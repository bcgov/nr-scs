package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteActivityApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteActivitySummary;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteActivityService;

@RestController
public class ScaleSiteActivityController implements ScaleSiteActivityApi {

  private final ScaleSiteActivityService service;

  public ScaleSiteActivityController(ScaleSiteActivityService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_ACTIVITY_READ)
  public ResponseEntity<ScaleSiteActivitySummary> getScaleSiteActivitySummary(String scaleSiteIdNmbr) {
    return ResponseEntity.ok(service.getActivitySummary(scaleSiteIdNmbr));
  }
}
