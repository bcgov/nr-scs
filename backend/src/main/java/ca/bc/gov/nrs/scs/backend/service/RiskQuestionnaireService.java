package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskAssessmentUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.riskassessment.RiskQuestionResponseInput;
import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentRiskRating;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSection;
import ca.bc.gov.nrs.scs.backend.repository.RiskQuestionnaireRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.RiskAssessmentApiMapper;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * The data-driven questionnaire structure shared by the scaler and scale-site risk assessments.
 * Both features bind an assessment to a template version via {@code risk_questionnaire_template_id}
 * and read/write the same {@code RISK_QUESTIONNAIRE} tables, so the section/question/answer model,
 * the response reconciliation, and the comment handling are identical and live here. The domain
 * services keep only their own header/search composition.
 */
@Service
public class RiskQuestionnaireService {

  private final RiskQuestionnaireRepository repository;

  public RiskQuestionnaireService(RiskQuestionnaireRepository repository) {
    this.repository = repository;
  }

  /** Fetch the questionnaire row (carrying its template id), or null if it does not exist. */
  public QuestionnaireRow findQuestionnaire(Long riskQuestionnaireId) {
    return repository.findQuestionnaire(riskQuestionnaireId);
  }

  /**
   * Read the template + saved responses for an assessment and map them to sections. Translation
   * lives in {@link RiskAssessmentApiMapper}; this method only supplies the freshly-read rows.
   */
  public List<RiskAssessmentSection> buildSections(Long templateId, Long riskQuestionnaireId) {
    return buildSections(repository.getTemplateQa(templateId), riskQuestionnaireId);
  }

  /**
   * Map already-loaded template rows to sections, re-reading only the saved responses. The update
   * path uses this to reuse the {@code templateQa} fetched during the save instead of re-reading
   * the (unchanged) template.
   */
  public List<RiskAssessmentSection> buildSections(
      List<TemplateQaRow> templateQa, Long riskQuestionnaireId) {
    return RiskAssessmentApiMapper.toSections(templateQa, repository.getResponses(riskQuestionnaireId));
  }

  /** Read and map the risk-level threshold rows for a template. */
  public List<RiskAssessmentRiskRating> buildRiskRatings(Long templateId) {
    return RiskAssessmentApiMapper.toRiskRatings(repository.getRiskRatings(templateId));
  }

  /**
   * Find the single active template for a risk template type (e.g. {@code SCLE} for a new scaler
   * assessment — the Consequences (C) / Likelihood (L) format). Mirrors the legacy
   * {@code RiskAssessmentDelegate.findActiveTemplate}: exactly one template must be active for the
   * type, else the create flow cannot proceed.
   */
  public ActiveTemplateRow findActiveTemplate(String riskTemplateType) {
    List<ActiveTemplateRow> active = repository.findActiveTemplates(riskTemplateType).stream()
        .filter(row -> row.templateId() != null)
        .toList();
    if (active.isEmpty()) {
      throw new BadRequestException(
          "No active risk assessment template found for type " + riskTemplateType + ".");
    }
    if (active.size() > 1) {
      throw new ConflictException(
          "Multiple active risk assessment templates found for type " + riskTemplateType + ".");
    }
    return active.get(0);
  }

  /** Read a template's sections/questions/answers with no answer selected (for a create form). */
  public List<RiskAssessmentSection> buildBlankSections(Long templateId) {
    return RiskAssessmentApiMapper.toSections(repository.getTemplateQa(templateId), List.of());
  }

  /** The primary key and bound template of a newly created assessment. */
  public record CreateResult(Long riskQuestionnaireId, Long templateId) {}

  /**
   * Create a new assessment bound to {@code templateId}: insert the {@code RISK_QUESTIONNAIRE} row
   * (owner FK set by {@code scalerLicenceNo} / {@code scaleSiteIdNmbr}, the other left null) and one
   * {@code RISK_QUESTION_RESPONSE} per answered question, in the caller's transaction. Every
   * template question must be answered (a full save, matching the legacy
   * {@code validateAllQuestionResponsesAnswered} rule); each answer must be valid for its question.
   * The risk rating total is derived by the DB views from the saved responses, so it is not written.
   */
  public CreateResult create(
      String scalerLicenceNo,
      String scaleSiteIdNmbr,
      String riskTemplateType,
      Long templateId,
      RiskAssessmentCreateCommand command) {

    List<TemplateQaRow> templateQa = repository.getTemplateQa(templateId);
    Map<Long, Set<Long>> validAnswersByQuestion = validAnswersByQuestion(templateQa);

    List<RiskQuestionResponseInput> inputs =
        validateResponses(command.responses(), validAnswersByQuestion);
    requireAllAnswered(validAnswersByQuestion.keySet(), inputs);

    Long riskQuestionnaireId =
        repository.insertQuestionnaire(
            scalerLicenceNo, scaleSiteIdNmbr, riskTemplateType, templateId, command.comments());

    for (RiskQuestionResponseInput input : inputs) {
      if (input.answerId() != null) {
        repository.insertResponse(riskQuestionnaireId, input.questionId(), input.answerId());
      }
    }

    return new CreateResult(riskQuestionnaireId, templateId);
  }

  /**
   * Every template question must be answered. Shared by {@link #create} and {@link #save}: edit
   * mirrors create — a save that leaves any question blank is rejected before any write.
   *
   * <p>This replaced an earlier, looser edit rule ("at least one answer"). That rule let an edit drop
   * below the questionnaire's lowest risk band, and because the DB risk view (SCS_RISK_SUMMARY_VW)
   * only returns a row whose rating falls inside a band, such an assessment became invisible — it
   * vanished from the Risk Rating tab and every search, and a re-save surfaced a misleading "record
   * not found" 404. Requiring every question answered closes that LOW-end case: a full save always
   * rates at or above the questionnaire's floor, so it can never drop below the lowest band.
   *
   * <p>NB this does NOT make a saved row guaranteed-visible. The view rates by the PRODUCT of each
   * section's summed weights ({@code exp(sum(ln(section_total)))}) while the bands are sized to the
   * SUM of max weights (its own {@code MAX_RISK_RATING}), so a high-weight — but fully answered —
   * assessment rates ABOVE the top band and is still invisible (tpl 5 ranges up to 1890 vs band top
   * 123; tpl 6 up to 3780 vs 141; in the seeded DB 104 fully-answered rows already sit above-band).
   * That high-end overflow is a separate, pre-existing DB-view defect this rule does not and cannot
   * fix (the Oracle view is immutable) — see the RSK {@code defects.md} files.
   */
  private void requireAllAnswered(
      Set<Long> templateQuestionIds, List<RiskQuestionResponseInput> inputs) {
    Set<Long> answered = new HashSet<>();
    for (RiskQuestionResponseInput input : inputs) {
      if (input.answerId() != null) {
        answered.add(input.questionId());
      }
    }
    if (!answered.containsAll(templateQuestionIds)) {
      throw new BadRequestException("All questions must be answered in order to save the assessment.");
    }
  }

  /** What {@link #save} loaded/derived, so the caller can rebuild the detail without re-reading. */
  public record SaveResult(List<TemplateQaRow> templateQa, String comments) {}

  /**
   * Persist the saved answers and comments for an edit. Every template question must be answered
   * ({@link #requireAllAnswered} — edit mirrors create), so a sparse/cleared save is rejected before
   * any write. The request is still reconciled as the full response set — answered questions are
   * inserted/updated, and the clear/omit branches in {@link #persistResponses} remain as a defensive
   * reconcile — but after the all-answered check no question is ever null or omitted on a valid save.
   * The risk rating total is recomputed by the database view from the saved responses, so it is not
   * written directly. Callers should run this transactionally.
   *
   * <p>Comments follow a "present = set, absent = leave unchanged" rule: a provided value (including
   * an explicit empty string, which clears the comment) is written, while an omitted field preserves
   * the stored comment. This removes the old ambiguity where an omitted field was coerced to "" and
   * silently wiped the comment. The UI always sends the box value, so only an API client can omit it.
   *
   * <p>Returns the template rows and the resulting comment it already loaded/derived; the template is
   * unchanged by a save, so the caller can reuse these to rebuild the detail (re-reading only the
   * responses it just wrote) instead of re-fetching everything.
   */
  public SaveResult save(QuestionnaireRow questionnaire, RiskAssessmentUpdateCommand command) {
    List<TemplateQaRow> templateQa = repository.getTemplateQa(questionnaire.templateId());
    Map<Long, Set<Long>> validAnswersByQuestion = validAnswersByQuestion(templateQa);

    List<RiskQuestionResponseInput> inputs =
        validateResponses(command.responses(), validAnswersByQuestion);
    requireAllAnswered(validAnswersByQuestion.keySet(), inputs);
    persistResponses(questionnaire.riskQuestionnaireId(), inputs);

    // "present = set, absent = leave unchanged": a present (already-normalized) comment is written,
    // an omitted one preserves the stored value.
    command.comments().ifPresent(comment -> repository.updateComments(questionnaire, comment));
    String comments = command.comments().orElseGet(questionnaire::comments);
    return new SaveResult(templateQa, comments);
  }

  // --- save helpers -------------------------------------------------------------------------

  private List<RiskQuestionResponseInput> validateResponses(
      List<RiskQuestionResponseInput> inputs, Map<Long, Set<Long>> validAnswersByQuestion) {

    if (inputs == null) {
      return List.of();
    }

    Set<Long> seenQuestions = new HashSet<>();
    for (RiskQuestionResponseInput input : inputs) {
      Long questionId = input.questionId();
      if (questionId == null) {
        throw new BadRequestException("Each response must include a questionId.");
      }
      if (!seenQuestions.add(questionId)) {
        throw new BadRequestException("Duplicate response for questionId " + questionId + ".");
      }
      Set<Long> validAnswers = validAnswersByQuestion.get(questionId);
      if (validAnswers == null) {
        throw new BadRequestException(
            "questionId " + questionId + " is not part of this assessment's template.");
      }
      Long answerId = input.answerId();
      if (answerId != null && !validAnswers.contains(answerId)) {
        throw new BadRequestException(
            "answerId " + answerId + " is not a valid answer for questionId " + questionId + ".");
      }
    }
    return inputs;
  }

  private void persistResponses(Long riskQuestionnaireId, List<RiskQuestionResponseInput> inputs) {

    Map<Long, ResponseRow> existingByQuestion = new HashMap<>();
    for (ResponseRow row : repository.getResponses(riskQuestionnaireId)) {
      if (row.questionId() != null) {
        existingByQuestion.put(row.questionId(), row);
      }
    }

    Set<Long> submittedQuestions = new HashSet<>();
    for (RiskQuestionResponseInput input : inputs) {
      Long questionId = input.questionId();
      Long answerId = input.answerId();
      submittedQuestions.add(questionId);
      ResponseRow existing = existingByQuestion.get(questionId);

      if (answerId == null) {
        if (existing != null) {
          repository.deleteResponse(existing.responseId());
        }
      } else if (existing == null) {
        repository.insertResponse(riskQuestionnaireId, questionId, answerId);
      } else if (!answerId.equals(existing.answerId())) {
        repository.updateResponse(existing.responseId(), riskQuestionnaireId, questionId, answerId);
      }
    }

    // A save replaces the full response set. Any previously-saved response for a question the
    // payload omits (e.g. a question hidden by the template filtering) would otherwise linger and
    // still feed the DB risk total, so delete it to keep stored responses in sync with the save.
    for (Map.Entry<Long, ResponseRow> existing : existingByQuestion.entrySet()) {
      if (!submittedQuestions.contains(existing.getKey())) {
        repository.deleteResponse(existing.getValue().responseId());
      }
    }
  }

  private Map<Long, Set<Long>> validAnswersByQuestion(List<TemplateQaRow> templateQa) {
    Map<Long, Set<Long>> map = new HashMap<>();
    for (TemplateQaRow row : templateQa) {
      if (row.questionId() == null) {
        continue;
      }
      Set<Long> answers = map.computeIfAbsent(row.questionId(), k -> new HashSet<>());
      if (row.answerId() != null) {
        answers.add(row.answerId());
      }
    }
    return map;
  }
}
