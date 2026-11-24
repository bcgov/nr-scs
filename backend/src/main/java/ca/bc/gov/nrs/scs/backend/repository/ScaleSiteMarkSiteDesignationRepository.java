package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.MarkSiteDesignationSummary;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ScaleSiteMarkSiteDesignationRepository extends AbstractRepository {

  private static final String MSD_VW_PKG = "scs_msd_vw_pkg";

  public ScaleSiteMarkSiteDesignationRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * Lists the timber marks designated to a scale site, backing the legacy MSD tab. Calls
   * {@code scs_msd_vw_pkg.search_recs} bound by {@code scale_site_id_nmbr} (parameter position 3),
   * with the timber-mark and owner filters left null. Sorted by timber mark (primary sort 1).
   */
  public List<MarkSiteDesignationSummary> listByScaleSite(String scaleSiteIdNmbr) {
    return queryCursorCall(buildSearchRecsCall(MSD_VW_PKG, 5),
        cs -> ParameterBinder.afterReturn(cs)
            .nullString()                  // p_timber_mark
            .string(scaleSiteIdNmbr)       // p_scale_site_id_nmbr
            .nullString()                  // p_owner_cli_number
            .intValue(1)                   // p_primary_sort: timber_mark
            .intValue(0),                  // p_secondary_sort: none
        rs -> {
          List<MarkSiteDesignationSummary> rows = new ArrayList<>();
          if (rs != null) {
            while (rs.next()) {
              rows.add(new MarkSiteDesignationSummary(
                  rs.getString("timber_mark"),
                  rs.getString("scale_site_id_nmbr"),
                  rs.getString("owner_cli_number")));
            }
          }
          return rows;
        });
  }
}
