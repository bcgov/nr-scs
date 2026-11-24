package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteRiskRatingApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteRiskRatingService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteRiskRatingController implements ScaleSiteRiskRatingApi {

  private final ScaleSiteRiskRatingService scaleSiteRiskRatingService;

  public ScaleSiteRiskRatingController(ScaleSiteRiskRatingService scaleSiteRiskRatingService) {
    this.scaleSiteRiskRatingService = scaleSiteRiskRatingService;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_RISK_RATING_QUERY)
  public ResponseEntity<List<ScaleSiteRiskRatingSummary>> getScaleSiteRiskRatings(
      String scaleSiteIdNmbr) {
    return ResponseEntity.ok(scaleSiteRiskRatingService.getScaleSiteRiskRatings(scaleSiteIdNmbr));
  }
}
