package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.time.LocalDate;

/**
 * Header row for a SAMPLE_LOG_TALLY return — sourced from
 * {@code scs_sample_log_tally_pkg.search_recs}.
 *
 * <p>Producer: {@code CheckScaleRepository.getSampleLogTallyHeader}.
 * Consumer: {@code CheckScaleService} enrichment. Sample headers additionally
 * carry population / stratum / sampling-year / weigh-slip fields not present
 * on the non-sample {@link LogTallyHeader}.
 */
public record SampleLogTallyHeader(
    String detailDocumentNumber,
    Integer version,
    LocalDate scaleDate,
    Integer returnNumber,
    String scaleSiteIdNmbr,
    String timberMark,
    String loadArrivalNumber,
    String primaryLicenseNumber,
    String secondaryLicenseNumber,
    String sampledWeighSlip,
    String populationNumber,
    String stratumNumber,
    Integer samplingYear,
    String checkReplacesOriginalInd)
    implements CommonCheckHeaderSource, CommonOriginalHeaderSource {}
