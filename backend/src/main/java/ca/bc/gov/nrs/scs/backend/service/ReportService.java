package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.model.report.*;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import org.springframework.core.task.TaskRejectedException;


@Service
public class ReportService {

  private static final Logger log = LogManager.getLogger(ReportService.class);

  // Bound concurrent JasperServer renders independently of the executor's thread count, so a burst
  // of report requests (sync previews + async jobs) cannot overwhelm JasperServer or hold scarce
  // DB connections for the duration of a render. A render that cannot get a slot within the timeout
  // is rejected (503) rather than queued indefinitely.
  private static final int MAX_CONCURRENT_RENDERS = 3;
  private static final long RENDER_SLOT_TIMEOUT_SECONDS = 20;
  private final Semaphore renderSemaphore = new Semaphore(MAX_CONCURRENT_RENDERS, true);

  private final JasperServerClient client;
  private final ReportEmailService emailService;
  private final JWTService jwtService;
  private final Executor reportExecutor;
  private final ReportReferenceValidator referenceValidator;

  public ReportService(
      JasperServerClient client,
      ReportEmailService service,
      JWTService jwtService,
      @Qualifier("reportExecutor") Executor reportExecutor,
      ReportReferenceValidator referenceValidator) {
    this.client = client;
    this.emailService = service;
    this.jwtService = jwtService;
    this.reportExecutor = reportExecutor;
    this.referenceValidator = referenceValidator;
  }

  // ---------------------------------------------------------------- one entry point per report endpoint
  //
  // Each report keeps its own public method so the controller mapping and any report-specific validation stay
  // explicit at a glance. Everything after validation is the same for every report and lives in respond(...).
  // Validation runs BEFORE respond(...), so a rejected request never renders — on the preview path or the
  // preview=false (background render) path alike. Each returns a ReportOutcome; turning that into an HTTP
  // response (200 inline download / 202 acknowledgement) is the controller's job (ReportResponses).

  public ReportOutcome fetchScalerRegisterReport(
      ScalerRegisterReportRequest request,
      String authHeader) {
    return respond(ReportDefinition.SCALER_REGISTER, request, authHeader);
  }

  public ReportOutcome fetchScaleSiteRegisterReport(
      ScaleSiteRegisterReportRequest request,
      String authHeader) {
    return respond(ReportDefinition.SCALE_SITE_REGISTER, request, authHeader);
  }

  public ReportOutcome fetchMarkSiteDesignationReport(
      MarkSiteDesignationReportRequest request,
      String authHeader) {
    validateMarkSiteDesignationReportRequest(request);
    return respond(ReportDefinition.MARK_SITE_DESIGNATION, request, authHeader);
  }

  public ReportOutcome fetchDesignatedMarksExceptionReport(
      DesignatedMarksExceptionReportRequest request,
      String authHeader) {
    validateDesignatedMarksExceptionReportRequest(request);
    return respond(ReportDefinition.DESIGNATED_MARKS_EXCEPTION, request, authHeader);
  }

  public ReportOutcome fetchScalingAdministrationReport(
      ScalingAdministrationReportRequest request,
      String authHeader) {
    return respond(ReportDefinition.SCALING_ADMINISTRATION, request, authHeader);
  }

  public ReportOutcome fetchScalingExceptionReport(
      ScalingExceptionReportRequest request,
      String authHeader) {
    return respond(ReportDefinition.SCALING_EXCEPTION, request, authHeader);
  }

  public ReportOutcome fetchDistrictCheckScalePerformanceReport(
      DistrictPerformanceReportRequest request,
      String authHeader) {
    validateDistrictReportRequest(request);
    return respond(ReportDefinition.DISTRICT_CHECK_SCALE_PERFORMANCE, request, authHeader);
  }

  public ReportOutcome fetchDistrictSiteInspectionPerformanceReport(
      DistrictPerformanceReportRequest request,
      String authHeader) {
    validateDistrictReportRequest(request);
    return respond(ReportDefinition.DISTRICT_SITE_INSPECTION_PERFORMANCE, request, authHeader);
  }

  public ReportOutcome fetchScaleSiteComplianceReport(
      ScaleSiteComplianceReportRequest request,
      String authHeader) {
    return respond(ReportDefinition.SCALE_SITE_COMPLIANCE, request, authHeader);
  }

  // ---------------------------------------------------------------- the shared report path

  /**
   * Run a validated report request as the user the {@code Authorization} header value resolves to. A preview is
   * rendered now ({@link Rendered}); otherwise the render is queued on the report executor and {@link Queued}
   * returns at once, carrying the request id the background render and its email are tied to.
   */
  private ReportOutcome respond(
      ReportDefinition reportDefinition,
      ReportRequest request,
      String authHeader) {
    String username = jwtService.resolveUsername(authHeader);
    String requestId = nextRequestId();
    if (Boolean.TRUE.equals(request.getPreview())) {
      ReportDocument doc = renderAndEmail(requestId, reportDefinition, request, username);
      return new Rendered(requestId, doc, emailService.buildFilename(requestId, doc.mediaType()));
    }
    reportExecutor.execute(() -> generateInBackground(requestId, reportDefinition, request, username));
    return new Queued(requestId);
  }

  /** Render the report and hand it to the email service (which sends only when a recipient is set). */
  private ReportDocument renderAndEmail(
      String requestId,
      ReportDefinition reportDefinition,
      ReportRequest request,
      String username) {
    ReportDocument doc = fetchReportDocument(requestId, reportDefinition, request, username);
    emailService.handleEmail(requestId, request, doc.content(), doc.mediaType());
    return doc;
  }

  /**
   * The background half of a preview=false request. The caller already has its 202, so a failure here can only
   * be logged — there is no one left to answer.
   */
  private void generateInBackground(
      String requestId,
      ReportDefinition reportDefinition,
      ReportRequest request,
      String username) {
    try {
      renderAndEmail(requestId, reportDefinition, request, username);
    } catch (Exception ex) {
      log.error("Report generation failed report={} requestId={}", reportDefinition, requestId, ex);
    }
  }

  private ReportDocument fetchReportDocument(
      String requestId,
      ReportDefinition reportDefinition,
      ReportRequest request,
      String username) {
    boolean acquired;
    try {
      acquired = renderSemaphore.tryAcquire(RENDER_SLOT_TIMEOUT_SECONDS, TimeUnit.SECONDS);
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new TaskRejectedException("Interrupted while waiting for a report rendering slot", ex);
    }
    if (!acquired) {
      log.warn("Report rendering capacity exhausted requestId={} report={}",
          requestId, reportDefinition.getReportName());
      throw new TaskRejectedException(
          "Report generation is at capacity; please retry shortly.");
    }
    try {
      JasperServerClient.ReportPayload payload =
        client.fetchReport(requestId, reportDefinition.getReportName(), request, username);
      return new ReportDocument(payload.content(), payload.mediaType());
    } finally {
      renderSemaphore.release();
    }
  }

  private void validateDistrictReportRequest(ReportRequest request) {
    if (request == null) {
      throw new BadRequestException("Report request is required.");
    }
    if (request.getFromDate() == null || request.getToDate() == null) {
      throw new BadRequestException("From Date and To Date are required.");
    }
    validateDateRange(request.getFromDate(), request.getToDate());
  }

  /**
   * Paired date windows on the Mark Site Designation report: each of the two windows is ALL-OR-NOTHING.
   *
   * <p>The screen enforces this as well (the {@code pairedRequired} tier of {@code utils/reportDateRange}),
   * but the rule has to hold here too — a caller posting straight to the endpoint never runs the form, and
   * legacy blocked that path because its validation lived on the server
   * ({@code MarkSiteDesignationReportBo.validateDates} raising {@code errors.mark_site_eff_date_both} /
   * {@code errors.mark_site_exp_date_both}). Without this guard a half-filled window reaches Jasper as a
   * one-sided filter and the caller gets 200 and a document nobody asked for.
   *
   * <p>Deliberately NOT the same rule as {@link #validateDistrictReportRequest} next door: both dates blank
   * is a perfectly legal request here — the window is simply not filtered on — it is supplying exactly one
   * of the two that is refused. Ordering is not checked either, because legacy did not check it on this
   * screen (its {@code isDate}/from-to block is commented out); the screen's ordering rule comes from the
   * shared frontend helper, not from this report's spec.
   *
   * <p>Two behaviours carried over from legacy. Both windows are reported TOGETHER rather than failing on
   * the first, because legacy accumulated into {@code ActionErrors} and the screen shows both at once; and
   * each message is hung on the FROM field in both directions, even when it is the To date that is missing —
   * the same {@code MARK_SITE_DESIGNATION_REPORT_EFF_FROM_DATE} key served both arms there. Carrying that
   * needs per-field messages, which is why this throws {@link FieldValidationException} rather than the
   * {@link BadRequestException} its sibling uses: both are 400, but only this one can say WHICH window is
   * wrong, under field names that match the request body and the screen.
   */
  private void validateMarkSiteDesignationReportRequest(MarkSiteDesignationReportRequest request) {
    if (request == null) {
      throw new BadRequestException("Report request is required.");
    }

    List<FieldValidationException.FieldErrorDetail> fieldErrors = new ArrayList<>();
    addPairedDateWindowError(
        fieldErrors,
        request.getEffectiveFrom(),
        request.getEffectiveTo(),
        "effectiveFrom",
        "Effective Date (From)",
        "Effective Date (To)");
    addPairedDateWindowError(
        fieldErrors,
        request.getExpiryFrom(),
        request.getExpiryTo(),
        "expiryFrom",
        "Expiry Date (From)",
        "Expiry Date (To)");
    // Legacy validateSitesAndMarks ran in the same form validate(), so its errors join the date errors.
    fieldErrors.addAll(referenceValidator.validate(request));

    if (!fieldErrors.isEmpty()) {
      throw new FieldValidationException(fieldErrors);
    }
  }

  /**
   * Designated Marks Exception: every designated mark must be a timber mark and every designated site a
   * scale site, checked here on the server as legacy's {@code DesignatedMarksExceptionReportForm.validate}
   * did — see {@link ReportReferenceValidator}. Runs before the preview/async branch, so the {@code
   * preview=false} (202) path is guarded too.
   */
  private void validateDesignatedMarksExceptionReportRequest(DesignatedMarksExceptionReportRequest request) {
    if (request == null) {
      throw new BadRequestException("Report request is required.");
    }
    List<FieldValidationException.FieldErrorDetail> fieldErrors = referenceValidator.validate(request);
    if (!fieldErrors.isEmpty()) {
      throw new FieldValidationException(fieldErrors);
    }
  }

  /**
   * Records the pairing failure for ONE window when exactly one of its two dates is supplied. Both present
   * and both absent are equally fine, hence the equality on nullness rather than a count.
   */
  private void addPairedDateWindowError(
      List<FieldValidationException.FieldErrorDetail> fieldErrors,
      LocalDate fromDate,
      LocalDate toDate,
      String field,
      String fromLabel,
      String toLabel) {
    if ((fromDate == null) == (toDate == null)) {
      return;
    }
    fieldErrors.add(new FieldValidationException.FieldErrorDetail(
        field,
        "If a value is entered in either " + fromLabel + " or " + toLabel
            + ", then a value must be entered in both."));
  }

  private void validateDateRange(LocalDate fromDate, LocalDate toDate) {
    SCSUtils.requireDateOrder(fromDate, toDate, "From Date must be on or before To Date.");

    int maxYears = 1;
    if (fromDate.plusYears(maxYears).isBefore(toDate)) {
      throw new BadRequestException("Search date range cannot be more than 1 year(s).");
    }
  }

  private String nextRequestId() {
    return UUID.randomUUID().toString();
  }

  public static record ReportDocument(byte[] content, MediaType mediaType) {

    @Override
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      }
      if (!(other instanceof ReportDocument that)) {
        return false;
      }
      return Arrays.equals(content, that.content)
          && Objects.equals(mediaType, that.mediaType);
    }

    @Override
    public int hashCode() {
      int result = Objects.hash(mediaType);
      result = 31 * result + Arrays.hashCode(content);
      return result;
    }

    @Override
    public String toString() {
      return "ReportDocument["
          + "content=" + Arrays.toString(content)
          + ", mediaType=" + mediaType
          + ']';
    }
  }

  /** What a report request came to: rendered now (a preview), or queued for a background render. */
  public sealed interface ReportOutcome permits Rendered, Queued {
    String requestId();
  }

  /** A preview, rendered synchronously: the document and the filename to serve it under. */
  public record Rendered(String requestId, ReportDocument document, String filename) implements ReportOutcome {}

  /** A preview=false request, accepted and rendering in the background under {@code requestId}. */
  public record Queued(String requestId) implements ReportOutcome {}
}