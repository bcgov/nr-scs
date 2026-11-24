package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScalerRiskRatingApi;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskRatingSummary;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScalerRiskRatingService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScalerRiskRatingController implements ScalerRiskRatingApi {

  private final ScalerRiskRatingService scalerRiskRatingService;

  public ScalerRiskRatingController(ScalerRiskRatingService scalerRiskRatingService) {
    this.scalerRiskRatingService = scalerRiskRatingService;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALER_RISK_RATING_QUERY)
  public ResponseEntity<List<ScalerRiskRatingSummary>> getScalerRiskRatings(
      String scalerLicenceNo) {
    return ResponseEntity.ok(scalerRiskRatingService.getScalerRiskRatings(scalerLicenceNo));
  }
}
