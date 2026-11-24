package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSoftwareRecord;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ScaleSiteSoftwareRepository extends AbstractRepository {

  private static final String SITE_SOFTWARE_VW_PKG = "scs_site_software_vw_pkg";

  public ScaleSiteSoftwareRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * Lists the scaling software products/versions used to submit returns at a scale site, backing the
   * legacy Software tab. Calls {@code scs_site_software_vw_pkg.search_recs} bound by
   * {@code scale_site_id_nmbr} (parameter position 2), with the remaining search filters left null.
   * Sorted by last used date (primary sort 7, descending), then software version (secondary sort 3,
   * ascending) — matching the legacy {@code ScaleSiteDelegate.loadScaleSiteSoftwareList}.
   */
  public List<ScaleSiteSoftwareRecord> listByScaleSite(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(SITE_SOFTWARE_VW_PKG, 9),
        cs -> ParameterBinder.afterReturn(cs)
            .string(scaleSiteIdNmbr)       // p_scale_site_id_nmbr
            .nullString()                  // p_software_product
            .nullString()                  // p_software_version
            .nullString()                  // p_software_revision
            .nullString()                  // p_return_type
            .nullNumeric()                 // p_return_count
            .nullDate()                    // p_last_used_date
            .intValue(7)                   // p_primary_sort: last_used_date DESC
            .intValue(3),                  // p_secondary_sort: software_version ASC
        rs -> {
          List<ScaleSiteSoftwareRecord> rows = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              rows.add(new ScaleSiteSoftwareRecord(
                  rs.getString("software_product"),
                  rs.getString("software_version"),
                  rs.getString("software_revision"),
                  rs.getString("return_type"),
                  getLongNullable(rs, "return_count"),
                  getLocalDateNullable(rs, "last_used_date")));
            }
          }
          return rows;
        });
  }
}
