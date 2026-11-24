package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ScaleSiteRiskAssessmentRepository extends AbstractRepository {

  private static final String RISK_SCALE_SITE_VW_PKG = "scs_risk_scale_site_vw_pkg";

  public ScaleSiteRiskAssessmentRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  public List<ScaleSiteRiskAssessmentSearchResult> searchScaleSiteRiskAssessments(
      Long riskQuestionnaireId,
      String riskTypeCode,
      String completeInd,
      String scaleSiteIdNmbr,
      Long versionNo,
      Long orgUnitNo,
      boolean weightScale,
      boolean pieceScale,
      boolean specialForestProduct,
      String ownerClientNumber,
      String ownerClientLocnCode,
      String siteName,
      Integer primarySort,
      Integer secondarySort) {

    return queryCursorCall(
        buildSearchRecsCall(RISK_SCALE_SITE_VW_PKG, 24),
        cs -> ParameterBinder.afterReturn(cs)
            .longValue(riskQuestionnaireId)
            .nullNumeric()                                   // risk_rating
            .string(scaleSiteIdNmbr)
            .longValue(versionNo)
            .nullNumeric()                                   // max_risk_rating
            .nullString()                                    // rating_description
            .string(riskTypeCode)
            .nullString()                                    // code_description
            .nullNumeric()                                   // range_low_value
            .nullNumeric()                                   // range_high_value
            .nullNumeric()                                   // num_resp
            .nullNumeric()                                   // quest_count
            .string(completeInd)
            .longValue(orgUnitNo)
            .nullString()                                    // method_type_code_name
            .string(toLegacyFlag(weightScale))
            .string(toLegacyFlag(pieceScale))
            .string(toLegacyFlag(specialForestProduct))
            .string(ownerClientNumber)
            .string(ownerClientLocnCode)
            .string(siteName)
            .nullString()                                    // district
            .intValue(primarySort)
            .intValue(secondarySort),
        rs -> {
          List<ScaleSiteRiskAssessmentSearchResult> out = new ArrayList<>();
          while (rs.next()) {
            out.add(new ScaleSiteRiskAssessmentSearchResult()
                .riskQuestionnaireId(getLongNullable(rs, "risk_questionnaire_id"))
                .riskRating(rs.getBigDecimal("risk_rating"))
                .scaleSiteIdNmbr(rs.getString("scale_site_id_nmbr"))
                .versionNo(getLongNullable(rs, "version_no"))
                .maxRiskRating(rs.getBigDecimal("max_risk_rating"))
                .ratingDescription(rs.getString("rating_description"))
                .riskTypeCode(rs.getString("risk_type_code"))
                .codeDescription(rs.getString("code_description"))
                .rangeLowValue(getIntNullable(rs, "range_low_value"))
                .rangeHighValue(getIntNullable(rs, "range_high_value"))
                .numResp(rs.getBigDecimal("num_resp"))
                .questCount(rs.getBigDecimal("quest_count"))
                .completeInd(rs.getString("complete_ind"))
                .orgUnitNo(getLongNullable(rs, "org_unit_no"))
                .methodTypeCodeName(rs.getString("method_type_code_name"))
                .ownerClientNumber(rs.getString("owner_client_number"))
                .ownerClientLocnCode(rs.getString("owner_client_locn_code"))
                .siteName(rs.getString("site_name"))
                .district(rs.getString("district")));
          }
          return out;
        });
  }

  public ScaleSiteRiskAssessmentSearchResult getScaleSiteRiskAssessment(Long riskQuestionnaireId) {
    List<ScaleSiteRiskAssessmentSearchResult> matches =
        searchScaleSiteRiskAssessments(
            riskQuestionnaireId,
            /*riskTypeCode*/       null,
            /*completeInd*/        null,
            /*scaleSiteIdNmbr*/    null,
            /*versionNo*/          null,
            /*orgUnitNo*/          null,
            /*weightScale*/        false,
            /*pieceScale*/         false,
            /*specialForestProduct*/ false,
            /*ownerClientNumber*/  null,
            /*ownerClientLocnCode*/ null,
            /*siteName*/           null,
            /*primarySort*/        1,
            /*secondarySort*/      0);
    return matches.isEmpty() ? null : matches.get(0);
  }

  private String toLegacyFlag(boolean selected) {
    return selected ? "Y" : null;
  }
}
