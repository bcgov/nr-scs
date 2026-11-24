package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.InspectionQuestionApi;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionDetail;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionSummary;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.InspectionQuestionService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InspectionQuestionController implements InspectionQuestionApi {

  private final InspectionQuestionService service;

  public InspectionQuestionController(InspectionQuestionService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_QUESTIONS_QUERY)
  public ResponseEntity<List<InspectionQuestionSummary>> searchInspectionQuestions(
      @RequestParam(value = "inspectionQuestionId", required = false) Long inspectionQuestionId,
      @RequestParam(value = "questionText", required = false) String questionText,
      @RequestParam(value = "commentRequiredInd", required = false) String commentRequiredInd,
      @RequestParam(value = "sortOrderNo", required = false) Integer sortOrderNo,
      @RequestParam(value = "effectiveDate", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @RequestParam(value = "expiryDate", required = false)
          @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate) {
    return ResponseEntity.ok(service.searchQuestions(
        inspectionQuestionId,
        questionText,
        commentRequiredInd,
        sortOrderNo,
        effectiveDate,
        expiryDate));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_QUESTIONS_CREATE)
  public ResponseEntity<InspectionQuestionDetail> createInspectionQuestion(
      @RequestBody InspectionQuestionCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.createQuestion(request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_QUESTIONS_READ)
  public ResponseEntity<InspectionQuestionDetail> getInspectionQuestion(
      Long inspectionQuestionId) {
    return ResponseEntity.ok(service.getQuestion(inspectionQuestionId));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_QUESTIONS_UPDATE)
  public ResponseEntity<InspectionQuestionDetail> updateInspectionQuestion(
      Long inspectionQuestionId,
      @RequestBody InspectionQuestionUpdateRequest request) {
    return ResponseEntity.ok(service.updateQuestion(inspectionQuestionId, request));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_QUESTIONS_DELETE)
  public ResponseEntity<Void> deleteInspectionQuestion(
      Long inspectionQuestionId) {
    service.deleteQuestion(inspectionQuestionId);
    return ResponseEntity.noContent().build();
  }
}
