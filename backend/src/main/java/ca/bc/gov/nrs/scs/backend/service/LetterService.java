package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.report.OutputFormatEnum;
import ca.bc.gov.nrs.scs.backend.model.report.ReportDefinition;
import ca.bc.gov.nrs.scs.backend.model.report.ReportRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.MarkSiteDesignationRepository;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.domain.report.LetterRequest;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.HaulingMarkAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleAdvisoryLetterReportRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import org.springframework.core.io.Resource;
import java.util.Arrays;
import java.util.Objects;

@Service
public class LetterService {

  private static final String DEFAULT_SIGNATURE_BLOCK_IND = "Y";
  private static final String SIGNATURE_BLOCK_REQUIRED = "Signature block is required.";

  private final JasperServerClient client;
  private final ReportEmailService emailService;
  private final JWTService jwtService;
  private final ScalerAuthorizationRepository scalerAuthorizationRepository;
  private final ScaleSiteAuthorizationRepository scaleSiteAuthorizationRepository;
  private final MarkSiteDesignationRepository markSiteDesignationRepository;

  public LetterService(
      JasperServerClient client,
      ReportEmailService emailService,
      JWTService jwtService,
      ScalerAuthorizationRepository scalerAuthorizationRepository,
      ScaleSiteAuthorizationRepository scaleSiteAuthorizationRepository,
      MarkSiteDesignationRepository markSiteDesignationRepository) {
    this.client = client;
    this.emailService = emailService;
    this.jwtService = jwtService;
    this.scalerAuthorizationRepository = scalerAuthorizationRepository;
    this.scaleSiteAuthorizationRepository = scaleSiteAuthorizationRepository;
    this.markSiteDesignationRepository = markSiteDesignationRepository;
  }

  public ResponseEntity<Resource> createScalerAuthorizationLetter(
      Long scalerAuthorizationId,
      ScalerAuthorizationLetterReportRequest request) {
    ScalerAuthorizationDetail detail = getScalerAuthorizationDetail(scalerAuthorizationId);
    if (Boolean.TRUE.equals(detail.getLetterExists())) {
      throw new BadRequestException("Scaler authorization already has a letter.");
    }

    ReportRequest reportRequest = buildReportRequest(
        toLetterRequest(request),
        scalerAuthorizationId);

    ReportPayload payload = fetchReportPayload(
      ReportDefinition.SCALER_AUTHORIZATION_LETTER,
      reportRequest);

    scalerAuthorizationRepository.upsertScalerAuthorizationLetter(
      scalerAuthorizationId,
      payload.document().content());

    return buildLetterResponse(payload, reportRequest, String.valueOf(scalerAuthorizationId));
  }

  public ResponseEntity<Resource> viewScalerAuthorizationLetter(Long scalerAuthorizationId) {
    ScalerAuthorizationDetail detail = getScalerAuthorizationDetail(scalerAuthorizationId);
    if (!Boolean.TRUE.equals(detail.getLetterExists())) {
      throw new ResourceNotFoundException("Scaler authorization letter not found.");
    }
    // Return the letter blob stored when the letter was created (not a regenerated report).
    return inlineStoredLetter(
        scalerAuthorizationRepository.getScalerAuthorizationLetter(scalerAuthorizationId),
        String.valueOf(scalerAuthorizationId),
        "Scaler authorization letter not found.");
  }

  public ResponseEntity<Resource> createScaleSiteAuthorizationLetter(
      Long scaleSiteAuthorizationId,
      ScaleSiteAuthorizationLetterReportRequest request) {
    ScaleSiteAuthorizationDetail detail = getScaleSiteAuthorizationDetail(scaleSiteAuthorizationId);
    if (Boolean.TRUE.equals(detail.getLetterExists())) {
      throw new BadRequestException("Scale site authorization already has a letter.");
    }

    ReportRequest reportRequest = buildReportRequest(
        toLetterRequest(request),
        scaleSiteAuthorizationId);

    ReportPayload payload = fetchReportPayload(
      ReportDefinition.SCALE_SITE_AUTHORIZATION_LETTER,
      reportRequest);

    scaleSiteAuthorizationRepository.upsertScaleSiteAuthorizationLetter(
        scaleSiteAuthorizationId,
        payload.document().content());

    return buildLetterResponse(payload, reportRequest, String.valueOf(scaleSiteAuthorizationId));
  }

  public ResponseEntity<Resource> viewScaleSiteAuthorizationLetter(Long scaleSiteAuthorizationId) {
    ScaleSiteAuthorizationDetail detail = getScaleSiteAuthorizationDetail(scaleSiteAuthorizationId);
    if (!Boolean.TRUE.equals(detail.getLetterExists())) {
      throw new ResourceNotFoundException("Scale site authorization letter not found.");
    }
    return inlineStoredLetter(
        scaleSiteAuthorizationRepository.getScaleSiteAuthorizationLetter(scaleSiteAuthorizationId),
        String.valueOf(scaleSiteAuthorizationId),
        "Scale site authorization letter not found.");
  }

  private ScalerAuthorizationDetail getScalerAuthorizationDetail(Long scalerAuthorizationId) {
    ScalerAuthorizationDetail detail = scalerAuthorizationRepository.getScalerAuthorization(scalerAuthorizationId);
    SCSUtils.requireFound(detail, "No scaler authorization found with id " + scalerAuthorizationId);
    return detail;
  }

  private ScaleSiteAuthorizationDetail getScaleSiteAuthorizationDetail(Long scaleSiteAuthorizationId) {
    ScaleSiteAuthorizationDetail detail = scaleSiteAuthorizationRepository.getScaleSiteAuthorization(scaleSiteAuthorizationId);
    SCSUtils.requireFound(detail, "No scale site authorization found with id " + scaleSiteAuthorizationId);
    return detail;
  }

  public ResponseEntity<Resource> createMarkSiteDesignationLetter(
      Long authorizationId,
      MarkSiteDesignationLetterReportRequest request) {
    getHaulingMarkAuthorizationDetail(authorizationId); // 404 guard: ensure the authorization exists
    if (markSiteDesignationRepository.getMarkSiteDesignationLetterExists(authorizationId)) {
      throw new BadRequestException("Mark site designation already has a letter.");
    }

    ReportRequest reportRequest = buildReportRequest(
        toMsdLetterRequest(request),
        authorizationId);

    ReportPayload payload = fetchReportPayload(
        ReportDefinition.MARK_SITE_DESIGNATION_LETTER,
        reportRequest);

    markSiteDesignationRepository.upsertMarkSiteDesignationLetter(
        authorizationId,
        payload.document().content());

    return buildLetterResponse(payload, reportRequest, String.valueOf(authorizationId));
  }

  public ResponseEntity<Resource> viewMarkSiteDesignationLetter(Long authorizationId) {
    if (!markSiteDesignationRepository.getMarkSiteDesignationLetterExists(authorizationId)) {
      throw new ResourceNotFoundException("Mark site designation letter not found.");
    }
    return inlineStoredLetter(
        markSiteDesignationRepository.getMarkSiteDesignationLetter(authorizationId),
        String.valueOf(authorizationId),
        "Mark site designation letter not found.");
  }

  /** Generates the check scale advisory letter (R004/SCS_REP004). Not persisted (legacy parity). */
  public ResponseEntity<Resource> createCheckScaleAdvisoryLetter(
      Long checkScaleId, CheckScaleAdvisoryLetterReportRequest request) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }

    // buildLetterReportRequest directly (not buildReportRequest): R004 allows a null signatory.
    // A non-positive id is still rejected: it is "nothing selected" sent as a number, not a choice.
    rejectNonPositiveSignatory(request.getScaleSignatoryBlockId());
    // (Email validation is now applied inside buildLetterReportRequest for all letters.)
    ReportRequest reportRequest =
        buildLetterReportRequest(
            request.getRegDist(),
            request.getCcField(),
            null,
            request.getScaleSignatoryBlockId(),
            request.getOutputFormat(),
            request.getEmailRecipient(),
            request.getPreview(),
            checkScaleId);

    ReportPayload payload =
        fetchReportPayload(ReportDefinition.CHECK_SCALE_ADVISORY_LETTER, reportRequest);
    return buildLetterResponse(payload, reportRequest, String.valueOf(checkScaleId));
  }

  private void validateReportEmail(Boolean preview, String emailRecipient) {
    String email = SCSUtils.trimToNull(emailRecipient);
    if (!Boolean.TRUE.equals(preview) && email == null) {
      throw new BadRequestException(
          "If Preview Report has been set to No then the Email Recipient is required.");
    }
    if (email != null && !isWellFormedEmail(email)) {
      throw new BadRequestException("The Email Recipient is not in a valid format.");
    }
  }

  /**
   * Loose {@code local@domain.tld} shape check (legacy {@code ReportBo.validateEmail} parity): no
   * whitespace, exactly one {@code @} with a non-empty local part, and a domain of at least two
   * non-empty dot-separated labels. Written as a single pass rather than a regex so validation is
   * linear in the input length with no backtracking or matcher recursion (java:S5852).
   */
  static boolean isWellFormedEmail(String email) {
    int at = email.indexOf('@');
    if (at <= 0 || email.indexOf('@', at + 1) >= 0) {
      return false;
    }
    int labels = 0;
    int labelLength = 0;
    for (int i = 0; i < email.length(); i++) {
      char c = email.charAt(i);
      if (Character.isWhitespace(c)) {
        return false;
      }
      if (i <= at) {
        continue;
      }
      if (c == '.') {
        if (labelLength == 0) {
          return false; // empty label: leading dot or ".."
        }
        labels++;
        labelLength = 0;
      } else {
        labelLength++;
      }
    }
    return labels >= 1 && labelLength > 0; // at least "domain.tld", no trailing dot
  }

  /**
   * Wraps a stored letter blob in an inline PDF response, or throws 404 when no letter is stored.
   * Shared by the scaler / scale-site / mark-site letter views.
   */
  private ResponseEntity<Resource> inlineStoredLetter(byte[] content, String id, String notFoundMessage) {
    if (content == null || content.length == 0) {
      throw new ResourceNotFoundException(notFoundMessage);
    }
    ReportPayload payload = new ReportPayload(
        new ReportDocument(content, MediaType.APPLICATION_PDF),
        UUID.randomUUID().toString());
    return buildInlineResourceResponse(payload, id);
  }

  private HaulingMarkAuthorizationDetail getHaulingMarkAuthorizationDetail(Long authorizationId) {
    HaulingMarkAuthorizationDetail detail = markSiteDesignationRepository.getMarkSiteAuthorizationDetail(authorizationId);
    SCSUtils.requireFound(detail, "No mark site designation found with id " + authorizationId);
    return detail;
  }

  private LetterRequest toMsdLetterRequest(MarkSiteDesignationLetterReportRequest dto) {
    if (dto == null) return null;
    return new LetterRequest(
        dto.getRegDist(),
        dto.getCcField(),
        null,
        dto.getScaleSignatoryBlockId(),
        dto.getOutputFormat(),
        dto.getEmailRecipient(),
        dto.getPreview());
  }

  private LetterRequest toLetterRequest(ScalerAuthorizationLetterReportRequest dto) {
    if (dto == null) return null;
    return new LetterRequest(
        dto.getRegDist(),
        dto.getCcField(),
        dto.getShowSignatureBlockInd(),
        dto.getScaleSignatoryBlockId(),
        dto.getOutputFormat(),
        dto.getEmailRecipient(),
        dto.getPreview());
  }

  private LetterRequest toLetterRequest(ScaleSiteAuthorizationLetterReportRequest dto) {
    if (dto == null) return null;
    return new LetterRequest(
        dto.getRegDist(),
        dto.getCcField(),
        dto.getShowSignatureBlockInd(),
        dto.getScaleSignatoryBlockId(),
        dto.getOutputFormat(),
        dto.getEmailRecipient(),
        dto.getPreview());
  }

  private ReportRequest buildReportRequest(LetterRequest request, Long letterId) {
    if (request == null) {
      throw new BadRequestException("Request body is required.");
    }
    validateLetterRequest(request.scaleSignatoryBlockId());

    return buildLetterReportRequest(
        request.regDist(),
        request.ccField(),
        request.showSignatureBlockInd(),
        request.scaleSignatoryBlockId(),
        request.outputFormat(),
        request.emailRecipient(),
        request.preview(),
        letterId);
  }

  private ReportRequest buildLetterReportRequest(
      String regDist,
      String ccField,
      String showSignatureBlockInd,
      Long scaleSignatoryBlockId,
      Object outputFormat,
      String emailRecipient,
      Boolean preview,
      Long letterId) {
    // Shared server-side email validation for all letters (legacy ReportBo.validateEmail parity):
    // required when not previewing, and well-formed when supplied.
    validateReportEmail(preview, emailRecipient);
    String normalizedCc = SCSUtils.trimToNull(ccField);
    // The MSD report does not use the signature-block indicator; callers that omit it
    // (showSignatureBlockInd == null) leave P_SHOW_SIGNATURE_BLOCK out of the request entirely.
    String normalizedShowSignatureBlockInd =
        showSignatureBlockInd == null ? null : normalizeYesNo(showSignatureBlockInd);
    String normalizedEmail = SCSUtils.trimToNull(emailRecipient);
    OutputFormatEnum resolvedOutputFormat = resolveOutputFormat(outputFormat);
    Boolean previewValue = Boolean.TRUE.equals(preview);

    ReportRequest reportRequest = new ReportRequest() {
      @Override
      public Map<String, String> buildParameters(String requester) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("P_ORG_UNIT_CODE", normalizeOrgUnitCode(regDist));
        params.put("P_CC_Field", normalizeForJasper(normalizedCc));
        if (normalizedShowSignatureBlockInd != null) {
          params.put("P_SHOW_SIGNATURE_BLOCK", normalizeForJasper(normalizedShowSignatureBlockInd));
        }
        params.put("P_LETTER_ID", letterId == null ? "" : String.valueOf(letterId));
        params.put(
            "P_SCALE_SIGNATORY_BLOCK_ID",
            scaleSignatoryBlockId == null ? "" : String.valueOf(scaleSignatoryBlockId));
        return params;
      }
    };
    reportRequest.setOutputFormat(resolvedOutputFormat);
    reportRequest.setEmailRecipient(normalizedEmail);
    reportRequest.setPreview(previewValue);
    return reportRequest;
  }

  private void validateLetterRequest(Long scaleSignatoryBlockId) {
    if (scaleSignatoryBlockId == null) {
      throw new BadRequestException(SIGNATURE_BLOCK_REQUIRED);
    }
    rejectNonPositiveSignatory(scaleSignatoryBlockId);
  }

  /**
   * A signature block id is a positive sequence value, so {@code 0} or a negative number can only be
   * a client that sent "nothing selected" as a number ({@code Number('') === 0}). Rejected on all
   * four letters — including the advisory letter, which may omit the signatory ({@code null}) but
   * not send a non-positive id. Only the sign is checked here; whether a positive id names an existing
   * signature block is not verified.
   */
  private void rejectNonPositiveSignatory(Long scaleSignatoryBlockId) {
    if (scaleSignatoryBlockId != null && scaleSignatoryBlockId <= 0) {
      throw new BadRequestException(SIGNATURE_BLOCK_REQUIRED);
    }
  }

  private OutputFormatEnum resolveOutputFormat(Object value) {
    if (value == null) {
      return OutputFormatEnum.PDF;
    }
    String normalized = value.toString().trim().toUpperCase();
    if ("XLS".equals(normalized) || "MS EXCEL".equals(normalized)) {
      return OutputFormatEnum.XLS;
    }
    return OutputFormatEnum.PDF;
  }

  private String normalizeYesNo(String value) {
    if (SCSUtils.isBlank(value)) {
      return DEFAULT_SIGNATURE_BLOCK_IND;
    }
    String normalized = value.trim().toUpperCase();
    return "N".equals(normalized) ? "N" : "Y";
  }

  private ReportPayload fetchReportPayload(
      ReportDefinition definition,
      ReportRequest reportRequest) {
    String requestId = UUID.randomUUID().toString();
    String username = jwtService.getAuthenticatedUsername();
    JasperServerClient.ReportPayload payload = client.fetchReport(
        requestId,
        definition.getReportName(),
        reportRequest,
        username);

    ReportDocument doc = new ReportDocument(payload.content(), payload.mediaType());
    emailService.handleEmail(requestId, reportRequest, doc.content(), doc.mediaType());
    return new ReportPayload(doc, requestId);
  }

  private ResponseEntity<Resource> buildLetterResponse(ReportPayload payload, ReportRequest request, String filenameBase) {
    if (Boolean.TRUE.equals(request.getPreview())) {
      return buildInlineResourceResponse(payload, filenameBase);
    }
    ByteArrayResource resource = new ByteArrayResource(new byte[0]);
    return ResponseEntity.accepted()
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(resource);
  }

  private ResponseEntity<Resource> buildInlineResourceResponse(ReportPayload payload, String filenameBase) {
    MediaType mediaType = payload.document().mediaType();
    byte[] content = payload.document().content();
    String filename = filenameBase + (MediaType.APPLICATION_PDF.equals(mediaType) ? ".pdf" : ".xls");
    ContentDisposition disposition = ContentDisposition.inline().filename(filename).build();
    ByteArrayResource resource = new ByteArrayResource(content == null ? new byte[0] : content);

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .contentType(mediaType)
        .body(resource);
  }

  /**
   * Rendered report bytes plus their media type. The array field needs content-based
   * {@code equals} / {@code hashCode} / {@code toString} (java:S6218); the default record versions
   * would compare the array reference and print its identity.
   */
  private record ReportDocument(byte[] content, MediaType mediaType) {
    @Override
    public boolean equals(Object other) {
      return other instanceof ReportDocument that
          && Arrays.equals(content, that.content)
          && Objects.equals(mediaType, that.mediaType);
    }

    @Override
    public int hashCode() {
      return 31 * Arrays.hashCode(content) + Objects.hashCode(mediaType);
    }

    @Override
    public String toString() {
      return "ReportDocument[content=" + (content == null ? "null" : content.length + " bytes")
          + ", mediaType=" + mediaType + "]";
    }
  }

  private record ReportPayload(ReportDocument document, String requestId) {}
}
