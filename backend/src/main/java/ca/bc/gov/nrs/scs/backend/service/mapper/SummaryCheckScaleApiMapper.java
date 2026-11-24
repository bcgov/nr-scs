package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.ReturnType;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleSpgRowCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummaryCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleSpgRow;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleView;
import java.util.List;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Boundary between the generated summary-check-scale API DTOs and the domain layer. Sole owner of
 * {@code JsonNullable} unwrapping and {@code trimToNull} normalization for this feature. The
 * return-type rules (legacy cksc_type code, partial_ind forcing, SPG product/grade blanking) live
 * on the domain {@link ReturnType} enum; this mapper just resolves the wire value to it via
 * {@link ReturnType#fromWire(String)} and reads the rules off it.
 */
public final class SummaryCheckScaleApiMapper {

  private SummaryCheckScaleApiMapper() {}

  /** Projects the Scaler Summary Check Scales tab rows to the API result (no stats, no filter). */
  public static ScalerSummaryCheckScaleTabResult toScalerSummaryTabResult(
      List<SummaryCheckScaleEntry> rows) {
    ScalerSummaryCheckScaleTabResult m = new ScalerSummaryCheckScaleTabResult();
    m.setSummaryCheckScales(rows.stream().map(SummaryCheckScaleApiMapper::toView).toList());
    return m;
  }

  private static SummaryCheckScaleView toView(SummaryCheckScaleEntry e) {
    SummaryCheckScaleView m = new SummaryCheckScaleView();
    m.setCheckScaleId(JsonNullable.of(e.checkScaleId()));
    m.setCkscType(JsonNullable.of(e.ckscType()));
    m.setPrimCheckLicenceNo(JsonNullable.of(e.primCheckLicenceNo()));
    m.setPrimOrigLicenceNo(JsonNullable.of(e.primOrigLicenceNo()));
    m.setOrigScaleDate(JsonNullable.of(e.origScaleDate()));
    m.setCheckScaleDate(JsonNullable.of(e.checkScaleDate()));
    m.setPieceDiff(JsonNullable.of(e.pieceDiff()));
    m.setVolumeVariance(JsonNullable.of(e.volumeVariance()));
    m.setValueVariance(JsonNullable.of(e.valueVariance()));
    m.setReplacedInd(JsonNullable.of(YesNo.toCode(e.replacedInd())));
    m.setCheckScaleTypeCode(JsonNullable.of(e.checkScaleTypeCode()));
    m.setFollowedGoodPracticeInd(JsonNullable.of(YesNo.toCode(e.followedGoodPracticeInd())));
    m.setOriginalWithinStandardInd(JsonNullable.of(YesNo.toCode(e.originalWithinStandardInd())));
    return m;
  }

  public static SummaryCheckScaleCreateCommand toCreateCommand(SummaryCheckScaleCreateRequest req) {
    // returnType / the Y-N indicators are required fields — @Valid rejects null before this runs.
    ReturnType returnType = ReturnType.fromWire(req.getReturnType().getValue());
    SummaryCheckScaleCreateRequest.PartialIndEnum submittedPartial = getNullable(req.getPartialInd());
    YesNo partialInd = returnType.resolvePartialInd(
        YesNo.fromCode(submittedPartial == null ? null : submittedPartial.getValue()));

    Long weighSlip = getNullable(req.getWeighSlipNumber());

    return new SummaryCheckScaleCreateCommand(
        returnType.ckscType(),
        trimToNull(req.getCheckScaleTypeCode()),
        partialInd,
        YesNo.fromCode(req.getFollowedGoodPracticeInd().getValue()),
        YesNo.fromCode(req.getOriginalWithinStandardInd().getValue()),
        YesNo.fromCode(req.getCheckReplacesOriginalInd().getValue()),
        trimToNull(getNullable(req.getChkScalerCommentTxt())),
        trimToNull(req.getOriginalScalerLicenceNo()),
        trimToNull(req.getCheckScalerLicenceNo()),
        trimToNull(req.getScaleSiteIdNmbr()),
        trimToNull(req.getTimberMark()),
        trimToNull(getNullable(req.getLoadArrivalNumber())),
        weighSlip == null ? null : weighSlip.intValue(),
        req.getOriginalScaleDate(),
        req.getOriginalScaleReturnNo(),
        req.getChkScaleDate(),
        req.getChkScaleReturnNo(),
        toSpgRowCommands(req.getSpgRows(), returnType.isSpecialForestProduct()));
  }

  /**
   * Maps the summary header update request to a domain command. Mirrors {@link #toCreateCommand}
   * but carries no SPG rows — the header update never touches SPG roll-up rows. {@code ckscType} is
   * resolved from the submitted return type so the service can enforce the return-type lock.
   */
  public static SummaryCheckScaleUpdateCommand toUpdateCommand(SummaryCheckScaleUpdateRequest req) {
    ReturnType returnType = ReturnType.fromWire(req.getReturnType().getValue());
    SummaryCheckScaleUpdateRequest.PartialIndEnum submittedPartial = getNullable(req.getPartialInd());
    YesNo partialInd = returnType.resolvePartialInd(
        YesNo.fromCode(submittedPartial == null ? null : submittedPartial.getValue()));

    Long weighSlip = getNullable(req.getWeighSlipNumber());

    return new SummaryCheckScaleUpdateCommand(
        returnType.ckscType(),
        trimToNull(req.getCheckScaleTypeCode()),
        partialInd,
        YesNo.fromCode(req.getFollowedGoodPracticeInd().getValue()),
        YesNo.fromCode(req.getOriginalWithinStandardInd().getValue()),
        YesNo.fromCode(req.getCheckReplacesOriginalInd().getValue()),
        trimToNull(getNullable(req.getChkScalerCommentTxt())),
        trimToNull(req.getOriginalScalerLicenceNo()),
        trimToNull(req.getCheckScalerLicenceNo()),
        trimToNull(req.getScaleSiteIdNmbr()),
        trimToNull(req.getTimberMark()),
        trimToNull(getNullable(req.getLoadArrivalNumber())),
        weighSlip == null ? null : weighSlip.intValue(),
        req.getOriginalScaleDate(),
        req.getOriginalScaleReturnNo(),
        req.getChkScaleDate(),
        req.getChkScaleReturnNo());
  }

  private static List<SummaryCheckScaleSpgRowCommand> toSpgRowCommands(
      List<SummaryCheckScaleSpgRow> rows, boolean specialForestProduct) {
    return rows.stream().map(row -> toSpgRowCommand(row).blankFor(specialForestProduct)).toList();
  }

  /**
   * Maps one SPG row DTO to a domain command (JsonNullable unwrap + field copy only). The legacy
   * product/grade blanking is NOT applied here — that rule lives on
   * {@link SummaryCheckScaleSpgRowCommand#blankFor(boolean)} and is applied by the caller once the
   * return type is known (from the create request, or from the stored record on the add-row flow).
   */
  public static SummaryCheckScaleSpgRowCommand toSpgRowCommand(SummaryCheckScaleSpgRow row) {
    return new SummaryCheckScaleSpgRowCommand(
        row.getScaleSpeciesCode(),
        getNullable(row.getScaleProductCode()),
        getNullable(row.getScaleGradeCode()),
        row.getOriginalScalePieceCnt(),
        row.getOriginalScaleNetVolume(),
        row.getOriginalScaleNetValue(),
        row.getCheckScalePieceCnt(),
        row.getCheckScaleNetVolume(),
        row.getCheckScaleNetValue());
  }
}
