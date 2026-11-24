package ca.bc.gov.nrs.scs.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteActivityRecord;

@Repository
public class ScaleSiteActivityRepository extends AbstractRepository {

  private static final String ACTIVITY_VW_PKG = "scs_scale_site_activity_vw_pkg";

  public ScaleSiteActivityRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * Returns the activity summary row for a scale site via the view package.
   *
   * <p>{@code search_recs} takes 7 input params, in order:
   * p_scale_site_id_nmbr, p_last_scale_date, p_number_of_samples, p_sample_volume,
   * p_tot_volume, p_primary_sort, p_secondary_sort. With the return cursor registered at index 1,
   * the inputs bind at indices 2..8. Only the site id and sort flags are supplied; the metric
   * params are filter-only and left null so the view computes all values.
   *
   * @return the single activity row for the site, or {@code null} when the cursor is empty
   *     (i.e. the site does not exist).
   */
  public ScaleSiteActivityRecord getActivityForSite(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(ACTIVITY_VW_PKG, 7),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr) // p_scale_site_id_nmbr
            .nullDate()              // p_last_scale_date (filter only)
            .nullNumeric()           // p_number_of_samples (filter only)
            .nullNumeric()           // p_sample_volume (filter only)
            .nullNumeric()           // p_tot_volume (filter only)
            .intValue(1)             // p_primary_sort
            .intValue(2),            // p_secondary_sort
        rs -> {
          if (!rs.next()) {
            return null;
          }
          return new ScaleSiteActivityRecord(
              rs.getString("scale_site_id_nmbr"),
              getLocalDateNullable(rs, "last_scale_date"),
              getLongNullable(rs, "number_of_samples"),
              rs.getBigDecimal("sample_volume"),
              rs.getBigDecimal("tot_volume"));
        });
  }
}
