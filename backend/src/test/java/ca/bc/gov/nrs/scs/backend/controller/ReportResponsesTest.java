package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import ca.bc.gov.nrs.scs.backend.service.ReportService;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** How a report request's outcome is said on the wire (the HTTP half moved out of ReportService). */
class ReportResponsesTest {

  @Test
  void aRenderedPreviewIsAn200InlineDownloadUnderItsFilename() {
    byte[] bytes = "pdf".getBytes(StandardCharsets.UTF_8);
    ReportService.Rendered rendered = new ReportService.Rendered(
        "req-1", new ReportService.ReportDocument(bytes, MediaType.APPLICATION_PDF), "req-1.pdf");

    ResponseEntity<Object> response = ReportResponses.toResponse(rendered);

    assertEquals(200, response.getStatusCode().value());
    assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
    assertEquals("inline; filename=\"req-1.pdf\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
    assertArrayEquals(bytes, ((ByteArrayResource) response.getBody()).getByteArray());
  }

  @Test
  void aQueuedRequestIsA202JsonAcknowledgementCarryingItsRequestId() {
    ResponseEntity<Object> response = ReportResponses.toResponse(new ReportService.Queued("req-2"));

    assertEquals(202, response.getStatusCode().value());
    assertEquals(MediaType.APPLICATION_JSON, response.getHeaders().getContentType());
    assertEquals(Map.of("requestId", "req-2", "message", "Report request received"), response.getBody());
  }

  @Test
  void aRenderedDocumentWithNoContentIsRejected() {
    // Moved from ReportServiceTest (fetchScalerRegisterReportResponse_throwsWhenPayloadContentIsNull): it was always
    // the HTTP body — ByteArrayResource — that refused a null document, so the check now lives where that happens.
    ReportService.Rendered empty = new ReportService.Rendered(
        "req-3", new ReportService.ReportDocument(null, MediaType.APPLICATION_PDF), "req-3.pdf");

    assertThrows(IllegalArgumentException.class, () -> ReportResponses.toResponse(empty));
  }
}
