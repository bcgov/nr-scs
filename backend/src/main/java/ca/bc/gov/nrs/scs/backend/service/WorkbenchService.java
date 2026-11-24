package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.resolveSort;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScaleSiteAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScalerAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.model.AuthorizationRenewResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.repository.WorkbenchRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.WorkbenchApiMapper;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Application service for the authorization workbench page. Owns both the renewal of expiring
 * authorizations (shared {@code scs_scale_workbench_pkg}) and the expiring-authorization grids
 * (per-feature {@code *_wb_vw_pkg} view packages) via {@link WorkbenchRepository}. Keeping the whole
 * workbench page in its own vertical leaves the feature services (scaler / scale-site / mark-site)
 * free of any workbench concern.
 *
 * <p>Each renew clones the source authorization into a new one and returns its id; a {@code null} id
 * (no renewal performed) is surfaced as an {@link AuthorizationRenewResult} with no id set.
 */
@Service
public class WorkbenchService {

  private static final Set<Integer> MARK_SITE_PRIMARY_SORTS = Set.of(1, 2, 3, 4, 5, 6);
  private static final Set<Integer> MARK_SITE_SECONDARY_SORTS = Set.of(0, 1, 2, 3, 4, 5, 6);

  private final WorkbenchRepository workbenchRepository;

  public WorkbenchService(WorkbenchRepository workbenchRepository) {
    this.workbenchRepository = workbenchRepository;
  }

  public AuthorizationRenewResult renewScalerAuthorization(Long authorizationId) {
    return toResult(workbenchRepository.renewScalerAuthorization(authorizationId));
  }

  public AuthorizationRenewResult renewScaleSiteAuthorization(Long authorizationId) {
    return toResult(workbenchRepository.renewScaleSiteAuthorization(authorizationId));
  }

  public AuthorizationRenewResult renewMarkSiteDesignation(Long authorizationId) {
    return toResult(workbenchRepository.renewMarkSiteDesignation(authorizationId));
  }

  private AuthorizationRenewResult toResult(Long newAuthorizationId) {
    AuthorizationRenewResult result = new AuthorizationRenewResult();
    if (newAuthorizationId != null) {
      result.newAuthorizationId(newAuthorizationId);
    }
    return result;
  }

  public List<ScalerAuthorizationWorkbenchResult> searchScalerAuthorizations(
      ScalerAuthorizationWorkbenchSearchCriteria criteria) {
    return workbenchRepository.searchScalerAuthorizations(criteria);
  }

  public List<ScaleSiteAuthorizationWorkbenchResult> searchScaleSiteAuthorizations(
      ScaleSiteAuthorizationWorkbenchSearchCriteria criteria) {
    return workbenchRepository.searchScaleSiteAuthorizations(criteria);
  }

  public List<MarkSiteDesignationWorkbenchResult> searchMarkSiteDesignations(
      MarkSiteDesignationSearchCriteria criteria) {

    int resolvedPrimary = resolveSort(criteria.primarySort(), MARK_SITE_PRIMARY_SORTS, 1);
    int resolvedSecondary = resolveSort(criteria.secondarySort(), MARK_SITE_SECONDARY_SORTS, 0);

    return workbenchRepository.searchMarkSiteDesignations(
            new MarkSiteDesignationSearchCriteria(
                criteria.authorizationId(),
                criteria.effectiveDate(),
                criteria.expiryDate(),
                upperOrNull(criteria.timberMark()),
                criteria.regionId(),
                criteria.districtId(),
                resolvedPrimary,
                resolvedSecondary))
        .stream()
        .map(WorkbenchApiMapper::toMarkSiteDesignationWorkbenchResult)
        .toList();
  }
}
