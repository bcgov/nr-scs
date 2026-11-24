package ca.bc.gov.nrs.scs.backend.service.mapper;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.openapitools.jackson.nullable.JsonNullable;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.RiskRatingRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentAnswer;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentQuestion;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentResponseInput;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentRiskRating;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSection;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;

/**
 * Projects the data-driven risk assessment DB rows ({@code TemplateQaRow}, {@code ResponseRow},
 * {@code RiskRatingRow}) and the header search-result rows onto the generated API models. The
 * questionnaire structure (sections/questions/answers) and risk levels are shared by the scaler and
 * scale-site features; only the detail header differs, so each has its own {@code toDetail}. Pure
 * and static so it can be unit-tested without a database or Spring context.
 */
public final class RiskAssessmentApiMapper {

  private RiskAssessmentApiMapper() {}

  /**
   * Build the template sections (with their questions and answers) from the template rows, seeding
   * each question's saved selection from {@code responses}. A selection whose answer was filtered
   * out of the template (obsolete or de-duped) is blanked so the dropdown, validation, and the save
   * round-trip agree (a stale id would otherwise 400 on save).
   */
  public static List<RiskAssessmentSection> toSections(
      List<TemplateQaRow> templateQa, List<ResponseRow> responses) {

    Map<Long, Long> selectedByQuestion = new HashMap<>();
    for (ResponseRow response : responses) {
      if (response.questionId() != null && response.answerId() != null) {
        selectedByQuestion.put(response.questionId(), response.answerId());
      }
    }

    List<TemplateQaRow> sorted = new ArrayList<>(templateQa);
    sorted.sort(
        Comparator.comparing(TemplateQaRow::sectionOrder, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(TemplateQaRow::questionOrder, Comparator.nullsLast(Integer::compareTo))
            .thenComparing(TemplateQaRow::answerOrder, Comparator.nullsLast(Integer::compareTo)));

    Map<Long, RiskAssessmentSection> sectionById = new LinkedHashMap<>();
    Map<Long, RiskAssessmentQuestion> questionById = new LinkedHashMap<>();

    for (TemplateQaRow row : sorted) {
      RiskAssessmentSection section =
          sectionById.computeIfAbsent(
              row.sectionId(),
              id ->
                  new RiskAssessmentSection()
                      .sectionId(id)
                      .sectionDescription(row.sectionDescription())
                      .sectionOrder(row.sectionOrder())
                      .questions(new ArrayList<>()));

      RiskAssessmentQuestion question = questionById.get(row.questionId());
      if (question == null) {
        question =
            new RiskAssessmentQuestion()
                .questionId(row.questionId())
                .questionText(row.questionText())
                .questionOrder(row.questionOrder())
                .answers(new ArrayList<>());
        Long selected = selectedByQuestion.get(row.questionId());
        if (selected != null) {
          question.selectedAnswerId(selected);
        }
        questionById.put(row.questionId(), question);
        section.getQuestions().add(question);
      }

      if (row.answerId() != null) {
        question
            .getAnswers()
            .add(
                new RiskAssessmentAnswer()
                    .answerId(row.answerId())
                    .answerText(row.answerText())
                    .weight(row.weight())
                    .answerOrder(row.answerOrder()));
      }
    }

    // A saved answer can be hidden by the obsolete/duplicate filtering done when the rows are read.
    // If the stored selection is no longer among the question's surviving answers, blank it so the
    // dropdown, validation, and the save round-trip agree.
    for (RiskAssessmentQuestion question : questionById.values()) {
      Long selected = question.getSelectedAnswerId().orElse(null);
      if (selected != null
          && question.getAnswers().stream()
              .noneMatch(answer -> selected.equals(answer.getAnswerId().orElse(null)))) {
        question.selectedAnswerId(null);
      }
    }

    return new ArrayList<>(sectionById.values());
  }

  /** Build the risk-level threshold rows for a template, highest band first. */
  public static List<RiskAssessmentRiskRating> toRiskRatings(List<RiskRatingRow> ratings) {
    List<RiskAssessmentRiskRating> out = new ArrayList<>();
    ratings.stream()
        .sorted(
            Comparator.comparing(
                RiskRatingRow::rangeLowValue, Comparator.nullsLast(Comparator.reverseOrder())))
        .forEach(
            r ->
                out.add(
                    new RiskAssessmentRiskRating()
                        .riskTypeCode(r.riskTypeCode())
                        .codeDescription(r.codeDescription())
                        .ratingDescription(r.ratingDescription())
                        .rangeLowValue(r.rangeLowValue())
                        .rangeHighValue(r.rangeHighValue())));
    return out;
  }

  /** Project the scaler header row + resolved questionnaire parts onto the scaler detail model. */
  public static ScalerRiskAssessmentDetail toScalerDetail(
      ScalerRiskAssessmentSearchResult header,
      Long templateId,
      String comments,
      String regionName,
      String districtName,
      List<RiskAssessmentSection> sections,
      List<RiskAssessmentRiskRating> riskRatings,
      QuestionnaireRow questionnaire) {

    return new ScalerRiskAssessmentDetail()
        .riskQuestionnaireId(SCSUtils.getNullable(header.getRiskQuestionnaireId()))
        .templateId(templateId)
        .versionNo(SCSUtils.getNullable(header.getVersionNo()))
        .riskRating(SCSUtils.getNullable(header.getRiskRating()))
        .maxRiskRating(SCSUtils.getNullable(header.getMaxRiskRating()))
        .riskTypeCode(SCSUtils.getNullable(header.getRiskTypeCode()))
        .codeDescription(SCSUtils.getNullable(header.getCodeDescription()))
        .rangeLowValue(SCSUtils.getNullable(header.getRangeLowValue()))
        .rangeHighValue(SCSUtils.getNullable(header.getRangeHighValue()))
        .scalerLicenceNo(SCSUtils.getNullable(header.getScalerLicenceNo()))
        .scalerClientLoc(SCSUtils.getNullable(header.getScalerClientLoc()))
        .clientName(SCSUtils.getNullable(header.getClientName()))
        .orgUnitName(SCSUtils.getNullable(header.getOrgUnitName()))
        .regionName(regionName)
        .districtName(districtName)
        .comments(comments)
        .sections(sections)
        .riskRatings(riskRatings)
        .entryTimestamp(questionnaire == null ? null : questionnaire.entryTimestamp())
        .entryUserid(questionnaire == null ? null : questionnaire.entryUserid())
        .updateTimestamp(questionnaire == null ? null : questionnaire.updateTimestamp())
        .updateUserid(questionnaire == null ? null : questionnaire.updateUserid())
        .revisionCount(questionnaire == null ? null : questionnaire.revisionCount());
  }

  /** Project the scale-site header row + resolved questionnaire parts onto the scale-site detail. */
  public static ScaleSiteRiskAssessmentDetail toScaleSiteDetail(
      ScaleSiteRiskAssessmentSearchResult header,
      Long templateId,
      String comments,
      String regionName,
      String districtName,
      List<RiskAssessmentSection> sections,
      List<RiskAssessmentRiskRating> riskRatings,
      QuestionnaireRow questionnaire) {

    return new ScaleSiteRiskAssessmentDetail()
        .riskQuestionnaireId(SCSUtils.getNullable(header.getRiskQuestionnaireId()))
        .templateId(templateId)
        .versionNo(SCSUtils.getNullable(header.getVersionNo()))
        .riskRating(SCSUtils.getNullable(header.getRiskRating()))
        .maxRiskRating(SCSUtils.getNullable(header.getMaxRiskRating()))
        .riskTypeCode(SCSUtils.getNullable(header.getRiskTypeCode()))
        .codeDescription(SCSUtils.getNullable(header.getCodeDescription()))
        .rangeLowValue(SCSUtils.getNullable(header.getRangeLowValue()))
        .rangeHighValue(SCSUtils.getNullable(header.getRangeHighValue()))
        .scaleSiteIdNmbr(SCSUtils.getNullable(header.getScaleSiteIdNmbr()))
        .siteName(SCSUtils.getNullable(header.getSiteName()))
        .regionName(regionName)
        .districtName(districtName)
        .comments(comments)
        .sections(sections)
        .riskRatings(riskRatings)
        .entryTimestamp(questionnaire == null ? null : questionnaire.entryTimestamp())
        .entryUserid(questionnaire == null ? null : questionnaire.entryUserid())
        .updateTimestamp(questionnaire == null ? null : questionnaire.updateTimestamp())
        .updateUserid(questionnaire == null ? null : questionnaire.updateUserid())
        .revisionCount(questionnaire == null ? null : questionnaire.revisionCount());
  }

  // --- request -> command (write boundary) --------------------------------------------------

  private static final int MAX_COMMENTS_LENGTH = 4000;

  /**
   * Map the generated save request onto the create command: unwrap {@code JsonNullable}, coerce a
   * blank/absent comment to {@code null}, trim + length-check a supplied one, and flatten each
   * response's {@code answerId} to a plain {@link Long}. On create the comment is optional (legacy
   * inserts a null comment when none is given).
   */
  public static RiskAssessmentCreateCommand toCreateCommand(RiskAssessmentSaveRequest request) {
    return new RiskAssessmentCreateCommand(
        normalizeCommentForCreate(request.getComments()),
        toResponseInputs(request.getResponses()));
  }

  /**
   * Map the generated save request onto the update command. The comment follows "present = set,
   * absent = leave unchanged": an absent field yields {@link Optional#empty()}, while a present
   * value is trimmed + length-checked (a null value becomes an empty string, which clears the
   * comment). Each response's {@code answerId} is flattened to a plain {@link Long}.
   */
  public static RiskAssessmentUpdateCommand toUpdateCommand(RiskAssessmentSaveRequest request) {
    return new RiskAssessmentUpdateCommand(
        normalizeCommentForUpdate(request.getComments()),
        toResponseInputs(request.getResponses()));
  }

  private static String normalizeCommentForCreate(JsonNullable<String> comments) {
    if (comments == null || !comments.isPresent()) {
      return null;
    }
    String value = comments.get();
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    if (trimmed.isEmpty()) {
      return null;
    }
    requireCommentWithinMaxLength(trimmed);
    return trimmed;
  }

  private static Optional<String> normalizeCommentForUpdate(JsonNullable<String> comments) {
    if (comments == null || !comments.isPresent()) {
      return Optional.empty();
    }
    String value = comments.get();
    if (value == null) {
      return Optional.of("");
    }
    String trimmed = value.trim();
    requireCommentWithinMaxLength(trimmed);
    return Optional.of(trimmed);
  }

  private static void requireCommentWithinMaxLength(String value) {
    if (value.length() > MAX_COMMENTS_LENGTH) {
      throw new BadRequestException(
          "Comments can not be greater than " + MAX_COMMENTS_LENGTH + " characters.");
    }
  }

  private static List<RiskQuestionResponseInput> toResponseInputs(
      List<RiskAssessmentResponseInput> rows) {
    if (rows == null) {
      return List.of();
    }
    return rows.stream().map(RiskAssessmentApiMapper::toResponseInput).toList();
  }

  private static RiskQuestionResponseInput toResponseInput(RiskAssessmentResponseInput row) {
    return new RiskQuestionResponseInput(
        row.getQuestionId(), SCSUtils.getNullable(row.getAnswerId()));
  }
}
