package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentDetail;
import ca.bc.gov.nrs.scs.backend.repository.ScalerAppointmentRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScalerAppointmentService tests")
class ScalerAppointmentServiceTest {

  private static final LocalDate ISSUED = LocalDate.of(2025, 1, 15);

  @Mock
  private ScalerAppointmentRepository scalerAppointmentRepository;

  @Mock
  private ScalerRepository scalerRepository;

  @InjectMocks
  private ScalerAppointmentService service;

  private ScalerSummaryCore existingScaler(String licenceNo) {
    return new ScalerSummaryCore(licenceNo, null, null, null, null, null, null);
  }

  private ScalerAppointmentRecord appointmentRecord(String licenceNo, long attributeId) {
    return new ScalerAppointmentRecord(
        attributeId, licenceNo, "O", "BC", null, YesNo.Y,
        ISSUED, null, null, null, null, null, null, null, null);
  }

  /** Province-wide official appointment, no district, well within the 5-year limit. */
  private ScalerAppointmentCommand createCommand() {
    return new ScalerAppointmentCommand(
        "O", "BC", null, YesNo.Y, ISSUED, LocalDate.of(2030, 1, 15), null, null);
  }

  /** District-specific acting appointment within the 1-year limit. */
  private ScalerAppointmentCommand updateCommand() {
    return new ScalerAppointmentCommand(
        "A", "BC", 1234L, YesNo.N, ISSUED, LocalDate.of(2026, 1, 15), null, null);
  }

  private ScalerAppointmentCommand updateCommandWithCancellation(
      LocalDate cancellationDate, String cancellationReason) {
    return new ScalerAppointmentCommand(
        "A", "BC", 1234L, YesNo.N, ISSUED, LocalDate.of(2026, 1, 15),
        cancellationDate, cancellationReason);
  }

  @Test
  void getScalerAppointments_returnsListWhenScalerExists() {
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(appointmentRecord("1234", 5001L)));

    List<ScalerAppointmentDetail> result = service.getScalerAppointments("1234");

    assertEquals(1, result.size());
    verify(scalerAppointmentRepository).findByScalerLicenceNo("1234");
  }

  @Test
  void getScalerAppointments_throwsNotFoundWhenScalerMissing() {
    when(scalerRepository.getScalerSummaryCore("9999")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScalerAppointments("9999"));

    assertEquals("No scaler found with licence number 9999", ex.getMessage());
    verify(scalerAppointmentRepository, never()).findByScalerLicenceNo(any());
  }

  @Test
  void createScalerAppointment_insertsWhenValid() {
    ScalerAppointmentCommand command = createCommand();
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.insert("1234", command)).thenReturn(appointmentRecord("1234", 5001L));

    ScalerAppointmentDetail result = service.createScalerAppointment("1234", command);

    assertNotNull(result);
    verify(scalerAppointmentRepository).insert("1234", command);
  }

  @Test
  void createScalerAppointment_rejectsDistrictSpecificWithoutDistrict() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "A", "BC", null, YesNo.N, ISSUED, null, null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals("District is required when the appointment is not province-wide.", ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_rejectsProvinceWideWithDistrict() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "O", "BC", 1234L, YesNo.Y, ISSUED, LocalDate.of(2030, 1, 15), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals("District must be omitted when the appointment is province-wide.", ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_rejectsMissingProvinceWide() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "O", "BC", null, null, ISSUED, LocalDate.of(2030, 1, 15), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals("Province Wide is required.", ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_rejectsInvalidDateOrder() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "O", "BC", null, YesNo.Y, ISSUED, LocalDate.of(2024, 12, 31), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals("Appointment effective date must be on or before the appointment expiry date.", ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_rejectsActingDurationBeyondOneYear() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "A", "BC", null, YesNo.Y, ISSUED, LocalDate.of(2026, 1, 16), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals(
        "Appointment expiry date cannot be more than 1 year(s) after the appointment effective date for appointment type A.",
        ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_rejectsLimitedDurationBeyondTwoYears() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "L", "BC", null, YesNo.Y, ISSUED, LocalDate.of(2027, 1, 16), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals(
        "Appointment expiry date cannot be more than 2 year(s) after the appointment effective date for appointment type L.",
        ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_rejectsOfficialDurationBeyondFiveYears() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "O", "BC", null, YesNo.Y, ISSUED, LocalDate.of(2030, 1, 16), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerAppointment("1234", command));

    assertEquals(
        "Appointment expiry date cannot be more than 5 year(s) after the appointment effective date for appointment type O.",
        ex.getMessage());
    verify(scalerAppointmentRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerAppointment_doesNotApplyDurationRuleToUnlimitedTypes() {
    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "FORS", "BC", null, YesNo.Y, ISSUED, LocalDate.of(2040, 1, 15), null, null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.insert("1234", command)).thenReturn(appointmentRecord("1234", 5001L));

    ScalerAppointmentDetail result = service.createScalerAppointment("1234", command);

    assertNotNull(result);
    verify(scalerAppointmentRepository).insert("1234", command);
  }

  @Test
  void updateScalerAppointment_updatesWhenValid() {
    ScalerAppointmentCommand command = updateCommand();
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findById(5001L)).thenReturn(appointmentRecord("1234", 5001L));
    when(scalerAppointmentRepository.update("1234", 5001L, command))
        .thenReturn(appointmentRecord("1234", 5001L));

    ScalerAppointmentDetail result = service.updateScalerAppointment("1234", 5001L, command);

    assertNotNull(result);
    verify(scalerAppointmentRepository).update("1234", 5001L, command);
  }

  @Test
  void updateScalerAppointment_rejectsUnpairedCancellationFields() {
    ScalerAppointmentCommand command = updateCommandWithCancellation(LocalDate.of(2025, 11, 1), null);
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findById(5001L)).thenReturn(appointmentRecord("1234", 5001L));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScalerAppointment("1234", 5001L, command));

    assertEquals(
        "Cancellation date and reason must either both be provided or both be omitted.",
        ex.getMessage());
    verify(scalerAppointmentRepository, never()).update(any(), any(), any());
  }

  @Test
  void updateScalerAppointment_rejectsCancellationBeforeIssuedDate() {
    ScalerAppointmentCommand command = updateCommandWithCancellation(LocalDate.of(2025, 1, 14), "Reason");
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findById(5001L)).thenReturn(appointmentRecord("1234", 5001L));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScalerAppointment("1234", 5001L, command));

    assertEquals("Cancellation date must be on or after the appointment effective date.", ex.getMessage());
    verify(scalerAppointmentRepository, never()).update(any(), any(), any());
  }

  @Test
  void updateScalerAppointment_rejectsCancellationAfterExpiryDate() {
    ScalerAppointmentCommand command = updateCommandWithCancellation(LocalDate.of(2026, 1, 16), "Reason");
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findById(5001L)).thenReturn(appointmentRecord("1234", 5001L));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScalerAppointment("1234", 5001L, command));

    assertEquals("Cancellation date must be on or before the appointment expiry date.", ex.getMessage());
    verify(scalerAppointmentRepository, never()).update(any(), any(), any());
  }

  @Test
  void updateScalerAppointment_rejectsWhenAppointmentBelongsToDifferentScaler() {
    ScalerAppointmentCommand command = updateCommand();
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findById(5001L)).thenReturn(appointmentRecord("9999", 5001L));

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateScalerAppointment("1234", 5001L, command));

    assertEquals("No appointment 5001 found for scaler 1234", ex.getMessage());
    verify(scalerAppointmentRepository, never()).update(any(), any(), any());
  }

  @Test
  void deleteScalerAppointment_deletesWhenOwnedByScaler() {
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerAppointmentRepository.findById(5001L)).thenReturn(appointmentRecord("1234", 5001L));

    service.deleteScalerAppointment("1234", 5001L);

    verify(scalerAppointmentRepository).delete(5001L);
  }

  @Test
  void deleteFirstForScaler_deletesOnlyTheFirstAppointment() {
    // Legacy parity: only the first (get(0)) appointment is removed; extras are left to block the
    // scaler's core delete via ORA-02292, so a multi-appointment scaler is not deletable.
    when(scalerAppointmentRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(appointmentRecord("1234", 5001L), appointmentRecord("1234", 5002L)));

    service.deleteFirstForScaler("1234");

    verify(scalerAppointmentRepository).delete(5001L);
    verify(scalerAppointmentRepository, never()).delete(5002L);
  }
}
