package ca.bc.gov.nrs.scs.backend.domain.appointment;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Per-scaler appointment (licence attribute) row from {@code scs_scaler_licence_attribt_pkg}.
 * Field-compatible with the Appointments tab's {@code ScalerAppointmentDetail} so the tab's
 * eventual domain migration can adopt it unchanged. Produced by {@code ScalerRepository} on the
 * scaler aggregate read; projected by {@code ScalerApiMapper}.
 */
public record ScalerAppointmentRecord(
    Long scalerLicenceAttributeId,
    String scalerLicenceNo,
    String scalerAppointmentType,
    String scaleGradingSystemCode,
    Long orgUnitNo,
    YesNo provinceWideInd,
    LocalDate issuedDate,
    LocalDate expiryDate,
    LocalDate cancellationDate,
    String cancellationReasonTxt,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
