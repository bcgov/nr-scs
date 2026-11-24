package ca.bc.gov.nrs.scs.backend.service.inspection;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Validates scale site inspection create/update requests. Extracted from
 * {@code ScaleSiteInspectionService} so the rules are isolated and unit-testable. This component is
 * intentionally free of repository/persistence dependencies: callers supply the data a rule needs
 * (the set of required question ids, and a lookup from question id to its valid answer codes), so
 * every method is a pure function of its inputs.
 */
@Component
public class InspectionValidator {

  private static final String AUTOMATED_INSPECTION_TYPE_CODE = "AUT";
  private static final String WEIGHT_SCALE_METHOD_CODE = "W";

  /**
   * Validates a create request. {@code validAnswerCodesLookup} returns the valid answer codes for a
   * given inspection question id.
   */
  public void validateCreate(
      InspectionCreateCommand command,
      String inspectionTypeCode,
      List<String> siteTypeCodes,
      Function<Long, Set<String>> validAnswerCodesLookup) {
    validateInspectionDate(command.inspectionDate());
    validateAutomatedInspectionSiteTypes(inspectionTypeCode, siteTypeCodes, false);

    if (command.previousInspectionId() != null && command.previousInspectionId() <= 0) {
      throw new BadRequestException("previousInspectionId must be greater than 0 when supplied.");
    }

    validateQuestionResponsesAllowEmpty(command.questionResponses(), validAnswerCodesLookup);
  }

  /** Validates an update request. */
  public void validateUpdate(
      InspectionUpdateCommand command, Function<Long, Set<String>> validAnswerCodesLookup) {
    validateInspectionDate(command.inspectionDate());
    validateQuestionResponses(command.questionResponses(), validAnswerCodesLookup);
  }

  /**
   * Ensures automated inspections (type {@code AUT}) use only Weight Scale as the site type. When
   * {@code unprocessable} is true the failure surfaces as a 422 (create-init preview), otherwise a
   * 400 (create submission).
   */
  public void validateAutomatedInspectionSiteTypes(
      String inspectionTypeCode, List<String> siteTypeCodes, boolean unprocessable) {
    if (!AUTOMATED_INSPECTION_TYPE_CODE.equals(inspectionTypeCode)) {
      return;
    }
    boolean validAutomatedSelection = siteTypeCodes.size() == 1
        && WEIGHT_SCALE_METHOD_CODE.equals(siteTypeCodes.getFirst());
    if (validAutomatedSelection) {
      return;
    }

    if (unprocessable) {
      throw new UnprocessableEntityException(
          "Automated inspections must use Weight Scale as the site type.");
    }
    throw new BadRequestException(
        "Automated inspections must use Weight Scale as the site type.");
  }

  /**
   * Ensures the submitted responses cover every required inspection question. A {@code null}/empty
   * {@code requiredQuestionIds} means there is nothing to enforce.
   */
  public void validateQuestionCoverage(
      Set<Long> requiredQuestionIds, List<InspectionQuestionResponseInput> submittedRows) {
    if (requiredQuestionIds == null || requiredQuestionIds.isEmpty()) {
      return;
    }

    if (submittedRows == null || submittedRows.isEmpty()) {
      throw new BadRequestException(
          "Question responses must be submitted for all required inspection questions.");
    }

    Set<Long> submittedQuestionIds = submittedRows.stream()
        .filter(Objects::nonNull)
        .map(InspectionQuestionResponseInput::inspectionQuestionId)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    if (!submittedQuestionIds.containsAll(requiredQuestionIds)) {
      throw new BadRequestException(
          "Question responses must include all required inspection questions.");
    }
  }

  private void validateInspectionDate(LocalDate inspectionDate) {
    if (inspectionDate != null && inspectionDate.isAfter(LocalDate.now())) {
      // Field-scoped (not a plain BadRequestException) so it surfaces inline on the Inspection Date
      // field rather than as a top-of-page banner the user is scrolled away from — matching legacy
      // and the sibling PerformanceRemark future-date rule. Covers both create and update.
      throw new FieldValidationException(List.of(new FieldErrorDetail(
          "inspectionDate", "Inspection Date cannot be in the future.")));
    }
  }

  private void validateQuestionResponsesAllowEmpty(
      List<InspectionQuestionResponseInput> rows,
      Function<Long, Set<String>> validAnswerCodesLookup) {
    if (rows == null || rows.isEmpty()) {
      return;
    }
    validateQuestionResponses(rows, validAnswerCodesLookup);
  }

  private void validateQuestionResponses(
      List<InspectionQuestionResponseInput> rows,
      Function<Long, Set<String>> validAnswerCodesLookup) {
    Set<Long> seenQuestionIds = new HashSet<>();
    Map<Long, Set<String>> validAnswerCodesByQuestion = new LinkedHashMap<>();
    for (InspectionQuestionResponseInput row : rows) {
      validateQuestionResponse(row, seenQuestionIds, validAnswerCodesByQuestion, validAnswerCodesLookup);
    }
  }

  private void validateQuestionResponse(
      InspectionQuestionResponseInput row,
      Set<Long> seenQuestionIds,
      Map<Long, Set<String>> validAnswerCodesByQuestion,
      Function<Long, Set<String>> validAnswerCodesLookup) {
    if (row == null) {
      throw new BadRequestException("Question responses cannot contain null rows.");
    }

    Long questionId = row.inspectionQuestionId();
    if (questionId == null || questionId <= 0) {
      throw new BadRequestException(
          "inspectionQuestionId must be greater than 0 for each question response.");
    }
    if (!seenQuestionIds.add(questionId)) {
      throw new BadRequestException(
          "Duplicate question response submitted for inspectionQuestionId " + questionId);
    }
    String normalizedAnswerCode =
        SCSUtils.requireText(
            upperOrNull(row.inspectionAnswerCode()),
            "inspectionAnswerCode must not be blank for inspectionQuestionId " + questionId);

    Set<String> validAnswerCodes = validAnswerCodesByQuestion.computeIfAbsent(
        questionId, validAnswerCodesLookup);
    if (!validAnswerCodes.contains(normalizedAnswerCode)) {
      throw new BadRequestException(
          "inspectionAnswerCode "
              + normalizedAnswerCode
              + " is not valid for inspectionQuestionId "
              + questionId);
    }

    validateFollowUpFields(row, questionId);
  }

  private void validateFollowUpFields(InspectionQuestionResponseInput row, Long questionId) {
    YesNo followUpRequired = row.followUpRequired();

    if (followUpRequired == YesNo.Y) {
      validateRequiredFollowUpFields(
          questionId, row.followUpActionText(), row.followUpDueDate(), row.followUpCompleted());
      return;
    }

    if (followUpRequired == YesNo.N
        && (row.followUpActionText() != null || row.followUpDueDate() != null || row.followUpCompleted() != null)) {
      throw new BadRequestException(
          "Follow-up action, due date, and completed indicator must be omitted when followUpRequiredInd is N for inspectionQuestionId "
              + questionId);
    }
  }

  private void validateRequiredFollowUpFields(
      Long questionId,
      String followUpActionText,
      LocalDate followUpDueDate,
      YesNo followUpCompleted) {
    if (followUpActionText == null) {
      throw new BadRequestException(
          "followUpActionText is required when followUpRequiredInd is Y for inspectionQuestionId "
              + questionId);
    }
    if (followUpDueDate == null) {
      throw new BadRequestException(
          "followUpDueDate is required when followUpRequiredInd is Y for inspectionQuestionId "
              + questionId);
    }
    if (followUpCompleted == null) {
      throw new BadRequestException(
          "followUpCompletedInd is required when followUpRequiredInd is Y for inspectionQuestionId "
              + questionId);
    }
  }
}
