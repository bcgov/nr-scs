package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScalerPerformanceRemarkApi;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.PerformanceRemarkService;
import ca.bc.gov.nrs.scs.backend.service.mapper.PerformanceRemarkApiMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PerformanceRemarkController implements ScalerPerformanceRemarkApi {

  private final PerformanceRemarkService performanceRemarkService;

  public PerformanceRemarkController(PerformanceRemarkService performanceRemarkService) {
    this.performanceRemarkService = performanceRemarkService;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_PERFORMANCE_REMARK_QUERY)
  public ResponseEntity<List<ScalerPerformanceRemarkDetail>> getScalerPerformanceRemarks(
      String scalerLicenceNo
  ) {
    return ResponseEntity.ok(
        performanceRemarkService.getScalerPerformanceRemarks(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_PERFORMANCE_REMARK_CREATE)
  public ResponseEntity<ScalerPerformanceRemarkDetail> createScalerPerformanceRemark(
      String scalerLicenceNo,
      ScalerPerformanceRemarkCreateRequest scalerPerformanceRemarkCreateRequest
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(performanceRemarkService.createScalerPerformanceRemark(
            scalerLicenceNo,
            PerformanceRemarkApiMapper.toCreateCommand(scalerPerformanceRemarkCreateRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_PERFORMANCE_REMARK_UPDATE)
  public ResponseEntity<ScalerPerformanceRemarkDetail> updateScalerPerformanceRemark(
      String scalerLicenceNo,
      Long scalerPerformanceRemarkId,
      ScalerPerformanceRemarkUpdateRequest scalerPerformanceRemarkUpdateRequest
  ) {
    return ResponseEntity.ok(
        performanceRemarkService.updateScalerPerformanceRemark(
            scalerLicenceNo,
            scalerPerformanceRemarkId,
            PerformanceRemarkApiMapper.toUpdateCommand(scalerPerformanceRemarkUpdateRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_PERFORMANCE_REMARK_DELETE)
  public ResponseEntity<Void> deleteScalerPerformanceRemark(
      String scalerLicenceNo,
      Long scalerPerformanceRemarkId
  ) {
    performanceRemarkService.deleteScalerPerformanceRemark(scalerLicenceNo, scalerPerformanceRemarkId);
    return ResponseEntity.noContent().build();
  }
}
