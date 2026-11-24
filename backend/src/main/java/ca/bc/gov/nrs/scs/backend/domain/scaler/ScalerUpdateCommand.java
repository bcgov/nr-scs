package ca.bc.gov.nrs.scs.backend.domain.scaler;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;

/**
 * Service input for updating a scaler (legacy {@code ScalerAction.update}). Produced by
 * {@code ScalerApiMapper.toUpdateCommand} from the path licence number + generated
 * {@code ScalerCreate} request; consumed by {@code ScalerService.updateScaler}.
 *
 * <p>{@code licenceCancelledDate} is read-only here (owned by {@code updateScalerLicenceCancelledDate});
 * the {@code licenceCancelledDateProvided} flag carries the request's absent-vs-null distinction so
 * the service can reject a provided-and-different value.
 */
public record ScalerUpdateCommand(
    String scalerLicenceNo,
    String clientNumber,
    Long orgUnitNo,
    LocalDate issuedDate,
    LocalDate expiryDate,
    YesNo oathTakenInd,
    boolean licenceCancelledDateProvided,
    LocalDate licenceCancelledDate,
    List<ScalerLicenceType> licenceTypes,
    ScalerAppointmentCommand appointment,
    ScalerExamCommand exam) {}
