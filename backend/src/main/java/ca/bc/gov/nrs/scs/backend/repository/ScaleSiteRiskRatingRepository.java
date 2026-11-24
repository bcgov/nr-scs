package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskRatingSummary;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads the risk-assessment summary rows for a scale site's read-only "Risk Rating" tab. Binds the
 * generic {@code scs_risk_summary_vw_pkg} view (shared by scaler / scale site / cruise / waste), which
 * exposes {@code entry_timestamp} (the "Date Created" column) alongside the rating, level, range,
 * outcome ({@code rating_description}) and template version. Mirrors the scaler tab's repository,
 * differing only in the filter column ({@code scale_site_id_nmbr} + {@code scale_site_assessment_ind}).
 */
@Repository
public class ScaleSiteRiskRatingRepository extends AbstractRepository {

  private static final String SCS_RISK_SUMMARY_VW_PKG = "scs_risk_summary_vw_pkg";

  // scs_risk_summary_vw_pkg sort codes: 2 = risk_questionnaire_id (assessment id).
  private static final int SORT_BY_ASSESSMENT_ID = 2;
  private static final int NO_SORT = 0;

  public ScaleSiteRiskRatingRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /** All risk-assessment summaries for a scale site, ordered by assessment id. */
  public List<ScaleSiteRiskRatingSummary> getScaleSiteRiskRatings(String scaleSiteIdNmbr) {
    return queryCursorCall(
        buildSearchRecsCall(SCS_RISK_SUMMARY_VW_PKG, 22),
        cs -> ParameterBinder.afterReturn(cs)
            .nullNumeric()                     // p_risk_rating
            .nullNumeric()                     // p_risk_questionnaire_id
            .string(scaleSiteIdNmbr)           // p_scale_site_id_nmbr
            .nullString()                      // p_scaler_licence_no
            .nullNumeric()                     // p_timber_cruise_plan_id
            .nullNumeric()                     // p_waste_assessment_area_id
            .nullNumeric()                     // p_version_no
            .nullNumeric()                     // p_max_risk_rating
            .nullString()                      // p_rating_description
            .nullString()                      // p_risk_type_code
            .nullString()                      // p_code_description
            .nullNumeric()                     // p_range_low_value
            .nullNumeric()                     // p_range_high_value
            .nullNumeric()                     // p_num_resp
            .nullNumeric()                     // p_quest_count
            .nullString()                      // p_complete_ind
            .nullString()                      // p_timber_cruise_assssmnt_nd
            .string("Y")                       // p_scale_site_assessment_ind (scale site only)
            .nullString()                      // p_scaler_assessment_ind
            .nullString()                      // p_waste_assessment_ind
            .intValue(SORT_BY_ASSESSMENT_ID)   // p_primary_sort
            .intValue(NO_SORT),                // p_secondary_sort
        rs -> {
          List<ScaleSiteRiskRatingSummary> out = new ArrayList<>();
          while (rs.next()) {
            out.add(
                new ScaleSiteRiskRatingSummary()
                    .riskQuestionnaireId(getLongNullable(rs, "risk_questionnaire_id"))
                    .entryTimestamp(getWallClockOffsetDateTimeNullable(rs, "entry_timestamp"))
                    .riskRating(rs.getBigDecimal("risk_rating"))
                    .riskTypeCode(rs.getString("risk_type_code"))
                    .codeDescription(rs.getString("code_description"))
                    .rangeLowValue(getIntNullable(rs, "range_low_value"))
                    .rangeHighValue(getIntNullable(rs, "range_high_value"))
                    .ratingDescription(rs.getString("rating_description"))
                    .versionNo(getLongNullable(rs, "version_no")));
          }
          return out;
        });
  }
}
