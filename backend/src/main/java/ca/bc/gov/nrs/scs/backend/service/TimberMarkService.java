package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.repository.HaulingAuthorityRepository;
import org.springframework.stereotype.Service;

/**
 * Timber marks themselves — whether a mark exists — as distinct from what is recorded ABOUT a mark (its
 * hauling-mark authorizations, i.e. designations, which {@link HaulMarkAuthorizationService} searches).
 *
 * <p>Keep the two apart: a mark exists when {@code HAULING_AUTHORITY} holds it, whether or not it has any
 * hauling-mark authorization. Conflating them is how this rule went wrong — the legacy class that does this
 * lookup is misleadingly named {@code HaulingMarkAuthorityDelegate}, yet reads {@code HAULING_AUTHORITY}, and
 * the rule was first ported against the authorization view (UC-RPT-012 defects #4, UC-RPT-005 #3,
 * UC-CHK-005 #1).
 */
@Service
public class TimberMarkService {

  private final HaulingAuthorityRepository haulingAuthorityRepository;

  public TimberMarkService(HaulingAuthorityRepository haulingAuthorityRepository) {
    this.haulingAuthorityRepository = haulingAuthorityRepository;
  }

  /**
   * Whether a hauling authority exists for the given timber mark — the timber-mark existence rule shared by
   * the check-scale writes and the Mark Site Designation / Designated Marks Exception reports.
   *
   * <p>Reads {@code HAULING_AUTHORITY}, as legacy did: {@code MarkSiteBo.validateTimberMark} and {@code
   * ReportValidator.doesMarkExist} both search {@code HaulingAuthorityDb}. It also matches the DB:
   * {@code CHECK_SCALE.TIMBER_MARK}'s FK ({@code CKSC_HAA_FK}) references {@code HAULING_AUTHORITY}, so a hit
   * here still means a check-scale write won't trip the FK.
   *
   * <p>The mark is folded to upper case first (marks are stored upper-case) so a lower-case-but-real mark is
   * not flagged — the app-wide convention, not a legacy behaviour. Blank input is treated as "not found".
   *
   * <p>A value holding a SQL wildcard ({@code %} or {@code _}) is "not found" without a lookup. The procedure
   * matches {@code timber_mark LIKE p_timber_mark} with no {@code ESCAPE} clause, so a wildcard can't be
   * escaped, and {@code %} would match every row — legacy accepted it, but legacy never exposed the lookup on
   * its own endpoint. Timber marks are letters and digits, so no real mark is refused.
   */
  public boolean timberMarkExists(String timberMark) {
    if (isBlank(timberMark) || containsLikeWildcard(timberMark)) {
      return false;
    }
    return haulingAuthorityRepository.timberMarkExists(upperOrNull(timberMark));
  }

  private static boolean containsLikeWildcard(String value) {
    return value.indexOf('%') >= 0 || value.indexOf('_') >= 0;
  }
}
