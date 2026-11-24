package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionDetail;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionSummary;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.InspectionQuestionRepository;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InspectionQuestionService {

  private final InspectionQuestionRepository repository;

  public InspectionQuestionService(InspectionQuestionRepository repository) {
    this.repository = repository;
  }

  public List<InspectionQuestionSummary> searchQuestions(
      Long inspectionQuestionId,
      String questionText,
      String commentRequiredInd,
      Integer sortOrderNo,
      LocalDate effectiveDate,
      LocalDate expiryDate) {
    return repository.searchQuestions(
        inspectionQuestionId,
        questionText,
        commentRequiredInd,
        sortOrderNo,
        effectiveDate,
        expiryDate);
  }

  public InspectionQuestionDetail getQuestion(Long inspectionQuestionId) {
    InspectionQuestionDetail detail = repository.getQuestionDetail(inspectionQuestionId);
    SCSUtils.requireFound(detail, "No inspection question found with id " + inspectionQuestionId);
    return detail;
  }

  @Transactional
  public InspectionQuestionDetail createQuestion(InspectionQuestionCreateRequest request) {
    validateQuestionRequest(request);

    var created = repository.createQuestion(request);
    if (created == null || created.getInspectionQuestionId() == null) {
      throw new BadRequestException("Inspection question could not be created.");
    }

    Long questionId = created.getInspectionQuestionId();
    repository.replaceInspectionTypes(questionId, request.getInspectionTypeCodes());
    repository.replaceScalingMethods(questionId, request.getScalingMethodTypeCodes());
    repository.replaceValidResponses(questionId, request.getValidResponseCodes(), request.getEffectiveDate());

    return getQuestion(questionId);
  }

  @Transactional
  public InspectionQuestionDetail updateQuestion(Long inspectionQuestionId, InspectionQuestionUpdateRequest request) {
    InspectionQuestionDetail existing = repository.getQuestionDetail(inspectionQuestionId);
    SCSUtils.requireFound(existing, "No inspection question found with id " + inspectionQuestionId);

    boolean questionUsed = Boolean.TRUE.equals(existing.getQuestionUsed());
    if (questionUsed) {
      validateSortAndExpiry(request.getSortOrderNo(), request.getExpiryDate());
      InspectionQuestionUpdateRequest update = new InspectionQuestionUpdateRequest()
          .questionText(existing.getQuestionText())
          .commentRequiredInd(existing.getCommentRequiredInd())
          .sortOrderNo(request.getSortOrderNo())
          .effectiveDate(existing.getEffectiveDate())
          .expiryDate(request.getExpiryDate())
          .inspectionTypeCodes(existing.getInspectionTypeCodes())
          .scalingMethodTypeCodes(existing.getScalingMethodTypeCodes())
          .validResponseCodes(existing.getValidResponseCodes());
      repository.updateQuestion(inspectionQuestionId, update);
      return getQuestion(inspectionQuestionId);
    }

    validateQuestionRequest(request);

    repository.updateQuestion(inspectionQuestionId, request);
    repository.replaceInspectionTypes(inspectionQuestionId, request.getInspectionTypeCodes());
    repository.replaceScalingMethods(inspectionQuestionId, request.getScalingMethodTypeCodes());
    repository.replaceValidResponses(inspectionQuestionId, request.getValidResponseCodes(), request.getEffectiveDate());

    return getQuestion(inspectionQuestionId);
  }

  @Transactional
  public void deleteQuestion(Long inspectionQuestionId) {
    InspectionQuestionDetail existing = repository.getQuestionDetail(inspectionQuestionId);
    SCSUtils.requireFound(existing, "No inspection question found with id " + inspectionQuestionId);
    if (Boolean.TRUE.equals(existing.getQuestionUsed())) {
      throw new BadRequestException("This question has been used in an inspection and cannot be deleted.");
    }

    repository.replaceInspectionTypes(inspectionQuestionId, List.of());
    repository.replaceScalingMethods(inspectionQuestionId, List.of());
    repository.replaceValidResponses(inspectionQuestionId, List.of(), existing.getEffectiveDate());
    repository.deleteQuestion(inspectionQuestionId);
  }

  private void validateQuestionRequest(InspectionQuestionCreateRequest request) {
    validateQuestionRequestParams(
      request.getQuestionText(),
      request.getCommentRequiredInd(),
      request.getSortOrderNo(),
      request.getEffectiveDate(),
      request.getExpiryDate(),
      request.getInspectionTypeCodes(),
      request.getScalingMethodTypeCodes(),
      request.getValidResponseCodes()
    );
  }

  private void validateQuestionRequest(InspectionQuestionUpdateRequest request) {
    validateQuestionRequestParams(
      request.getQuestionText(),
      request.getCommentRequiredInd(),
      request.getSortOrderNo(),
      request.getEffectiveDate(),
      request.getExpiryDate(),
      request.getInspectionTypeCodes(),
      request.getScalingMethodTypeCodes(),
      request.getValidResponseCodes()
    );
  }

  private void validateQuestionRequestParams(
    String questionText,
    String commentRequiredInd,
    Integer sortOrderNo,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    List<String> inspectionTypeCodes,
    List<String> scalingMethodTypeCodes,
    List<String> validResponseCodes
  ) {
    SCSUtils.requireText(questionText, "Question text is required.");
    if (questionText.length() > 200) {
      throw new BadRequestException("Question text must be 200 characters or less.");
    }
    SCSUtils.requireText(commentRequiredInd, "Comment required indicator is required.");
    if (!SCSUtils.isYesNo(commentRequiredInd)) {
      throw new BadRequestException("Comment required indicator must be Y or N.");
    }
    if (sortOrderNo == null) {
      throw new BadRequestException("Sort order is required.");
    }
    if (sortOrderNo < 0 || sortOrderNo > 9999) {
      throw new BadRequestException("Sort order must be between 0 and 9999.");
    }
    SCSUtils.requireDateOrder(effectiveDate, expiryDate,
        "Expiry date must be on or after Effective date.");

    if (inspectionTypeCodes.isEmpty()) {
      throw new BadRequestException("At least one inspection type is required.");
    }
    if (scalingMethodTypeCodes.isEmpty()) {
      throw new BadRequestException("At least one scaling method is required.");
    }
    if (validResponseCodes.size() < 2) {
      throw new BadRequestException("At least two valid responses are required.");
    }
  }

  private void validateSortAndExpiry(Integer sortOrderNo, LocalDate expiryDate) {
    if (sortOrderNo == null) {
      throw new BadRequestException("Sort order is required.");
    }
    if (sortOrderNo < 0 || sortOrderNo > 9999) {
      throw new BadRequestException("Sort order must be between 0 and 9999.");
    }
    if (expiryDate == null) {
      throw new BadRequestException("Expiry date is required.");
    }
  }

}
