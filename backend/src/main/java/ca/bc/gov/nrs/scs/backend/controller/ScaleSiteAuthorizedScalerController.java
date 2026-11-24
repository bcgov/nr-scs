package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteAuthorizedScalerApi;
import ca.bc.gov.nrs.scs.backend.model.AuthorizedScalerSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteAuthorizedScalerService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteAuthorizedScalerController implements ScaleSiteAuthorizedScalerApi {

  private final ScaleSiteAuthorizedScalerService scaleSiteAuthorizedScalerService;

  public ScaleSiteAuthorizedScalerController(
      ScaleSiteAuthorizedScalerService scaleSiteAuthorizedScalerService) {
    this.scaleSiteAuthorizedScalerService = scaleSiteAuthorizedScalerService;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY)
  public ResponseEntity<List<AuthorizedScalerSummary>> getScaleSiteAuthorizedScalers(
      String scaleSiteIdNmbr) {
    return ResponseEntity.ok(
        scaleSiteAuthorizedScalerService.getScaleSiteAuthorizedScalers(scaleSiteIdNmbr));
  }
}
