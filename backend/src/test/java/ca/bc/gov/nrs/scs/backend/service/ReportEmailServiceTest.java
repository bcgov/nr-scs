package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.report.ScalerRegisterReportRequest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

class ReportEmailServiceTest {

  @Test
  void handleEmail_returnsFalseWhenRecipientMissing() {
    RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
    ReportEmailService service = buildService(restTemplate, true, "http://host", "http://login");

    ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
    request.setEmailRecipient(" ");

    boolean sent = service.handleEmail("rid", request, "payload".getBytes(), MediaType.APPLICATION_PDF);

    assertFalse(sent);
    verify(restTemplate, never()).postForEntity(any(String.class), any(), eq(Map.class));
    verify(restTemplate, never()).postForEntity(any(String.class), any(), eq(String.class));
  }

  @Test
  void handleEmail_returnsFalseWhenEmailIsDisabled() {
    RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
    ReportEmailService service = buildService(restTemplate, false, "http://host", "http://login");

    ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
    request.setEmailRecipient("to@example.com");

    boolean sent = service.handleEmail("rid", request, "payload".getBytes(), MediaType.APPLICATION_PDF);

    assertFalse(sent);
    verify(restTemplate, never()).postForEntity(any(String.class), any(), eq(Map.class));
    verify(restTemplate, never()).postForEntity(any(String.class), any(), eq(String.class));
  }

  @Test
  void handleEmail_returnsTrueWhenSendSucceeds() {
    RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
    ReportEmailService service = buildService(restTemplate, true, "http://host", "http://login");

    when(restTemplate.postForEntity(eq("http://login"), any(), eq(Map.class)))
      .thenReturn(ResponseEntity.ok(Map.of("access_token", "token-1")));
    when(restTemplate.postForEntity(eq("http://host"), any(), eq(String.class)))
      .thenReturn(ResponseEntity.ok("ok"));

    ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
    request.setEmailRecipient("to@example.com");

    boolean sent = service.handleEmail("rid", request, "payload".getBytes(), MediaType.APPLICATION_PDF);

    assertTrue(sent);
    verify(restTemplate).postForEntity(eq("http://login"), any(), eq(Map.class));
    verify(restTemplate).postForEntity(eq("http://host"), any(), eq(String.class));
  }

  @Test
  void handleEmail_returnsFalseWhenAccessTokenIsMissing() {
	RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
	ReportEmailService service = buildService(restTemplate, true, "http://host", "http://login");

	when(restTemplate.postForEntity(eq("http://login"), any(), eq(Map.class)))
	  .thenReturn(ResponseEntity.ok(Map.of("other", "value")));

	ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
	request.setEmailRecipient("to@example.com");

	boolean sent = service.handleEmail("rid", request, "payload".getBytes(), MediaType.APPLICATION_PDF);

	assertFalse(sent);
	verify(restTemplate).postForEntity(eq("http://login"), any(), eq(Map.class));
  }

  @Test
  void handleEmail_returnsFalseWhenMailHostMissing() {
	RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
	ReportEmailService service = buildService(restTemplate, true, "", "http://login");

	ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
	request.setEmailRecipient("to@example.com");

	boolean sent = service.handleEmail("rid", request, "payload".getBytes(), MediaType.APPLICATION_PDF);

	assertFalse(sent);
  }

  @Test
  void buildFilename_returnsPdfAndXlsExtensions() {
	RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
	ReportEmailService service = buildService(restTemplate, true, "http://host", "http://login");

	assertEquals("abc.pdf", service.buildFilename("abc", MediaType.APPLICATION_PDF));
	assertEquals("abc.xls", service.buildFilename("abc", MediaType.APPLICATION_OCTET_STREAM));
  }

  @Test
  void handleEmail_returnsFalseWhenLoginResponseBodyIsNull() {
    RestTemplate restTemplate = org.mockito.Mockito.mock(RestTemplate.class);
    ReportEmailService service = buildService(restTemplate, true, "http://host", "http://login");

    when(restTemplate.postForEntity(eq("http://login"), any(), eq(Map.class)))
        .thenReturn(ResponseEntity.ok().build());

    ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
    request.setEmailRecipient("to@example.com");

    boolean sent = service.handleEmail("rid", request, "payload".getBytes(), MediaType.APPLICATION_PDF);

    assertFalse(sent);
    verify(restTemplate).postForEntity(eq("http://login"), any(), eq(Map.class));
    verify(restTemplate, never()).postForEntity(eq("http://host"), any(), eq(String.class));
  }

  private ReportEmailService buildService(
	  RestTemplate restTemplate,
	  boolean enabled,
	  String host,
	  String login) {
	return new ReportEmailService(
	  restTemplate,
	  enabled,
	  host,
	  login,
	  "user",
	  "pass",
	  "scope",
	  "noreply@example.com",
	  3,
	  10);
  }
}
