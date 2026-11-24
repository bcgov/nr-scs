package ca.bc.gov.nrs.scs.backend.domain.performanceremark;

import java.time.LocalDate;

/**
 * Service-input shape for the scaler performance-remark update flow. Carries the user-editable
 * fields as domain types so the service and repository never touch generated-API types or
 * {@code JsonNullable}. The remark id is supplied from the request path, not the body, so it is not
 * part of this command.
 *
 * <p>Producer: {@code PerformanceRemarkApiMapper.toUpdateCommand} from the generated
 * {@code ScalerPerformanceRemarkUpdateRequest}. Consumer:
 * {@code PerformanceRemarkService.updateScalerPerformanceRemark}.
 */
public record PerformanceRemarkUpdateCommand(
    LocalDate loggedTimestamp,
    String performanceRemarkDesc,
    String scalerPerformanceActnCode,
    String scalerPerformanceOutcmCode,
    String outcomeDesc,
    LocalDate suspendStartDate,
    LocalDate suspendEndDate,
    Long checkScaleId) implements PerformanceRemarkCommand {}
