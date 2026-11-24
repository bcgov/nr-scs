package ca.bc.gov.nrs.scs.backend.domain.appointment;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;

/**
 * Write shape for a scaler appointment (licence attribute) row in
 * {@code scs_scaler_licence_attribt_pkg}. A single record serves every producing flow, per the
 * {@code examupgrade.ScalerExamCommand} precedent — the field set is the superset of the
 * Appointments tab's create/update contracts and the scaler form's appointment section:
 *
 * <ul>
 *   <li>Scaler form (create/update scaler): {@code orgUnitNo} is the scaler's Reg/Dist, applied
 *       only when {@code provinceWideInd} is {@code N} (legacy {@code ScalerDelegate.java:528-530});
 *       cancellation fields are always null.</li>
 *   <li>Appointments tab (future migration): {@code orgUnitNo} is explicit in the payload;
 *       cancellation date + reason are set by the edit flow and must be supplied together.</li>
 * </ul>
 *
 * Produced by the flow's ApiMapper; consumed by the owning service/repository.
 */
public record ScalerAppointmentCommand(
    String scalerAppointmentType,
    String scaleGradingSystemCode,
    Long orgUnitNo,
    YesNo provinceWideInd,
    LocalDate issuedDate,
    LocalDate expiryDate,
    LocalDate cancellationDate,
    String cancellationReasonTxt) {}
