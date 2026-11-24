package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import ca.bc.gov.nrs.scs.backend.api.LovApi;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictRollupLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ScalerTrainingTypeLov;
import ca.bc.gov.nrs.scs.backend.model.SpeciesProductGradeXref;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
import ca.bc.gov.nrs.scs.backend.service.LovService;

@RestController
public class LovController implements LovApi {

  private final LovService service;

  public LovController(LovService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<RegionDistrictLov>> getRegionDistrictLov(
      String code,
      String description
  ) {
    return ResponseEntity.ok(service.getRegionDistrictLov(code, description));
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<RegionDistrictRollupLov>> getRegionDistrictRollupLov(
      Long orgUnitNo,
      String description,
      Long rollupRegionNo
  ) {
    return ResponseEntity.ok(service.getRegionDistrictRollupLov(orgUnitNo, description, rollupRegionNo));
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<AppointmentTypeLov>> getAppointmentTypeLov(
      String code,
      String description
  ) {
    return ResponseEntity.ok(service.getAppointmentTypeLov(code, description));
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<ScaleMethodTypeLov>> getScaleMethodTypeLov(
      String code,
      String description
  ) {
    return ResponseEntity.ok(service.getScaleMethodTypeLov(code, description));
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<GradingCodeAppointmentTypeLov>> getGradingCodeAppointmentTypeLov() {
    return ResponseEntity.ok(service.getGradingCodeAppointmentTypeLov());
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<ScalerTrainingTypeLov>> getScalerTrainingTypeLov() {
    return ResponseEntity.ok(service.getScalerTrainingTypeLov());
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<SpeciesProductGradeXref>> getSpeciesProductGradeXref() {
    return ResponseEntity.ok(service.getSpeciesProductGradeXref());
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<StaticLov>> getStaticLov(String tableKey) {
    return ResponseEntity.ok(service.getStaticLov(tableKey));
  }

  @Override
  @RequiresPermission(Permissions.LOV_READ)
  public ResponseEntity<List<StaticLov>> getTemplatesByFilter(String filterField) {
    return ResponseEntity.ok(service.getTemplateLov(filterField));
  }
}

