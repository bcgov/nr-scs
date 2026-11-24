package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteApi;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchCriteria;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteTombstone;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteUpdateRequest;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteService;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteApiMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteController implements ScaleSiteApi {

  private final ScaleSiteService scaleSiteService;

  public ScaleSiteController(ScaleSiteService scaleSiteService) {
    this.scaleSiteService = scaleSiteService;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_QUERY)
  public ResponseEntity<List<ScaleSiteSearchResult>> searchScaleSites(
      String scaleSiteIdNmbr,
      Long orgUnitNo,
      String siteName,
      String ownerClientNumber,
      String ownerClientLocnCode,
      List<String> methodTypes,
      Integer primarySort,
      Integer secondarySort) {

    ScaleSiteSearchCriteria criteria = new ScaleSiteSearchCriteria(
        scaleSiteIdNmbr,
        orgUnitNo,
        siteName,
        ownerClientNumber,
        ownerClientLocnCode,
        methodTypes,
        primarySort,
        secondarySort);

    return ResponseEntity.ok(scaleSiteService.searchScaleSites(criteria));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_SUMMARY_READ)
  public ResponseEntity<ScaleSiteSummary> getScaleSiteSummary(String scaleSiteIdNmbr) {
    return ResponseEntity.ok(scaleSiteService.getScaleSiteSummary(scaleSiteIdNmbr));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_READ)
  public ResponseEntity<ScaleSiteTombstone> getScaleSiteTombstone(String scaleSiteIdNmbr) {
    return ResponseEntity.ok(scaleSiteService.getScaleSiteTombstone(scaleSiteIdNmbr));
  }

  // TODO: add @PreAuthorize when the user-role model lands (see scalesite-create-plan.md tracked deferrals).
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CREATE)
  public ResponseEntity<ScaleSiteSummary> createScaleSite(ScaleSiteCreateRequest scaleSiteCreateRequest) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scaleSiteService.createScaleSite(
            ScaleSiteApiMapper.toDomain(scaleSiteCreateRequest)));
  }

  // TODO: add @PreAuthorize when the user-role model lands (see scalesite-create-plan.md tracked deferrals).
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_UPDATE)
  public ResponseEntity<ScaleSiteSummary> updateScaleSite(
      String scaleSiteIdNmbr, ScaleSiteUpdateRequest scaleSiteUpdateRequest) {
    return ResponseEntity.ok(scaleSiteService.updateScaleSite(
        ScaleSiteApiMapper.toDomain(scaleSiteUpdateRequest, scaleSiteIdNmbr)));
  }
}


