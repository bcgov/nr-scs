package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.CheckScaleApi;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationResult;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDoc;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleAdvisoryLetterReportRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleDetail;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateResponse;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationResponse;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.CheckScaleService;
import ca.bc.gov.nrs.scs.backend.service.LetterService;
import ca.bc.gov.nrs.scs.backend.service.mapper.CheckScaleApiMapper;
import java.time.LocalDate;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CheckScaleController implements CheckScaleApi {

  private final CheckScaleService service;
  private final LetterService letterService;

  public CheckScaleController(CheckScaleService service, LetterService letterService) {
    this.service = service;
    this.letterService = letterService;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_CHECK_SCALE_QUERY)
  public ResponseEntity<ScalerCheckScaleTabResult> getScalerCheckScales(
      String scalerLicenceNo, String filter) {
    return ResponseEntity.ok(
        CheckScaleApiMapper.toScalerTabResult(
            service.getScalerCheckScaleTab(scalerLicenceNo, filter)));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CHECK_SCALE_QUERY)
  public ResponseEntity<ScaleSiteCheckScaleTabResult> getScaleSiteCheckScales(
      String scaleSiteIdNmbr, String checkScaleTypeCode) {
    return ResponseEntity.ok(
        CheckScaleApiMapper.toScaleSiteTabResult(
            service.getScaleSiteCheckScales(scaleSiteIdNmbr, checkScaleTypeCode)));
  }

  @Override
  @RequiresPermission(Permissions.CHECK_SCALE_CREATE)
  public ResponseEntity<CheckScaleCreateResponse> createCheckScale(
      @RequestBody CheckScaleCreateRequest request) {
    Long id = service.createCheckScale(CheckScaleApiMapper.toCreateCommand(request));
    return ResponseEntity.status(HttpStatus.CREATED).body(CheckScaleApiMapper.toCreateResponse(id));
  }

  @Override
  @RequiresPermission(Permissions.CHECK_SCALE_CREATE)
  public ResponseEntity<CheckScaleValidationResponse> validateCheckScale(
      @RequestBody CheckScaleValidationRequest request) {
    CheckScaleValidationResult result =
        service.validate(CheckScaleApiMapper.toValidationCommand(request));
    CheckScaleValidationResponse body = CheckScaleApiMapper.toValidationResponse(result);
    return result.ok() ? ResponseEntity.ok(body) : ResponseEntity.badRequest().body(body);
  }

  @Override
  @RequiresPermission(Permissions.CHECK_SCALE_UPDATE)
  public ResponseEntity<CheckScaleDetail> updateCheckScale(
      Long checkScaleId, @RequestBody CheckScaleUpdateRequest request) {
    CheckScale updated =
        service.updateCheckScale(CheckScaleApiMapper.toUpdateCommand(checkScaleId, request));
    return ResponseEntity.ok(CheckScaleApiMapper.toCheckScaleDetail(updated));
  }

  @Override
  @RequiresPermission(Permissions.CHECK_SCALE_DELETE)
  public ResponseEntity<Void> deleteCheckScale(Long checkScaleId) {
    service.deleteCheckScale(checkScaleId);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE)
  public ResponseEntity<Resource> createCheckScaleAdvisoryLetter(
      Long checkScaleId, CheckScaleAdvisoryLetterReportRequest request) {
    return letterService.createCheckScaleAdvisoryLetter(checkScaleId, request);
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.CHECK_SCALE_QUERY)
  public ResponseEntity<List<CheckScaleDetail>> searchCheckScales(
      Long checkScaleId,
      String checkScaleTypeCode,
      String ckscType,
      String partialInd,
      String followedGoodPracticeInd,
      String originalWithinStandardInd,
      Double originalScaleNetValue,
      Double checkScaleNetValue,
      String chkScalerCommentTxt,
      String orgLogTallyDocNo,
      Integer orgLogTallyVer,
      String chkLogTallyDocNo,
      Integer chkLogTallyVer,
      Integer orgSampleLogTallyVer,
      String orgSampleLogTallyDocNo,
      Integer chkSampleLogTallyVer,
      String chkSampleLogTallyDocNo,
      String originalScalerLicenceNo,
      String checkScalerLicenceNo,
      String scaleSiteIdNmbr,
      String timberMark,
      String loadArrivalNumber,
      Integer weighSlipNumber,
      String checkReplacesOriginalInd,
      String population,
      String stratum,
      Integer samplingYear,
      LocalDate originalScaleDate,
      Integer originalScaleReturnNo,
      Integer originalScaleTotalTops,
      Integer originalScaleTotalButts,
      Double originalScaleTotalLength,
      LocalDate chkScaleDate,
      Integer chkScaleReturnNo,
      Integer chkScaleTotalTops,
      Integer chkScaleTotalButts,
      Double chkScaleTotalLength,
      String entryUserid,
      String updateUserid) {

    ScaleSide originalScale =
        new ScaleSide(
            originalScaleDate,
            originalScaleReturnNo,
            originalScaleTotalTops,
            originalScaleTotalButts,
            originalScaleTotalLength,
            null,
            null);
    ScaleSide checkScale =
        new ScaleSide(
            chkScaleDate,
            chkScaleReturnNo,
            chkScaleTotalTops,
            chkScaleTotalButts,
            chkScaleTotalLength,
            null,
            null);

    CheckScaleSearchCriteria criteria =
        new CheckScaleSearchCriteria(
            checkScaleId,
            checkScaleTypeCode,
            ckscType,
            partialInd,
            followedGoodPracticeInd,
            originalWithinStandardInd,
            originalScaleNetValue,
            checkScaleNetValue,
            chkScalerCommentTxt,
            new TallyDoc(orgLogTallyDocNo, orgLogTallyVer),
            new TallyDoc(chkLogTallyDocNo, chkLogTallyVer),
            new TallyDoc(orgSampleLogTallyDocNo, orgSampleLogTallyVer),
            new TallyDoc(chkSampleLogTallyDocNo, chkSampleLogTallyVer),
            originalScalerLicenceNo,
            checkScalerLicenceNo,
            scaleSiteIdNmbr,
            timberMark,
            loadArrivalNumber,
            weighSlipNumber,
            checkReplacesOriginalInd,
            population,
            stratum,
            samplingYear,
            originalScale,
            checkScale,
            entryUserid,
            updateUserid);
    return ResponseEntity.ok(CheckScaleApiMapper.toSearchResults(service.search(criteria)));
  }
}
