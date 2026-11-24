package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.math.BigDecimal;

/**
 * Raw SAMPLE_TLLY_DETAIL row — sourced from
 * {@code scs_sample_tally_detail_pkg.search_recs}.
 *
 * <p>Producer: {@code CheckScaleRepository.getSampleLogTallyDetail}.
 * Consumer: {@code CheckScaleService} sample-flow enrichment for totals
 * and SPG rollups.
 */
public record SampleLogTallyDetail(
    String scaleSpeciesCode,
    String scaleProductCode,
    String scaleGradeCode,
    Integer top,
    Integer butt,
    Double length,
    BigDecimal netVolume) implements TallyDetailRow {}
