package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleStats;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleTab;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDoc;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationResult;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationField;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationFieldError;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateResponse;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleDetail;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleStatsView;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleSummaryView;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationResponse;
import ca.bc.gov.nrs.scs.backend.model.FieldError;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.SpeciesSummaryView;
import java.util.List;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Boundary between the generated check-scale API DTOs and the domain layer.
 * Sole owner of {@code JsonNullable} wrapping, generated-enum conversion, and
 * fluent setter chains for this feature.
 */
public final class CheckScaleApiMapper {

  private static final String CKSC_TYPE_HBCS = "HBCS";

  private CheckScaleApiMapper() {}

  public static CheckScaleValidationCommand toValidationCommand(CheckScaleValidationRequest req) {
    String chkSampleDoc = getNullable(req.getChkSampleLogTallyDocNo());
    boolean isSample = chkSampleDoc != null && !chkSampleDoc.isBlank();
    if (isSample) {
      return new SampleLogTallyValidationCommand(
          chkSampleDoc,
          getNullable(req.getChkSampleLogTallyVer()),
          getNullable(req.getOrgSampleLogTallyDocNo()),
          getNullable(req.getOrgSampleLogTallyVer()));
    }
    return new LogTallyValidationCommand(
        getNullable(req.getChkLogTallyDocNo()),
        getNullable(req.getChkLogTallyVer()),
        getNullable(req.getOrgLogTallyDocNo()),
        getNullable(req.getOrgLogTallyVer()));
  }

  public static CheckScaleCreateCommand toCreateCommand(CheckScaleCreateRequest req) {
    // followed / within are required fields — @Valid + Jackson reject null/invalid
    // values before this method runs, so no null guard here.
    String chkSampleDoc = getNullable(req.getChkSampleLogTallyDocNo());
    boolean isSample = chkSampleDoc != null && !chkSampleDoc.isBlank();
    if (isSample) {
      return new SampleLogTallyCreateCommand(
          CKSC_TYPE_HBCS,
          chkSampleDoc,
          getNullable(req.getChkSampleLogTallyVer()),
          getNullable(req.getOrgSampleLogTallyDocNo()),
          getNullable(req.getOrgSampleLogTallyVer()),
          req.getCheckScaleTypeCode(),
          YesNo.fromCode(req.getFollowedGoodPracticeInd().getValue()),
          YesNo.fromCode(req.getOriginalWithinStandardInd().getValue()),
          getNullable(req.getChkScalerCommentTxt()),
          req.getOriginalScaleNetValue(),
          req.getCheckScaleNetValue());
    }
    return new LogTallyCreateCommand(
        CKSC_TYPE_HBCS,
        getNullable(req.getChkLogTallyDocNo()),
        getNullable(req.getChkLogTallyVer()),
        getNullable(req.getOrgLogTallyDocNo()),
        getNullable(req.getOrgLogTallyVer()),
        req.getCheckScaleTypeCode(),
        YesNo.fromCode(req.getFollowedGoodPracticeInd().getValue()),
        YesNo.fromCode(req.getOriginalWithinStandardInd().getValue()),
        getNullable(req.getChkScalerCommentTxt()),
        req.getOriginalScaleNetValue(),
        req.getCheckScaleNetValue());
  }

  public static CheckScaleUpdateCommand toUpdateCommand(
      Long checkScaleId, CheckScaleUpdateRequest req) {
    return new CheckScaleUpdateCommand(
        checkScaleId,
        req.getCheckScaleTypeCode(),
        YesNo.fromCode(req.getFollowedGoodPracticeInd().getValue()),
        YesNo.fromCode(req.getOriginalWithinStandardInd().getValue()),
        getNullable(req.getChkScalerCommentTxt()),
        req.getOriginalScaleNetValue(),
        req.getCheckScaleNetValue());
  }

  public static CheckScaleValidationResponse toValidationResponse(CheckScaleValidationResult result) {
    CheckScaleValidationResponse resp = new CheckScaleValidationResponse();
    resp.setOk(result.ok());
    if (result.errors() != null && !result.errors().isEmpty()) {
      resp.setErrors(result.errors().stream().map(CheckScaleApiMapper::toFieldError).toList());
    }
    if (result.checkScale() != null) {
      resp.setCheckScale(toCheckScaleDetail(result.checkScale()));
    }
    return resp;
  }

  public static CheckScaleCreateResponse toCreateResponse(Long checkScaleId) {
    return new CheckScaleCreateResponse().checkScaleId(checkScaleId);
  }

  public static List<CheckScaleDetail> toSearchResults(List<CheckScale> rows) {
    return rows.stream().map(CheckScaleApiMapper::toCheckScaleDetail).toList();
  }

  public static CheckScaleDetail toCheckScaleDetail(CheckScale cs) {
    CheckScaleDetail m = new CheckScaleDetail();
    m.setCheckScaleId(JsonNullable.of(cs.checkScaleId()));
    m.setCheckScaleTypeCode(JsonNullable.of(cs.checkScaleTypeCode()));
    m.setCkscType(JsonNullable.of(cs.ckscType()));
    m.setPartialInd(JsonNullable.of(cs.partialInd()));
    m.setFollowedGoodPracticeInd(JsonNullable.of(YesNo.toCode(cs.followedGoodPractice())));
    m.setOriginalWithinStandardInd(JsonNullable.of(YesNo.toCode(cs.originalWithinStandard())));
    m.setCheckReplacesOriginalInd(JsonNullable.of(YesNo.toCode(cs.checkReplacesOriginal())));
    m.setChkScalerCommentTxt(JsonNullable.of(cs.commentTxt()));
    m.setOriginalScaleNetValue(JsonNullable.of(cs.originalScaleNetValue()));
    m.setCheckScaleNetValue(JsonNullable.of(cs.checkScaleNetValue()));

    m.setChkLogTallyDocNo(JsonNullable.of(TallyDoc.docNoOf(cs.chkLogTally())));
    m.setChkLogTallyVer(JsonNullable.of(TallyDoc.versionOf(cs.chkLogTally())));
    m.setChkSampleLogTallyDocNo(JsonNullable.of(TallyDoc.docNoOf(cs.chkSampleLogTally())));
    m.setChkSampleLogTallyVer(JsonNullable.of(TallyDoc.versionOf(cs.chkSampleLogTally())));
    m.setOrgLogTallyDocNo(JsonNullable.of(TallyDoc.docNoOf(cs.orgLogTally())));
    m.setOrgLogTallyVer(JsonNullable.of(TallyDoc.versionOf(cs.orgLogTally())));
    m.setOrgSampleLogTallyDocNo(JsonNullable.of(TallyDoc.docNoOf(cs.orgSampleLogTally())));
    m.setOrgSampleLogTallyVer(JsonNullable.of(TallyDoc.versionOf(cs.orgSampleLogTally())));

    m.setOriginalScalerLicenceNo(JsonNullable.of(cs.originalScalerLicenceNo()));
    m.setCheckScalerLicenceNo(JsonNullable.of(cs.checkScalerLicenceNo()));
    m.setSecondScalerLicenceNo(JsonNullable.of(cs.secondScalerLicenceNo()));
    m.setScaleSiteIdNmbr(JsonNullable.of(cs.scaleSiteIdNmbr()));
    m.setTimberMark(JsonNullable.of(cs.timberMark()));
    m.setLoadArrivalNumber(JsonNullable.of(cs.loadArrivalNumber()));
    m.setWeighSlipNumber(JsonNullable.of(cs.weighSlipNumber()));

    m.setPopulation(JsonNullable.of(cs.population()));
    m.setStratum(JsonNullable.of(cs.stratum()));
    m.setSamplingYear(JsonNullable.of(cs.samplingYear()));

    ScaleSide org = cs.originalScale();
    m.setOriginalScaleDate(JsonNullable.of(org.scaleDate()));
    m.setOriginalScaleReturnNo(JsonNullable.of(org.returnNo()));
    m.setOriginalScaleTotalTops(JsonNullable.of(org.totalTops()));
    m.setOriginalScaleTotalButts(JsonNullable.of(org.totalButts()));
    m.setOriginalScaleTotalLength(JsonNullable.of(org.totalLength()));
    m.setOriginalScaleTotalVolume(JsonNullable.of(org.totalVolume()));
    m.setOriginalScaleTotalPieces(JsonNullable.of(org.totalPieces()));

    ScaleSide chk = cs.checkScale();
    m.setChkScaleDate(JsonNullable.of(chk.scaleDate()));
    m.setChkScaleReturnNo(JsonNullable.of(chk.returnNo()));
    m.setChkScaleTotalTops(JsonNullable.of(chk.totalTops()));
    m.setChkScaleTotalButts(JsonNullable.of(chk.totalButts()));
    m.setChkScaleTotalLength(JsonNullable.of(chk.totalLength()));
    m.setChkScaleTotalVolume(JsonNullable.of(chk.totalVolume()));
    m.setChkScaleTotalPieces(JsonNullable.of(chk.totalPieces()));

    m.setEntryTimestamp(JsonNullable.of(cs.entryTimestamp()));
    m.setEntryUserid(JsonNullable.of(cs.entryUserid()));
    m.setUpdateTimestamp(JsonNullable.of(cs.updateTimestamp()));
    m.setUpdateUserid(JsonNullable.of(cs.updateUserid()));
    m.setRevisionCount(JsonNullable.of(cs.revisionCount() == null ? null : cs.revisionCount().longValue()));

    if (cs.speciesSummary() != null) {
      m.setSpeciesSummary(JsonNullable.of(
          cs.speciesSummary().stream().map(CheckScaleApiMapper::toSpeciesSummaryView).toList()));
    }

    return m;
  }

  private static FieldError toFieldError(ValidationFieldError ve) {
    return new FieldError(toFieldEnum(ve.field()), ve.message());
  }

  private static FieldError.FieldEnum toFieldEnum(ValidationField vf) {
    return switch (vf) {
      case RETURN_TYPE -> FieldError.FieldEnum.RETURN_TYPE;
      case CHECK_SCALE_DDN -> FieldError.FieldEnum.CHECK_SCALE_DDN;
      case CHECK_SCALE_DDV -> FieldError.FieldEnum.CHECK_SCALE_DDV;
      case ORIGINAL_SCALE_DDN -> FieldError.FieldEnum.ORIGINAL_SCALE_DDN;
      case ORIGINAL_SCALE_DDV -> FieldError.FieldEnum.ORIGINAL_SCALE_DDV;
    };
  }

  private static SpeciesSummaryView toSpeciesSummaryView(SpeciesSummary s) {
    SpeciesSummaryView m = new SpeciesSummaryView();
    m.setSpeciesCode(JsonNullable.of(s.speciesCode()));
    m.setSpeciesGrade(JsonNullable.of(s.speciesGrade()));
    m.setProductCode(JsonNullable.of(s.productCode()));
    m.setOrgPieces(JsonNullable.of(s.orgPieces()));
    m.setOrgNetVolume(JsonNullable.of(s.orgNetVolume()));
    m.setOrgNetValue(JsonNullable.of(s.orgNetValue()));
    m.setChkPieces(JsonNullable.of(s.chkPieces()));
    m.setChkNetVolume(JsonNullable.of(s.chkNetVolume()));
    m.setChkNetValue(JsonNullable.of(s.chkNetValue()));
    return m;
  }

  public static ScalerCheckScaleTabResult toScalerTabResult(ScalerCheckScaleTab tab) {
    ScalerCheckScaleTabResult m = new ScalerCheckScaleTabResult();
    m.setStats(toStatsView(tab.stats()));
    m.setCheckScales(tab.checkScales().stream().map(CheckScaleApiMapper::toSummaryView).toList());
    return m;
  }

  public static ScaleSiteCheckScaleTabResult toScaleSiteTabResult(List<CheckScaleSummary> rows) {
    ScaleSiteCheckScaleTabResult m = new ScaleSiteCheckScaleTabResult();
    m.setCheckScales(rows.stream().map(CheckScaleApiMapper::toSummaryView).toList());
    return m;
  }

  private static CheckScaleStatsView toStatsView(CheckScaleStats stats) {
    CheckScaleStatsView m = new CheckScaleStatsView();
    m.setLast10Volume(JsonNullable.of(stats.last10Volume()));
    m.setLast10Value(JsonNullable.of(stats.last10Value()));
    m.setPast12Volume(JsonNullable.of(stats.past12Volume()));
    m.setPast12Value(JsonNullable.of(stats.past12Value()));
    m.setAllVolume(JsonNullable.of(stats.allVolume()));
    m.setAllValue(JsonNullable.of(stats.allValue()));
    return m;
  }

  private static CheckScaleSummaryView toSummaryView(CheckScaleSummary s) {
    CheckScaleSummaryView m = new CheckScaleSummaryView();
    m.setCheckScaleId(JsonNullable.of(s.checkScaleId()));
    m.setScaleSiteIdNmbr(JsonNullable.of(s.scaleSiteIdNmbr()));
    m.setPrimCheckLicenceNo(JsonNullable.of(s.primCheckLicenceNo()));
    m.setSecCheckLicenceNo(JsonNullable.of(s.secCheckLicenceNo()));
    m.setPrimOrigLicenceNo(JsonNullable.of(s.primOrigLicenceNo()));
    m.setSecOrigLicenceNo(JsonNullable.of(s.secOrigLicenceNo()));
    m.setOrigScaleDate(JsonNullable.of(s.origScaleDate()));
    m.setCheckScaleDate(JsonNullable.of(s.checkScaleDate()));
    m.setPieceDiff(JsonNullable.of(s.pieceDiff()));
    m.setVolumeVariance(JsonNullable.of(s.volumeVariance()));
    m.setValueVariance(JsonNullable.of(s.valueVariance()));
    m.setReplacedInd(JsonNullable.of(YesNo.toCode(s.replacedInd())));
    m.setCheckScaleTypeCode(JsonNullable.of(s.checkScaleTypeCode()));
    m.setFollowedGoodPracticeInd(JsonNullable.of(YesNo.toCode(s.followedGoodPracticeInd())));
    m.setOriginalWithinStandardInd(JsonNullable.of(YesNo.toCode(s.originalWithinStandardInd())));
    return m;
  }

}
