package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.model.HaulMarkAuthorization;
import ca.bc.gov.nrs.scs.backend.repository.HaulMarkAuthorizationRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Searches hauling-mark authorizations — the designations recorded against a timber mark — through
 * {@code scs_haul_mark_auth_srch_vw_pkg}.
 *
 * <p>Not where "does this timber mark exist?" is answered: that is {@link TimberMarkService}, which reads
 * {@code HAULING_AUTHORITY}. A real mark need not have any authorization, so searching here for existence
 * refuses valid marks (UC-RPT-012 defects #4).
 */
@Service
public class HaulMarkAuthorizationService {

  private final HaulMarkAuthorizationRepository repository;

  public HaulMarkAuthorizationService(HaulMarkAuthorizationRepository repository) {
    this.repository = repository;
  }

  public List<HaulMarkAuthorization> searchHaulMarkAuthorizations(
      Long haulingMarkAuthorizationId,
      String timberMark,
      LocalDate effectiveDate,
      LocalDate expiryDate,
      String orgUnitName,
      Integer primarySort,
      Integer secondarySort) {

    // Timber marks are stored upper-case, so normalize the search key before the SP call — a
    // lower-case-but-real mark must not be flagged as "does not exist". Mirrors the convention in
    // MarkSiteDesignationService/WorkbenchService, and matches the site side of the callers'
    // referential checks, which already compares case-insensitively.
    return repository.searchHaulMarkAuthorizations(
        haulingMarkAuthorizationId,
        upperOrNull(timberMark),
        effectiveDate,
        expiryDate,
        orgUnitName,
        primarySort,
        secondarySort);
  }
}

