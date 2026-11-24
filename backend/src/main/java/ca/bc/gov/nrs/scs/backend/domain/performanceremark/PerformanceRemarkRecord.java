package ca.bc.gov.nrs.scs.backend.domain.performanceremark;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * A single scaler performance-remark row. Maps one row of {@code scs_scaler_performanc_rmrk_pkg}
 * (legacy Performance Remarks tab). Holds raw codes only; the action / outcome LOV descriptions
 * ("Issue Type" column) are resolved in the service loader and applied at the API projection, so
 * this record carries no spec-first artifacts.
 */
public record PerformanceRemarkRecord(
    Long scalerPerformanceRemarkId,
    String scalerLicenceNo,
    LocalDate loggedTimestamp,
    String loggedUserid,
    String performanceRemarkDesc,
    String scalerPerformanceActnCode,
    String scalerPerformanceOutcmCode,
    String outcomeDesc,
    LocalDate suspendStartDate,
    Long checkScaleId,
    LocalDate suspendEndDate,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
