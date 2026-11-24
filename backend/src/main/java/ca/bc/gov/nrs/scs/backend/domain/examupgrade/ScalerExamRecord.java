package ca.bc.gov.nrs.scs.backend.domain.examupgrade;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Per-scaler exam / upgrade (training) record. Maps a single row of
 * {@code scs_scaler_training_pkg}. The composite key is
 * {@code (scalerLicenceNo, scalerTrainingClassCode, scalerTrainingTypeId)}; within a scaler the
 * training type id is unique because the class code is derived from the training type.
 */
public record ScalerExamRecord(
    String scalerLicenceNo,
    String scalerTrainingClassCode,
    String scalerTrainingTypeId,
    LocalDate completionDate,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
