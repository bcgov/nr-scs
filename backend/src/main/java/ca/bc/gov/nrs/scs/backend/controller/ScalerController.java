package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScalerApi;
import ca.bc.gov.nrs.scs.backend.model.ScalerAddress;
import ca.bc.gov.nrs.scs.backend.model.ScalerResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate;
import ca.bc.gov.nrs.scs.backend.model.ScalerDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerLicenceCancelledDateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummary;
import ca.bc.gov.nrs.scs.backend.model.ScalerTombstone;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScalerService;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerApiMapper;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScalerController implements ScalerApi {

  private final ScalerService scalerService;

  public ScalerController(ScalerService scalerService) {
    this.scalerService = scalerService;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_CREATE)
  public ResponseEntity<ScalerDetail> createScaler(@RequestBody ScalerCreate scalerCreate) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ScalerApiMapper.toResponse(
        scalerService.createScaler(ScalerApiMapper.toCreateCommand(scalerCreate))));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_READ)
  public ResponseEntity<ScalerDetail> getScaler(String scalerLicenceNo) {
    return ResponseEntity.ok(ScalerApiMapper.toResponse(scalerService.getScaler(scalerLicenceNo)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_READ)
  public ResponseEntity<ScalerSummary> getScalerSummary(String scalerLicenceNo) {
    return ResponseEntity.ok(scalerService.getScalerSummary(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_ADDRESS_READ)
  public ResponseEntity<ScalerAddress> getScalerAddress(String scalerLicenceNo) {
    ScalerAddress address = scalerService.getScalerAddress(scalerLicenceNo);
    return address != null ? ResponseEntity.ok(address) : ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.SCALER_READ)
  public ResponseEntity<ScalerTombstone> getScalerTombstone(String scalerLicenceNo) {
    return ResponseEntity.ok(scalerService.getScalerTombstone(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_UPDATE)
  public ResponseEntity<ScalerDetail> updateScaler(
      String scalerLicenceNo,
      @RequestBody ScalerCreate scalerCreate) {
    return ResponseEntity.ok(ScalerApiMapper.toResponse(
        scalerService.updateScaler(ScalerApiMapper.toUpdateCommand(scalerLicenceNo, scalerCreate))));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_DELETE)
  public ResponseEntity<Void> deleteScaler(String scalerLicenceNo) {
    scalerService.deleteScaler(scalerLicenceNo);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.SCALER_LICENCE_CANCEL)
  public ResponseEntity<ScalerDetail> updateScalerLicenceCancelledDate(
      String scalerLicenceNo,
      @RequestBody ScalerLicenceCancelledDateRequest scalerLicenceCancelledDateRequest) {
    return ResponseEntity.ok(ScalerApiMapper.toResponse(scalerService.updateLicenceCancelledDate(
        scalerLicenceNo,
        SCSUtils.getNullable(scalerLicenceCancelledDateRequest.getLicenceCancelledDate()))));
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALER_QUERY)
  public ResponseEntity<List<ScalerResult>> searchScalers(
      @RequestParam(value = "scalerLicenceNo", required = false) String scalerLicenceNo,
      @RequestParam(value = "clientNumber", required = false) String clientNumber,
      @RequestParam(value = "orgUnitNo", required = false) Long orgUnitNo,
      @RequestParam(value = "clientName", required = false) String clientName,
      @RequestParam(value = "legalFirstName", required = false) String legalFirstName,
      @RequestParam(value = "scalarTrainingType", required = false) String scalarTrainingType,
      @RequestParam(value = "scalerLicenceTypeCode", required = false) String scalerLicenceTypeCode,
      @RequestParam(value = "scalerAppointmentType", required = false) String scalerAppointmentType,
      @RequestParam(value = "primarySort", required = false, defaultValue = "1") Integer primarySort,
      @RequestParam(value = "secondarySort", required = false, defaultValue = "0") Integer secondarySort) {

    return ResponseEntity.ok(
        scalerService.searchScalers(
            scalerLicenceNo,
            clientNumber,
            orgUnitNo,
            clientName,
            legalFirstName,
            scalarTrainingType,
            scalerLicenceTypeCode,
            scalerAppointmentType,
            primarySort,
            secondarySort));
  }
}
