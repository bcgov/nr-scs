package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ScalerRiskAssessmentRepository extends AbstractRepository {

  private static final String SCS_RISK_SCALER_VW_PKG = "scs_risk_scaler_vw_pkg";

  public ScalerRiskAssessmentRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<ScalerRiskAssessmentSearchResult> searchScalerRiskAssessments(
      Long riskQuestionnaireId,
      String riskTypeCode,
      String completeInd,
      String scalerLicenceNo,
      Long orgUnitNo,
      String clientNumber,
      String scalerLicenceTypeCode,
      Integer primarySort,
      Integer secondarySort) {

    return queryCursorCall(
        buildSearchRecsCall(SCS_RISK_SCALER_VW_PKG, 24),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(riskQuestionnaireId)
            .nullNumeric()                    // risk_rating
            .string(scalerLicenceNo)
            .nullNumeric()                    // version_no
            .nullNumeric()                    // max_risk_rating
            .nullString()                     // rating_description
            .string(riskTypeCode)
            .nullString()                     // code_description
            .nullNumeric()                    // range_low_value
            .nullNumeric()                    // range_high_value
            .nullNumeric()                    // num_resp
            .nullNumeric()                    // quest_count
            .string(completeInd)
            .nullString()                     // org_unit_name
            .longValue(orgUnitNo)
            .string(clientNumber)
            .nullString()                     // client_name
            .nullString()                     // licence_type
            .nullString()                     // scaler_client_loc
            .nullString()                     // scalar_training_type
            .string(scalerLicenceTypeCode)
            .nullString()                     // scaler_appointment_type
            .intValue(primarySort)
            .intValue(secondarySort),
        rs -> {
          List<ScalerRiskAssessmentSearchResult> out = new ArrayList<>();
          while (rs.next()) {
            out.add(
                new ScalerRiskAssessmentSearchResult()
                    .riskQuestionnaireId(getLongNullable(rs, "risk_questionnaire_id"))
                    .riskRating(rs.getBigDecimal("risk_rating"))
                    .maxRiskRating(rs.getBigDecimal("max_risk_rating"))
                    .numResp(rs.getBigDecimal("num_resp"))
                    .questCount(rs.getBigDecimal("quest_count"))
                    .riskTypeCode(rs.getString("risk_type_code"))
                    .codeDescription(rs.getString("code_description"))
                    .rangeLowValue(getIntNullable(rs, "range_low_value"))
                    .rangeHighValue(getIntNullable(rs, "range_high_value"))
                    .versionNo(getLongNullable(rs, "version_no"))
                    .scalerLicenceNo(rs.getString("scaler_licence_no"))
                    .scalerClientLoc(rs.getString("scaler_client_loc"))
                    .orgUnitName(rs.getString("org_unit_name"))
                    .clientName(rs.getString("client_name")));
          }
          return out;
        });
  }

  public ScalerRiskAssessmentSearchResult getScalerRiskAssessment(Long riskQuestionnaireId) {
    List<ScalerRiskAssessmentSearchResult> matches =
        searchScalerRiskAssessments(riskQuestionnaireId, null, null, null, null, null, null, 1, 0);
    return matches.isEmpty() ? null : matches.get(0);
  }
}
