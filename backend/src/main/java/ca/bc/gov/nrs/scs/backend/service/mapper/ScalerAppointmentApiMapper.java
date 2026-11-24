package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.mapNullable;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentUpdateRequest;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Boundary mapper for the Scaler Appointments tab: generated request bodies to the domain
 * {@link ScalerAppointmentCommand} inbound, the domain {@link ScalerAppointmentRecord} to
 * {@code ScalerAppointmentDetail} outbound. Spec-first artifacts ({@code JsonNullable}, generated
 * enums, fluent setters) are contained here. Mirrors {@code ScalerExamApiMapper}.
 */
public final class ScalerAppointmentApiMapper {

  private ScalerAppointmentApiMapper() {}

  // -------------------------------------------------------------------------
  // Inbound — requests to command
  // -------------------------------------------------------------------------

  public static ScalerAppointmentCommand toCommand(ScalerAppointmentCreateRequest request) {
    return new ScalerAppointmentCommand(
        request.getScalerAppointmentType(),
        request.getScaleGradingSystemCode(),
        getNullable(request.getOrgUnitNo()),
        YesNo.fromCode(mapNullable(request.getProvinceWideInd(),
            ScalerAppointmentCreateRequest.ProvinceWideIndEnum::getValue)),
        request.getIssuedDate(),
        getNullable(request.getExpiryDate()),
        null,   // cancellation date — not on the create contract
        null);  // cancellation reason — not on the create contract
  }

  public static ScalerAppointmentCommand toCommand(ScalerAppointmentUpdateRequest request) {
    return new ScalerAppointmentCommand(
        request.getScalerAppointmentType(),
        request.getScaleGradingSystemCode(),
        getNullable(request.getOrgUnitNo()),
        YesNo.fromCode(mapNullable(request.getProvinceWideInd(),
            ScalerAppointmentUpdateRequest.ProvinceWideIndEnum::getValue)),
        request.getIssuedDate(),
        getNullable(request.getExpiryDate()),
        getNullable(request.getCancellationDate()),
        getNullable(request.getCancellationReasonTxt()));
  }

  // -------------------------------------------------------------------------
  // Outbound — domain record to response
  // -------------------------------------------------------------------------

  public static ScalerAppointmentDetail toDetail(ScalerAppointmentRecord appt) {
    ScalerAppointmentDetail a = new ScalerAppointmentDetail();
    a.setScalerLicenceAttributeId(JsonNullable.of(appt.scalerLicenceAttributeId()));
    a.setScalerLicenceNo(JsonNullable.of(appt.scalerLicenceNo()));
    a.setScalerAppointmentType(JsonNullable.of(appt.scalerAppointmentType()));
    a.setScaleGradingSystemCode(JsonNullable.of(appt.scaleGradingSystemCode()));
    a.setOrgUnitNo(JsonNullable.of(appt.orgUnitNo()));
    a.setProvinceWideInd(JsonNullable.of(appt.provinceWideInd() != null
        ? ScalerAppointmentDetail.ProvinceWideIndEnum.fromValue(appt.provinceWideInd().name()) : null));
    a.setIssuedDate(JsonNullable.of(appt.issuedDate()));
    a.setExpiryDate(JsonNullable.of(appt.expiryDate()));
    a.setCancellationDate(JsonNullable.of(appt.cancellationDate()));
    a.setCancellationReasonTxt(JsonNullable.of(appt.cancellationReasonTxt()));
    a.setEntryTimestamp(JsonNullable.of(appt.entryTimestamp()));
    a.setEntryUserid(JsonNullable.of(appt.entryUserid()));
    a.setUpdateTimestamp(JsonNullable.of(appt.updateTimestamp()));
    a.setUpdateUserid(JsonNullable.of(appt.updateUserid()));
    a.setRevisionCount(JsonNullable.of(appt.revisionCount()));
    return a;
  }
}
