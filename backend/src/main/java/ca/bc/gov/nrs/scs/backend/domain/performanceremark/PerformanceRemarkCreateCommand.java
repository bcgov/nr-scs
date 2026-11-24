package ca.bc.gov.nrs.scs.backend.domain.performanceremark;

import java.time.LocalDate;

/**
 * Service-input shape for the scaler performance-remark create flow. Carries the user-editable
 * fields as domain types so the service and repository never touch generated-API types or
 * {@code JsonNullable}.
 *
 * <p>Producer: {@code PerformanceRemarkApiMapper.toCreateCommand} from the generated
 * {@code ScalerPerformanceRemarkCreateRequest}. Consumer:
 * {@code PerformanceRemarkService.createScalerPerformanceRemark}.
 */
public record PerformanceRemarkCreateCommand(
    LocalDate loggedTimestamp,
    String performanceRemarkDesc,
    String scalerPerformanceActnCode,
    String scalerPerformanceOutcmCode,
    String outcomeDesc,
    LocalDate suspendStartDate,
    LocalDate suspendEndDate,
    Long checkScaleId) implements PerformanceRemarkCommand {}
