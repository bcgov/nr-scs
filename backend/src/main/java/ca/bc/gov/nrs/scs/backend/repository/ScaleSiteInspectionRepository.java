package ca.bc.gov.nrs.scs.backend.repository;

import static ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils.currentUserIdOrSystem;

import java.util.ArrayList;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionBase;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateParams;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionQuestion;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionResponse;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSearchRef;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSummary;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateParams;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactOption;
import oracle.jdbc.OracleTypes;

@Repository
public class ScaleSiteInspectionRepository extends AbstractRepository {

  private static final String SCALE_SITE_INSPECTIONS_PKG = "SCS_SCALE_SITE_INSPCTNS_VW_PKG";
  private static final String SITE_INSPECTION_PKG = "scs_site_inspection_pkg";
  private static final String INSPECTED_SCALING_METHOD_PKG = "SCS_INSPECTED_SCALING_MTHD_PKG";
  private static final String INSPECTION_RESPONSE_PKG = "scs_inspection_response_pkg";
  private static final String INSPECTION_QUESTION_PKG = "scs_inspection_question_pkg";
  private static final String INSPECTION_VALID_RESPONSE_PKG = "scs_inspection_valid_rspns_pkg";
  private static final String INSPECTION_TYPE_QUESTION_PKG = "scs_inspection_type_questn_pkg";
  private static final String SCALING_METHOD_QUESTION_PKG = "scs_scaling_method_questin_pkg";
  private static final String SCALE_SITE_CONTACT_PKG = "scs_scale_site_contact_vw_pkg";

  public ScaleSiteInspectionRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<InspectionSearchRef> searchScaleSiteInspectionByInspectionId(Long inspectionId) {
    return queryScaleSiteInspections(
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()              // p_scale_site_id_nmbr
            .longValue(inspectionId)   // p_inspection_id
            .nullString()              // p_scale_site_inspctn_typ_cd
            .nullString()              // p_inspctn_type_desc
            .nullDate()                // p_hh_data_transfer_timestmp
            .nullString()              // p_hh_data_transfer_userid
            .nullString()              // p_follow_up_id_ind
            .nullString()              // p_owner_client_number
            .nullString()              // p_method_type_desc
            .nullString()              // p_ws
            .nullString()              // p_ps
            .nullString()              // p_sf
            .nullDate()                // p_inspection_date
            .nullString()              // p_inspector
            .nullString()              // p_inspector_euser_guid
            .intValue(0)               // p_primary_sort
            .intValue(0),              // p_secondary_sort
        rs -> {
          List<InspectionSearchRef> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new InspectionSearchRef(
                rs.getString(1),
                getLongNullable(rs, 2)));
          }
          return out;
        });
  }

  public List<InspectionSummary> getScaleSiteInspectionSummaries(String scaleSiteIdNmbr) {
    return queryScaleSiteInspections(
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)   // p_scale_site_id_nmbr
            .longValue(null)           // p_inspection_id
            .nullString()              // p_scale_site_inspctn_typ_cd
            .nullString()              // p_inspctn_type_desc
            .nullDate()                // p_hh_data_transfer_timestmp
            .nullString()              // p_hh_data_transfer_userid
            .nullString()              // p_follow_up_id_ind
            .nullString()              // p_owner_client_number
            .nullString()              // p_method_type_desc
            .nullString()              // p_ws
            .nullString()              // p_ps
            .nullString()              // p_sf
            .nullDate()                // p_inspection_date
            .nullString()              // p_inspector
            .nullString()              // p_inspector_euser_guid
            .intValue(13)              // p_primary_sort
            .intValue(2),              // p_secondary_sort
        rs -> {
          List<InspectionSummary> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new InspectionSummary(
                rs.getString(1),
                getLongNullable(rs, 2),
                rs.getString(4),
                rs.getString(9),
                getLocalDateNullable(rs, 13),
                rs.getString(15),
                rs.getString(7)));
          }
          return out;
        });
  }

  public boolean isInspectionViewableInCims(Long inspectionId) {
    Boolean result = getInspectionReport(inspectionId, rs -> rs != null && rs.next());
    return Boolean.TRUE.equals(result);
  }

  public InspectionBase getScaleSiteInspectionDetailBase(Long inspectionId) {
    return getInspectionReport(inspectionId, rs -> {
      if (rs == null || !rs.next()) {
        return null;
      }

      return new InspectionBase(
          rs.getString(5),
          rs.getString(1),
          rs.getString(6),
          getLocalDateNullable(rs, "inspection_date"),
          rs.getString(3),
          rs.getString(4),
          getLongNullable(rs, "follow_up_to_inspection_id"),
          rs.getString(8),
          rs.getString(9),
          rs.getString(10),
          rs.getString(13));
    });
  }

  public List<String> getInspectedScalingMethodCodes(Long inspectionId) {
    return querySearchRecs(
        INSPECTED_SCALING_METHOD_PKG,
        4,
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionId)   // p_inspection_id
            .nullString()              // p_scale_method_type_code
            .nullString()              // p_entry_userid
            .nullString(),             // p_update_userid
        rs -> {
          List<String> out = new ArrayList<>();
          while (rs.next()) {
            out.add(rs.getString(2));
          }
          return out;
        });
  }

  public List<InspectionResponse> getInspectionResponses(Long inspectionId) {
    return querySearchRecs(
        INSPECTION_RESPONSE_PKG,
        9,
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionId)   // p_inspection_id
            .longValue(null)           // p_inspection_question_id
            .nullString()              // p_inspection_answer_code
            .nullString()              // p_comments_text
            .nullString()              // p_follow_up_action_txt
            .nullDate()                // p_follow_up_due_date
            .nullString()              // p_follow_up_completed_ind
            .nullString()              // p_entry_userid
            .nullString(),             // p_update_userid
        rs -> {
          List<InspectionResponse> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new InspectionResponse(
                getLongNullable(rs, "inspection_question_id"),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5),
                getLocalDateNullable(rs, "follow_up_due_date"),
                rs.getString(7)));
          }
          return out;
        });
  }

  public String getInspectionQuestionText(Long inspectionQuestionId) {
    return queryCursorCall(buildSelectRecCall(INSPECTION_QUESTION_PKG, 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionQuestionId), // in_inspection_question_id
        rs -> (rs == null || !rs.next()) ? null : rs.getString(2));
  }

  public List<String> getActiveInspectionValidResponseCodes(Long inspectionQuestionId) {
    return querySearchRecs(
        INSPECTION_VALID_RESPONSE_PKG,
        6,
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionQuestionId) // p_inspection_question_id
            .nullString()                    // p_inspection_answer_code
            .nullDate()                      // p_effective_date
            .nullDate()                      // p_expiry_date
            .nullString()                    // p_entry_userid
            .nullString(),                   // p_update_userid
        rs -> {
          List<String> out = new ArrayList<>();
          while (rs.next()) {
            out.add(rs.getString(2));
          }
          return out;
        });
  }

  public List<InspectionQuestion> getActiveInspectionQuestions() {
    return queryCursorCall(buildSearchRecsCall(INSPECTION_QUESTION_PKG, 8),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(null)   // p_inspection_question_id
            .nullString()      // p_question_text
            .nullString()      // p_comment_required_ind
            .nullNumeric()     // p_sort_order_no
            .nullDate()        // p_effective_date
            .nullDate()        // p_expiry_date
            .nullString()      // p_entry_userid
            .nullString(),     // p_update_userid
        rs -> {
          List<InspectionQuestion> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new InspectionQuestion(
                getLongNullable(rs, 1),
                rs.getString(2)));
          }
          return out;
        });
  }

  public List<Long> getInspectionQuestionIdsForInspectionType(String inspectionTypeCode) {
    return queryCursorCall(buildSearchRecsCall(INSPECTION_TYPE_QUESTION_PKG, 4),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(null)              // p_inspection_question_id
            .string(inspectionTypeCode)   // p_scale_site_inspctn_typ_cd
            .nullString()                 // p_entry_userid
            .nullString(),                // p_update_userid
        rs -> {
          List<Long> out = new ArrayList<>();
          while (rs.next()) {
            Long questionId = getLongNullable(rs, 1);
            if (questionId != null) {
              out.add(questionId);
            }
          }
          return out;
        });
  }

  public List<Long> getInspectionQuestionIdsForScaleMethod(String scaleMethodTypeCode) {
    return queryCursorCall(buildSearchRecsCall(SCALING_METHOD_QUESTION_PKG, 4),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(null)               // p_inspection_question_id
            .string(scaleMethodTypeCode)   // p_scale_method_type_code
            .nullString()                  // p_entry_userid
            .nullString(),                 // p_update_userid
        rs -> {
          List<Long> out = new ArrayList<>();
          while (rs.next()) {
            Long questionId = getLongNullable(rs, 1);
            if (questionId != null) {
              out.add(questionId);
            }
          }
          return out;
        });
  }

  public List<ScaleSiteContactOption> getScaleSiteContactOptions(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(SCALE_SITE_CONTACT_PKG, 11),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(null)            // p_client_contact_id
            .string(scaleSiteIdNmbr)    // p_scale_site_id_nmbr
            .nullString()               // p_primary_contact_ind
            .nullString()               // p_contact_name
            .nullString()               // p_contact_role_desc
            .nullString()               // p_business_phone
            .nullString()               // p_fax_number
            .nullString()               // p_email_address
            .nullString()               // p_site_information_accss_nd
            .intValue(2)                // p_primary_sort
            .intValue(3),               // p_secondary_sort
        rs -> {
          List<ScaleSiteContactOption> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ScaleSiteContactOption(
                getLongNullable(rs, "client_contact_id"),
                rs.getString("contact_name")));
          }
          return out;
        });
  }

  public Long createScaleSiteInspectionBase(InspectionCreateParams params) {
    return queryOutParamsCall(
        buildProcedureCall(SITE_INSPECTION_PKG, "create_inspection_report", 12),
        cs -> {
          ParameterBinder.fromStart(cs)
              .date(params.inspectionDate())             // p_inspection_date
              .string(params.inspectorUserGuid())        // p_inspector_user_guid
              .string(params.scaleSiteIdNmbr())          // p_scale_site_id_nmbr
              .string(params.siteOperatorPresentInd())   // p_site_operator_present_ind
              .string(null)                               // p_unused
              .string(null)                               // p_unused
              .string(params.comments())                 // p_comments
              .string(params.inspectionTypeCode())       // p_inspection_type_code
              .nullNumeric()                              // p_unused numeric
              .longValue(params.previousInspectionId())  // p_previous_inspection_id (null-safe)
              .string(params.recipient());               // p_recipient
          cs.registerOutParameter(12, OracleTypes.NUMBER);
        },
        cs -> cs.getLong(12));
  }

  public void insertInspectedScalingMethod(Long inspectionId, String scaleMethodTypeCode) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(buildInsertRecCall(INSPECTED_SCALING_METHOD_PKG, 4),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionId)        // in_inspection_id
            .string(scaleMethodTypeCode)    // in_scale_method_type_code
            .string(userId)                 // in_entry_userid
            .string(userId),                // in_update_userid
        rs -> null);
  }

  public void updateScaleSiteInspectionBase(InspectionUpdateParams params) {
    executeVoidCall(buildProcedureCall(SITE_INSPECTION_PKG, "update_inspection_report", 5),
        cs -> ParameterBinder.fromStart(cs)
            .date(params.inspectionDate())           // inspectionDate
            .string(params.inspector())              // inspector
            .string(params.siteOperatorPresentInd()) // siteOperatorPresentInd
            .string(params.comments())               // comments
            .longValue(params.inspectionId()));
  }

  public void deleteInspectionResponse(Long inspectionId, Long inspectionQuestionId, String inspectionAnswerCode) {
    executeVoidCall(buildDeleteRecCall(INSPECTION_RESPONSE_PKG, 3),
        cs -> ParameterBinder.fromStart(cs)
            .longValue(inspectionId)              // in_inspection_id
            .longValue(inspectionQuestionId)      // in_inspection_question_id
            .string(inspectionAnswerCode));
  }

  public void deleteScaleSiteInspection(Long inspectionId) {
    executeVoidCall(buildProcedureCall(SITE_INSPECTION_PKG, "delete_inspection_report", 1),
        cs -> ParameterBinder.fromStart(cs)
            .longValue(inspectionId)); // inspectionId
  }

  public void insertInspectionResponse(Long inspectionId, InspectionResponse row) {
    final String userId = currentUserIdOrSystem();
    queryCursorCall(buildInsertRecCall(INSPECTION_RESPONSE_PKG, 9),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionId)              // in_inspection_id
            .longValue(row.inspectionQuestionId()) // in_inspection_question_id
            .string(row.inspectionAnswerCode())   // in_inspection_answer_code
            .string(row.commentsText())           // in_comments_text
            .string(row.followUpActionText())     // in_follow_up_action_txt
            .date(row.followUpDueDate())          // in_follow_up_due_date
            .string(row.followUpCompletedInd())   // in_follow_up_completed_ind
            .string(userId)                       // in_entry_userid
            .string(userId),                      // in_update_userid
        rs -> null);
  }

  private <T> T queryScaleSiteInspections(StatementBinder binder, ResultSetMapper<T> mapper) {
    return queryCursorCall(buildSearchRecsCall(SCALE_SITE_INSPECTIONS_PKG, 17), binder, mapper);
  }

  private <T> T getInspectionReport(Long inspectionId, ResultSetMapper<T> mapper) {
    return queryCursorCall(
        buildFunctionCall(SITE_INSPECTION_PKG, "get_inspection_report", 1),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(inspectionId), // inspectionId
        mapper);
  }


}
