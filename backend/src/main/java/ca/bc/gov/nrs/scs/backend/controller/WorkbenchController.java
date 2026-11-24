package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.WorkbenchApi;
import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScaleSiteAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScalerAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.model.AuthorizationRenewResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.service.WorkbenchService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Workbench endpoints: the expiring-authorization grids (backed by the per-feature {@code *_wb_vw_pkg}
 * view packages) and renewal of expiring authorizations (shared {@code scs_scale_workbench_pkg}). All
 * workbench-package access lives in one vertical (controller → {@link WorkbenchService} →
 * {@code WorkbenchRepository}) rather than being spread across the per-feature controllers.
 */
@RestController
public class WorkbenchController implements WorkbenchApi {

  private final WorkbenchService workbenchService;

  public WorkbenchController(WorkbenchService workbenchService) {
    this.workbenchService = workbenchService;
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_CREATE)
  public ResponseEntity<AuthorizationRenewResult> renewScalerAuthorization(
      Long authorizationId) {
    return ResponseEntity.ok(workbenchService.renewScalerAuthorization(authorizationId));
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_CREATE)
  public ResponseEntity<AuthorizationRenewResult> renewScaleSiteAuthorization(
      Long authorizationId) {
    return ResponseEntity.ok(workbenchService.renewScaleSiteAuthorization(authorizationId));
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_CREATE)
  public ResponseEntity<AuthorizationRenewResult> renewMarkSiteDesignation(
      Long authorizationId) {
    return ResponseEntity.ok(workbenchService.renewMarkSiteDesignation(authorizationId));
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_QUERY)
  public ResponseEntity<List<ScalerAuthorizationWorkbenchResult>> searchScalerAuthorizations(
      @RequestParam(value = "scalerAuthorizationId", required = false) Long scalerAuthorizationId,
      @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
      @RequestParam(value = "scalerLicenceNumber", required = false) String scalerLicenceNumber,
      @RequestParam(value = "regionId", required = false) Long regionId,
      @RequestParam(value = "districtId", required = false) Long districtId,
      @RequestParam(value = "scalerName", required = false) String scalerName,
      @RequestParam(value = "primarySort", required = false) Integer primarySort,
      @RequestParam(value = "secondarySort", required = false) Integer secondarySort) {
    return ResponseEntity.ok(
        workbenchService.searchScalerAuthorizations(
            new ScalerAuthorizationWorkbenchSearchCriteria(
                scalerAuthorizationId,
                effectiveDate,
                expiryDate,
                scalerLicenceNumber,
                regionId,
                districtId,
                scalerName,
                primarySort,
                secondarySort)));
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_QUERY)
  public ResponseEntity<List<ScaleSiteAuthorizationWorkbenchResult>> searchScaleSiteAuthorizations(
      @RequestParam(value = "scaleSiteAuthorizationId", required = false) Long scaleSiteAuthorizationId,
      @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
      @RequestParam(value = "scaleSiteNumber", required = false) String scaleSiteNumber,
      @RequestParam(value = "scaleSiteName", required = false) String scaleSiteName,
      @RequestParam(value = "regionId", required = false) Long regionId,
      @RequestParam(value = "districtId", required = false) Long districtId,
      @RequestParam(value = "primarySort", required = false, defaultValue = "1") Integer primarySort,
      @RequestParam(value = "secondarySort", required = false, defaultValue = "0") Integer secondarySort) {
    return ResponseEntity.ok(
        workbenchService.searchScaleSiteAuthorizations(
            new ScaleSiteAuthorizationWorkbenchSearchCriteria(
                scaleSiteAuthorizationId,
                effectiveDate,
                expiryDate,
                scaleSiteNumber,
                scaleSiteName,
                regionId,
                districtId,
                primarySort,
                secondarySort)));
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_QUERY)
  public ResponseEntity<List<MarkSiteDesignationWorkbenchResult>> searchMarkSiteDesignations(
      @RequestParam(value = "haulingMarkAuthorizationId", required = false) Long haulingMarkAuthorizationId,
      @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate,
      @RequestParam(value = "timberMark", required = false) String timberMark,
      @RequestParam(value = "regionId", required = false) Long regionId,
      @RequestParam(value = "districtId", required = false) Long districtId,
      @RequestParam(value = "primarySort", required = false, defaultValue = "1") Integer primarySort,
      @RequestParam(value = "secondarySort", required = false, defaultValue = "0") Integer secondarySort) {
    return ResponseEntity.ok(
        workbenchService.searchMarkSiteDesignations(
            new MarkSiteDesignationSearchCriteria(
                haulingMarkAuthorizationId,
                effectiveDate,
                expiryDate,
                timberMark,
                regionId,
                districtId,
                primarySort,
                secondarySort)));
  }
}
