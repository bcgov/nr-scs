package ca.bc.gov.nrs.scs.backend.domain.performanceremark;

import java.time.LocalDate;

/**
 * The user-editable fields common to the performance-remark create and update flows, as domain
 * types. Sealed over the two variants so the shared validator ({@code
 * PerformanceRemarkService.validateRemarkRequest}) and repository can operate on one shape while the
 * runtime type still distinguishes create from update. Carrying these already unwrapped means the
 * service and repository never touch generated-API types or {@code JsonNullable} — those stay
 * confined to {@code PerformanceRemarkApiMapper}. The scaler licence, remark id and acting user are
 * supplied from the request path / security context, not the body, so they are not part of this
 * command.
 */
public sealed interface PerformanceRemarkCommand
    permits PerformanceRemarkCreateCommand, PerformanceRemarkUpdateCommand {

  LocalDate loggedTimestamp();

  String performanceRemarkDesc();

  String scalerPerformanceActnCode();

  String scalerPerformanceOutcmCode();

  String outcomeDesc();

  LocalDate suspendStartDate();

  LocalDate suspendEndDate();

  Long checkScaleId();
}
