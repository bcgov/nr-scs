package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteInspectionApi;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteInspectionApiMapper;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateInitView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionEditView;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteInspectionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteInspectionService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScaleSiteInspectionController implements ScaleSiteInspectionApi {

  private final ScaleSiteInspectionService scaleSiteInspectionService;

  public ScaleSiteInspectionController(ScaleSiteInspectionService scaleSiteInspectionService) {
    this.scaleSiteInspectionService = scaleSiteInspectionService;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_READ)
  public ResponseEntity<ScaleSiteInspectionDetail> getScaleSiteInspectionDetail(Long inspectionId) {
    return ResponseEntity.ok(scaleSiteInspectionService.getScaleSiteInspectionDetail(inspectionId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_UPDATE)
  public ResponseEntity<ScaleSiteInspectionEditView> getScaleSiteInspectionEdit(Long inspectionId) {
    return ResponseEntity.ok(scaleSiteInspectionService.getScaleSiteInspectionEdit(inspectionId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_CREATE)
  public ResponseEntity<ScaleSiteInspectionCreateInitView> getScaleSiteInspectionCreateInit(
      String scaleSiteIdNmbr,
      String inspectionTypeCode,
      List<String> siteTypeCodes) {
    return ResponseEntity.ok(
        scaleSiteInspectionService.getScaleSiteInspectionCreateInit(
            scaleSiteIdNmbr,
            inspectionTypeCode,
            siteTypeCodes));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_QUERY)
  public ResponseEntity<List<ScaleSiteInspectionSummary>> getScaleSiteInspectionSummaries(String scaleSiteIdNmbr) {
    return ResponseEntity.ok(scaleSiteInspectionService.getScaleSiteInspectionSummaries(scaleSiteIdNmbr));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_CREATE)
  public ResponseEntity<ScaleSiteInspectionDetail> createScaleSiteInspection(
      String scaleSiteIdNmbr,
      ScaleSiteInspectionCreateRequest scaleSiteInspectionCreateRequest) {
    return ResponseEntity.status(HttpStatus.CREATED).body(
        scaleSiteInspectionService.createScaleSiteInspection(
            ScaleSiteInspectionApiMapper.toCreateCommand(
                scaleSiteIdNmbr, scaleSiteInspectionCreateRequest)));
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_QUERY)
  public ResponseEntity<ScaleSiteInspectionSearchResult> searchScaleSiteInspection(Long inspectionId) {
    return ResponseEntity.ok(scaleSiteInspectionService.searchScaleSiteInspection(inspectionId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_UPDATE)
  public ResponseEntity<ScaleSiteInspectionDetail> updateScaleSiteInspection(
      Long inspectionId,
      ScaleSiteInspectionUpdateRequest scaleSiteInspectionUpdateRequest) {
    return ResponseEntity.ok(
        scaleSiteInspectionService.updateScaleSiteInspection(
            ScaleSiteInspectionApiMapper.toUpdateCommand(
                inspectionId, scaleSiteInspectionUpdateRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_INSPECTION_DELETE)
  public ResponseEntity<Void> deleteScaleSiteInspection(Long inspectionId) {
    scaleSiteInspectionService.deleteScaleSiteInspection(inspectionId);
    return ResponseEntity.noContent().build();
  }
}

