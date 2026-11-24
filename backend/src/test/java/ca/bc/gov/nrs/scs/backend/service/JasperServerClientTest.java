package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import ca.bc.gov.nrs.scs.backend.exception.ReportGenerationException;
import ca.bc.gov.nrs.scs.backend.model.report.OutputFormatEnum;
import ca.bc.gov.nrs.scs.backend.model.report.ScalerRegisterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.SortOrder;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;

class JasperServerClientTest {

  @Test
  void fetchReport_throwsWhenConfigIsIncomplete() {
    JasperServerClient client = new JasperServerClient("", "http://fetch", "user", "pass");

    assertThrows(
      ReportGenerationException.class,
      () -> client.fetchReport("rid", "report", baseRequest(OutputFormatEnum.PDF), "requester"));
  }

  @Test
  void fetchReport_throwsWhenReportNameIsBlank() {
    JasperServerClient client = new JasperServerClient("http://login", "http://fetch", "user", "pass");

    assertThrows(
      ReportGenerationException.class,
      () -> client.fetchReport("rid", " ", baseRequest(OutputFormatEnum.PDF), "requester"));
  }

  @Test
  @SuppressWarnings({"rawtypes", "unchecked"})
  void fetchReport_returnsPdfAndSendsCookieAuthAndQuery() throws Exception {
    JasperServerClient client = new JasperServerClient("http://login", "http://fetch", "user", "pass");
    HttpClient httpClient = mock(HttpClient.class);
    ReflectionTestUtils.setField(client, "httpClient", httpClient);

    HttpResponse<String> loginResponse = mock(HttpResponse.class);
    doReturn(200).when(loginResponse).statusCode();
    doReturn(HttpHeaders.of(Map.of("set-cookie", List.of("JSESSIONID=abc; Path=/", "XSRF=token; Path=/")), (a, b) -> true))
      .when(loginResponse)
      .headers();

    HttpResponse<byte[]> fetchResponse = mock(HttpResponse.class);
    byte[] reportBytes = "pdf-bytes".getBytes();
    doReturn(200).when(fetchResponse).statusCode();
    doReturn(reportBytes).when(fetchResponse).body();

    doReturn(loginResponse, fetchResponse)
      .when(httpClient)
      .send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));

    JasperServerClient.ReportPayload payload =
      client.fetchReport("req-1", "scaler-register", baseRequest(OutputFormatEnum.PDF), "requester");

    assertEquals(MediaType.APPLICATION_PDF, payload.mediaType());
    assertArrayEquals(reportBytes, payload.content());

    ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
    verify(httpClient, times(2)).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));

    HttpRequest loginRequest = requestCaptor.getAllValues().getFirst();
    assertEquals("http://login", loginRequest.uri().toString());
    assertEquals("POST", loginRequest.method());

    HttpRequest fetchRequest = requestCaptor.getAllValues().get(1);
    assertEquals("GET", fetchRequest.method());
    assertEquals("application/pdf", fetchRequest.headers().firstValue("Accept").orElse(""));
    assertTrue(fetchRequest.headers().firstValue("Authorization").orElse("").startsWith("Basic "));
    assertEquals("JSESSIONID=abc; XSRF=token", fetchRequest.headers().firstValue("Cookie").orElse(""));
    assertTrue(fetchRequest.uri().toString().contains("P_USERID=requester"));
  }

  @Test
  @SuppressWarnings({"rawtypes", "unchecked"})
  void fetchReport_throwsWhenLoginFails() throws Exception {
    JasperServerClient client = new JasperServerClient("http://login", "http://fetch", "user", "pass");
    HttpClient httpClient = mock(HttpClient.class);
    ReflectionTestUtils.setField(client, "httpClient", httpClient);

    HttpResponse<String> loginResponse = mock(HttpResponse.class);
    doReturn(401).when(loginResponse).statusCode();
    doReturn(HttpHeaders.of(Map.of(), (a, b) -> true)).when(loginResponse).headers();

    doReturn(loginResponse)
      .when(httpClient)
      .send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));

    assertThrows(
      ReportGenerationException.class,
      () -> client.fetchReport("req-1", "scaler-register", baseRequest(OutputFormatEnum.PDF), "requester"));
  }

  @Test
  @SuppressWarnings({"rawtypes", "unchecked"})
  void fetchReport_throwsWhenFetchReturnsNon2xx() throws Exception {
    JasperServerClient client = new JasperServerClient("http://login", "http://fetch", "user", "pass");
    HttpClient httpClient = mock(HttpClient.class);
    ReflectionTestUtils.setField(client, "httpClient", httpClient);

    HttpResponse<String> loginResponse = mock(HttpResponse.class);
    doReturn(200).when(loginResponse).statusCode();
    doReturn(HttpHeaders.of(Map.of("set-cookie", List.of("JSESSIONID=abc; Path=/")), (a, b) -> true))
      .when(loginResponse)
      .headers();

    HttpResponse<byte[]> fetchResponse = mock(HttpResponse.class);
    doReturn(500).when(fetchResponse).statusCode();
    doReturn("failed".getBytes()).when(fetchResponse).body();

    doReturn(loginResponse, fetchResponse)
      .when(httpClient)
      .send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));

    assertThrows(
      ReportGenerationException.class,
      () -> client.fetchReport("req-1", "scaler-register", baseRequest(OutputFormatEnum.PDF), "requester"));
  }

  @Test
  @SuppressWarnings({"rawtypes", "unchecked"})
  void fetchReport_returnsXlsMediaTypeWhenOutputFormatIsXls() throws Exception {
    JasperServerClient client = new JasperServerClient("http://login", "http://fetch", "user", "pass");
    HttpClient httpClient = mock(HttpClient.class);
    ReflectionTestUtils.setField(client, "httpClient", httpClient);

    HttpResponse<String> loginResponse = mock(HttpResponse.class);
    doReturn(200).when(loginResponse).statusCode();
    doReturn(HttpHeaders.of(Map.of("set-cookie", List.of("JSESSIONID=abc; Path=/")), (a, b) -> true))
      .when(loginResponse)
      .headers();

    HttpResponse<byte[]> fetchResponse = mock(HttpResponse.class);
    doReturn(200).when(fetchResponse).statusCode();
    doReturn("xls".getBytes()).when(fetchResponse).body();

    doReturn(loginResponse, fetchResponse)
      .when(httpClient)
      .send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));

    JasperServerClient.ReportPayload payload =
      client.fetchReport("req-1", "scaler-register", baseRequest(OutputFormatEnum.XLS), "requester");

    assertEquals("application/vnd.ms-excel", payload.mediaType().toString());
  }

  @Test
  void reportPayload_equalsHashCodeAndToString_useArrayContentSemantics() {
    byte[] contentA = "pdf-bytes".getBytes();
    byte[] contentB = "pdf-bytes".getBytes();

    JasperServerClient.ReportPayload left =
        new JasperServerClient.ReportPayload(contentA, MediaType.APPLICATION_PDF);
    JasperServerClient.ReportPayload right =
        new JasperServerClient.ReportPayload(contentB, MediaType.APPLICATION_PDF);

    assertEquals(left, right);
    assertEquals(left.hashCode(), right.hashCode());
    assertTrue(left.toString().contains("content=["));
  }

  private ScalerRegisterReportRequest baseRequest(OutputFormatEnum format) {
    ScalerRegisterReportRequest request = new ScalerRegisterReportRequest();
    request.setOutputFormat(format);
    request.setRegDist("D1");
    request.setPrimarySort(SortOrder.NUMBER_1);
    request.setSecondarySort(SortOrder.NUMBER_0);
    return request;
  }
}
