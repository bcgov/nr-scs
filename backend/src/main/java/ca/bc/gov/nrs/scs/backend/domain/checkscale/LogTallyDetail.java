package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.math.BigDecimal;

/**
 * Raw LOG_TALLY_DETAIL row — sourced from
 * {@code scs_log_tally_detail_pkg.search_recs}.
 *
 * <p>Producer: {@code CheckScaleRepository.getLogTallyDetail}.
 * Consumer: {@code CheckScaleService} when computing totals and SPG rollups
 * during validate / preview, before any summary view is available.
 */
public record LogTallyDetail(
    String scaleSpeciesCode,
    String scaleProductCode,
    String scaleGradeCode,
    Integer top,
    Integer butt,
    Double length,
    BigDecimal netVolume) implements TallyDetailRow {}
