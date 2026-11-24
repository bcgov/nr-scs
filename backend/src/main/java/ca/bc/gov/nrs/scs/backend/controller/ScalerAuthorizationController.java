package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.core.io.Resource;

import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationListItem;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.api.ScalerAuthorizationApi;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.ScalerAuthorizationService;

@RestController
public class ScalerAuthorizationController implements ScalerAuthorizationApi {

  private final ScalerAuthorizationService scalerAuthorizationService;
  private final LetterService letterService;

  public ScalerAuthorizationController(
      ScalerAuthorizationService scalerAuthorizationService,
      LetterService letterService) {
    this.scalerAuthorizationService = scalerAuthorizationService;
    this.letterService = letterService;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_CREATE)
  public ResponseEntity<ScalerAuthorizationDetail> createScalerAuthorization(
      @RequestBody ScalerAuthorizationSaveRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scalerAuthorizationService.createScalerAuthorization(request));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_READ)
  public ResponseEntity<ScalerAuthorizationDetail> getScalerAuthorization(
      Long scalerAuthorizationId) {
    return ResponseEntity.ok(scalerAuthorizationService.getScalerAuthorization(scalerAuthorizationId));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_QUERY)
  public ResponseEntity<List<ScalerAuthorizationListItem>> listScalerAuthorizations(
      String scalerLicenceNo) {
    return ResponseEntity.ok(scalerAuthorizationService.listScalerAuthorizations(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_UPDATE)
  public ResponseEntity<ScalerAuthorizationDetail> updateScalerAuthorization(
      Long scalerAuthorizationId,
      @RequestBody ScalerAuthorizationSaveRequest request) {
    return ResponseEntity.ok(
        scalerAuthorizationService.updateScalerAuthorization(scalerAuthorizationId, request));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_DELETE)
  public ResponseEntity<Void> deleteScalerAuthorization(
      Long scalerAuthorizationId) {
    scalerAuthorizationService.deleteScalerAuthorization(scalerAuthorizationId);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_LETTER_CREATE)
  public ResponseEntity<Resource> createScalerAuthorizationLetter(
      Long scalerAuthorizationId,
      @RequestBody ScalerAuthorizationLetterReportRequest request) {
    return letterService.createScalerAuthorizationLetter(scalerAuthorizationId, request);
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_LETTER_VIEW)
  public ResponseEntity<Resource> getScalerAuthorizationLetter(
      Long scalerAuthorizationId) {
    return letterService.viewScalerAuthorizationLetter(scalerAuthorizationId);
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_CREATE)
  public ResponseEntity<List<ScaleAuthCondition>> searchActiveScaleAuthConditions(
      @RequestParam(value = "scaleConditionClassCode", required = false) String scaleConditionClassCode,
      @RequestParam(value = "scaleAuthConditionId", required = false) Long scaleAuthConditionId,
      @RequestParam(value = "scaleAuthConditionTitle", required = false) String scaleAuthConditionTitle,
      @RequestParam(value = "scaleAuthConditionDesc", required = false) String scaleAuthConditionDesc,
      @RequestParam(value = "ministryStandardInd", required = false) String ministryStandardInd,
      @RequestParam(value = "sortOrderNo", required = false) Integer sortOrderNo) {
    return ResponseEntity.ok(
        scalerAuthorizationService.searchActiveScaleAuthConditions(
            scaleConditionClassCode,
            scaleAuthConditionId,
            scaleAuthConditionTitle,
            scaleAuthConditionDesc,
            ministryStandardInd,
            sortOrderNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_AUTHORIZATION_CREATE)
  public ResponseEntity<List<ScaleAuthCondition>> getScaleAuthTemplateConditions(
      Long templateId) {
    return ResponseEntity.ok(scalerAuthorizationService.getScaleAuthTemplateConditions(templateId));
  }

  @Override
  @RequiresPermission(Permissions.WORKBENCH_UPDATE)
  public ResponseEntity<Void> removeScalerAuthorizationFromWorkbench(
      Long authorizationId) {
    scalerAuthorizationService.removeScalerAuthorizationFromWorkbench(authorizationId);
    return ResponseEntity.noContent().build();
  }
}
