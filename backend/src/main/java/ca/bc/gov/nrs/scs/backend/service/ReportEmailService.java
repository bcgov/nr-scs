package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.sanitizeForLog;

import ca.bc.gov.nrs.scs.backend.model.report.ReportRequest;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@Service
public class ReportEmailService {

  private static final Logger log = LogManager.getLogger(ReportEmailService.class);

  private final RestTemplate restTemplate;
  private final boolean enabled;
  private final String mailHost;
  private final String mailLogin;
  private final String mailUsername;
  private final String mailPassword;
  private final String mailScope;
  private final String fromAddress;
  private final int maxAttempts;
  private final int maxPerRun;

  public ReportEmailService(
      RestTemplate restTemplate,
      @Value("${mail.enabled:false}") boolean enabled,
      @Value("${mail.host:}") String mailHost,
      @Value("${mail.login:}") String mailLogin,
      @Value("${mail.username:}") String mailUsername,
      @Value("${mail.password:}") String mailPassword,
      @Value("${mail.login.scope:}") String mailScope,
      @Value("${mail.from:no-reply@scs.local}") String fromAddress,
      @Value("${mail.queue.max-attempts:3}") int maxAttempts,
      @Value("${mail.queue.max-per-run:10}") int maxPerRun) {
    this.restTemplate = restTemplate;
    this.enabled = enabled;
    this.mailHost = mailHost;
    this.mailLogin = mailLogin;
    this.mailUsername = mailUsername;
    this.mailPassword = mailPassword;
    this.mailScope = mailScope;
    this.fromAddress = fromAddress;
    this.maxAttempts = Math.max(1, maxAttempts);
    this.maxPerRun = Math.max(1, maxPerRun);

    log.info(
      "Email config enabled={} host={} login={} from={} maxAttempts={} maxPerRun={}",
      this.enabled,
      this.mailHost,
      this.mailLogin,
      this.fromAddress,
      this.maxAttempts,
      this.maxPerRun);
  }

  public boolean handleEmail(
      String requestId,
      ReportRequest request,
      byte[] content,
      MediaType mediaType) {
    String emailRecipient = request == null ? null : request.getEmailRecipient();
    if (emailRecipient == null || emailRecipient.isBlank()) {
      return false;
    }

    boolean sent = send(requestId, emailRecipient, content, mediaType);
    if (!sent) {
      log.warn("Report email failed to {} (requestId={})", sanitizeForLog(emailRecipient), requestId);
    }
    return sent;
  }

  private boolean send(
      String requestId,
      String emailRecipient,
      byte[] content,
      MediaType mediaType) {
    EmailJob job = new EmailJob(
        requestId,
        emailRecipient,
        "MoF Report " + requestId,
        "Please find the requested report attached. Job number: " + requestId,
        buildFilename(requestId, mediaType),
        content,
        mediaType == null
            ? MediaType.APPLICATION_OCTET_STREAM.toString()
            : mediaType.toString(),
        0);
    if (!enabled) {
      log.warn("Email disabled; skipping send for {}", sanitizeForLog(job.to()));
      return false;
    }

    try {
      sendRequest(job);
      return true;
    } catch (Exception ex) {
      int attempt = job.attempt() + 1;
      if (attempt < maxAttempts) {
        log.warn("Email send failed (attempt {} of {}) for {}", attempt, maxAttempts, sanitizeForLog(job.to()), ex);
      } else {
        log.error("Email send failed after {} attempts for {}", maxAttempts, sanitizeForLog(job.to()), ex);
      }
      return false;
    }
  }

  private void sendRequest(EmailJob job) throws Exception {
    if (mailHost == null || mailHost.isBlank()) {
      throw new IllegalStateException("mail.host must be configured when mail.enabled=true");
    }
    log.debug(
        "Preparing email to={} requestId={} from={} subject=\"{}\" attachment={} contentType={} sizeBytes={}",
        sanitizeForLog(job.to()),
        job.requestId(),
        fromAddress,
        job.subject(),
        job.filename(),
        job.contentType(),
        job.content() == null ? 0 : job.content().length);
    String token = fetchAccessToken();
    Map<String, Object> payload = buildEmailPayload(job);

    HttpHeaders headers = new HttpHeaders();
    headers.setBearerAuth(token);
    headers.setContentType(MediaType.APPLICATION_JSON);

    HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

    try {
      log.debug("Dispatching email to={} requestId={} host={}", sanitizeForLog(job.to()), job.requestId(), mailHost);
      ResponseEntity<String> response = restTemplate.postForEntity(mailHost, request, String.class);
      log.debug(
          "Email API response status={} requestId={}",
          response.getStatusCode(),
          job.requestId());
    } catch (HttpStatusCodeException ex) {
      String responseBody = ex.getResponseBodyAsString(StandardCharsets.UTF_8);
      log.warn(
          "Email API error status={} requestId={} responseBody={}",
          ex.getStatusCode(),
          job.requestId(),
          responseBody);
      throw ex;
    }
    log.info("Email sent to {} for requestId={}", sanitizeForLog(job.to()), job.requestId());
  }

  private String fetchAccessToken() {
    if (mailLogin == null || mailLogin.isBlank()) {
      throw new IllegalStateException("mail.login must be configured when mail.enabled=true");
    }
    if (mailUsername == null || mailUsername.isBlank()) {
      throw new IllegalStateException("mail.username must be configured when mail.enabled=true");
    }
    if (mailPassword == null || mailPassword.isBlank()) {
      throw new IllegalStateException("mail.password must be configured when mail.enabled=true");
    }
    HttpHeaders headers = new HttpHeaders();
    headers.setBasicAuth(mailUsername, mailPassword);
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");
    if (mailScope != null && !mailScope.isBlank()) {
      form.add("scope", mailScope);
    }

    HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
    ResponseEntity<?> response = restTemplate.postForEntity(mailLogin, request, Map.class);
    Object body = response.getBody();
    Object token = body instanceof Map<?, ?> responseBody ? responseBody.get("access_token") : null;
    if (token == null) {
      throw new IllegalStateException("Email login did not return access_token");
    }
    return token.toString();
  }

  private Map<String, Object> buildEmailPayload(EmailJob job) {
    Map<String, Object> payload = new HashMap<>();
    payload.put("bcc", List.of());
    payload.put("bodyType", "html");
    payload.put("body", job.body());
    payload.put("cc", List.of());
    payload.put("delayTS", 0);
    payload.put("encoding", "utf-8");
    payload.put("from", fromAddress);
    payload.put("priority", "normal");
    payload.put("subject", job.subject());
    payload.put("to", List.of(job.to()));
    payload.put("tag", "email_" + job.requestId());

    Map<String, Object> attachment = new HashMap<>();
    attachment.put(
        "content",
        job.content() == null
            ? ""
            : Base64.getEncoder().encodeToString(job.content()));
    attachment.put("contentType", job.contentType());
    attachment.put("encoding", "base64");
    attachment.put("filename", job.filename());
    payload.put("attachments", List.of(attachment));

    return payload;
  }

  public String buildFilename(String requestId, MediaType mediaType) {
    String ext = MediaType.APPLICATION_PDF.equals(mediaType) ? "pdf" : "xls";
    return requestId + "." + ext;
  }
  private record EmailJob(
      String requestId,
      String to,
      String subject,
      String body,
      String filename,
      byte[] content,
      String contentType,
      int attempt) {

    @Override
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      }
      if (!(other instanceof EmailJob that)) {
        return false;
      }
      return attempt == that.attempt
          && Objects.equals(requestId, that.requestId)
          && Objects.equals(to, that.to)
          && Objects.equals(subject, that.subject)
          && Objects.equals(body, that.body)
          && Objects.equals(filename, that.filename)
          && Arrays.equals(content, that.content)
          && Objects.equals(contentType, that.contentType);
    }

    @Override
    public int hashCode() {
      int result = Objects.hash(requestId, to, subject, body, filename, contentType, attempt);
      result = 31 * result + Arrays.hashCode(content);
      return result;
    }

    @Override
    public String toString() {
      return "EmailJob["
          + "requestId=" + requestId
          + ", to=" + to
          + ", subject=" + subject
          + ", body=" + body
          + ", filename=" + filename
          + ", contentLength=" + (content == null ? 0 : content.length)
          + ", contentType=" + contentType
          + ", attempt=" + attempt
          + ']';
    }
  }
}