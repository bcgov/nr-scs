package ca.bc.gov.nrs.scs.backend.domain.scaler;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * The loaded scaler aggregate: core {@code scs_scaler_pkg} row plus assigned licence types and
 * the associated appointment or exam (legacy loads at most one — appointment wins). Produced by
 * {@code ScalerRepository.getScaler}; consumed by {@code ScalerService} (validation gates) and
 * {@code ScalerApiMapper} (projection to {@code ScalerDetail}).
 */
public record Scaler(
    String scalerLicenceNo,
    String clientNumber,
    Long orgUnitNo,
    LocalDate issuedDate,
    LocalDate expiryDate,
    YesNo oathTakenInd,
    LocalDate licenceCancelledDate,
    List<ScalerLicenceType> licenceTypes,
    ScalerAppointmentRecord appointment,
    ScalerExamRecord exam,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {

  /** Legacy {@code ScalerBo.appointmentOrExamExists()} — gates the appointment/exam XOR on update. */
  public boolean hasAppointmentOrExam() {
    return appointment != null || exam != null;
  }
}
