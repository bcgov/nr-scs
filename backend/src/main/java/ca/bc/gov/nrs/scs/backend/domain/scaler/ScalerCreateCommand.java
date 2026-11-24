package ca.bc.gov.nrs.scs.backend.domain.scaler;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;

/**
 * Service input for creating a scaler (legacy {@code ScalerAction.create}). Produced by
 * {@code ScalerApiMapper.toCreateCommand}; consumed by {@code ScalerService.createScaler}.
 * The exam class code is derived server-side, never taken from the request.
 */
public record ScalerCreateCommand(
    String clientNumber,
    Long orgUnitNo,
    LocalDate issuedDate,
    LocalDate expiryDate,
    YesNo oathTakenInd,
    LocalDate licenceCancelledDate,
    List<ScalerLicenceType> licenceTypes,
    ScalerAppointmentCommand appointment,
    ScalerExamCommand exam) {}
