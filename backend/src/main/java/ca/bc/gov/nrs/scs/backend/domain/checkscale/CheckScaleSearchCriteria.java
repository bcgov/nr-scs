package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Search-input shape for the generic check-scale list endpoint. Replaces the legacy
 * 38-primitive-parameter signature on {@code searchCheckScales}.
 *
 * <p>The four DDN / version pairs are bundled as {@link TallyDoc}s and the two scale-side filters
 * as {@link ScaleSide}s, matching the internal shape of {@link CheckScale}. {@code totalVolume} and
 * {@code totalPieces} on the scale sides are unused by the search proc — pass {@code null}.
 *
 * <p>Producer: {@code CheckScaleApiMapper.toSearchCriteria} from controller query parameters.
 * Consumer: {@code CheckScaleService.search} and {@code CheckScaleRepository.searchCheckScales}.
 */
public record CheckScaleSearchCriteria(
    Long checkScaleId,
    String checkScaleTypeCode,
    String ckscType,
    String partialInd,
    String followedGoodPracticeInd,
    String originalWithinStandardInd,
    Double originalScaleNetValue,
    Double checkScaleNetValue,
    String chkScalerCommentTxt,
    TallyDoc orgLogTally,
    TallyDoc chkLogTally,
    TallyDoc orgSampleLogTally,
    TallyDoc chkSampleLogTally,
    String originalScalerLicenceNo,
    String checkScalerLicenceNo,
    String scaleSiteIdNmbr,
    String timberMark,
    String loadArrivalNumber,
    Integer weighSlipNumber,
    String checkReplacesOriginalInd,
    String population,
    String stratum,
    Integer samplingYear,
    ScaleSide originalScale,
    ScaleSide checkScale,
    String entryUserid,
    String updateUserid) {

  /** Narrow criteria that filters by the check-scale primary key. */
  public static CheckScaleSearchCriteria forId(Long checkScaleId) {
    return new CheckScaleSearchCriteria(
        checkScaleId,
        null, null, null, null, null, null, null, null,
        null, null, null, null,
        null, null, null, null, null, null, null, null, null, null,
        ScaleSide.EMPTY,
        ScaleSide.EMPTY,
        null,
        null);
  }

  /** Narrow criteria that filters by the check-side DDN/version — log-tally or sample. */
  public static CheckScaleSearchCriteria forCheckLookup(boolean isSample, String doc, Integer ver) {
    TallyDoc ref = new TallyDoc(doc, ver);
    return new CheckScaleSearchCriteria(
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        isSample ? null : ref,
        null,
        isSample ? ref : null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        ScaleSide.EMPTY,
        ScaleSide.EMPTY,
        null,
        null);
  }

  /** Narrow criteria that filters by the original-side DDN/version — log-tally or sample. */
  public static CheckScaleSearchCriteria forOriginalLookup(
      boolean isSample, String doc, Integer ver) {
    TallyDoc ref = new TallyDoc(doc, ver);
    return new CheckScaleSearchCriteria(
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        isSample ? null : ref,
        null,
        isSample ? ref : null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        ScaleSide.EMPTY,
        ScaleSide.EMPTY,
        null,
        null);
  }
}
