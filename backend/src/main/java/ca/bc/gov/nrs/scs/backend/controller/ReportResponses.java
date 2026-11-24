package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.service.ReportService.Queued;
import ca.bc.gov.nrs.scs.backend.service.ReportService.Rendered;
import ca.bc.gov.nrs.scs.backend.service.ReportService.ReportOutcome;
import java.util.Map;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Turns a report request's {@link ReportOutcome} into the HTTP response the report endpoints return: a rendered
 * preview is a 200 inline download named for its request; a queued (preview=false) request is a 202 JSON
 * acknowledgement carrying the request id the background render and its email are tied to.
 *
 * <p>The HTTP edge of the report flow — it used to live in {@code ReportService}, which now only decides what
 * happened and leaves how to say so on the wire to the controller layer.
 */
final class ReportResponses {

  private static final Logger log = LogManager.getLogger(ReportResponses.class);
  private static final String REPORT_REQUEST_RECEIVED_MESSAGE = "Report request received";

  private ReportResponses() {
  }

  static ResponseEntity<Object> toResponse(ReportOutcome outcome) {
    return switch (outcome) {
      case Rendered rendered -> inlineDownload(rendered);
      case Queued queued -> accepted(queued);
    };
  }

  private static ResponseEntity<Object> inlineDownload(Rendered rendered) {
    MediaType mediaType = rendered.document().mediaType();
    byte[] content = rendered.document().content();
    log.info(
        "Fetched report requestId='{}' mediaType='{}' sizeBytes='{}'",
        rendered.requestId(),
        mediaType,
        content == null ? 0 : content.length);

    ContentDisposition disposition = ContentDisposition.inline().filename(rendered.filename()).build();
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
        .contentType(mediaType)
        .body(new ByteArrayResource(content));
  }

  private static ResponseEntity<Object> accepted(Queued queued) {
    Map<String, String> payload = Map.of(
        "requestId", queued.requestId(),
        "message", REPORT_REQUEST_RECEIVED_MESSAGE);
    return ResponseEntity.accepted()
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload);
  }
}
