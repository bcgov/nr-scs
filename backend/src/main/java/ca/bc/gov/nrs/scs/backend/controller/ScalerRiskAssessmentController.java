package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScalerRiskAssessmentApi;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScalerRiskAssessmentService;
import ca.bc.gov.nrs.scs.backend.service.mapper.RiskAssessmentApiMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScalerRiskAssessmentController implements ScalerRiskAssessmentApi {

  private final ScalerRiskAssessmentService scalerRiskAssessmentService;

  public ScalerRiskAssessmentController(ScalerRiskAssessmentService scalerRiskAssessmentService) {
    this.scalerRiskAssessmentService = scalerRiskAssessmentService;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALER_RISK_ASSESSMENT_QUERY)
  public ResponseEntity<List<ScalerRiskAssessmentSearchResult>> searchScalerRiskAssessments(
      @RequestParam(value = "riskQuestionnaireId", required = false) String riskQuestionnaireId,
      @RequestParam(value = "riskTypeCode", required = false) String riskTypeCode,
      @RequestParam(value = "completeInd", required = false) String completeInd,
      @RequestParam(value = "scalerLicenceNo", required = false) String scalerLicenceNo,
      @RequestParam(value = "orgUnitNo", required = false) Long orgUnitNo,
      @RequestParam(value = "clientNumber", required = false) String clientNumber,
      @RequestParam(value = "scalerLicenceTypeCode", required = false) String scalerLicenceTypeCode,
      @RequestParam(value = "primarySort", required = false, defaultValue = "1") Integer primarySort,
      @RequestParam(value = "secondarySort", required = false, defaultValue = "0") Integer secondarySort) {

    return ResponseEntity.ok(
        scalerRiskAssessmentService.searchScalerRiskAssessments(
            riskQuestionnaireId,
            riskTypeCode,
            completeInd,
            scalerLicenceNo,
            orgUnitNo,
            clientNumber,
            scalerLicenceTypeCode,
            primarySort,
            secondarySort));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_RISK_ASSESSMENT_READ)
  public ResponseEntity<ScalerRiskAssessmentDetail> getScalerRiskAssessment(
      Long riskQuestionnaireId) {
    return ResponseEntity.ok(scalerRiskAssessmentService.getScalerRiskAssessment(riskQuestionnaireId));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_RISK_ASSESSMENT_CREATE)
  public ResponseEntity<ScalerRiskAssessmentDetail> getScalerRiskAssessmentCreateInit(
      String scalerLicenceNo) {
    return ResponseEntity.ok(
        scalerRiskAssessmentService.getScalerRiskAssessmentCreateInit(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_RISK_ASSESSMENT_CREATE)
  public ResponseEntity<ScalerRiskAssessmentDetail> createScalerRiskAssessment(
      String scalerLicenceNo,
      @RequestBody RiskAssessmentSaveRequest riskAssessmentSaveRequest) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scalerRiskAssessmentService.createScalerRiskAssessment(
            scalerLicenceNo, RiskAssessmentApiMapper.toCreateCommand(riskAssessmentSaveRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_RISK_ASSESSMENT_UPDATE)
  public ResponseEntity<ScalerRiskAssessmentDetail> updateScalerRiskAssessment(
      Long riskQuestionnaireId,
      @RequestBody RiskAssessmentSaveRequest scalerRiskAssessmentSaveRequest) {
    return ResponseEntity.ok(
        scalerRiskAssessmentService.updateScalerRiskAssessment(
            riskQuestionnaireId,
            RiskAssessmentApiMapper.toUpdateCommand(scalerRiskAssessmentSaveRequest)));
  }
}
