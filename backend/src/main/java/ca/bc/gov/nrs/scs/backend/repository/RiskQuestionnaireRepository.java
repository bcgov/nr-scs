package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.RiskRatingRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads and writes the data-driven structure of a risk assessment (scaler or scale site). The
 * questionnaire instance ({@code RISK_QUESTIONNAIRE}) is bound to a specific template version via
 * {@code risk_questionnaire_template_id}; the template version defines the sections, questions,
 * answers, and risk-level thresholds. Nothing about the structure is hardcoded here - it all comes
 * from the template the assessment points at, so this repository is shared by both risk-assessment
 * features (the underlying Oracle packages are common to both).
 */
@Repository
public class RiskQuestionnaireRepository extends AbstractRepository {

  private static final String QUESTIONNAIRE_PKG = "scs_risk_questionnaire_pkg";
  private static final String TEMPLATE_QA_VW_PKG = "scs_risk_tmplt_qa_vw_pkg";
  private static final String QUESTION_RESPONSE_PKG = "scs_risk_question_respons_pkg";
  private static final String RISK_RATING_VW_PKG = "scs_risk_rating_vw_pkg";
  private static final String TEMPLATE_PKG = "scs_risk_questionnr_tmplt_pkg";

  /**
   * Legacy marker on retired answers (see the original ScsQuestionnaire tag /
   * RiskAssessmentDelegate): these are hidden from the questionnaire. A question whose answers are
   * all obsolete then has no surviving rows and drops out of the page entirely.
   */
  private static final String OBSOLETE_ANSWER_MARKER = "[OBSOLETE - DO NOT USE]";

  public RiskQuestionnaireRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /** Fetch the questionnaire row (including its template id) by primary key. */
  public QuestionnaireRow findQuestionnaire(Long riskQuestionnaireId) {
    return queryCursorCall(
        buildSelectRecCall(QUESTIONNAIRE_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(riskQuestionnaireId),
        rs -> {
          if (!rs.next()) {
            return null;
          }
          return new QuestionnaireRow(
              getLongNullable(rs, "risk_questionnaire_id"),
              getLocalDateNullable(rs, "start_questionnaire_date"),
              getLocalDateNullable(rs, "completed_questionnaire_date"),
              rs.getString("comments_text"),
              rs.getString("scaler_licence_no"),
              getLongNullable(rs, "waste_assessment_area_id"),
              rs.getString("scale_site_id_nmbr"),
              getLongNullable(rs, "timber_cruise_plan_id"),
              rs.getString("risk_template_type"),
              getLongNullable(rs, "risk_questionnaire_template_id"),
              getLongNullable(rs, "timber_cruise_participant_id"),
              rs.getString("check_recommend_ind"),
              rs.getString("cruise_plan_stage_code"),
              getOffsetDateTimeNullable(rs, "entry_timestamp"),
              rs.getString("entry_userid"),
              getOffsetDateTimeNullable(rs, "update_timestamp"),
              rs.getString("update_userid"),
              getLongNullable(rs, "revision_count"));
        });
  }

  /** Fetch all sections/questions/answers for a template version. Sorted in Java. */
  public List<TemplateQaRow> getTemplateQa(Long templateId) {
    if (templateId == null) {
      return new ArrayList<>();
    }
    return queryCursorCall(
        buildSearchRecsCall(TEMPLATE_QA_VW_PKG, 15),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(templateId)  // p_risk_questionnair_tmplt_d
            .nullString()           // p_template_description
            .nullNumeric()          // p_version_no
            .nullNumeric()          // p_risk_template_section_id
            .nullString()           // p_section_description
            .nullNumeric()          // p_section_order
            .nullNumeric()          // p_risk_question_id
            .nullString()           // p_question_text
            .nullNumeric()          // p_question_order
            .nullNumeric()          // p_risk_valid_answer_id
            .nullString()           // p_answer_text
            .nullNumeric()          // p_answer_weighting
            .nullNumeric()          // p_answer_order
            .nullNumeric()          // p_primary_sort
            .nullNumeric(),         // p_secondary_sort
        rs -> {
          List<TemplateQaRow> rows = new ArrayList<>();
          // Mirrors the legacy view path (RiskAssessmentDelegate.findTemplateAnswers...): retired
          // answers are dropped, then answer texts already seen on an earlier question are dropped
          // (a template-wide de-dup). A question left with no answers then drops out entirely.
          Set<String> seenAnswerText = new HashSet<>();
          while (rs.next()) {
            String answerText = rs.getString("answer_text");
            if (answerText != null && answerText.contains(OBSOLETE_ANSWER_MARKER)) {
              continue;
            }
            if (answerText != null && !seenAnswerText.add(answerText)) {
              continue;
            }
            rows.add(
                new TemplateQaRow(
                    getLongNullable(rs, "risk_template_section_id"),
                    rs.getString("section_description"),
                    getIntNullable(rs, "section_order"),
                    getLongNullable(rs, "risk_question_id"),
                    rs.getString("question_text"),
                    getIntNullable(rs, "question_order"),
                    getLongNullable(rs, "risk_valid_answer_id"),
                    answerText,
                    getIntNullable(rs, "answer_weighting"),
                    getIntNullable(rs, "answer_order")));
          }
          return rows;
        });
  }

  /** Fetch the saved responses (question -> selected answer) for an assessment. */
  public List<ResponseRow> getResponses(Long riskQuestionnaireId) {
    return queryCursorCall(
        buildSearchRecsCall(QUESTION_RESPONSE_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                    // p_risk_question_response_id
            .nullString()                     // p_entry_userid
            .nullString()                     // p_update_userid
            .longValue(riskQuestionnaireId)   // p_risk_questionnaire_id
            .nullNumeric()                    // p_risk_question_id
            .nullNumeric(),                   // p_risk_valid_answer_id
        rs -> {
          List<ResponseRow> rows = new ArrayList<>();
          while (rs.next()) {
            rows.add(
                new ResponseRow(
                    getLongNullable(rs, "risk_question_response_id"),
                    getLongNullable(rs, "risk_question_id"),
                    getLongNullable(rs, "risk_valid_answer_id")));
          }
          return rows;
        });
  }

  /** Fetch the risk-level thresholds for a template version. */
  public List<RiskRatingRow> getRiskRatings(Long templateId) {
    if (templateId == null) {
      return new ArrayList<>();
    }
    return queryCursorCall(
        buildSearchRecsCall(RISK_RATING_VW_PKG, 11),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()          // p_risk_rating_id
            .nullString()           // p_rating_description
            .nullString()           // p_code_description
            .nullNumeric()          // p_range_low_value
            .nullNumeric()          // p_range_high_value
            .nullString()           // p_risk_type_code
            .longValue(templateId)  // p_risk_questionnair_tmplt_d
            .nullDate()             // p_effective_date
            .nullDate()             // p_expiry_date
            .nullNumeric()          // p_primary_sort
            .nullNumeric(),         // p_secondary_sort
        rs -> {
          List<RiskRatingRow> rows = new ArrayList<>();
          while (rs.next()) {
            rows.add(
                new RiskRatingRow(
                    rs.getString("risk_type_code"),
                    rs.getString("code_description"),
                    rs.getString("rating_description"),
                    getIntNullable(rs, "range_low_value"),
                    getIntNullable(rs, "range_high_value")));
          }
          return rows;
        });
  }

  /**
   * Fetch the currently active template(s) for a risk template type (e.g. {@code SCLE} for scaler).
   * "Active" is defined by the effective/expiry-date window in
   * {@code scs_risk_questionnr_tmplt_pkg.search_active_recs} (effective_date &lt;= sysdate and
   * expiry_date null or &gt; sysdate). Callers enforce the "exactly one active" rule.
   */
  public List<ActiveTemplateRow> findActiveTemplates(String riskTemplateType) {
    return queryCursorCall(
        buildFunctionCall(TEMPLATE_PKG, "search_active_recs", 8),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()            // p_risk_questionnair_tmplt_d
            .nullString()             // p_version_description
            .nullNumeric()            // p_version_no
            .nullDate()               // p_effective_date
            .nullDate()               // p_expiry_date
            .string(riskTemplateType) // p_risk_template_type
            .nullString()             // p_entry_userid
            .nullString(),            // p_update_userid
        rs -> {
          List<ActiveTemplateRow> rows = new ArrayList<>();
          while (rs.next()) {
            rows.add(
                new ActiveTemplateRow(
                    getLongNullable(rs, "risk_questionnaire_template_id"),
                    getLongNullable(rs, "version_no"),
                    rs.getString("risk_template_type")));
          }
          return rows;
        });
  }

  /**
   * Insert a new {@code RISK_QUESTIONNAIRE} row and return its generated primary key. Mirrors the
   * legacy create path (scaler assessment): only the owner FK, template type, template id, comments
   * and audit user ids are set; the start/completed dates and the derived rating are left to the
   * views. The PK / timestamps / revision are populated by the DB sequence/trigger, and
   * {@code insert_rec} returns the inserted row so we can read the new id.
   */
  public Long insertQuestionnaire(
      String scalerLicenceNo,
      String scaleSiteIdNmbr,
      String riskTemplateType,
      Long templateId,
      String comments) {
    final String userId = currentUserIdOrSystem();
    return queryCursorCall(
        buildInsertRecCall(QUESTIONNAIRE_PKG, 15),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()             // in_risk_questionnaire_id (trigger generates)
            .nullDate()                // in_start_questionnaire_date
            .nullDate()                // in_completed_questionnair_dt
            .string(comments)          // in_comments_text
            .string(scalerLicenceNo)   // in_scaler_licence_no
            .nullNumeric()             // in_waste_assessment_area_id
            .string(scaleSiteIdNmbr)   // in_scale_site_id_nmbr
            .nullNumeric()             // in_timber_cruise_plan_id
            .string(riskTemplateType)  // in_risk_template_type
            .longValue(templateId)     // in_risk_questionnair_tmplt_d
            .nullNumeric()             // in_tmbr_cruise_participant_id
            .nullString()              // in_check_recommend_ind
            .nullString()              // in_cruise_plan_stage_code
            .string(userId)            // in_entry_userid
            .string(userId),           // in_update_userid
        rs -> {
          if (!rs.next()) {
            throw new SQLException("Insert of risk questionnaire did not return a row.");
          }
          return getLongNullable(rs, "risk_questionnaire_id");
        });
  }

  /**
   * Update the comments on the questionnaire, preserving every other field. The risk rating total
   * itself is derived by the view from the saved responses, so only comments and audit fields
   * change here.
   */
  public void updateComments(QuestionnaireRow existing, String comments) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(
        buildUpdateRecCall(QUESTIONNAIRE_PKG, 15),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(existing.riskQuestionnaireId())
            .date(existing.startQuestionnaireDate())
            .date(existing.completedQuestionnaireDate())
            .string(comments)
            .string(existing.scalerLicenceNo())
            .longValue(existing.wasteAssessmentAreaId())
            .string(existing.scaleSiteIdNmbr())
            .longValue(existing.timberCruisePlanId())
            .string(existing.riskTemplateType())
            .longValue(existing.templateId())
            .longValue(existing.timberCruiseParticipantId())
            .string(existing.checkRecommendInd())
            .string(existing.cruisePlanStageCode())
            .string(userId)  // entry_userid (preserved by package if applicable)
            .string(userId), // update_userid
        rs -> null);
  }

  /** Insert a new response. The PK is sequence-generated by a DB trigger. */
  public void insertResponse(Long riskQuestionnaireId, Long questionId, Long answerId) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(
        buildInsertRecCall(QUESTION_RESPONSE_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                  // in_risk_question_response_id (trigger generates)
            .string(userId)                 // in_entry_userid
            .string(userId)                 // in_update_userid
            .longValue(riskQuestionnaireId)
            .longValue(questionId)
            .longValue(answerId),
        rs -> {
          if (!rs.next()) {
            throw new SQLException("Insert of risk question response did not return a row.");
          }
          return null;
        });
  }

  /** Update an existing response to a new answer. */
  public void updateResponse(
      Long responseId, Long riskQuestionnaireId, Long questionId, Long answerId) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(
        buildUpdateRecCall(QUESTION_RESPONSE_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(responseId)
            .string(userId)                 // in_entry_userid
            .string(userId)                 // in_update_userid
            .longValue(riskQuestionnaireId)
            .longValue(questionId)
            .longValue(answerId),
        rs -> null);
  }

  /** Delete a response (used when a previously-answered question is cleared). */
  public void deleteResponse(Long responseId) {
    executeVoidCall(
        buildDeleteRecCall(QUESTION_RESPONSE_PKG, 1),
        cs -> ParameterBinder.fromStart(cs)
            .longValue(responseId));
  }
}
