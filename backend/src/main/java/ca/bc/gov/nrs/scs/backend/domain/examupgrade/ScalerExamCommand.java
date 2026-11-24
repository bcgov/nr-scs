package ca.bc.gov.nrs.scs.backend.domain.examupgrade;

import java.time.LocalDate;

/**
 * Service-input shape for the per-scaler exam / upgrade create and update flows. Carries the only
 * two user-supplied fields — the training type id and the completion date — as domain types so the
 * service never touches generated-API types or {@code JsonNullable}. The class code is derived
 * server-side from the training type LOV and so is not part of this command.
 *
 * <p>A single record serves both create and update because they accept an identical field set: on
 * update the training type is immutable (the path id wins) and only the completion date may change.
 *
 * <p>Producer: {@code ScalerExamApiMapper.toCommand} from the generated {@code ScalerExam}.
 * Consumer: {@code ScalerExamService.createScalerExam} / {@code updateScalerExam}.
 */
public record ScalerExamCommand(String scalerTrainingTypeId, LocalDate completionDate) {}
