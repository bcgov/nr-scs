package ca.bc.gov.nrs.scs.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Read access to {@code HAULING_AUTHORITY} — the table of real timber marks — through the legacy
 * {@code scs_hauling_authority_pkg}.
 *
 * <p>This is the source legacy's timber-mark existence checks read: {@code ReportValidator.doesMarkExist}
 * (the Mark Site Designation and Designated Marks Exception reports) and {@code
 * MarkSiteBo.validateTimberMark} (check scales) both go through {@code HaulingAuthorityDb.search}. Note the
 * misleading legacy name: {@code HaulingMarkAuthorityDelegate.findByTimberMark} reads THIS table, not the
 * hauling-mark-authorization view. A mark can be a valid hauling authority without any hauling-mark
 * authorization (the record a mark-site designation creates).
 */
@Repository
public class HaulingAuthorityRepository extends AbstractRepository {

  private static final String HAULING_AUTHORITY_PKG = "scs_hauling_authority_pkg";

  public HaulingAuthorityRepository(JdbcTemplate jdbcTemplate) {
    super(jdbcTemplate);
  }

  /**
   * Whether {@code HAULING_AUTHORITY} holds the given timber mark.
   *
   * <p>Calls {@code search_recs(p_timber_mark, p_forest_file_id, p_marking_method_code,
   * p_marking_instrument_code, p_update_userid, p_entry_userid)} with only the mark set — exactly legacy
   * {@code HaulingAuthorityDb.search} with a mark-only DTO — and treats any row as a hit. The procedure
   * matches with {@code timber_mark LIKE p_timber_mark} and no {@code ESCAPE} clause, so this is an exact match
   * only when the mark holds no SQL wildcard ({@code %}, {@code _}) — which {@code TimberMarkService} ensures
   * before calling it.
   */
  public boolean timberMarkExists(String timberMark) {
    return queryCursorCall(buildSearchRecsCall(HAULING_AUTHORITY_PKG, 6),
        cs -> ParameterBinder.afterReturn(cs)
            .string(timberMark)
            .nullString()
            .nullString()
            .nullString()
            .nullString()
            .nullString(),
        rs -> rs != null && rs.next());
  }
}
