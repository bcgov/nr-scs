package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;

import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkRecord;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkUpdateCommand;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkUpdateRequest;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Maps between the generated performance-remark API models and the domain layer. Spec-first
 * artifacts ({@code JsonNullable}) are contained here — the inbound {@code toCreateCommand} /
 * {@code toUpdateCommand} unwrap them into domain commands and the outbound {@code toDetail}
 * projects a {@link PerformanceRemarkRecord} back to the model, so the service and repository never
 * touch generated-API types. The action / outcome descriptions on {@code toDetail} are resolved by
 * the service loader and passed in — that projection only rearranges data.
 */
public final class PerformanceRemarkApiMapper {

  private PerformanceRemarkApiMapper() {}

  public static PerformanceRemarkCreateCommand toCreateCommand(
      ScalerPerformanceRemarkCreateRequest request) {
    return new PerformanceRemarkCreateCommand(
        request.getLoggedTimestamp(),
        request.getPerformanceRemarkDesc(),
        getNullable(request.getScalerPerformanceActnCode()),
        getNullable(request.getScalerPerformanceOutcmCode()),
        getNullable(request.getOutcomeDesc()),
        getNullable(request.getSuspendStartDate()),
        getNullable(request.getSuspendEndDate()),
        getNullable(request.getCheckScaleId()));
  }

  public static PerformanceRemarkUpdateCommand toUpdateCommand(
      ScalerPerformanceRemarkUpdateRequest request) {
    return new PerformanceRemarkUpdateCommand(
        request.getLoggedTimestamp(),
        request.getPerformanceRemarkDesc(),
        getNullable(request.getScalerPerformanceActnCode()),
        getNullable(request.getScalerPerformanceOutcmCode()),
        getNullable(request.getOutcomeDesc()),
        getNullable(request.getSuspendStartDate()),
        getNullable(request.getSuspendEndDate()),
        getNullable(request.getCheckScaleId()));
  }

  public static ScalerPerformanceRemarkDetail toDetail(
      PerformanceRemarkRecord remark,
      String actnDescription,
      String outcmDescription
  ) {
    ScalerPerformanceRemarkDetail model = new ScalerPerformanceRemarkDetail();
    model.setScalerPerformanceRemarkId(JsonNullable.of(remark.scalerPerformanceRemarkId()));
    model.setScalerLicenceNo(JsonNullable.of(remark.scalerLicenceNo()));
    model.setLoggedTimestamp(JsonNullable.of(remark.loggedTimestamp()));
    model.setLoggedUserid(JsonNullable.of(remark.loggedUserid()));
    model.setPerformanceRemarkDesc(JsonNullable.of(remark.performanceRemarkDesc()));
    model.setScalerPerformanceActnCode(JsonNullable.of(remark.scalerPerformanceActnCode()));
    model.setScalerPerformanceActnDescription(JsonNullable.of(actnDescription));
    model.setScalerPerformanceOutcmCode(JsonNullable.of(remark.scalerPerformanceOutcmCode()));
    model.setScalerPerformanceOutcmDescription(JsonNullable.of(outcmDescription));
    model.setOutcomeDesc(JsonNullable.of(remark.outcomeDesc()));
    model.setSuspendStartDate(JsonNullable.of(remark.suspendStartDate()));
    model.setSuspendEndDate(JsonNullable.of(remark.suspendEndDate()));
    model.setCheckScaleId(JsonNullable.of(remark.checkScaleId()));
    model.setEntryTimestamp(JsonNullable.of(remark.entryTimestamp()));
    model.setEntryUserid(JsonNullable.of(remark.entryUserid()));
    model.setUpdateTimestamp(JsonNullable.of(remark.updateTimestamp()));
    model.setUpdateUserid(JsonNullable.of(remark.updateUserid()));
    model.setRevisionCount(JsonNullable.of(remark.revisionCount()));
    return model;
  }
}
