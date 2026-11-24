package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.exception.GlobalApiExceptionHandler;
import com.jayway.jsonpath.JsonPath;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import ca.bc.gov.nrs.scs.backend.service.JasperServerClient;
import ca.bc.gov.nrs.scs.backend.service.ReportEmailService;
import ca.bc.gov.nrs.scs.backend.service.ReportReferenceValidator;
import ca.bc.gov.nrs.scs.backend.service.ReportService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;

/**
 * The report endpoints' HTTP contract, end to end through the REAL controller and the REAL service (only Jasper,
 * email, the request and the JWT claims are stubbed): what a caller sees on the wire for a preview (200 inline
 * download) and for preview=false (202 acknowledgement), which user the render runs as, and that a rejected
 * request is a 400 that renders nothing.
 *
 * <p>Written as the safety net for moving HTTP response building and token parsing out of {@code ReportService}:
 * it asserts only observable behaviour, so it must pass unchanged before and after that move. {@code JWTService}
 * is a spy of the real class so the username rules are exercised wherever they live.
 */
class ReportHttpContractTest {

  private static final byte[] PDF = "pdf-bytes".getBytes(StandardCharsets.UTF_8);

  private record Endpoint(String path, String reportName, String previewBody) {
    String body(boolean preview) {
      return previewBody.replace("\"preview\":true", "\"preview\":" + preview);
    }
  }

  private static final List<Endpoint> ENDPOINTS = List.of(
      new Endpoint("/reports/scaler-register", "SCS_REP005.rpt",
          "{\"regDist\":\"ALL\",\"licenceStatus\":\"A\",\"authStatus\":\"ACTIVE\",\"appointmentType\":\"FS\","
              + "\"primarySort\":1,\"secondarySort\":0,\"outputFormat\":\"PDF\",\"preview\":true}"),
      new Endpoint("/reports/scale-site-register", "SCS_REP007.rpt",
          "{\"regDist\":\"ALL\",\"scaleType\":\"A\",\"siteStatus\":\"ACTIVE\",\"primarySort\":1,\"secondarySort\":0,"
              + "\"outputFormat\":\"PDF\",\"preview\":true}"),
      new Endpoint("/reports/mark-site-designation", "SCS_REP010.rpt",
          "{\"regDist\":\"ALL\",\"markOrSite\":\"MARK\",\"outputFormat\":\"PDF\",\"preview\":true}"),
      new Endpoint("/reports/designated-marks-exception", "SCS_REP002.rpt",
          "{\"markRegDist\":\"ALL\",\"siteRegDist\":\"ALL\",\"outputFormat\":\"PDF\",\"preview\":true}"),
      new Endpoint("/reports/scaling-administration", "SCS_REP015.rpt",
          "{\"regDist\":\"ALL\",\"outputFormat\":\"PDF\",\"preview\":true}"),
      new Endpoint("/reports/scaling-exception", "SCS_REP016.rpt",
          "{\"regDist\":\"ALL\",\"primarySort\":1,\"secondarySort\":0,\"outputFormat\":\"PDF\",\"preview\":true}"),
      new Endpoint("/reports/district-check-scale-performance", "SCS_REP025.rpt",
          "{\"regDist\":\"ALL\",\"fromDate\":\"2024-01-01\",\"toDate\":\"2024-12-31\",\"outputFormat\":\"PDF\","
              + "\"preview\":true}"),
      new Endpoint("/reports/district-site-inspection-performance", "SCS_REP026.rpt",
          "{\"regDist\":\"ALL\",\"fromDate\":\"2024-01-01\",\"toDate\":\"2024-12-31\",\"outputFormat\":\"PDF\","
              + "\"preview\":true}"),
      new Endpoint("/reports/scale-site-compliance", "SCS_REP014.rpt",
          "{\"inspectionId\":123,\"outputFormat\":\"PDF\",\"preview\":true}"));

  private JasperServerClient client;
  private ReportEmailService emailService;
  private JWTService jwtService;
  private NativeWebRequest webRequest;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    client = mock(JasperServerClient.class);
    emailService = mock(ReportEmailService.class);
    jwtService = spy(new JWTService());
    webRequest = mock(NativeWebRequest.class);
    ReportReferenceValidator referenceValidator = mock(ReportReferenceValidator.class);
    // Inline executor: the preview=false render runs before perform() returns, so its effects can be asserted.
    ReportService service = new ReportService(client, emailService, jwtService, Runnable::run, referenceValidator);
    mockMvc = MockMvcBuilders.standaloneSetup(new ReportController(service, webRequest))
        .setControllerAdvice(new GlobalApiExceptionHandler())
        .build();

    doReturn("auth-user").when(jwtService).getAuthenticatedUsername();
    when(client.fetchReport(anyString(), anyString(), any(), any()))
        .thenReturn(new JasperServerClient.ReportPayload(PDF, MediaType.APPLICATION_PDF));
    when(emailService.buildFilename(anyString(), any()))
        .thenAnswer(invocation -> invocation.getArgument(0) + ".pdf");
  }

  private String renderedRequestId(String reportName, String expectedUser) {
    ArgumentCaptor<String> id = ArgumentCaptor.forClass(String.class);
    verify(client).fetchReport(id.capture(), eq(reportName), any(), eq(expectedUser));
    return id.getValue();
  }

  @Test
  void preview_returnsAnInlineDownloadNamedForTheRenderedRequest() throws Exception {
    for (Endpoint endpoint : ENDPOINTS) {
      setUp();

      var result = mockMvc.perform(post(endpoint.path())
              .contentType(MediaType.APPLICATION_JSON)
              .content(endpoint.body(true)))
          .andExpect(status().isOk())
          .andExpect(content().contentType(MediaType.APPLICATION_PDF))
          .andExpect(content().bytes(PDF))
          .andReturn();

      String id = renderedRequestId(endpoint.reportName(), "auth-user");
      assertEquals("inline; filename=\"" + id + ".pdf\"",
          result.getResponse().getHeader(HttpHeaders.CONTENT_DISPOSITION), endpoint.path());
      verify(emailService).handleEmail(eq(id), any(), eq(PDF), eq(MediaType.APPLICATION_PDF));
    }
  }

  @Test
  void previewFalse_returnsAnAcceptedAckForTheQueuedRequest() throws Exception {
    for (Endpoint endpoint : ENDPOINTS) {
      setUp();

      var result = mockMvc.perform(post(endpoint.path())
              .contentType(MediaType.APPLICATION_JSON)
              .content(endpoint.body(false)))
          .andExpect(status().isAccepted())
          .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
          .andExpect(jsonPath("$.message").value("Report request received"))
          .andReturn();

      String id = renderedRequestId(endpoint.reportName(), "auth-user");
      String ackId = JsonPath.read(result.getResponse().getContentAsString(), "$.requestId");
      assertEquals(id, ackId, endpoint.path());
      verify(emailService).handleEmail(eq(id), any(), eq(PDF), eq(MediaType.APPLICATION_PDF));
    }
  }

  @Test
  void rendersAsTheBearerTokenUserWhenNoUserIsAuthenticated() throws Exception {
    doReturn(null).when(jwtService).getAuthenticatedUsername();
    when(webRequest.getHeader("Authorization")).thenReturn("Bearer the-token");
    doReturn("TOKEN-USER").when(jwtService).extractUserId("the-token");
    Endpoint endpoint = ENDPOINTS.get(0);

    mockMvc.perform(post(endpoint.path())
            .contentType(MediaType.APPLICATION_JSON)
            .content(endpoint.body(true)))
        .andExpect(status().isOk());

    renderedRequestId(endpoint.reportName(), "TOKEN-USER");
  }

  @Test
  void aRejectedRequestIsA400AndRendersNothing() throws Exception {
    // Mark Site Designation's paired date window: an Effective From with no Effective To is refused.
    mockMvc.perform(post("/reports/mark-site-designation")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"regDist\":\"ALL\",\"markOrSite\":\"MARK\",\"effectiveFrom\":\"2024-01-01\","
                + "\"outputFormat\":\"PDF\",\"preview\":false}"))
        // Which field failed is pinned at the service level (ReportServiceTest); this asserts the HTTP outcome.
        // (Standalone MockMvc lacks the app's configured ObjectMapper, so the error body is not asserted here.)
        .andExpect(status().isBadRequest());

    verify(client, never()).fetchReport(anyString(), anyString(), any(), any());
  }
}
