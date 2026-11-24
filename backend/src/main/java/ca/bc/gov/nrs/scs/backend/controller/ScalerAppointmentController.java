package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ScalerAppointmentApi;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ScalerAppointmentService;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerAppointmentApiMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ScalerAppointmentController implements ScalerAppointmentApi {

  private final ScalerAppointmentService scalerAppointmentService;

  public ScalerAppointmentController(ScalerAppointmentService scalerAppointmentService) {
    this.scalerAppointmentService = scalerAppointmentService;
  }

  @Override
  @RequiresPermission(Permissions.SCALER_APPOINTMENT_CREATE)
  public ResponseEntity<ScalerAppointmentDetail> createScalerAppointment(
      String scalerLicenceNo,
      ScalerAppointmentCreateRequest scalerAppointmentCreateRequest
  ) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(scalerAppointmentService.createScalerAppointment(
            scalerLicenceNo,
            ScalerAppointmentApiMapper.toCommand(scalerAppointmentCreateRequest)));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_APPOINTMENT_DELETE)
  public ResponseEntity<Void> deleteScalerAppointment(
      String scalerLicenceNo,
      Long scalerLicenceAttributeId
  ) {
    scalerAppointmentService.deleteScalerAppointment(scalerLicenceNo, scalerLicenceAttributeId);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.SCALER_APPOINTMENT_QUERY)
  public ResponseEntity<List<ScalerAppointmentDetail>> getScalerAppointments(String scalerLicenceNo) {
    return ResponseEntity.ok(scalerAppointmentService.getScalerAppointments(scalerLicenceNo));
  }

  @Override
  @RequiresPermission(Permissions.SCALER_APPOINTMENT_UPDATE)
  public ResponseEntity<ScalerAppointmentDetail> updateScalerAppointment(
      String scalerLicenceNo,
      Long scalerLicenceAttributeId,
      ScalerAppointmentUpdateRequest scalerAppointmentUpdateRequest
  ) {
    return ResponseEntity.ok(scalerAppointmentService.updateScalerAppointment(
        scalerLicenceNo,
        scalerLicenceAttributeId,
        ScalerAppointmentApiMapper.toCommand(scalerAppointmentUpdateRequest)));
  }
}

