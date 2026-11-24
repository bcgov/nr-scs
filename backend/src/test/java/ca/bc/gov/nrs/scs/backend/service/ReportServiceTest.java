package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.model.report.*;
import ca.bc.gov.nrs.scs.backend.model.SortOrder;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Supplier;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReportServiceTest {

  private JasperServerClient client;
  private ReportEmailService emailQueueService;
  private JWTService jwtService;
  private Executor reportExecutor;
  private ReportReferenceValidator referenceValidator;
  private ReportService service;

  private record ReportCase(
      String reportName,
      Supplier<? extends ReportRequest> requestSupplier,
      BiFunction<ReportService, ReportRequest, ReportService.ReportOutcome> responseInvoker) {}

  @BeforeEach
  void setUp() {
    client = org.mockito.Mockito.mock(JasperServerClient.class);
    emailQueueService = org.mockito.Mockito.mock(ReportEmailService.class);
    // A spy of the real JWTService: the service asks it to resolveUsername(header), and the real rules then run
    // over the claims each test stubs — so the username fallbacks below stay tested through ReportService.
    jwtService = org.mockito.Mockito.spy(new JWTService());
    reportExecutor = Runnable::run;
    // Mockito answers an empty error list by default, so every report passes the reference checks unless a
    // test stubs a failure (ReportReferenceValidatorTest covers the checks themselves).
    referenceValidator = org.mockito.Mockito.mock(ReportReferenceValidator.class);
    service = new ReportService(client, emailQueueService, jwtService, reportExecutor, referenceValidator);
  }

  @Test
  void fetchScalerRegisterReport_sendsEmailWhenRecipientPresent() {
    byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
    ScalerRegisterReportRequest request = baseRequest();
    request.setEmailRecipient("user@example.com");
    JasperServerClient.ReportPayload payload =
        new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
    when(client.fetchReport(
      anyString(),
      eq(ReportDefinition.SCALER_REGISTER.getReportName()),
      eq(request),
      eq("user1")))
        .thenReturn(payload);
    doReturn("user1").when(jwtService).getAuthenticatedUsername();
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");
    // Driven through the public endpoint method (preview=true), as the controller calls it; the per-report
    // sync fetch method this test used to call was internal and is gone with the shared report path.
    service.fetchScalerRegisterReport(request, null);
    ArgumentCaptor<String> renderedId = ArgumentCaptor.forClass(String.class);
    verify(client).fetchReport(renderedId.capture(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), eq(request), eq("user1"));
    record Result(String requestId) {}
    Result result = new Result(renderedId.getValue());

    ArgumentCaptor<String> requestIdCaptor = ArgumentCaptor.forClass(String.class);
    ArgumentCaptor<ScalerRegisterReportRequest> requestCaptor = ArgumentCaptor.forClass(ScalerRegisterReportRequest.class);
    ArgumentCaptor<byte[]> contentCaptor = ArgumentCaptor.forClass(byte[].class);
    ArgumentCaptor<MediaType> mediaTypeCaptor = ArgumentCaptor.forClass(MediaType.class);
    verify(emailQueueService).handleEmail(
      requestIdCaptor.capture(),
      requestCaptor.capture(),
      contentCaptor.capture(),
      mediaTypeCaptor.capture());

    assertEquals(result.requestId(), requestIdCaptor.getValue());
    assertEquals(request, requestCaptor.getValue());
    assertArrayEquals(bytes, contentCaptor.getValue());
    assertEquals(MediaType.APPLICATION_PDF, mediaTypeCaptor.getValue());

    verify(client)
      .fetchReport(eq(result.requestId()), eq(ReportDefinition.SCALER_REGISTER.getReportName()), eq(request), eq("user1"));
  }

  @Test
  void fetchReportResponse_previewTrue_returnsInlineResponseAndEmails() {
    for (ReportCase reportCase : reportCases()) {
      setUp();
      byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
      doReturn("auth-user").when(jwtService).getAuthenticatedUsername();

      ReportRequest request = reportCase.requestSupplier().get();
      JasperServerClient.ReportPayload payload =
        new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
      when(client.fetchReport(
        anyString(),
        eq(reportCase.reportName()),
        same(request),
        eq("auth-user")))
        .thenReturn(payload);
      when(emailQueueService.buildFilename(anyString(), any())).thenAnswer(invocation -> {
        String requestId = invocation.getArgument(0);
        return requestId + ".pdf";
      });

      ReportService.ReportOutcome outcome = reportCase.responseInvoker().apply(service, request);

      // Rendered now, under the email service's filename for this request. (The 200 / inline download it becomes
      // on the wire is ReportResponses' job — pinned by ReportResponsesTest and ReportHttpContractTest.)
      ReportService.Rendered rendered =
        assertInstanceOf(ReportService.Rendered.class, outcome, reportCase.reportName());
      assertArrayEquals(bytes, rendered.document().content());
      assertEquals(MediaType.APPLICATION_PDF, rendered.document().mediaType());
      assertEquals(rendered.requestId() + ".pdf", rendered.filename());

      verify(client)
        .fetchReport(anyString(), eq(reportCase.reportName()), same(request), eq("auth-user"));
      verify(emailQueueService).handleEmail(anyString(), same(request), eq(bytes), eq(MediaType.APPLICATION_PDF));
    }
  }

  @Test
  void fetchReportResponse_previewFalse_returnsAcceptedAndRunsAsyncGeneration() {
    for (ReportCase reportCase : reportCases()) {
      setUp();
      byte[] bytes = "queued-content".getBytes(StandardCharsets.UTF_8);
      doReturn("auth-user").when(jwtService).getAuthenticatedUsername();

      ReportRequest request = reportCase.requestSupplier().get();
      request.setPreview(false);
      JasperServerClient.ReportPayload payload =
        new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
      when(client.fetchReport(
        anyString(),
        eq(reportCase.reportName()),
        same(request),
        eq("auth-user")))
        .thenReturn(payload);

      ReportService.ReportOutcome outcome = reportCase.responseInvoker().apply(service, request);

      // Queued, and (inline executor) already rendered and emailed. The 202 acknowledgement it becomes on the
      // wire is ReportResponses' job.
      ReportService.Queued queued =
        assertInstanceOf(ReportService.Queued.class, outcome, reportCase.reportName());
      assertNotNull(queued.requestId());

      verify(client)
        .fetchReport(anyString(), eq(reportCase.reportName()), same(request), eq("auth-user"));
      verify(emailQueueService).handleEmail(anyString(), same(request), eq(bytes), eq(MediaType.APPLICATION_PDF));
    }
  }

  // One request id must tie a request together end to end: the id Jasper renders under is the id the email
  // is queued under and the id the download is named after (preview), and the id handed back in the 202
  // acknowledgement is the id that is rendered and emailed (async). Pinned for every report because a
  // generic report path could otherwise mint a second id and still satisfy the status/header assertions.

  @Test
  void fetchReportResponse_previewTrue_usesOneRequestIdForRenderEmailAndFilename() {
    for (ReportCase reportCase : reportCases()) {
      setUp();
      byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
      doReturn("auth-user").when(jwtService).getAuthenticatedUsername();
      ReportRequest request = reportCase.requestSupplier().get();
      when(client.fetchReport(anyString(), eq(reportCase.reportName()), same(request), eq("auth-user")))
        .thenReturn(new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF));
      when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");

      reportCase.responseInvoker().apply(service, request);

      ArgumentCaptor<String> renderedId = ArgumentCaptor.forClass(String.class);
      ArgumentCaptor<String> emailedId = ArgumentCaptor.forClass(String.class);
      ArgumentCaptor<String> filenameId = ArgumentCaptor.forClass(String.class);
      verify(client).fetchReport(renderedId.capture(), eq(reportCase.reportName()), same(request), eq("auth-user"));
      verify(emailQueueService).handleEmail(emailedId.capture(), same(request), eq(bytes), eq(MediaType.APPLICATION_PDF));
      verify(emailQueueService).buildFilename(filenameId.capture(), eq(MediaType.APPLICATION_PDF));
      assertEquals(renderedId.getValue(), emailedId.getValue(), reportCase.reportName());
      assertEquals(renderedId.getValue(), filenameId.getValue(), reportCase.reportName());
    }
  }

  @Test
  void fetchReportResponse_previewFalse_ackRequestIdIsTheOneRenderedAndEmailed() {
    for (ReportCase reportCase : reportCases()) {
      setUp();
      byte[] bytes = "queued-content".getBytes(StandardCharsets.UTF_8);
      doReturn("auth-user").when(jwtService).getAuthenticatedUsername();
      ReportRequest request = reportCase.requestSupplier().get();
      request.setPreview(false);
      when(client.fetchReport(anyString(), eq(reportCase.reportName()), same(request), eq("auth-user")))
        .thenReturn(new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF));

      ReportService.ReportOutcome response = reportCase.responseInvoker().apply(service, request);

      Object ackId = assertInstanceOf(ReportService.Queued.class, response).requestId();
      ArgumentCaptor<String> renderedId = ArgumentCaptor.forClass(String.class);
      ArgumentCaptor<String> emailedId = ArgumentCaptor.forClass(String.class);
      verify(client).fetchReport(renderedId.capture(), eq(reportCase.reportName()), same(request), eq("auth-user"));
      verify(emailQueueService).handleEmail(emailedId.capture(), same(request), eq(bytes), eq(MediaType.APPLICATION_PDF));
      assertEquals(ackId, renderedId.getValue(), reportCase.reportName());
      assertEquals(ackId, emailedId.getValue(), reportCase.reportName());
    }
  }

  @Test
  void fetchReportResponse_previewFalse_handlesGenerationExceptions() {
    for (ReportCase reportCase : reportCases()) {
      setUp();
      doReturn(" ").when(jwtService).getAuthenticatedUsername();

      ReportRequest request = reportCase.requestSupplier().get();
      request.setPreview(false);
      when(client.fetchReport(
        anyString(),
        eq(reportCase.reportName()),
        same(request),
        isNull()))
        .thenThrow(new RuntimeException("boom"));

      ReportService.ReportOutcome response = reportCase.responseInvoker().apply(service, request);

      assertInstanceOf(ReportService.Queued.class, response);
      verify(client)
        .fetchReport(anyString(), eq(reportCase.reportName()), same(request), isNull());
      verify(emailQueueService, never()).handleEmail(anyString(), same(request), any(), any());
    }
  }

  @Test
  void fetchScalerRegisterReportResponse_usesAuthHeaderUserIdWhenJwtEmpty() {
    byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
    doReturn(null).when(jwtService).getAuthenticatedUsername();
    doReturn("user-from-token").when(jwtService).extractUserId("token");
    ScalerRegisterReportRequest request = baseRequest();
    JasperServerClient.ReportPayload payload =
      new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
    when(client.fetchReport(
      anyString(),
      eq(ReportDefinition.SCALER_REGISTER.getReportName()),
      same(request),
      eq("user-from-token")))
      .thenReturn(payload);
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");

    ReportService.ReportOutcome response = service.fetchScalerRegisterReport(request, "Bearer token");

    assertInstanceOf(ReportService.Rendered.class, response);
    verify(client)
      .fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request), eq("user-from-token"));
  }

  @Test
  void fetchScalerRegisterReportResponse_usesAuthHeaderUsernameWhenUserIdMissing() {
    byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
    doReturn(" ").when(jwtService).getAuthenticatedUsername();
    doReturn(null).when(jwtService).extractUserId("token");
    doReturn("user-from-username-claim").when(jwtService).extractSubject("token");

    ScalerRegisterReportRequest request = baseRequest();
    JasperServerClient.ReportPayload payload =
      new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
    when(client.fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request),
      eq("user-from-username-claim"))).thenReturn(payload);
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");

    service.fetchScalerRegisterReport(request, "Bearer token");

    verify(client).fetchReport(
      anyString(),
      eq(ReportDefinition.SCALER_REGISTER.getReportName()),
      same(request),
      eq("user-from-username-claim"));
  }

  @Test
  void fetchScalerRegisterReportResponse_usesNullUsernameWhenNoAuthInformationExists() {
    byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
    doReturn("").when(jwtService).getAuthenticatedUsername();

    ScalerRegisterReportRequest request = baseRequest();
    JasperServerClient.ReportPayload payload =
      new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
    when(client.fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request),
      isNull())).thenReturn(payload);
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");

    service.fetchScalerRegisterReport(request, "invalid-header");

    verify(client).fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request), isNull());
  }

  @Test
  void fetchDistrictPerformanceResponse_throwsBadRequestWhenRequestIsNull() {
    BadRequestException exception = assertThrows(
      BadRequestException.class,
      () -> service.fetchDistrictCheckScalePerformanceReport(null, null));
    assertEquals("Report request is required.", exception.getMessage());
  }

  @Test
  void fetchDistrictPerformanceResponse_throwsBadRequestWhenDatesMissing() {
    DistrictPerformanceReportRequest request = districtRequest(true);
    request.setFromDate(null);
    request.setToDate(null);

    BadRequestException exception = assertThrows(
      BadRequestException.class,
      () -> service.fetchDistrictCheckScalePerformanceReport(request, null));
    assertEquals("From Date and To Date are required.", exception.getMessage());
  }

  @Test
  void fetchDistrictPerformanceResponse_throwsBadRequestWhenFromDateAfterToDate() {
    DistrictPerformanceReportRequest request = districtRequest(true);
    request.setFromDate(LocalDate.of(2025, 2, 2));
    request.setToDate(LocalDate.of(2025, 2, 1));

    BadRequestException exception = assertThrows(
      BadRequestException.class,
      () -> service.fetchDistrictCheckScalePerformanceReport(request, null));
    assertEquals("From Date must be on or before To Date.", exception.getMessage());
  }

  @Test
  void fetchDistrictPerformanceResponse_throwsBadRequestWhenRangeExceedsOneYear() {
    DistrictPerformanceReportRequest request = districtRequest(true);
    request.setFromDate(LocalDate.of(2025, 1, 1));
    request.setToDate(LocalDate.of(2026, 1, 2));

    BadRequestException exception = assertThrows(
      BadRequestException.class,
      () -> service.fetchDistrictCheckScalePerformanceReport(request, null));
    assertEquals("Search date range cannot be more than 1 year(s).", exception.getMessage());
  }

  // ---------------------------------------------------------------- paired date windows (UC-RPT-012)
  //
  // QA reported the half-filled window generating a report; the fix landed on the screen first, and review
  // pointed out the endpoint still answered 200 for the same payload. Legacy validated on the SERVER
  // (MarkSiteDesignationReportBo.validateDates), so a direct API caller was blocked there too. Every case
  // below asserts the report was never RENDERED, not merely that a throw happened -- that no document is
  // produced is the actual bug.

  @Test
  void fetchMarkSiteDesignationReportResponse_throwsWhenEffectiveFromHasNoTo() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setEffectiveFrom(LocalDate.of(2024, 1, 1));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));

    assertEquals(1, exception.getFieldErrors().size());
    assertEquals("effectiveFrom", exception.getFieldErrors().get(0).field());
    assertEquals(
      "If a value is entered in either Effective Date (From) or Effective Date (To), "
        + "then a value must be entered in both.",
      exception.getFieldErrors().get(0).message());
    verifyNoInteractions(client);
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_throwsWhenEffectiveToHasNoFrom() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setEffectiveTo(LocalDate.of(2024, 12, 31));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));

    // Legacy hung the message on the FROM field in BOTH directions, even though here it is the To date that
    // is present. The screen does the same, so the API has to agree or the inline error lands nowhere.
    assertEquals(1, exception.getFieldErrors().size());
    assertEquals("effectiveFrom", exception.getFieldErrors().get(0).field());
    verifyNoInteractions(client);
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_throwsWhenExpiryFromHasNoTo() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setExpiryFrom(LocalDate.of(2025, 1, 1));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));

    // The expiry window failing must not implicate the effective window -- one error, and it names expiry.
    assertEquals(1, exception.getFieldErrors().size());
    assertEquals("expiryFrom", exception.getFieldErrors().get(0).field());
    assertEquals(
      "If a value is entered in either Expiry Date (From) or Expiry Date (To), "
        + "then a value must be entered in both.",
      exception.getFieldErrors().get(0).message());
    verifyNoInteractions(client);
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_throwsWhenExpiryToHasNoFrom() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setExpiryTo(LocalDate.of(2025, 6, 30));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));

    assertEquals(1, exception.getFieldErrors().size());
    assertEquals("expiryFrom", exception.getFieldErrors().get(0).field());
    verifyNoInteractions(client);
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_reportsBothWindowsWhenEachIsHalfFilled() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setEffectiveFrom(LocalDate.of(2024, 1, 1));
    request.setExpiryTo(LocalDate.of(2025, 6, 30));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));

    // Both, not just the first -- legacy accumulated into ActionErrors, so fixing one window per round-trip
    // is not the experience the screen gives.
    assertEquals(
      List.of("effectiveFrom", "expiryFrom"),
      exception.getFieldErrors().stream()
        .map(FieldValidationException.FieldErrorDetail::field)
        .toList());
    verifyNoInteractions(client);
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_blocksTheAsyncEmailPathToo() {
    // preview=false returns 202 immediately and renders on a background thread, so a guard placed inside
    // the render would never reach the caller. This case proves the guard runs BEFORE that branch.
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(false);
    request.setEffectiveFrom(LocalDate.of(2024, 1, 1));

    assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));
    verifyNoInteractions(client);
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_acceptsAFullyPopulatedWindow() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setEffectiveFrom(LocalDate.of(2024, 1, 1));
    request.setEffectiveTo(LocalDate.of(2024, 12, 31));
    stubMarkSiteDesignationRender(request);

    service.fetchMarkSiteDesignationReport(request, null);

    verify(client).fetchReport(
      anyString(), eq(ReportDefinition.MARK_SITE_DESIGNATION.getReportName()), same(request), isNull());
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_acceptsAnEmptyWindow() {
    // The distinction between pairing and "required": no dates at all is a legal request. Asserted because
    // a validator written as "both are required" would satisfy every case above and still break this one.
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    stubMarkSiteDesignationRender(request);

    service.fetchMarkSiteDesignationReport(request, null);

    verify(client).fetchReport(
      anyString(), eq(ReportDefinition.MARK_SITE_DESIGNATION.getReportName()), same(request), isNull());
  }

  @Test
  void fetchMarkSiteDesignationReportResponse_throwsBadRequestWhenRequestIsNull() {
    BadRequestException exception = assertThrows(
      BadRequestException.class,
      () -> service.fetchMarkSiteDesignationReport(null, null));
    assertEquals("Report request is required.", exception.getMessage());
  }

  // ------------------------------------------------- timber mark / scale site existence (UC-RPT-012, UC-RPT-005)
  //
  // Legacy refused an unknown mark or site in the forms' SERVER-side validate(), so a direct API caller was
  // blocked too. These assert the service runs the reference checks before rendering, on both endpoints and
  // on the async path; ReportReferenceValidatorTest covers what the checks decide.

  @Test
  void fetchMarkSiteDesignationReportResponse_reportsReferenceErrorsAlongsideDateErrors() {
    MarkSiteDesignationReportRequest request = markSiteDesignationRequest(true);
    request.setEffectiveFrom(LocalDate.of(2024, 1, 1));
    when(referenceValidator.validate(request)).thenReturn(List.of(new FieldValidationException.FieldErrorDetail(
      "siteMark2", "A Site nor Timbermark for A12345 exist in the system.")));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchMarkSiteDesignationReport(request, null));

    // One round-trip shows both, as legacy's single ActionErrors did.
    assertEquals(
      List.of("effectiveFrom", "siteMark2"),
      exception.getFieldErrors().stream().map(FieldValidationException.FieldErrorDetail::field).toList());
    verifyNoInteractions(client);
  }

  @Test
  void fetchDesignatedMarksExceptionReportResponse_throwsOnReferenceErrorsBeforeRendering() {
    DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
    request.setPreview(true);
    when(referenceValidator.validate(request)).thenReturn(List.of(
      new FieldValidationException.FieldErrorDetail("mark1", "A Timbermark for A12345 does not exist in the system."),
      new FieldValidationException.FieldErrorDetail("site1", "A Scale Site for ZZZ does not exist in the system.")));

    FieldValidationException exception = assertThrows(
      FieldValidationException.class,
      () -> service.fetchDesignatedMarksExceptionReport(request, null));

    assertEquals(
      List.of("mark1", "site1"),
      exception.getFieldErrors().stream().map(FieldValidationException.FieldErrorDetail::field).toList());
    verifyNoInteractions(client);
  }

  @Test
  void fetchDesignatedMarksExceptionReportResponse_blocksTheAsyncEmailPathToo() {
    DesignatedMarksExceptionReportRequest request = new DesignatedMarksExceptionReportRequest();
    request.setPreview(false);
    when(referenceValidator.validate(request)).thenReturn(List.of(
      new FieldValidationException.FieldErrorDetail("mark1", "A Timbermark for A12345 does not exist in the system.")));

    assertThrows(
      FieldValidationException.class,
      () -> service.fetchDesignatedMarksExceptionReport(request, null));
    verifyNoInteractions(client);
  }

  @Test
  void fetchDesignatedMarksExceptionReportResponse_throwsBadRequestWhenRequestIsNull() {
    BadRequestException exception = assertThrows(
      BadRequestException.class,
      () -> service.fetchDesignatedMarksExceptionReport(null, null));
    assertEquals("Report request is required.", exception.getMessage());
  }

  @Test
  void fetchScalerRegisterReportResponse_usesAuthenticatedUsernameFirst() {
    byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
    doReturn("session-user").when(jwtService).getAuthenticatedUsername();
    ScalerRegisterReportRequest request = baseRequest();
    JasperServerClient.ReportPayload payload =
      new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
    when(client.fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request),
      eq("session-user"))).thenReturn(payload);
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");

    service.fetchScalerRegisterReport(request, "Bearer token");

    verify(client).fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request),
      eq("session-user"));
    verify(jwtService, never()).extractUserId(anyString());
    verify(jwtService, never()).extractSubject(anyString());
  }

  @Test
  void fetchScalerRegisterReportResponse_returnsNullWhenBearerTokenHasNoIdentityClaims() {
    byte[] bytes = "content".getBytes(StandardCharsets.UTF_8);
    doReturn(null).when(jwtService).getAuthenticatedUsername();
    doReturn(" ").when(jwtService).extractUserId("token");
    doReturn(null).when(jwtService).extractSubject("token");

    ScalerRegisterReportRequest request = baseRequest();
    JasperServerClient.ReportPayload payload =
      new JasperServerClient.ReportPayload(bytes, MediaType.APPLICATION_PDF);
    when(client.fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request),
      isNull())).thenReturn(payload);
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");

    service.fetchScalerRegisterReport(request, "Bearer token");

    verify(client).fetchReport(anyString(), eq(ReportDefinition.SCALER_REGISTER.getReportName()), same(request), isNull());
  }

  @Test
  void scaleSiteComplianceReport_buildParameters_emitsOnlyUserIdAndInspectionId() {
    ScaleSiteComplianceReportRequest request = new ScaleSiteComplianceReportRequest();
    request.setInspectionId(4567L);

    Map<String, String> params = request.buildParameters("user1");

    assertEquals(2, params.size());
    assertEquals("user1", params.get("P_USERID"));
    assertEquals("4567", params.get("P_INSPECTION_ID"));
  }

  @Test
  void reportDocument_equalsHashCodeAndToString_useContentSemanticsForByteArray() {
    byte[] contentA1 = "abc".getBytes(StandardCharsets.UTF_8);
    byte[] contentA2 = "abc".getBytes(StandardCharsets.UTF_8);

    ReportService.ReportDocument left = new ReportService.ReportDocument(contentA1, MediaType.APPLICATION_PDF);
    ReportService.ReportDocument right = new ReportService.ReportDocument(contentA2, MediaType.APPLICATION_PDF);

    assertEquals(left, right);
    assertEquals(left.hashCode(), right.hashCode());
    assertTrue(left.toString().contains("content=[97, 98, 99]"));
  }

  private static ReportCase[] reportCases() {
    return new ReportCase[] {
      new ReportCase(
        ReportDefinition.SCALER_REGISTER.getReportName(),
        ReportServiceTest::baseRequest,
        (svc, req) -> svc.fetchScalerRegisterReport((ScalerRegisterReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.SCALE_SITE_REGISTER.getReportName(),
        () -> simpleRequest(new ScaleSiteRegisterReportRequest()),
        (svc, req) -> svc.fetchScaleSiteRegisterReport((ScaleSiteRegisterReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.MARK_SITE_DESIGNATION.getReportName(),
        () -> simpleRequest(new MarkSiteDesignationReportRequest()),
        (svc, req) -> svc.fetchMarkSiteDesignationReport((MarkSiteDesignationReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.DESIGNATED_MARKS_EXCEPTION.getReportName(),
        () -> simpleRequest(new DesignatedMarksExceptionReportRequest()),
        (svc, req) -> svc.fetchDesignatedMarksExceptionReport((DesignatedMarksExceptionReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.SCALING_ADMINISTRATION.getReportName(),
        () -> simpleRequest(new ScalingAdministrationReportRequest()),
        (svc, req) -> svc.fetchScalingAdministrationReport((ScalingAdministrationReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.SCALING_EXCEPTION.getReportName(),
        () -> simpleRequest(new ScalingExceptionReportRequest()),
        (svc, req) -> svc.fetchScalingExceptionReport((ScalingExceptionReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.DISTRICT_CHECK_SCALE_PERFORMANCE.getReportName(),
        () -> districtRequest(true),
        (svc, req) -> svc.fetchDistrictCheckScalePerformanceReport((DistrictPerformanceReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.DISTRICT_SITE_INSPECTION_PERFORMANCE.getReportName(),
        () -> districtRequest(true),
        (svc, req) -> svc.fetchDistrictSiteInspectionPerformanceReport((DistrictPerformanceReportRequest) req, null)),
      new ReportCase(
        ReportDefinition.SCALE_SITE_COMPLIANCE.getReportName(),
        ReportServiceTest::complianceRequest,
        (svc, req) -> svc.fetchScaleSiteComplianceReport((ScaleSiteComplianceReportRequest) req, null))
    };
  }

  private static <T extends ReportRequest> T simpleRequest(T request) {
    request.setPreview(true);
    return request;
  }

  private static ScalerRegisterReportRequest baseRequest() {
    ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
    request.setRegDist("ALL");
    request.setLicenceStatus("A");
    request.setAuthStatus("ACTIVE");
    request.setAppointmentType("FS");
    request.setPrimarySort(SortOrder.NUMBER_1);
    request.setSecondarySort(SortOrder.NUMBER_0);
    request.setOutputFormat(OutputFormatEnum.PDF);
    request.setPreview(true);
    return request;
  }

  private static ScaleSiteComplianceReportRequest complianceRequest() {
    ScaleSiteComplianceReportRequest request = new ScaleSiteComplianceReportRequest();
    request.setInspectionId(123L);
    request.setPreview(true);
    return request;
  }

  private static MarkSiteDesignationReportRequest markSiteDesignationRequest(boolean preview) {
    MarkSiteDesignationReportRequest request = new MarkSiteDesignationReportRequest();
    request.setRegDist("ALL");
    request.setMarkOrSite("MARK");
    request.setOutputFormat(OutputFormatEnum.PDF);
    request.setPreview(preview);
    return request;
  }

  private void stubMarkSiteDesignationRender(MarkSiteDesignationReportRequest request) {
    JasperServerClient.ReportPayload payload = new JasperServerClient.ReportPayload(
      "content".getBytes(StandardCharsets.UTF_8), MediaType.APPLICATION_PDF);
    when(client.fetchReport(
      anyString(),
      eq(ReportDefinition.MARK_SITE_DESIGNATION.getReportName()),
      same(request),
      isNull())).thenReturn(payload);
    when(emailQueueService.buildFilename(anyString(), any())).thenReturn("report.pdf");
  }

  private static DistrictPerformanceReportRequest districtRequest(boolean preview) {
    DistrictPerformanceReportRequest request = new DistrictPerformanceReportRequest();
    request.setFromDate(LocalDate.of(2025, 1, 1));
    request.setToDate(LocalDate.of(2025, 1, 31));
    request.setPreview(preview);
    return request;
  }
}
