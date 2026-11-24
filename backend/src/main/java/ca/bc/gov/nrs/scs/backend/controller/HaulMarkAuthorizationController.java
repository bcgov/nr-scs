package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.HaulMarkAuthorizationApi;
import ca.bc.gov.nrs.scs.backend.model.HaulMarkAuthorization;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.HaulMarkAuthorizationService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HaulMarkAuthorizationController implements HaulMarkAuthorizationApi {

  private final HaulMarkAuthorizationService service;

  public HaulMarkAuthorizationController(HaulMarkAuthorizationService service) {
    this.service = service;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.MSD_QUERY)
  public ResponseEntity<List<HaulMarkAuthorization>> searchHaulMarkAuthorizations(
      Long haulingMarkAuthorizationId,
      String timberMark,
      LocalDate effectiveDate,
      LocalDate expiryDate,
      String orgUnitName,
      Integer primarySort,
      Integer secondarySort) {

    return ResponseEntity.ok(
        service.searchHaulMarkAuthorizations(
            haulingMarkAuthorizationId,
            timberMark,
            effectiveDate,
            expiryDate,
            orgUnitName,
            primarySort,
            secondarySort));
  }
}

