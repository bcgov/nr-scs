package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.sanitizeForLog;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;

import ca.bc.gov.nrs.scs.backend.exception.ReportGenerationException;
import ca.bc.gov.nrs.scs.backend.model.report.ReportRequest;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

@Component
public class JasperServerClient {

  private static final Logger log = LogManager.getLogger(JasperServerClient.class);

  private final HttpClient httpClient;
  private final String loginUrl;
  private final String fetchUrl;
  private final String username;
  private final String password;

  public JasperServerClient(
      @Value("${jasper.server.login-url:}") String loginUrl,
      @Value("${jasper.server.fetch-url:}") String fetchUrl,
      @Value("${jasper.server.username:}") String username,
      @Value("${jasper.server.password:}") String password) {
    this.httpClient = HttpClient.newBuilder().build();
    this.loginUrl = loginUrl;
    this.fetchUrl = fetchUrl;
    this.username = username;
    this.password = password;
  }

  public ReportPayload fetchReport(
      String requestId,
      String reportName,
      ReportRequest request,
      String requester) {
    validateConfig();

    String format = request.getOutputFormatValue();
    MediaType mediaType = resolveMediaType(format);
    String reportUrl = buildReportUrl(reportName, format);

    Map<String, String> params = request.buildParameters(requester);
    log.debug("Jasper report parameters for requestId='{}': {}", requestId, sanitizeForLog(params));
    String query = toQueryString(params);

    String cookieHeader = loginAndGetCookie();

    URI uri = URI.create(reportUrl + "?" + query);
    HttpRequest httpRequest = HttpRequest.newBuilder(uri)
        .header("Accept", mediaType.toString())
        .header("Authorization", buildBasicAuthHeader())
        .header("Cookie", cookieHeader)
        .GET()
        .build();

    try {
      HttpResponse<byte[]> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofByteArray());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        String errorBody = new String(response.body() == null ? new byte[0] : response.body(), StandardCharsets.UTF_8);
        log.warn(
            "Jasper server fetch failed requestId='{}' status='{}' url='{}' query='{}' body='{}'",
            requestId,
            response.statusCode(),
            reportUrl,
            sanitizeForLog(query),
            sanitizeForLog(errorBody));
        throw new ReportGenerationException(
            "Jasper server returned status " + response.statusCode() + " for report fetch",
            null);
      }
      return new ReportPayload(response.body(), mediaType);
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new ReportGenerationException("Failed to fetch Jasper report", ex);
    } catch (IOException ex) {
      throw new ReportGenerationException("Failed to fetch Jasper report", ex);
    }
  }

  private void validateConfig() {
    if (isBlank(loginUrl) || isBlank(fetchUrl) || isBlank(username) || isBlank(password)) {
      throw new ReportGenerationException("Jasper server configuration is incomplete", null);
    }
  }

  private String loginAndGetCookie() {
    String payload = "j_username=" + urlEncode(username) + "&j_password=" + urlEncode(password);
    HttpRequest request = HttpRequest.newBuilder(URI.create(loginUrl))
      .header("Content-Type", "application/x-www-form-urlencoded")
      .POST(HttpRequest.BodyPublishers.ofString(payload))
      .build();

    try {
      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.warn("Jasper server login failed status='{}'", response.statusCode());
        throw new ReportGenerationException(
            "Jasper server login failed with status " + response.statusCode(),
            null);
      }
      return joinCookies(response.headers().allValues("set-cookie"));
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      throw new ReportGenerationException("Failed to login to Jasper server", ex);
    } catch (IOException ex) {
      throw new ReportGenerationException("Failed to login to Jasper server", ex);
    } catch (ReportGenerationException ex) {
      throw ex;
    } catch (RuntimeException ex) {
      throw new ReportGenerationException("Failed to login to Jasper server", ex);
    }
  }

  private String buildReportUrl(String reportName, String format) {
    if (isBlank(reportName)) {
      throw new ReportGenerationException("Report name is required", null);
    }
    String base = fetchUrl.endsWith("/") ? fetchUrl : fetchUrl + "/";
    return base + reportName + "." + format;
  }

  private String buildBasicAuthHeader() {
    String auth = username + ":" + password;
    String encoded = java.util.Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
    return "Basic " + encoded;
  }

  private String joinCookies(List<String> cookies) {
    if (cookies == null || cookies.isEmpty()) {
      return "";
    }
    StringJoiner joiner = new StringJoiner("; ");
    for (String cookie : cookies) {
      String trimmed = cookie == null ? "" : cookie.trim();
      if (!trimmed.isEmpty()) {
        String value = trimmed.split(";", 2)[0];
        joiner.add(value);
      }
    }
    return joiner.toString();
  }

  private String toQueryString(Map<String, String> params) {
    StringJoiner joiner = new StringJoiner("&");
    for (Map.Entry<String, String> entry : params.entrySet()) {
      String key = urlEncode(entry.getKey());
      String value = urlEncode(entry.getValue() == null ? "" : entry.getValue());
      joiner.add(key + "=" + value);
    }
    return joiner.toString();
  }

  private MediaType resolveMediaType(String format) {
    if ("xls".equalsIgnoreCase(format)) {
      return MediaType.parseMediaType("application/vnd.ms-excel");
    }
    return MediaType.APPLICATION_PDF;
  }

  private String urlEncode(String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }

  public record ReportPayload(byte[] content, MediaType mediaType) {

    @Override
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      }
      if (!(other instanceof ReportPayload that)) {
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
      return "ReportPayload["
          + "content=" + Arrays.toString(content)
          + ", mediaType=" + mediaType
          + ']';
    }
  }
}
