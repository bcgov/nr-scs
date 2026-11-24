package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import ca.bc.gov.nrs.scs.backend.api.ValidLicenceAttributeApi;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeDetail;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.service.ValidLicenceAttributeService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ValidLicenceAttributeController implements ValidLicenceAttributeApi {

  private final ValidLicenceAttributeService service;

  public ValidLicenceAttributeController(ValidLicenceAttributeService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY)
  public ResponseEntity<List<ValidLicenceAttributeDetail>> searchValidLicenceAttributes(
      String scaleGradingSystemCode,
      String scalerAppointmentType) {
    return ResponseEntity.ok(
        service.searchValidLicenceAttributes(scaleGradingSystemCode, scalerAppointmentType));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE)
  public ResponseEntity<ValidLicenceAttributeDetail> createValidLicenceAttribute(
      ValidLicenceAttributeCreateRequest validLicenceAttributeCreateRequest) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createValidLicenceAttribute(validLicenceAttributeCreateRequest));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ)
  public ResponseEntity<ValidLicenceAttributeDetail> getValidLicenceAttribute(
      String scaleGradingSystemCode,
      String scalerAppointmentType) {
    return ResponseEntity.ok(
        service.getValidLicenceAttribute(scaleGradingSystemCode, scalerAppointmentType));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE)
  public ResponseEntity<ValidLicenceAttributeDetail> updateValidLicenceAttribute(
      String scaleGradingSystemCode,
      String scalerAppointmentType,
      ValidLicenceAttributeUpdateRequest validLicenceAttributeUpdateRequest) {
    return ResponseEntity.ok(
        service.updateValidLicenceAttribute(
            scaleGradingSystemCode, scalerAppointmentType, validLicenceAttributeUpdateRequest));
  }

  @Override
  @RequiresPermission(Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE)
  public ResponseEntity<Void> deleteValidLicenceAttribute(
      String scaleGradingSystemCode,
      String scalerAppointmentType) {
    service.deleteValidLicenceAttribute(scaleGradingSystemCode, scalerAppointmentType);
    return ResponseEntity.noContent().build();
  }
}
