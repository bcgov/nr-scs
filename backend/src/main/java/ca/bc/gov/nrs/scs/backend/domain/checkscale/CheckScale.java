package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.With;

/**
 * Canonical loaded check-scale entity. Used by the service and repository
 * in place of the generated {@code model.CheckScale} — domain code does not
 * see {@code JsonNullable} or generated enums.
 *
 * <p>Producer: {@code CheckScaleRepository} (search / load) or
 * {@code CheckScaleService} (validate-time draft preview).
 * Consumer: {@code CheckScaleService} for orchestration and
 * {@code CheckScaleApiMapper} for projection to the wire DTO.
 */
@With
public record CheckScale(
    Long checkScaleId,
    String checkScaleTypeCode,
    String ckscType,
    String partialInd,
    YesNo followedGoodPractice,
    YesNo originalWithinStandard,
    YesNo checkReplacesOriginal,
    String commentTxt,
    Double originalScaleNetValue,
    Double checkScaleNetValue,

    // Document refs — one of the four is populated per side, flavor-dependent.
    TallyDoc chkLogTally,
    TallyDoc chkSampleLogTally,
    TallyDoc orgLogTally,
    TallyDoc orgSampleLogTally,

    // HBS-derived: licences + site/mark/arrival
    String originalScalerLicenceNo,
    String checkScalerLicenceNo,
    String secondScalerLicenceNo,
    String scaleSiteIdNmbr,
    String timberMark,
    String loadArrivalNumber,
    Integer weighSlipNumber,

    // sample-only metadata
    String population,
    String stratum,
    Integer samplingYear,

    // scale sides — each bundles date, return number, and totals
    ScaleSide originalScale,
    ScaleSide checkScale,

    // audit
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Integer revisionCount,

    List<SpeciesSummary> speciesSummary) {

  /**
   * HBCS draft constructor used by the validate flow before step-2 fields are supplied.
   * {@code isSample} routes the {@code TallyDoc}s into the log or sample slots and selects
   * whether the sample-only fields (weigh-slip / population / stratum / sampling-year) are
   * carried; pass nulls for those on the log path. Audit / id / step-2 fields are null;
   * {@code ckscType} is fixed to {@code "HBCS"}.
   */
  @SuppressWarnings("java:S107")
  public CheckScale(
      boolean isSample,
      TallyDoc chkTally, TallyDoc orgTally,
      YesNo checkReplacesOriginal,
      String originalScalerLicenceNo, String checkScalerLicenceNo, String secondScalerLicenceNo,
      String scaleSiteIdNmbr, String timberMark, String loadArrivalNumber,
      Integer weighSlipNumber, String population, String stratum, Integer samplingYear,
      ScaleSide originalScale,
      ScaleSide checkScale,
      List<SpeciesSummary> speciesSummary) {
    this(
        null, null, "HBCS", null, null, null, checkReplacesOriginal, null, null, null,
        isSample ? null : chkTally,
        isSample ? chkTally : null,
        isSample ? null : orgTally,
        isSample ? orgTally : null,
        originalScalerLicenceNo, checkScalerLicenceNo, secondScalerLicenceNo,
        scaleSiteIdNmbr, timberMark, loadArrivalNumber, weighSlipNumber,
        population, stratum, samplingYear,
        originalScale, checkScale,
        null, null, null, null, null,
        speciesSummary);
  }
}
