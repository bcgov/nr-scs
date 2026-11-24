package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentDetail;
import ca.bc.gov.nrs.scs.backend.repository.ScalerAppointmentRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerAppointmentApiMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScalerAppointmentService {

  private final ScalerAppointmentRepository scalerAppointmentRepository;
  private final ScalerRepository scalerRepository;

  public ScalerAppointmentService(
      ScalerAppointmentRepository scalerAppointmentRepository,
      ScalerRepository scalerRepository
  ) {
    this.scalerAppointmentRepository = scalerAppointmentRepository;
    this.scalerRepository = scalerRepository;
  }

  public List<ScalerAppointmentDetail> getScalerAppointments(String scalerLicenceNo) {
    assertScalerExists(scalerLicenceNo);
    return scalerAppointmentRepository.findByScalerLicenceNo(scalerLicenceNo).stream()
        .map(ScalerAppointmentApiMapper::toDetail)
        .toList();
  }

  @Transactional
  public ScalerAppointmentDetail createScalerAppointment(
      String scalerLicenceNo,
      ScalerAppointmentCommand command
  ) {
    assertScalerExists(scalerLicenceNo);
    validateCommand(command);
    return ScalerAppointmentApiMapper.toDetail(
        scalerAppointmentRepository.insert(scalerLicenceNo, command));
  }

  @Transactional
  public ScalerAppointmentDetail updateScalerAppointment(
      String scalerLicenceNo,
      Long scalerLicenceAttributeId,
      ScalerAppointmentCommand command
  ) {
    assertScalerExists(scalerLicenceNo);
    assertAppointmentBelongsToScaler(scalerLicenceNo, scalerLicenceAttributeId);
    validateCommand(command);
    validateCancellation(command);
    return ScalerAppointmentApiMapper.toDetail(
        scalerAppointmentRepository.update(scalerLicenceNo, scalerLicenceAttributeId, command));
  }

  @Transactional
  public void deleteScalerAppointment(String scalerLicenceNo, Long scalerLicenceAttributeId) {
    assertScalerExists(scalerLicenceNo);
    assertAppointmentBelongsToScaler(scalerLicenceNo, scalerLicenceAttributeId);
    scalerAppointmentRepository.delete(scalerLicenceAttributeId);
  }

  /**
   * Deletes the scaler's first appointment (if any) for the scaler-delete cascade
   * ({@code ScalerService.deleteScaler}). Legacy {@code ScalerDb.loadScaler} loaded only
   * {@code licAtts.get(0)} (appointments come back ordered by expiry desc) and
   * {@code ScalerDelegate.deleteScaler} deleted just that one; any further appointment rows are
   * intentionally left to block the scaler's core delete via ORA-02292 — so a scaler with more than
   * one appointment is not deletable, matching legacy. One writer per table: the scaler service
   * delegates here rather than touching {@code scaler_licence_attribute} directly.
   */
  @Transactional
  public void deleteFirstForScaler(String scalerLicenceNo) {
    scalerAppointmentRepository.findByScalerLicenceNo(scalerLicenceNo).stream()
        .findFirst()
        .ifPresent(appointment -> scalerAppointmentRepository.delete(appointment.scalerLicenceAttributeId()));
  }

  /**
   * Shared appointment rules (province-wide/district, date order, duration). Owned here as the sole
   * appointment-table writer: both the tab (create/update) and the scaler form's embedded
   * appointment (via {@code ScalerService}) validate through this path.
   */
  private void validateCommand(ScalerAppointmentCommand command) {
    validateProvinceWideAndDistrict(command.provinceWideInd(), command.orgUnitNo());
    requireDateOrder(
        command.issuedDate(),
        command.expiryDate(),
        "Appointment effective date must be on or before the appointment expiry date.");
    validateAppointmentDuration(
        command.scalerAppointmentType(),
        command.issuedDate(),
        command.expiryDate());
  }

  /** Cancellation date/reason pairing and ordering — only reachable on update. */
  private void validateCancellation(ScalerAppointmentCommand command) {
    LocalDate cancellationDate = command.cancellationDate();
    String cancellationReason = command.cancellationReasonTxt();

    boolean hasCancellationDate = cancellationDate != null;
    boolean hasCancellationReason = cancellationReason != null && !cancellationReason.isBlank();
    if (hasCancellationDate != hasCancellationReason) {
      throw new BadRequestException(
          "Cancellation date and reason must either both be provided or both be omitted.");
    }

    if (hasCancellationDate) {
      if (cancellationDate.isBefore(command.issuedDate())) {
        throw new BadRequestException(
            "Cancellation date must be on or after the appointment effective date.");
      }
      if (command.expiryDate() != null && cancellationDate.isAfter(command.expiryDate())) {
        throw new BadRequestException(
            "Cancellation date must be on or before the appointment expiry date.");
      }
    }
  }

  private void validateProvinceWideAndDistrict(YesNo provinceWideInd, Long orgUnitNo) {
    if (provinceWideInd == null) {
      // Required field (legacy ScalerLicenceAttributeValidator). The wire type is @NotNull, but
      // guard the service so a direct/embed caller can't slip a null through to a NULL DB write.
      throw new BadRequestException("Province Wide is required.");
    }
    if (provinceWideInd == YesNo.Y && orgUnitNo != null) {
      throw new BadRequestException("District must be omitted when the appointment is province-wide.");
    }
    if (provinceWideInd == YesNo.N && orgUnitNo == null) {
      throw new BadRequestException("District is required when the appointment is not province-wide.");
    }
  }

  private void validateAppointmentDuration(
      String scalerAppointmentType,
      LocalDate issuedDate,
      LocalDate expiryDate
  ) {
    if (scalerAppointmentType == null || issuedDate == null || expiryDate == null) {
      return;
    }

    Integer maxYears = switch (scalerAppointmentType) {
      case "A" -> 1;
      case "L" -> 2;
      case "O" -> 5;
      default -> null;
    };

    if (maxYears == null) {
      return;
    }

    if (expiryDate.isAfter(issuedDate.plusYears(maxYears))) {
      throw new BadRequestException(
          "Appointment expiry date cannot be more than "
              + maxYears
              + " year(s) after the appointment effective date for appointment type "
              + scalerAppointmentType
              + ".");
    }
  }

  private void assertScalerExists(String scalerLicenceNo) {
    if (scalerRepository.getScalerSummaryCore(scalerLicenceNo) == null) {
      throw new ResourceNotFoundException(
          "No scaler found with licence number " + scalerLicenceNo);
    }
  }

  private void assertAppointmentBelongsToScaler(String scalerLicenceNo, Long scalerLicenceAttributeId) {
    ScalerAppointmentRecord existing = scalerAppointmentRepository.findById(scalerLicenceAttributeId);
    String existingLicenceNo = existing != null ? existing.scalerLicenceNo() : null;
    if (existing == null || !Objects.equals(existingLicenceNo, scalerLicenceNo)) {
      throw new ResourceNotFoundException(
          "No appointment " + scalerLicenceAttributeId + " found for scaler " + scalerLicenceNo);
    }
  }
}
