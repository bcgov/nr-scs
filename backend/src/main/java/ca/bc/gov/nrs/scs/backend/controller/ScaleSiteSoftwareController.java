package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteSoftwareApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSoftwareSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteSoftwareService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteSoftwareController implements ScaleSiteSoftwareApi {

  private final ScaleSiteSoftwareService scaleSiteSoftwareService;

  public ScaleSiteSoftwareController(ScaleSiteSoftwareService scaleSiteSoftwareService) {
    this.scaleSiteSoftwareService = scaleSiteSoftwareService;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_SOFTWARE_QUERY)
  public ResponseEntity<List<ScaleSiteSoftwareSummary>> getScaleSiteSoftware(
      String scaleSiteIdNmbr) {
    return ResponseEntity.ok(scaleSiteSoftwareService.getScaleSiteSoftware(scaleSiteIdNmbr));
  }
}
