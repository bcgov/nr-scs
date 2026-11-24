package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumber;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.mapNullable;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.Scaler;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceTypeEntry;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScalerAppointmentInput;
import ca.bc.gov.nrs.scs.backend.model.ScalerCreate;
import ca.bc.gov.nrs.scs.backend.model.ScalerDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamRequest;
import ca.bc.gov.nrs.scs.backend.model.ScalerResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummary;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummaryLicenceType;
import ca.bc.gov.nrs.scs.backend.model.ScalerTombstone;
import java.util.List;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Boundary mapper for the scaler feature: generated request models to domain commands inbound, and
 * the scaler domain records to their generated response models outbound — the {@link Scaler}
 * aggregate to {@code ScalerDetail}, plus the read projections (summary, search results, tombstone).
 * Spec-first artifacts ({@code JsonNullable}, generated enums, fluent setters) are contained here.
 */
public final class ScalerApiMapper {

  private ScalerApiMapper() {}

  // -------------------------------------------------------------------------
  // Inbound — requests to commands
  // -------------------------------------------------------------------------

  public static ScalerCreateCommand toCreateCommand(ScalerCreate request) {
    // Zero-padded at the boundary (legacy ScalerDto:122)
    return new ScalerCreateCommand(
        padClientNumber(request.getClientNumber()),
        request.getOrgUnitNo(),
        request.getIssuedDate(),
        getNullable(request.getExpiryDate()),
        toYesNo(request.getOathTakenInd()),
        getNullable(request.getLicenceCancelledDate()),
        toLicenceTypes(request.getLicenceTypes()),
        toAppointmentCommand(request.getAppointment(), request.getOrgUnitNo()),
        toExamCommand(request.getExam()));
  }

  public static ScalerUpdateCommand toUpdateCommand(String scalerLicenceNo, ScalerCreate request) {
    boolean cancelledDateProvided =
        request.getLicenceCancelledDate() != null && request.getLicenceCancelledDate().isPresent();
    return new ScalerUpdateCommand(
        scalerLicenceNo,
        padClientNumber(request.getClientNumber()),
        request.getOrgUnitNo(),
        request.getIssuedDate(),
        getNullable(request.getExpiryDate()),
        toYesNo(request.getOathTakenInd()),
        cancelledDateProvided,
        getNullable(request.getLicenceCancelledDate()),
        toLicenceTypes(request.getLicenceTypes()),
        toAppointmentCommand(request.getAppointment(), request.getOrgUnitNo()),
        toExamCommand(request.getExam()));
  }

  private static List<ScalerLicenceType> toLicenceTypes(List<ScalerCreate.LicenceTypesEnum> types) {
    if (types == null) {
      return List.of();
    }
    return types.stream()
        .map(t -> ScalerLicenceType.fromCode(t.getValue()))
        .filter(java.util.Objects::nonNull)
        .toList();
  }

  /**
   * {@code orgUnitNo} comes from the top-level request (the scaler's Reg/Dist — legacy derives it,
   * {@code ScalerDelegate.java:528-530}); cancellation fields are always null from the scaler form.
   */
  private static ScalerAppointmentCommand toAppointmentCommand(
      ScalerAppointmentInput input, Long scalerOrgUnitNo) {
    if (input == null) {
      return null;
    }
    YesNo provinceWideInd = YesNo.fromCode(
        mapNullable(input.getProvinceWideInd(), ScalerAppointmentInput.ProvinceWideIndEnum::getValue));
    // Legacy ScalerDelegate.java:528-530: the org unit (the scaler's Reg/Dist) is stored only for a
    // district-specific appointment; a province-wide appointment carries no org unit.
    Long appointmentOrgUnitNo = provinceWideInd == YesNo.N ? scalerOrgUnitNo : null;
    return new ScalerAppointmentCommand(
        input.getScalerAppointmentType(),
        input.getScaleGradingSystemCode(),
        appointmentOrgUnitNo,
        provinceWideInd,
        input.getIssuedDate(),
        getNullable(input.getExpiryDate()),
        null,
        null);
  }

  /**
   * The exam section shares {@code ScalerExamRequest} with the Exams/Upgrades tab — no class code
   * on the wire; it is derived server-side ({@code ScalerExamService.resolveClassCode}).
   */
  private static ScalerExamCommand toExamCommand(ScalerExamRequest request) {
    return request != null ? ScalerExamApiMapper.toCommand(request) : null;
  }

  private static YesNo toYesNo(ScalerCreate.OathTakenIndEnum oathTakenInd) {
    return oathTakenInd != null ? YesNo.fromCode(oathTakenInd.getValue()) : null;
  }

  // -------------------------------------------------------------------------
  // Outbound — domain aggregate to response
  // -------------------------------------------------------------------------

  public static ScalerDetail toResponse(Scaler scaler) {
    ScalerDetail d = new ScalerDetail();
    d.setScalerLicenceNo(JsonNullable.of(scaler.scalerLicenceNo()));
    d.setClientNumber(JsonNullable.of(scaler.clientNumber()));
    d.setOrgUnitNo(JsonNullable.of(scaler.orgUnitNo()));
    d.setIssuedDate(JsonNullable.of(scaler.issuedDate()));
    d.setExpiryDate(JsonNullable.of(scaler.expiryDate()));
    d.setOathTakenInd(JsonNullable.of(scaler.oathTakenInd() != null
        ? ScalerDetail.OathTakenIndEnum.fromValue(scaler.oathTakenInd().name()) : null));
    d.setLicenceCancelledDate(JsonNullable.of(scaler.licenceCancelledDate()));
    d.setLicenceTypes(JsonNullable.of(scaler.licenceTypes().stream()
        .map(t -> ScalerDetail.LicenceTypesEnum.fromValue(t.name()))
        .toList()));
    if (scaler.appointment() != null) {
      d.setAppointment(ScalerAppointmentApiMapper.toDetail(scaler.appointment()));
    }
    if (scaler.exam() != null) {
      d.setExam(ScalerExamApiMapper.toDetail(scaler.exam()));
    }
    d.setEntryTimestamp(JsonNullable.of(scaler.entryTimestamp()));
    d.setEntryUserid(JsonNullable.of(scaler.entryUserid()));
    d.setUpdateTimestamp(JsonNullable.of(scaler.updateTimestamp()));
    d.setUpdateUserid(JsonNullable.of(scaler.updateUserid()));
    d.setRevisionCount(JsonNullable.of(scaler.revisionCount()));
    return d;
  }

  // -------------------------------------------------------------------------
  // Outbound — read projections
  // -------------------------------------------------------------------------

  /** Projects the summary aggregate; licence status stays undefined when unresolved (legacy parity). */
  public static ScalerSummary toSummary(ScalerSummaryRecord summary) {
    ScalerSummaryCore core = summary.core();
    ScalerSummary s = new ScalerSummary();
    s.setScalerLicenceNo(JsonNullable.of(core.scalerLicenceNo()));
    s.setClientNumber(JsonNullable.of(core.clientNumber()));
    s.setOrgUnitName(JsonNullable.of(core.orgUnitName()));
    s.setIssuedDate(JsonNullable.of(core.issuedDate()));
    s.setExpiryDate(JsonNullable.of(core.expiryDate()));
    s.setLicenceCancelledDate(JsonNullable.of(core.licenceCancelledDate()));
    s.setOathTakenInd(JsonNullable.of(core.oathTakenInd() != null
        ? ScalerSummary.OathTakenIndEnum.fromValue(core.oathTakenInd().name()) : null));
    s.setLicenceTypes(JsonNullable.of(summary.licenceTypes().stream()
        .map(ScalerApiMapper::toSummaryLicenceType)
        .toList()));
    if (summary.licenceStatus() != null) {
      s.setLicenceStatus(JsonNullable.of(summary.licenceStatus().name()));
    }
    return s;
  }

  private static ScalerSummaryLicenceType toSummaryLicenceType(ScalerLicenceTypeEntry entry) {
    ScalerSummaryLicenceType lt = new ScalerSummaryLicenceType();
    lt.setCode(JsonNullable.of(entry.code()));
    lt.setDescription(JsonNullable.of(entry.description()));
    return lt;
  }

  public static ScalerResult toSearchResult(ScalerSearchEntry entry) {
    ScalerResult r = new ScalerResult();
    r.setScalerLicenceNo(JsonNullable.of(entry.scalerLicenceNo()));
    r.setOrgUnitName(JsonNullable.of(entry.orgUnitName()));
    r.setClientName(JsonNullable.of(entry.clientName()));
    r.setLegalFirstName(JsonNullable.of(entry.legalFirstName()));
    r.setLegalMiddleName(JsonNullable.of(entry.legalMiddleName()));
    r.setLicenceType(JsonNullable.of(entry.licenceType()));
    r.setScalerClientLoc(JsonNullable.of(entry.scalerClientLoc()));
    return r;
  }

  public static ScalerTombstone toTombstone(ScalerTombstoneRecord tombstone) {
    ScalerTombstone t = new ScalerTombstone(tombstone.scalerLicenceNo());
    t.setDistrictName(tombstone.districtName());
    t.setRegionName(tombstone.regionName());
    t.setClientName(tombstone.clientName());
    t.setLegalFirstName(tombstone.legalFirstName());
    return t;
  }
}
