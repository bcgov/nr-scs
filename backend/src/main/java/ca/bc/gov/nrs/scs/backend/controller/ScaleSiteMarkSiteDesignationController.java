package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteMarkSiteDesignationApi;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteMarkSiteDesignationService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteMarkSiteDesignationController implements ScaleSiteMarkSiteDesignationApi {

  private final ScaleSiteMarkSiteDesignationService scaleSiteMarkSiteDesignationService;

  public ScaleSiteMarkSiteDesignationController(
      ScaleSiteMarkSiteDesignationService scaleSiteMarkSiteDesignationService) {
    this.scaleSiteMarkSiteDesignationService = scaleSiteMarkSiteDesignationService;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_MSD_QUERY)
  public ResponseEntity<List<MarkSiteDesignationSummary>> getScaleSiteMarkSiteDesignations(
      String scaleSiteIdNmbr) {
    return ResponseEntity.ok(
        scaleSiteMarkSiteDesignationService.getScaleSiteMarkSiteDesignations(scaleSiteIdNmbr));
  }
}
