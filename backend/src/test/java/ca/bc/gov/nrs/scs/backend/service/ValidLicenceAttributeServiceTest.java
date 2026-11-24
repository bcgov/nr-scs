package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.dao.DataIntegrityViolationException;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.openapitools.jackson.nullable.JsonNullable;

import ca.bc.gov.nrs.scs.backend.dto.ValidLicenceAttributeRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeDetail;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ValidLicenceAttributeRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("ValidLicenceAttributeService tests")
class ValidLicenceAttributeServiceTest {

  @Mock
  private ValidLicenceAttributeRepository repository;

  @Mock
  private LovService lovService;

  @InjectMocks
  private ValidLicenceAttributeService service;

  private ValidLicenceAttributeRow existingRow(String gradingCode, String appointmentType) {
    ValidLicenceAttributeRow row = new ValidLicenceAttributeRow();
    row.setScaleGradingSystemCode(gradingCode);
    row.setScalerAppointmentType(appointmentType);
    row.setEffectiveDate(LocalDate.of(2024, 1, 1));
    return row;
  }

  private ValidLicenceAttributeCreateRequest createRequest() {
    return new ValidLicenceAttributeCreateRequest(
        "BC",
        "O",
        LocalDate.of(2024, 1, 1));
  }

  private ValidLicenceAttributeUpdateRequest updateRequest() {
    ValidLicenceAttributeUpdateRequest req = new ValidLicenceAttributeUpdateRequest(
        LocalDate.of(2024, 1, 1));
    req.setExpiryDate(JsonNullable.of(LocalDate.of(2026, 12, 31)));
    return req;
  }

  // ── search ──────────────────────────────────────────────────────────────────

  @Test
  void searchValidLicenceAttributes_returnsEnrichedList() {
    when(repository.search(null, null))
        .thenReturn(List.of(existingRow("BC", "O")));
    when(lovService.getGradingCodeAppointmentTypeLovMap()).thenReturn(Map.of());
    when(lovService.getAppointmentTypeActingMap()).thenReturn(Map.of());

    List<ValidLicenceAttributeDetail> result = service.searchValidLicenceAttributes(null, null);

    assertEquals(1, result.size());
    verify(repository).search(null, null);
  }

  // ── get ─────────────────────────────────────────────────────────────────────

  @Test
  void getValidLicenceAttribute_returnsDetailWhenExists() {
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));
    when(repository.hasDependentAppointments("BC", "O")).thenReturn(false);
    when(lovService.getGradingCodeAppointmentTypeLovMap()).thenReturn(Map.of());
    when(lovService.getAppointmentTypeActingMap()).thenReturn(Map.of());

    ValidLicenceAttributeDetail result = service.getValidLicenceAttribute("BC", "O");

    assertNotNull(result);
    verify(repository).findByPk("BC", "O");
  }

  @Test
  void getValidLicenceAttribute_throwsNotFoundWhenMissing() {
    when(repository.findByPk("XX", "Y")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getValidLicenceAttribute("XX", "Y"));

    assertEquals(
        "No valid licence attribute found for grading system 'XX' and appointment type 'Y'.",
        ex.getMessage());
  }

  // ── create ──────────────────────────────────────────────────────────────────

  @Test
  void createValidLicenceAttribute_insertsWhenValid() {
    ValidLicenceAttributeCreateRequest request = createRequest();
    when(repository.findByPk("BC", "O")).thenReturn(null);
    when(repository.insert(request)).thenReturn(existingRow("BC", "O"));
    when(repository.hasDependentAppointments("BC", "O")).thenReturn(false);
    when(lovService.getGradingCodeAppointmentTypeLovMap()).thenReturn(Map.of());
    when(lovService.getAppointmentTypeActingMap()).thenReturn(Map.of());

    ValidLicenceAttributeDetail result = service.createValidLicenceAttribute(request);

    assertNotNull(result);
    verify(repository).insert(request);
  }

  @Test
  void createValidLicenceAttribute_rejectsDuplicate() {
    ValidLicenceAttributeCreateRequest request = createRequest();
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createValidLicenceAttribute(request));

    assertEquals(
        "A valid licence attribute with grading system 'BC' and appointment type 'O' already exists.",
        ex.getMessage());
    verify(repository, never()).insert(any());
  }

  @Test
  void createValidLicenceAttribute_rejectsExpiryBeforeEffective() {
    ValidLicenceAttributeCreateRequest request = createRequest();
    request.setExpiryDate(JsonNullable.of(LocalDate.of(2023, 12, 31)));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createValidLicenceAttribute(request));

    assertEquals("Expiry Date must be on or after Effective Date.", ex.getMessage());
    verify(repository, never()).insert(any());
  }

  @Test
  void createValidLicenceAttribute_rejectsMissingGradingCode() {
    ValidLicenceAttributeCreateRequest request = new ValidLicenceAttributeCreateRequest(
        "",
        "O",
        LocalDate.of(2024, 1, 1));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createValidLicenceAttribute(request));

    assertEquals("Grading System Code is required.", ex.getMessage());
    verify(repository, never()).insert(any());
  }

  @Test
  void createValidLicenceAttribute_rejectsMissingAppointmentType() {
    ValidLicenceAttributeCreateRequest request = new ValidLicenceAttributeCreateRequest(
        "BC",
        "",
        LocalDate.of(2024, 1, 1));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createValidLicenceAttribute(request));

    assertEquals("Appointment Type is required.", ex.getMessage());
    verify(repository, never()).insert(any());
  }

  // ── update ──────────────────────────────────────────────────────────────────

  @Test
  void updateValidLicenceAttribute_updatesWhenValid() {
    ValidLicenceAttributeUpdateRequest request = updateRequest();
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));
    when(repository.update("BC", "O", request)).thenReturn(existingRow("BC", "O"));
    when(repository.hasDependentAppointments("BC", "O")).thenReturn(false);
    when(lovService.getGradingCodeAppointmentTypeLovMap()).thenReturn(Map.of());
    when(lovService.getAppointmentTypeActingMap()).thenReturn(Map.of());

    ValidLicenceAttributeDetail result = service.updateValidLicenceAttribute("BC", "O", request);

    assertNotNull(result);
    verify(repository).update("BC", "O", request);
  }

  @Test
  void updateValidLicenceAttribute_throwsNotFoundWhenMissing() {
    when(repository.findByPk("XX", "Y")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateValidLicenceAttribute("XX", "Y", updateRequest()));

    assertEquals(
        "No valid licence attribute found for grading system 'XX' and appointment type 'Y'.",
        ex.getMessage());
    verify(repository, never()).update(any(), any(), any());
  }

  @Test
  void updateValidLicenceAttribute_rejectsExpiryBeforeEffective() {
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));
    ValidLicenceAttributeUpdateRequest request = new ValidLicenceAttributeUpdateRequest(
        LocalDate.of(2024, 6, 1));
    request.setExpiryDate(JsonNullable.of(LocalDate.of(2024, 1, 1)));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateValidLicenceAttribute("BC", "O", request));

    assertEquals("Expiry Date must be on or after Effective Date.", ex.getMessage());
    verify(repository, never()).update(any(), any(), any());
  }

  // ── delete ──────────────────────────────────────────────────────────────────

  @Test
  void deleteValidLicenceAttribute_deletesWhenNoDependents() {
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));
    when(repository.hasDependentAppointments("BC", "O")).thenReturn(false);

    service.deleteValidLicenceAttribute("BC", "O");

    verify(repository).delete("BC", "O");
  }

  @Test
  void deleteValidLicenceAttribute_translatesFkViolationTo400() {
    // Backstop: pre-check passes but a concurrent FK violation at delete → clean 400, not a raw 500.
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));
    when(repository.hasDependentAppointments("BC", "O")).thenReturn(false);
    doThrow(new DataIntegrityViolationException("ORA-02292")).when(repository).delete("BC", "O");

    assertThrows(BadRequestException.class, () -> service.deleteValidLicenceAttribute("BC", "O"));
  }

  @Test
  void deleteValidLicenceAttribute_throwsNotFoundWhenMissing() {
    when(repository.findByPk("XX", "Y")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteValidLicenceAttribute("XX", "Y"));

    assertEquals(
        "No valid licence attribute found for grading system 'XX' and appointment type 'Y'.",
        ex.getMessage());
    verify(repository, never()).delete(any(), any());
  }

  @Test
  void deleteValidLicenceAttribute_rejectsWhenDependentExists() {
    when(repository.findByPk("BC", "O")).thenReturn(existingRow("BC", "O"));
    when(repository.hasDependentAppointments("BC", "O")).thenReturn(true);

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.deleteValidLicenceAttribute("BC", "O"));

    assertEquals(
        "The current record has been associated to a Scaler and cannot be deleted. "
            + "You can expire this record by setting an expiry date.",
        ex.getMessage());
    verify(repository, never()).delete(any(), any());
  }
}
