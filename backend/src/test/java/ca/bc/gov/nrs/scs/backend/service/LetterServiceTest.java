package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import static org.mockito.Mockito.mock;

import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.HaulingMarkAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleAdvisoryLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ReportDefinition;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ReportRequest;
import ca.bc.gov.nrs.scs.backend.repository.MarkSiteDesignationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;

@ExtendWith(MockitoExtension.class)
@DisplayName("LetterService tests")
class LetterServiceTest {

  @Mock private JasperServerClient client;
  @Mock private ReportEmailService emailService;
  @Mock private JWTService jwtService;
  @Mock private ScalerAuthorizationRepository scalerAuthorizationRepository;
  @Mock private ScaleSiteAuthorizationRepository scaleSiteAuthorizationRepository;
  @Mock private MarkSiteDesignationRepository markSiteDesignationRepository;

  @InjectMocks
  private LetterService service;

  // ── helpers ────────────────────────────────────────────────────────────────

  private ScalerAuthorizationLetterReportRequest scalerLetterRequest(boolean preview) {
    ScalerAuthorizationLetterReportRequest req = new ScalerAuthorizationLetterReportRequest();
    req.setRegDist("");
    req.setCcField("CC Test");
    req.setShowSignatureBlockInd("Y");
    req.setScaleSignatoryBlockId(44L);
    req.setOutputFormat(ScalerAuthorizationLetterReportRequest.OutputFormatEnum.PDF);
    req.setPreview(preview);
    return req;
  }

  private ScaleSiteAuthorizationLetterReportRequest siteLetterRequest(boolean preview) {
    ScaleSiteAuthorizationLetterReportRequest req = new ScaleSiteAuthorizationLetterReportRequest();
    req.setRegDist("");
    req.setCcField("");
    req.setShowSignatureBlockInd("Y");
    req.setScaleSignatoryBlockId(55L);
    req.setOutputFormat(ScaleSiteAuthorizationLetterReportRequest.OutputFormatEnum.PDF);
    req.setPreview(preview);
    return req;
  }

  private MarkSiteDesignationLetterReportRequest msdLetterRequest(boolean preview) {
    MarkSiteDesignationLetterReportRequest req = new MarkSiteDesignationLetterReportRequest();
    req.setRegDist("DCC");
    req.setCcField("CC Test");
    // The shared letter form always sends this indicator; the MSD report ignores it.
    req.setShowSignatureBlockInd("Y");
    req.setScaleSignatoryBlockId(42L);
    req.setOutputFormat(MarkSiteDesignationLetterReportRequest.OutputFormatEnum.PDF);
    req.setPreview(preview);
    return req;
  }

  private CheckScaleAdvisoryLetterReportRequest checkScaleLetterRequest(boolean preview) {
    CheckScaleAdvisoryLetterReportRequest req = new CheckScaleAdvisoryLetterReportRequest();
    req.setRegDist("");
    req.setCcField("CC Test");
    req.setScaleSignatoryBlockId(77L);
    req.setOutputFormat(CheckScaleAdvisoryLetterReportRequest.OutputFormatEnum.PDF);
    req.setPreview(preview);
    return req;
  }

  private void stubMsdFetchReport() {
    when(client.fetchReport(anyString(),
        eq(ReportDefinition.MARK_SITE_DESIGNATION_LETTER.getReportName()),
        any(ReportRequest.class), any()))
        .thenReturn(new JasperServerClient.ReportPayload(
            "pdf".getBytes(StandardCharsets.UTF_8), MediaType.APPLICATION_PDF));
  }

  private void stubScalerFetchReport(String reportName) {
    when(client.fetchReport(anyString(), eq(reportName), any(ReportRequest.class), any()))
        .thenReturn(new JasperServerClient.ReportPayload(
            "report".getBytes(StandardCharsets.UTF_8), MediaType.APPLICATION_PDF));
  }

  // ── createScalerAuthorizationLetter ────────────────────────────────────────

  @Test
  @DisplayName("passes CC text to Jasper using the legacy parameter name")
  void createScalerAuthorizationLetter_usesLegacyCcParameterName() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setOrgUnitNo(12L);
    detail.setLetterExists(false);

    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);
    stubScalerFetchReport(ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());

    service.createScalerAuthorizationLetter(7L, scalerLetterRequest(true));

    ArgumentCaptor<ReportRequest> captor = ArgumentCaptor.forClass(ReportRequest.class);
    verify(client).fetchReport(anyString(),
        eq(ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName()),
        captor.capture(), any());

    Map<String, String> params = captor.getValue().buildParameters("tester");
    assertNotNull(params);
    assertEquals("", params.get("P_ORG_UNIT_CODE"));
    assertEquals("CC Test", params.get("P_CC_Field"));
    assertEquals("Y", params.get("P_SHOW_SIGNATURE_BLOCK"));
    assertEquals("7", params.get("P_LETTER_ID"));
    assertEquals("44", params.get("P_SCALE_SIGNATORY_BLOCK_ID"));

    verify(scalerAuthorizationRepository).upsertScalerAuthorizationLetter(eq(7L), any(byte[].class));
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — letter already exists → 400")
  void createScalerAuthorizationLetter_letterAlreadyExists_throws400() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(true);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorizationLetter(7L, scalerLetterRequest(true)));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — authorization not found → 404")
  void createScalerAuthorizationLetter_notFound_throws404() {
    when(scalerAuthorizationRepository.getScalerAuthorization(99L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.createScalerAuthorizationLetter(99L, scalerLetterRequest(true)));
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — missing signature block → 400")
  void createScalerAuthorizationLetter_missingSignatureBlock_throws400() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

    ScalerAuthorizationLetterReportRequest req = scalerLetterRequest(true);
    req.setScaleSignatoryBlockId(null);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorizationLetter(7L, req));
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — non-preview returns 202 accepted")
  void createScalerAuthorizationLetter_nonPreview_returns202() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);
    stubScalerFetchReport(ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());

    ScalerAuthorizationLetterReportRequest req = scalerLetterRequest(false);
    req.setEmailRecipient("recipient@example.com");
    var response = service.createScalerAuthorizationLetter(7L, req);

    assertEquals(202, response.getStatusCode().value());
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — preview=No and blank email → 400 (shared validation)")
  void createScalerAuthorizationLetter_previewNoBlankEmail_throws400() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorizationLetter(7L, scalerLetterRequest(false)));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — malformed email → 400 (shared validation)")
  void createScalerAuthorizationLetter_malformedEmail_throws400() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

    for (String malformed : new String[] {
        "recipient", "recipient@", "@example.com", "recipient@example", "recipient@@example.com",
        "recipient@exam ple.com", "recipient@example..com", "recipient@.example.com",
        "recipient@example.com."}) {
      ScalerAuthorizationLetterReportRequest req = scalerLetterRequest(false);
      req.setEmailRecipient(malformed);
      assertThrows(BadRequestException.class,
          () -> service.createScalerAuthorizationLetter(7L, req), malformed);
    }
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createScalerAuthorizationLetter — email check is linear and stack-safe on adversarial input")
  void createScalerAuthorizationLetter_longDottedEmail_isRejectedQuickly() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

    // The kind of input that made the previous regex-based check backtrack polynomially (and that
    // would make a "(\\.label)+" regex recurse once per label): a very long run of dot-separated
    // labels that only fails at the very end.
    ScalerAuthorizationLetterReportRequest req = scalerLetterRequest(false);
    req.setEmailRecipient("recipient@" + "a.".repeat(200_000) + " ");

    long started = System.nanoTime();
    assertThrows(BadRequestException.class, () -> service.createScalerAuthorizationLetter(7L, req));
    assertTrue(System.nanoTime() - started < java.util.concurrent.TimeUnit.SECONDS.toNanos(2));
  }

  // ── viewScalerAuthorizationLetter ──────────────────────────────────────────

  @Test
  @DisplayName("viewScalerAuthorizationLetter — happy path returns 200 with the stored PDF")
  void viewScalerAuthorizationLetter_returnsInlinePdf() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(true);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);
    when(scalerAuthorizationRepository.getScalerAuthorizationLetter(7L))
        .thenReturn("pdf".getBytes(StandardCharsets.UTF_8));

    var response = service.viewScalerAuthorizationLetter(7L);

    assertEquals(200, response.getStatusCode().value());
  }

  @Test
  @DisplayName("viewScalerAuthorizationLetter — flagged as existing but no stored blob → 404")
  void viewScalerAuthorizationLetter_storedBlobMissing_throws404() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(true);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);
    when(scalerAuthorizationRepository.getScalerAuthorizationLetter(7L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewScalerAuthorizationLetter(7L));
  }

  @Test
  @DisplayName("viewScalerAuthorizationLetter — letter does not exist → 404")
  void viewScalerAuthorizationLetter_letterNotFound_throws404() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewScalerAuthorizationLetter(7L));
  }

  @Test
  @DisplayName("viewScalerAuthorizationLetter — authorization not found → 404")
  void viewScalerAuthorizationLetter_authNotFound_throws404() {
    when(scalerAuthorizationRepository.getScalerAuthorization(99L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewScalerAuthorizationLetter(99L));
  }

  // ── createScaleSiteAuthorizationLetter ─────────────────────────────────────

  @Test
  @DisplayName("createScaleSiteAuthorizationLetter — happy path writes letter and returns 200 preview")
  void createScaleSiteAuthorizationLetter_happyPath() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setLetterExists(false);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);
    when(client.fetchReport(anyString(),
        eq(ReportDefinition.SCALE_SITE_AUTHORIZATION_LETTER.getReportName()),
        any(ReportRequest.class), any()))
        .thenReturn(new JasperServerClient.ReportPayload(
            "pdf".getBytes(StandardCharsets.UTF_8), MediaType.APPLICATION_PDF));

    var response = service.createScaleSiteAuthorizationLetter(5L, siteLetterRequest(true));

    assertEquals(200, response.getStatusCode().value());
    verify(scaleSiteAuthorizationRepository)
        .upsertScaleSiteAuthorizationLetter(eq(5L), any(byte[].class));
  }

  @Test
  @DisplayName("createScaleSiteAuthorizationLetter — letter already exists → 400")
  void createScaleSiteAuthorizationLetter_letterAlreadyExists_throws400() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setLetterExists(true);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorizationLetter(5L, siteLetterRequest(true)));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createScaleSiteAuthorizationLetter — authorization not found → 404")
  void createScaleSiteAuthorizationLetter_notFound_throws404() {
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(99L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.createScaleSiteAuthorizationLetter(99L, siteLetterRequest(true)));
  }

  @Test
  @DisplayName("createScaleSiteAuthorizationLetter — non-preview returns 202 accepted")
  void createScaleSiteAuthorizationLetter_nonPreview_returns202() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setLetterExists(false);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);
    when(client.fetchReport(anyString(),
        eq(ReportDefinition.SCALE_SITE_AUTHORIZATION_LETTER.getReportName()),
        any(ReportRequest.class), any()))
        .thenReturn(new JasperServerClient.ReportPayload(
            "pdf".getBytes(StandardCharsets.UTF_8), MediaType.APPLICATION_PDF));

    ScaleSiteAuthorizationLetterReportRequest req = siteLetterRequest(false);
    req.setEmailRecipient("recipient@example.com");
    var response = service.createScaleSiteAuthorizationLetter(5L, req);

    assertEquals(202, response.getStatusCode().value());
  }

  // ── viewScaleSiteAuthorizationLetter ───────────────────────────────────────

  @Test
  @DisplayName("viewScaleSiteAuthorizationLetter — happy path returns stored PDF inline")
  void viewScaleSiteAuthorizationLetter_returnsStoredPdf() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setLetterExists(true);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorizationLetter(5L))
        .thenReturn("pdf".getBytes(StandardCharsets.UTF_8));

    var response = service.viewScaleSiteAuthorizationLetter(5L);

    assertEquals(200, response.getStatusCode().value());
  }

  @Test
  @DisplayName("viewScaleSiteAuthorizationLetter — letter does not exist → 404")
  void viewScaleSiteAuthorizationLetter_letterNotFound_throws404() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setLetterExists(false);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewScaleSiteAuthorizationLetter(5L));
  }

  @Test
  @DisplayName("viewScaleSiteAuthorizationLetter — authorization not found → 404")
  void viewScaleSiteAuthorizationLetter_authNotFound_throws404() {
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(99L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewScaleSiteAuthorizationLetter(99L));
  }

  @Test
  @DisplayName("viewScaleSiteAuthorizationLetter — blob is empty → 404")
  void viewScaleSiteAuthorizationLetter_emptyBlob_throws404() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setLetterExists(true);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);
    when(scaleSiteAuthorizationRepository.getScaleSiteAuthorizationLetter(5L))
        .thenReturn(new byte[0]);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewScaleSiteAuthorizationLetter(5L));
  }

  // ── createMarkSiteDesignationLetter ────────────────────────────────────────

  @Test
  @DisplayName("createMarkSiteDesignationLetter — happy path writes letter and returns 200 preview")
  void createMarkSiteDesignationLetter_happyPath() {
    when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(8L))
        .thenReturn(mock(HaulingMarkAuthorizationDetail.class));
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(false);
    stubMsdFetchReport();

    var response = service.createMarkSiteDesignationLetter(8L, msdLetterRequest(true));

    assertEquals(200, response.getStatusCode().value());
    verify(markSiteDesignationRepository).upsertMarkSiteDesignationLetter(eq(8L), any(byte[].class));
  }

  @Test
  @DisplayName("createMarkSiteDesignationLetter — omits P_SHOW_SIGNATURE_BLOCK from the Jasper request")
  void createMarkSiteDesignationLetter_omitsSignatureBlockParameter() {
    when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(8L))
        .thenReturn(mock(HaulingMarkAuthorizationDetail.class));
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(false);
    stubMsdFetchReport();

    service.createMarkSiteDesignationLetter(8L, msdLetterRequest(true));

    ArgumentCaptor<ReportRequest> captor = ArgumentCaptor.forClass(ReportRequest.class);
    verify(client).fetchReport(anyString(),
        eq(ReportDefinition.MARK_SITE_DESIGNATION_LETTER.getReportName()),
        captor.capture(), any());

    Map<String, String> params = captor.getValue().buildParameters("tester");
    assertEquals("DCC", params.get("P_ORG_UNIT_CODE"));
    assertEquals("CC Test", params.get("P_CC_Field"));
    assertEquals("8", params.get("P_LETTER_ID"));
    assertEquals("42", params.get("P_SCALE_SIGNATORY_BLOCK_ID"));
    assertFalse(params.containsKey("P_SHOW_SIGNATURE_BLOCK"));
  }

  @Test
  @DisplayName("createMarkSiteDesignationLetter — letter already exists → 400")
  void createMarkSiteDesignationLetter_letterAlreadyExists_throws400() {
    when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(8L))
        .thenReturn(mock(HaulingMarkAuthorizationDetail.class));
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(true);

    assertThrows(BadRequestException.class,
        () -> service.createMarkSiteDesignationLetter(8L, msdLetterRequest(true)));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createMarkSiteDesignationLetter — authorization not found → 404")
  void createMarkSiteDesignationLetter_notFound_throws404() {
    when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(99L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.createMarkSiteDesignationLetter(99L, msdLetterRequest(true)));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createMarkSiteDesignationLetter — missing signature block → 400")
  void createMarkSiteDesignationLetter_missingSignatureBlock_throws400() {
    when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(8L))
        .thenReturn(mock(HaulingMarkAuthorizationDetail.class));
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(false);

    MarkSiteDesignationLetterReportRequest req = msdLetterRequest(true);
    req.setScaleSignatoryBlockId(null);

    assertThrows(BadRequestException.class,
        () -> service.createMarkSiteDesignationLetter(8L, req));
  }

  @Test
  @DisplayName("createMarkSiteDesignationLetter — non-preview returns 202 accepted")
  void createMarkSiteDesignationLetter_nonPreview_returns202() {
    when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(8L))
        .thenReturn(mock(HaulingMarkAuthorizationDetail.class));
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(false);
    stubMsdFetchReport();

    MarkSiteDesignationLetterReportRequest req = msdLetterRequest(false);
    req.setEmailRecipient("recipient@example.com");
    var response = service.createMarkSiteDesignationLetter(8L, req);

    assertEquals(202, response.getStatusCode().value());
  }

  // ── viewMarkSiteDesignationLetter ──────────────────────────────────────────

  @Test
  @DisplayName("viewMarkSiteDesignationLetter — happy path returns stored PDF inline")
  void viewMarkSiteDesignationLetter_returnsStoredPdf() {
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(true);
    when(markSiteDesignationRepository.getMarkSiteDesignationLetter(8L))
        .thenReturn("pdf".getBytes(StandardCharsets.UTF_8));

    var response = service.viewMarkSiteDesignationLetter(8L);

    assertEquals(200, response.getStatusCode().value());
  }

  @Test
  @DisplayName("viewMarkSiteDesignationLetter — letter does not exist → 404")
  void viewMarkSiteDesignationLetter_letterNotFound_throws404() {
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(false);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewMarkSiteDesignationLetter(8L));
  }

  @Test
  @DisplayName("viewMarkSiteDesignationLetter — blob is empty → 404")
  void viewMarkSiteDesignationLetter_emptyBlob_throws404() {
    when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(true);
    when(markSiteDesignationRepository.getMarkSiteDesignationLetter(8L)).thenReturn(new byte[0]);

    assertThrows(ResourceNotFoundException.class,
        () -> service.viewMarkSiteDesignationLetter(8L));
  }

  // ── output-format mapping ──────────────────────────────────────────────────

  @Test
  @DisplayName("XLS output format is passed through to Jasper correctly")
  void createScalerAuthorizationLetter_xlsOutputFormat_resolvedToXls() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setLetterExists(false);
    when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);
    stubScalerFetchReport(ReportDefinition.SCALER_AUTHORIZATION_LETTER.getReportName());

    ScalerAuthorizationLetterReportRequest req = scalerLetterRequest(true);
    req.setOutputFormat(ScalerAuthorizationLetterReportRequest.OutputFormatEnum.XLS);

    assertDoesNotThrow(() -> service.createScalerAuthorizationLetter(7L, req));

    ArgumentCaptor<ReportRequest> captor = ArgumentCaptor.forClass(ReportRequest.class);
    verify(client).fetchReport(anyString(), any(), captor.capture(), any());
    assertEquals(ca.bc.gov.nrs.scs.backend.model.report.OutputFormatEnum.XLS,
        captor.getValue().getOutputFormat());
  }

  // ── createCheckScaleAdvisoryLetter (R004 — no-persist) ─────────────────────

  @Test
  @DisplayName("createCheckScaleAdvisoryLetter — preview: 200, correct params, no P_SHOW_SIGNATURE_BLOCK, never persisted")
  void createCheckScaleAdvisoryLetter_preview_returns200_correctParams_noPersist() {
    stubScalerFetchReport(ReportDefinition.CHECK_SCALE_ADVISORY_LETTER.getReportName());

    var response = service.createCheckScaleAdvisoryLetter(123L, checkScaleLetterRequest(true));

    assertEquals(200, response.getStatusCode().value());

    ArgumentCaptor<ReportRequest> captor = ArgumentCaptor.forClass(ReportRequest.class);
    verify(client).fetchReport(anyString(),
        eq(ReportDefinition.CHECK_SCALE_ADVISORY_LETTER.getReportName()), captor.capture(), any());
    Map<String, String> params = captor.getValue().buildParameters("tester");
    assertEquals("CC Test", params.get("P_CC_Field"));
    assertEquals("123", params.get("P_LETTER_ID"));
    assertEquals("77", params.get("P_SCALE_SIGNATORY_BLOCK_ID"));
    assertFalse(params.containsKey("P_SHOW_SIGNATURE_BLOCK"));

    verifyNoInteractions(
        scalerAuthorizationRepository, scaleSiteAuthorizationRepository, markSiteDesignationRepository);
  }

  @Test
  @DisplayName("createCheckScaleAdvisoryLetter — non-preview with valid email returns 202")
  void createCheckScaleAdvisoryLetter_nonPreviewWithEmail_returns202() {
    stubScalerFetchReport(ReportDefinition.CHECK_SCALE_ADVISORY_LETTER.getReportName());
    CheckScaleAdvisoryLetterReportRequest req = checkScaleLetterRequest(false);
    req.setEmailRecipient("scaler@example.com");

    var response = service.createCheckScaleAdvisoryLetter(123L, req);

    assertEquals(202, response.getStatusCode().value());
  }

  @Test
  @DisplayName("createCheckScaleAdvisoryLetter — preview=No and blank email → 400, no report generated")
  void createCheckScaleAdvisoryLetter_previewNoBlankEmail_throws400() {
    CheckScaleAdvisoryLetterReportRequest req = checkScaleLetterRequest(false);
    req.setEmailRecipient(null);

    assertThrows(BadRequestException.class,
        () -> service.createCheckScaleAdvisoryLetter(123L, req));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createCheckScaleAdvisoryLetter — malformed email → 400, no report generated")
  void createCheckScaleAdvisoryLetter_invalidEmail_throws400() {
    CheckScaleAdvisoryLetterReportRequest req = checkScaleLetterRequest(true);
    req.setEmailRecipient("not-an-email");

    assertThrows(BadRequestException.class,
        () -> service.createCheckScaleAdvisoryLetter(123L, req));
    verify(client, never()).fetchReport(any(), any(), any(), any());
  }

  @Test
  @DisplayName("createCheckScaleAdvisoryLetter — empty signatory is a non-error path (UC-RPT-002-S05)")
  void createCheckScaleAdvisoryLetter_nullSignatory_stillGenerates() {
    stubScalerFetchReport(ReportDefinition.CHECK_SCALE_ADVISORY_LETTER.getReportName());
    CheckScaleAdvisoryLetterReportRequest req = checkScaleLetterRequest(true);
    req.setScaleSignatoryBlockId(null);

    var response = service.createCheckScaleAdvisoryLetter(123L, req);

    assertEquals(200, response.getStatusCode().value());
    ArgumentCaptor<ReportRequest> captor = ArgumentCaptor.forClass(ReportRequest.class);
    verify(client).fetchReport(anyString(),
        eq(ReportDefinition.CHECK_SCALE_ADVISORY_LETTER.getReportName()), captor.capture(), any());
    assertEquals("", captor.getValue().buildParameters("tester").get("P_SCALE_SIGNATORY_BLOCK_ID"));
  }

  // ── non-positive signatory ids (nr-scs #286 follow-up) ─────────────────────
  // "Nothing selected" once reached the backend as 0 (Number('')), which passed the null check and
  // produced a letter with no signatory. A signature block id is a positive sequence value, so
  // 0 or a negative id is rejected on every letter, the advisory letter included. (Loops rather
  // than @ParameterizedTest: junit-jupiter-params is not on the test classpath.)

  private static final long[] NON_POSITIVE_IDS = {0L, -1L};

  @Test
  @DisplayName("createScalerAuthorizationLetter — non-positive signature block → 400, nothing generated")
  void createScalerAuthorizationLetter_nonPositiveSignatureBlock_throws400() {
    for (long id : NON_POSITIVE_IDS) {
      ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
      detail.setLetterExists(false);
      when(scalerAuthorizationRepository.getScalerAuthorization(7L)).thenReturn(detail);

      ScalerAuthorizationLetterReportRequest req = scalerLetterRequest(true);
      req.setScaleSignatoryBlockId(id);

      BadRequestException ex = assertThrows(BadRequestException.class,
          () -> service.createScalerAuthorizationLetter(7L, req));
      assertEquals("Signature block is required.", ex.getMessage());
      verify(client, never()).fetchReport(any(), any(), any(), any());
      verify(scalerAuthorizationRepository, never()).upsertScalerAuthorizationLetter(any(), any());
    }
  }

  @Test
  @DisplayName("createScaleSiteAuthorizationLetter — non-positive signature block → 400, nothing generated")
  void createScaleSiteAuthorizationLetter_nonPositiveSignatureBlock_throws400() {
    for (long id : NON_POSITIVE_IDS) {
      ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
      detail.setLetterExists(false);
      when(scaleSiteAuthorizationRepository.getScaleSiteAuthorization(5L)).thenReturn(detail);

      ScaleSiteAuthorizationLetterReportRequest req = siteLetterRequest(true);
      req.setScaleSignatoryBlockId(id);

      BadRequestException ex = assertThrows(BadRequestException.class,
          () -> service.createScaleSiteAuthorizationLetter(5L, req));
      assertEquals("Signature block is required.", ex.getMessage());
      verify(client, never()).fetchReport(any(), any(), any(), any());
      verify(scaleSiteAuthorizationRepository, never()).upsertScaleSiteAuthorizationLetter(any(), any());
    }
  }

  @Test
  @DisplayName("createMarkSiteDesignationLetter — non-positive signature block → 400, nothing generated")
  void createMarkSiteDesignationLetter_nonPositiveSignatureBlock_throws400() {
    for (long id : NON_POSITIVE_IDS) {
      when(markSiteDesignationRepository.getMarkSiteAuthorizationDetail(8L))
          .thenReturn(mock(HaulingMarkAuthorizationDetail.class));
      when(markSiteDesignationRepository.getMarkSiteDesignationLetterExists(8L)).thenReturn(false);

      MarkSiteDesignationLetterReportRequest req = msdLetterRequest(true);
      req.setScaleSignatoryBlockId(id);

      BadRequestException ex = assertThrows(BadRequestException.class,
          () -> service.createMarkSiteDesignationLetter(8L, req));
      assertEquals("Signature block is required.", ex.getMessage());
      verify(client, never()).fetchReport(any(), any(), any(), any());
      verify(markSiteDesignationRepository, never()).upsertMarkSiteDesignationLetter(any(), any());
    }
  }

  @Test
  @DisplayName("createCheckScaleAdvisoryLetter — non-positive signature block → 400 (null stays allowed)")
  void createCheckScaleAdvisoryLetter_nonPositiveSignatureBlock_throws400() {
    for (long id : NON_POSITIVE_IDS) {
      CheckScaleAdvisoryLetterReportRequest req = checkScaleLetterRequest(true);
      req.setScaleSignatoryBlockId(id);

      BadRequestException ex = assertThrows(BadRequestException.class,
          () -> service.createCheckScaleAdvisoryLetter(123L, req));
      assertEquals("Signature block is required.", ex.getMessage());
      verify(client, never()).fetchReport(any(), any(), any(), any());
    }
  }
}
