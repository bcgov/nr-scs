package ca.bc.gov.nrs.scs.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.model.report.DesignatedMarksExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.DistrictPerformanceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.MarkSiteDesignationReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScaleSiteComplianceReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScaleSiteRegisterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalerRegisterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingAdministrationReportRequest;
import ca.bc.gov.nrs.scs.backend.model.report.ScalingExceptionReportRequest;
import ca.bc.gov.nrs.scs.backend.service.ReportService;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.request.NativeWebRequest;

class ReportControllerTest {

  private ReportService service;
  private NativeWebRequest request;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    service = org.mockito.Mockito.mock(ReportService.class);
    request = org.mockito.Mockito.mock(NativeWebRequest.class);
    mockMvc = MockMvcBuilders.standaloneSetup(new ReportController(service, request)).build();
  }

  @Test
  void fetchScalerRegisterReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("scaler-register-test.pdf");

    when(service.fetchScalerRegisterReport(
      any(ScalerRegisterReportRequest.class),
      eq("Bearer token")))
      .thenReturn(response);

    String body = "{" +
        "\"regDist\":\"ALL\"," +
        "\"licenceStatus\":\"A\"," +
        "\"authStatus\":\"ACTIVE\"," +
        "\"appointmentType\":\"FS\"," +
        "\"primarySort\":1," +
        "\"secondarySort\":0," +
        "\"outputFormat\":\"PDF\"," +
        "\"preview\":true" +
        "}";

    assertReportResponse("/reports/scaler-register", body, "scaler-register-test.pdf");

    verify(service).fetchScalerRegisterReport(any(ScalerRegisterReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchScaleSiteRegisterReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("scale-site-register-test.pdf");

    when(service.fetchScaleSiteRegisterReport(
      any(ScaleSiteRegisterReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"regDist\":\"ALL\"," +
      "\"scaleType\":\"A\"," +
      "\"siteStatus\":\"ACTIVE\"," +
      "\"primarySort\":1," +
      "\"secondarySort\":0," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/scale-site-register", body, "scale-site-register-test.pdf");

    verify(service).fetchScaleSiteRegisterReport(any(ScaleSiteRegisterReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchMarkSiteDesignationReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("mark-site-designation-test.pdf");

    when(service.fetchMarkSiteDesignationReport(
        any(MarkSiteDesignationReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"regDist\":\"ALL\"," +
      "\"markOrSite\":\"MARK\"," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/mark-site-designation", body, "mark-site-designation-test.pdf");

    verify(service).fetchMarkSiteDesignationReport(any(MarkSiteDesignationReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchDesignatedMarksExceptionReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("designated-marks-exception-test.pdf");

    when(service.fetchDesignatedMarksExceptionReport(
        any(DesignatedMarksExceptionReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"markRegDist\":\"ALL\"," +
      "\"siteRegDist\":\"ALL\"," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/designated-marks-exception", body, "designated-marks-exception-test.pdf");

    verify(service).fetchDesignatedMarksExceptionReport(any(DesignatedMarksExceptionReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchScalingAdministrationReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("scaling-administration-test.pdf");

    when(service.fetchScalingAdministrationReport(
        any(ScalingAdministrationReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"regDist\":\"ALL\"," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/scaling-administration", body, "scaling-administration-test.pdf");

    verify(service).fetchScalingAdministrationReport(any(ScalingAdministrationReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchScalingExceptionReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("scaling-exception-test.pdf");

    when(service.fetchScalingExceptionReport(
        any(ScalingExceptionReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"regDist\":\"ALL\"," +
      "\"primarySort\":1," +
      "\"secondarySort\":0," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/scaling-exception", body, "scaling-exception-test.pdf");

    verify(service).fetchScalingExceptionReport(any(ScalingExceptionReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchDistrictCheckScalePerformanceReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("district-check-scale-performance-test.pdf");

    when(service.fetchDistrictCheckScalePerformanceReport(
      any(DistrictPerformanceReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"regDist\":\"ALL\"," +
      "\"fromDate\":\"2024-01-01\"," +
      "\"toDate\":\"2024-12-31\"," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/district-check-scale-performance", body,
      "district-check-scale-performance-test.pdf");

    verify(service).fetchDistrictCheckScalePerformanceReport(
      any(DistrictPerformanceReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchDistrictSiteInspectionPerformanceReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("district-site-inspection-performance-test.pdf");

    when(service.fetchDistrictSiteInspectionPerformanceReport(
      any(DistrictPerformanceReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"regDist\":\"ALL\"," +
      "\"fromDate\":\"2024-01-01\"," +
      "\"toDate\":\"2024-12-31\"," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/district-site-inspection-performance", body,
      "district-site-inspection-performance-test.pdf");

    verify(service).fetchDistrictSiteInspectionPerformanceReport(
      any(DistrictPerformanceReportRequest.class), eq("Bearer token"));
  }

  @Test
  void fetchScaleSiteComplianceReport_returnsResponseFromService() throws Exception {
    ReportService.ReportOutcome response = rendered("scale-site-compliance-test.pdf");

    when(service.fetchScaleSiteComplianceReport(
        any(ScaleSiteComplianceReportRequest.class),
        eq("Bearer token")))
        .thenReturn(response);

    String body = "{" +
      "\"inspectionId\":123," +
      "\"outputFormat\":\"PDF\"," +
      "\"preview\":true" +
      "}";

    assertReportResponse("/reports/scale-site-compliance", body, "scale-site-compliance-test.pdf");

    verify(service).fetchScaleSiteComplianceReport(any(ScaleSiteComplianceReportRequest.class), eq("Bearer token"));
  }

  private void assertReportResponse(String path, String body, String filename)
      throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Bearer token");

    byte[] bytes = "pdf".getBytes(StandardCharsets.UTF_8);

    mockMvc.perform(post(path)
            .contentType(MediaType.APPLICATION_JSON)
            .accept(MediaType.APPLICATION_PDF)
            .content(body))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\""))
        .andExpect(content().contentType(MediaType.APPLICATION_PDF))
        .andExpect(content().bytes(bytes));
  }

  /** What the service hands back for a preview; the controller turns it into the inline download. */
  private ReportService.ReportOutcome rendered(String filename) {
    byte[] bytes = "pdf".getBytes(StandardCharsets.UTF_8);
    return new ReportService.Rendered(
        "req-1", new ReportService.ReportDocument(bytes, MediaType.APPLICATION_PDF), filename);
  }
}
