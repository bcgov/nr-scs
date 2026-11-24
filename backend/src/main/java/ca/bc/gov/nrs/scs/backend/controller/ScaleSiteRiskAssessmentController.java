package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteRiskAssessmentApi;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentDetail;
import ca.bc.gov.nrs.scs.backend.model.RiskAssessmentSaveRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteRiskAssessmentService;
import ca.bc.gov.nrs.scs.backend.service.mapper.RiskAssessmentApiMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteRiskAssessmentController implements ScaleSiteRiskAssessmentApi {

  private final ScaleSiteRiskAssessmentService scaleSiteRiskAssessmentService;

  public ScaleSiteRiskAssessmentController(ScaleSiteRiskAssessmentService scaleSiteRiskAssessmentService) {
    this.scaleSiteRiskAssessmentService = scaleSiteRiskAssessmentService;
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_RISK_ASSESSMENT_READ)
  public ResponseEntity<ScaleSiteRiskAssessmentDetail> getScaleSiteRiskAssessment(
      Long riskQuestionnaireId) {
    return ResponseEntity.ok(
        scaleSiteRiskAssessmentService.getScaleSiteRiskAssessment(riskQuestionnaireId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE)
  public ResponseEntity<ScaleSiteRiskAssessmentDetail> updateScaleSiteRiskAssessment(
      Long riskQuestionnaireId,
      RiskAssessmentSaveRequest scaleSiteRiskAssessmentSaveRequest) {
    return ResponseEntity.ok(
        scaleSiteRiskAssessmentService.updateScaleSiteRiskAssessment(
            riskQuestionnaireId,
            RiskAssessmentApiMapper.toUpdateCommand(scaleSiteRiskAssessmentSaveRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE)
  public ResponseEntity<ScaleSiteRiskAssessmentDetail> getScaleSiteRiskAssessmentCreateInit(
      String scaleSiteIdNmbr) {
    return ResponseEntity.ok(
        scaleSiteRiskAssessmentService.getScaleSiteRiskAssessmentCreateInit(scaleSiteIdNmbr));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE)
  public ResponseEntity<ScaleSiteRiskAssessmentDetail> createScaleSiteRiskAssessment(
      String scaleSiteIdNmbr,
      @RequestBody RiskAssessmentSaveRequest riskAssessmentSaveRequest) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scaleSiteRiskAssessmentService.createScaleSiteRiskAssessment(
            scaleSiteIdNmbr, RiskAssessmentApiMapper.toCreateCommand(riskAssessmentSaveRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY)
  public ResponseEntity<List<ScaleSiteRiskAssessmentSearchResult>> searchScaleSiteRiskAssessments(
      @RequestParam(value = "riskQuestionnaireId", required = false) String riskQuestionnaireId,
      @RequestParam(value = "riskTypeCode", required = false) String riskTypeCode,
      @RequestParam(value = "completeInd", required = false) String completeInd,
      @RequestParam(value = "scaleSiteIdNmbr", required = false) String scaleSiteIdNmbr,
      @RequestParam(value = "orgUnitNo", required = false) Long orgUnitNo,
      @RequestParam(value = "methodTypes", required = false) List<String> methodTypes,
      @RequestParam(value = "siteName", required = false) String siteName,
      @RequestParam(value = "ownerClientNumber", required = false) String ownerClientNumber,
      @RequestParam(value = "ownerClientLocnCode", required = false) String ownerClientLocnCode,
      @RequestParam(value = "primarySort", required = false, defaultValue = "1") Integer primarySort,
      @RequestParam(value = "secondarySort", required = false, defaultValue = "0") Integer secondarySort) {

    return ResponseEntity.ok(scaleSiteRiskAssessmentService.searchScaleSiteRiskAssessments(
        riskQuestionnaireId,
        riskTypeCode,
        completeInd,
        scaleSiteIdNmbr,
        orgUnitNo,
        methodTypes,
        siteName,
        ownerClientNumber,
        ownerClientLocnCode,
        primarySort,
        secondarySort));
  }
}
