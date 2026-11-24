package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.AppointmentTypeApi;
import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.AppointmentTypeService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AppointmentTypeController implements AppointmentTypeApi {

  private final AppointmentTypeService appointmentTypeService;

  public AppointmentTypeController(AppointmentTypeService appointmentTypeService) {
    this.appointmentTypeService = appointmentTypeService;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_APPOINTMENT_TYPES_QUERY)
  public ResponseEntity<List<AppointmentType>> getAppointmentTypes(
      @RequestParam(value = "code", required = false) String code,
      @RequestParam(value = "description", required = false) String description,
      @RequestParam(value = "actingInd", required = false) String actingInd,
      @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
      @RequestParam(value = "expiryDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryDate
  ) {
    return ResponseEntity.ok(
        appointmentTypeService.getAppointmentTypes(
            code,
            description,
            actingInd,
            effectiveDate,
            expiryDate));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_APPOINTMENT_TYPES_CREATE)
  public ResponseEntity<AppointmentType> createAppointmentType(
      @RequestBody AppointmentTypeCreateRequest appointmentTypeCreateRequest
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(appointmentTypeService.createAppointmentType(appointmentTypeCreateRequest));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_APPOINTMENT_TYPES_UPDATE)
  public ResponseEntity<AppointmentType> updateAppointmentType(
      String appointmentTypeCode,
      @RequestBody AppointmentTypeUpdateRequest appointmentTypeUpdateRequest
  ) {
    return ResponseEntity.ok(
        appointmentTypeService.updateAppointmentType(
            appointmentTypeCode,
            appointmentTypeUpdateRequest));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_APPOINTMENT_TYPES_DELETE)
  public ResponseEntity<Void> deleteAppointmentType(
      String appointmentTypeCode
  ) {
    appointmentTypeService.deleteAppointmentType(appointmentTypeCode);
    return ResponseEntity.noContent().build();
  }
}
