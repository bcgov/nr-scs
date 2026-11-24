package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.time.LocalDate;

/**
 * Header row for a LOG_TALLY return — sourced from
 * {@code scs_log_tally_pkg.search_recs}.
 *
 * <p>Producer: {@code CheckScaleRepository.getLogTallyHeader}.
 * Consumer: {@code CheckScaleService} enrichment, where the check and original
 * headers supply scaler licences, scale date, return number, scale site,
 * timber mark, load arrival, and the check-replaces-original indicator.
 */
public record LogTallyHeader(
    String detailDocumentNumber,
    Integer version,
    LocalDate scaleDate,
    Integer returnNumber,
    String scaleSiteIdNmbr,
    String timberMark,
    String loadArrivalNumber,
    String primaryLicenseNumber,
    String secondaryLicenseNumber,
    String checkReplacesOriginalInd)
    implements CommonCheckHeaderSource, CommonOriginalHeaderSource {}
