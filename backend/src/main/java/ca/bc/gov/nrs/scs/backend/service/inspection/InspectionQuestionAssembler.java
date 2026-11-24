package ca.bc.gov.nrs.scs.backend.service.inspection;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionAnswerOption;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestion;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestionAndAnswer;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionResponse;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteInspectionRepository;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Builds the question-and-answer view of a scale site inspection and resolves the applicable
 * question set / valid answer codes from the repository. Extracted from
 * {@code ScaleSiteInspectionService} so the question-assembly responsibility (shell building,
 * saved-response mapping, answer-option loading) lives in one cohesive place.
 */
@Component
public class InspectionQuestionAssembler {

  /** Whether to eagerly load the selectable answer options for each question. */
  public enum AnswerOptionLoad {
    INCLUDE,
    EXCLUDE
  }

  private final ScaleSiteInspectionRepository scaleSiteInspectionRepository;

  public InspectionQuestionAssembler(ScaleSiteInspectionRepository scaleSiteInspectionRepository) {
    this.scaleSiteInspectionRepository = scaleSiteInspectionRepository;
  }

  /** Builds empty (unanswered) question shells for a new inspection of the given type/methods. */
  public List<InspectionQuestionAndAnswer> buildShellEntries(
      String inspectionTypeCode,
      List<String> inspectedScalingMethodCodes,
      Map<String, String> answerDescriptions) {
    Map<Long, List<InspectionAnswerOption>> optionsCache = new LinkedHashMap<>();
    return getApplicableInspectionQuestions(inspectionTypeCode, inspectedScalingMethodCodes)
        .stream()
        .map(q -> toShellEntry(q, optionsCache, answerDescriptions, AnswerOptionLoad.INCLUDE))
        .toList();
  }

  /**
   * Builds the question entries for an existing inspection from its saved responses, falling back to
   * reconstructed question shells when no saved response rows exist.
   */
  public List<InspectionQuestionAndAnswer> buildQuestionEntries(
      Long inspectionId,
      String inspectionTypeCode,
      List<String> inspectedScalingMethodCodes,
      Map<String, String> answerDescriptions,
      AnswerOptionLoad load) {
    List<InspectionResponse> rows =
        scaleSiteInspectionRepository.getInspectionResponses(inspectionId);
    Map<Long, String> questionTextCache = new LinkedHashMap<>();
    Map<Long, List<InspectionAnswerOption>> answerOptionsCache = new LinkedHashMap<>();

    if (!rows.isEmpty()) {
      return rows.stream()
          .map(row -> toQuestionEntry(row, questionTextCache, answerOptionsCache, answerDescriptions, load))
          .toList();
    }

    // Legacy inspections normally surface saved response rows. If none exist,
    // rebuild the applicable question shells from inspection type + scaling
    // method mappings so the UI can still render the expected question set.
    return getApplicableInspectionQuestions(inspectionTypeCode, inspectedScalingMethodCodes)
        .stream()
        .map(q -> toShellEntry(q, answerOptionsCache, answerDescriptions, load))
        .toList();
  }

  /**
   * Reconstructs the applicable question set as the intersection of active questions, questions
   * mapped to the inspection type, and questions mapped to one of the inspection's scaling methods.
   * Used both to render question shells and to derive the required-question set for validation.
   */
  public List<InspectionQuestion> getApplicableInspectionQuestions(
      String inspectionTypeCode,
      List<String> inspectedScalingMethodCodes) {
    if (inspectionTypeCode == null || inspectedScalingMethodCodes == null || inspectedScalingMethodCodes.isEmpty()) {
      return List.of();
    }

    Set<Long> questionIdsForType = new HashSet<>(
        scaleSiteInspectionRepository.getInspectionQuestionIdsForInspectionType(inspectionTypeCode));
    if (questionIdsForType.isEmpty()) {
      return List.of();
    }

    Set<Long> questionIdsForMethods = new HashSet<>();
    for (String scaleMethodCode : inspectedScalingMethodCodes) {
      String normalizedCode = normalizeCode(scaleMethodCode);
      if (normalizedCode != null) {
        questionIdsForMethods.addAll(
            scaleSiteInspectionRepository.getInspectionQuestionIdsForScaleMethod(normalizedCode));
      }
    }
    if (questionIdsForMethods.isEmpty()) {
      return List.of();
    }

    return scaleSiteInspectionRepository.getActiveInspectionQuestions()
        .stream()
        .filter(question -> question.inspectionQuestionId() != null)
        .filter(question -> questionIdsForType.contains(question.inspectionQuestionId()))
        .filter(question -> questionIdsForMethods.contains(question.inspectionQuestionId()))
        .toList();
  }

  /** Returns the normalized set of valid answer codes for a question. */
  public Set<String> getValidAnswerCodesForQuestion(Long inspectionQuestionId) {
    return new HashSet<>(normalizedValidAnswerCodes(inspectionQuestionId));
  }

  /**
   * Fetches the active valid response codes for a question and normalizes them (uppercased,
   * blanks dropped). The single source of the fetch+normalize rule shared by validation
   * ({@link #getValidAnswerCodesForQuestion}) and answer-option assembly
   * ({@link #loadAnswerOptions}), so the validated answer set and the selectable option set
   * can never diverge.
   */
  private List<String> normalizedValidAnswerCodes(Long inspectionQuestionId) {
    return scaleSiteInspectionRepository.getActiveInspectionValidResponseCodes(inspectionQuestionId)
        .stream()
        .map(this::normalizeCode)
        .filter(Objects::nonNull)
        .toList();
  }

  private InspectionQuestionAndAnswer toQuestionEntry(
      InspectionResponse row,
      Map<Long, String> questionTextCache,
      Map<Long, List<InspectionAnswerOption>> answerOptionsCache,
      Map<String, String> answerDescriptions,
      AnswerOptionLoad load) {
    YesNo followUpRequired = deriveFollowUpRequired(row);
    YesNo followUpCompleted = followUpRequired == YesNo.N
        ? null
        : YesNo.fromCode(row.followUpCompletedInd());
    Long questionId = row.inspectionQuestionId();
    String questionText = questionId == null ? null
        : questionTextCache.computeIfAbsent(
            questionId, scaleSiteInspectionRepository::getInspectionQuestionText);
    List<InspectionAnswerOption> options = load == AnswerOptionLoad.INCLUDE && questionId != null
        ? answerOptionsCache.computeIfAbsent(
            questionId, id -> loadAnswerOptions(id, answerDescriptions))
        : List.of();

    return new InspectionQuestionAndAnswer(
        questionId,
        questionText,
        trimToNull(row.inspectionAnswerCode()),
        descriptionFor(answerDescriptions, row.inspectionAnswerCode()),
        options,
        trimToNull(row.commentsText()),
        followUpRequired,
        trimToNull(row.followUpActionText()),
        row.followUpDueDate(),
        followUpCompleted);
  }

  private InspectionQuestionAndAnswer toShellEntry(
      InspectionQuestion question,
      Map<Long, List<InspectionAnswerOption>> answerOptionsCache,
      Map<String, String> answerDescriptions,
      AnswerOptionLoad load) {
    Long questionId = question.inspectionQuestionId();
    List<InspectionAnswerOption> options = load == AnswerOptionLoad.INCLUDE && questionId != null
        ? answerOptionsCache.computeIfAbsent(
            questionId, id -> loadAnswerOptions(id, answerDescriptions))
        : List.of();
    return new InspectionQuestionAndAnswer(
        questionId,
        trimToNull(question.questionText()),
        null,
        null,
        options,
        null,
        YesNo.N,
        null,
        null,
        null);
  }

  private List<InspectionAnswerOption> loadAnswerOptions(
      Long inspectionQuestionId,
      Map<String, String> answerDescriptions) {
    return normalizedValidAnswerCodes(inspectionQuestionId)
        .stream()
        .distinct()
        .sorted(questionAnswerCodeComparator())
        .map(code -> new InspectionAnswerOption(code, answerDescriptionForCode(code, answerDescriptions)))
        .toList();
  }

  private YesNo deriveFollowUpRequired(InspectionResponse row) {
    boolean hasFollowUpAction = trimToNull(row.followUpActionText()) != null;
    boolean hasFollowUpDueDate = row.followUpDueDate() != null;
    return hasFollowUpAction || hasFollowUpDueDate ? YesNo.Y : YesNo.N;
  }

  private Comparator<String> questionAnswerCodeComparator() {
    return Comparator
        .comparingInt(this::questionAnswerCodeSortOrder)
        .thenComparing(code -> code);
  }

  private int questionAnswerCodeSortOrder(String code) {
    return switch (code) {
      case "Y" -> 0;
      case "N" -> 1;
      case "NA" -> 2;
      default -> 3;
    };
  }

  private String answerDescriptionForCode(String code, Map<String, String> answerDescriptions) {
    String description = answerDescriptions.get(code);
    if (description != null) {
      return description;
    }

    return switch (code) {
      case "Y" -> "Yes";
      case "N" -> "No";
      case "NA" -> "N/A";
      default -> code;
    };
  }

  private String descriptionFor(Map<String, String> descriptions, String code) {
    String normalized = normalizeCode(code);
    return normalized == null ? null : descriptions.get(normalized);
  }

  private String normalizeCode(String code) {
    return upperOrNull(code);
  }
}
