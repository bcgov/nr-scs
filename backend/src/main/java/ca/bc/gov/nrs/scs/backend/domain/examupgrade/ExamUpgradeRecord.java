package ca.bc.gov.nrs.scs.backend.domain.examupgrade;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ExamUpgradeRecord(
    String scalerTrainingClassCode,
    String scalerTrainingTypeId,
    String licenceAccreditInd,
    String description,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
