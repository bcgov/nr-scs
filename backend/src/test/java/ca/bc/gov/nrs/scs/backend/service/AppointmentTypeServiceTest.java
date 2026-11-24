package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.dao.DataIntegrityViolationException;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.AppointmentTypeRepository;

@ExtendWith(MockitoExtension.class)
class AppointmentTypeServiceTest {

  @Mock
  private AppointmentTypeRepository repository;

  @InjectMocks
  private AppointmentTypeService service;

  @Test
  void getAppointmentTypes_throwsWhenCodeTooLong() {
    assertThrows(
        BadRequestException.class,
        () -> service.getAppointmentTypes("ABCDE", null, null, null, null));
  }

  @Test
  void getAppointmentTypes_throwsWhenActingIndInvalid() {
    assertThrows(
        BadRequestException.class,
        () -> service.getAppointmentTypes(null, null, "X", null, null));
  }

  @Test
  void createAppointmentType_throwsWhenCodeAlreadyExists() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    when(repository.findByCode("ABCD")).thenReturn(new AppointmentType());

    assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
  }

  @Test
  void createAppointmentType_throwsWhenExpiryDateMissing() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setExpiryDate(null);

    assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
  }

  @Test
  void createAppointmentType_normalizesAndDelegatesToRepository() {
    AppointmentTypeCreateRequest request = new AppointmentTypeCreateRequest();
    request.setCode(" abcd ");
    request.setDescription("  Acting description  ");
    request.setActingInd(AppointmentTypeCreateRequest.ActingIndEnum.N);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));

    AppointmentType created = new AppointmentType();
    created.setCode("ABCD");
    when(repository.findByCode("ABCD")).thenReturn(null);
    when(repository.create(any(AppointmentTypeCreateRequest.class))).thenReturn(created);

    AppointmentType result = service.createAppointmentType(request);

    assertEquals("ABCD", result.getCode());
    ArgumentCaptor<AppointmentTypeCreateRequest> captor =
        ArgumentCaptor.forClass(AppointmentTypeCreateRequest.class);
    verify(repository).create(captor.capture());

    AppointmentTypeCreateRequest normalized = captor.getValue();
    assertEquals("ABCD", normalized.getCode());
    assertEquals("Acting description", normalized.getDescription());
    assertEquals(AppointmentTypeCreateRequest.ActingIndEnum.N, normalized.getActingInd());
  }

  @Test
  void updateAppointmentType_throwsWhenNotFound() {
    AppointmentTypeUpdateRequest request = buildUpdateRequest();
    when(repository.findByCode("ABCD")).thenReturn(null);

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateAppointmentType("ABCD", request));
  }

  @Test
  void updateAppointmentType_delegatesWithNormalizedPayload() {
    AppointmentTypeUpdateRequest request = new AppointmentTypeUpdateRequest();
    request.setDescription("  Updated desc  ");
    request.setActingInd(AppointmentTypeUpdateRequest.ActingIndEnum.Y);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));

    when(repository.findByCode("ABCD")).thenReturn(new AppointmentType());
    when(repository.update(eq("ABCD"), any(AppointmentTypeUpdateRequest.class)))
        .thenReturn(new AppointmentType());

    service.updateAppointmentType(" abcd ", request);

    ArgumentCaptor<AppointmentTypeUpdateRequest> captor =
        ArgumentCaptor.forClass(AppointmentTypeUpdateRequest.class);
    verify(repository).update(eq("ABCD"), captor.capture());
    assertEquals("Updated desc", captor.getValue().getDescription());
  }

  @Test
  void deleteAppointmentType_throwsWhenDependentRecordsExist() {
    when(repository.findByCode("ABCD")).thenReturn(new AppointmentType());
    when(repository.hasDependentScalerAppointments("ABCD")).thenReturn(true);

    assertThrows(
        BadRequestException.class,
        () -> service.deleteAppointmentType("ABCD"));
  }

  @Test
  void deleteAppointmentType_deletesWhenNoDependents() {
    when(repository.findByCode("ABCD")).thenReturn(new AppointmentType());
    when(repository.hasDependentScalerAppointments("ABCD")).thenReturn(false);

    service.deleteAppointmentType("ABCD");

    verify(repository).delete("ABCD");
  }

  @Test
  void deleteAppointmentType_translatesFkViolationTo400() {
    // Backstop: pre-check passes but a concurrent FK violation at delete → clean 400, not a raw 500.
    when(repository.findByCode("ABCD")).thenReturn(new AppointmentType());
    when(repository.hasDependentScalerAppointments("ABCD")).thenReturn(false);
    doThrow(new DataIntegrityViolationException("ORA-02292")).when(repository).delete("ABCD");

    assertThrows(BadRequestException.class, () -> service.deleteAppointmentType("ABCD"));
  }

  @Test
  void createAppointmentType_throwsWhenDescriptionMissing() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setDescription(null);

    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
    assertEquals("Description is required.", ex.getMessage());
    verify(repository, never()).create(any());
  }

  @Test
  void createAppointmentType_acceptsDescriptionAtMaxLength() {
    // 120 is the legacy limit (matches ScalerAppointmentTypeValidator.MAXLENGTH_DESCRIPTION);
    // exactly 120 characters must be accepted, not rejected.
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setDescription("A".repeat(120));
    when(repository.findByCode("ABCD")).thenReturn(null);
    when(repository.create(any(AppointmentTypeCreateRequest.class))).thenReturn(new AppointmentType());

    service.createAppointmentType(request);

    verify(repository).create(any());
  }

  @Test
  void createAppointmentType_throwsWhenDescriptionTooLong() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setDescription("A".repeat(121));

    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
    assertEquals("Appointment Description can not be greater than 120 characters.", ex.getMessage());
    verify(repository, never()).create(any());
  }

  @Test
  void createAppointmentType_throwsWhenActingIndMissing() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setActingInd(null);

    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
    assertEquals("Acting indicator is required.", ex.getMessage());
    verify(repository, never()).create(any());
  }

  @Test
  void createAppointmentType_throwsWhenEffectiveDateMissing() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setEffectiveDate(null);

    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
    assertEquals("Effective date is required.", ex.getMessage());
    verify(repository, never()).create(any());
  }

  @Test
  void createAppointmentType_throwsWhenExpiryBeforeEffective() {
    AppointmentTypeCreateRequest request = buildCreateRequest();
    request.setEffectiveDate(LocalDate.of(2026, 6, 1));
    request.setExpiryDate(LocalDate.of(2026, 1, 1));

    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.createAppointmentType(request));
    assertEquals("Expiry date must be on or after Effective date.", ex.getMessage());
    verify(repository, never()).create(any());
  }

  @Test
  void deleteAppointmentType_throwsWhenNotFound() {
    when(repository.findByCode("ABCD")).thenReturn(null);

    ResourceNotFoundException ex =
        assertThrows(ResourceNotFoundException.class, () -> service.deleteAppointmentType("ABCD"));
    assertEquals("No appointment type found with code ABCD", ex.getMessage());
    verify(repository, never()).delete(any());
  }

  private AppointmentTypeCreateRequest buildCreateRequest() {
    AppointmentTypeCreateRequest request = new AppointmentTypeCreateRequest();
    request.setCode("ABCD");
    request.setDescription("Description");
    request.setActingInd(AppointmentTypeCreateRequest.ActingIndEnum.Y);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));
    return request;
  }

  private AppointmentTypeUpdateRequest buildUpdateRequest() {
    AppointmentTypeUpdateRequest request = new AppointmentTypeUpdateRequest();
    request.setDescription("Description");
    request.setActingInd(AppointmentTypeUpdateRequest.ActingIndEnum.N);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));
    return request;
  }
}
