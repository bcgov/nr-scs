package ca.bc.gov.nrs.scs.backend.service.mapper;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamRequest;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Bridges the per-scaler exam / upgrade domain layer and the generated API models. Spec-first
 * artifacts ({@code JsonNullable}) are contained here: {@link #toDetail} projects a domain record
 * outbound, {@link #toCommand} reads an inbound request body into a domain command.
 */
public final class ScalerExamApiMapper {

  private ScalerExamApiMapper() {}

  /** Reads an inbound request body into the domain command the service consumes. */
  public static ScalerExamCommand toCommand(ScalerExamRequest request) {
    return new ScalerExamCommand(
        request.getScalerTrainingTypeId(), request.getCompletionDate());
  }

  public static ScalerExamDetail toDetail(ScalerExamRecord exam) {
    ScalerExamDetail model = new ScalerExamDetail();
    model.setScalerLicenceNo(JsonNullable.of(exam.scalerLicenceNo()));
    model.setScalerTrainingTypeId(JsonNullable.of(exam.scalerTrainingTypeId()));
    model.setScalerTrainingClassCode(JsonNullable.of(exam.scalerTrainingClassCode()));
    model.setCompletionDate(JsonNullable.of(exam.completionDate()));
    model.setEntryTimestamp(JsonNullable.of(exam.entryTimestamp()));
    model.setEntryUserid(JsonNullable.of(exam.entryUserid()));
    model.setUpdateTimestamp(JsonNullable.of(exam.updateTimestamp()));
    model.setUpdateUserid(JsonNullable.of(exam.updateUserid()));
    model.setRevisionCount(JsonNullable.of(exam.revisionCount()));
    return model;
  }
}
