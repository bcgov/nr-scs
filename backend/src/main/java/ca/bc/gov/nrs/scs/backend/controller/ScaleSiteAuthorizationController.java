package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteAuthorizationApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteAuthorizationService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ScaleSiteAuthorizationController implements ScaleSiteAuthorizationApi {

  private final ScaleSiteAuthorizationService scaleSiteAuthorizationService;
  private final LetterService letterService;

  public ScaleSiteAuthorizationController(
      ScaleSiteAuthorizationService scaleSiteAuthorizationService,
      LetterService letterService) {
    this.scaleSiteAuthorizationService = scaleSiteAuthorizationService;
    this.letterService = letterService;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_CREATE)
  public ResponseEntity<ScaleSiteAuthorizationDetail> createScaleSiteAuthorization(
      @RequestBody ScaleSiteAuthorizationSaveRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scaleSiteAuthorizationService.createScaleSiteAuthorization(request));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_CREATE)
  public ResponseEntity<List<ScaleAuthCondition>> searchActiveScaleSiteAuthConditions(
      @RequestParam(value = "scaleConditionClassCode", required = false) String scaleConditionClassCode,
      @RequestParam(value = "scaleAuthConditionId", required = false) Long scaleAuthConditionId,
      @RequestParam(value = "scaleAuthConditionTitle", required = false) String scaleAuthConditionTitle,
      @RequestParam(value = "scaleAuthConditionDesc", required = false) String scaleAuthConditionDesc,
      @RequestParam(value = "ministryStandardInd", required = false) String ministryStandardInd,
      @RequestParam(value = "sortOrderNo", required = false) Integer sortOrderNo) {
    return ResponseEntity.ok(
        scaleSiteAuthorizationService.searchActiveScaleSiteAuthConditions(
            scaleConditionClassCode,
            scaleAuthConditionId,
            scaleAuthConditionTitle,
            scaleAuthConditionDesc,
            ministryStandardInd,
            sortOrderNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_CREATE)
  public ResponseEntity<List<ScaleAuthCondition>> getScaleSiteAuthTemplateConditions(
      Long templateId) {
    return ResponseEntity.ok(scaleSiteAuthorizationService.getScaleAuthTemplateConditions(templateId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_READ)
  public ResponseEntity<ScaleSiteAuthorizationDetail> getScaleSiteAuthorization(
      Long scaleSiteAuthorizationId) {
    return ResponseEntity.ok(scaleSiteAuthorizationService.getScaleSiteAuthorization(scaleSiteAuthorizationId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_QUERY)
  public ResponseEntity<List<ScaleSiteAuthorizationDetail>> listScaleSiteAuthorizations(
      String scaleSiteIdNmbr) {
    return ResponseEntity.ok(scaleSiteAuthorizationService.listScaleSiteAuthorizations(scaleSiteIdNmbr));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_UPDATE)
  public ResponseEntity<ScaleSiteAuthorizationDetail> updateScaleSiteAuthorization(
      Long scaleSiteAuthorizationId,
      @RequestBody ScaleSiteAuthorizationSaveRequest request) {
    return ResponseEntity.ok(
        scaleSiteAuthorizationService.updateScaleSiteAuthorization(scaleSiteAuthorizationId, request));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_DELETE)
  public ResponseEntity<Void> deleteScaleSiteAuthorization(
      Long scaleSiteAuthorizationId) {
    scaleSiteAuthorizationService.deleteScaleSiteAuthorization(scaleSiteAuthorizationId);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE)
  public ResponseEntity<Resource> createScaleSiteAuthorizationLetter(
      Long scaleSiteAuthorizationId,
      @RequestBody ScaleSiteAuthorizationLetterReportRequest request) {
    return letterService.createScaleSiteAuthorizationLetter(
        scaleSiteAuthorizationId,
        request);
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW)
  public ResponseEntity<Resource> getScaleSiteAuthorizationLetter(
      Long scaleSiteAuthorizationId) {
    return letterService.viewScaleSiteAuthorizationLetter(
        scaleSiteAuthorizationId);
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_UPDATE)
  public ResponseEntity<Void> removeScaleSiteAuthorizationFromWorkbench(
      Long authorizationId) {
    scaleSiteAuthorizationService.removeScaleSiteAuthorizationFromWorkbench(authorizationId);
    return ResponseEntity.noContent().build();
  }
}
