package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Row from the SAMPLE_LOG_TALLY detail-summary view — sourced from {@code
 * SCS_SMPL_TLLY_DTL_SMMRY_VW_PKG.search_recs}.
 *
 * <p>Producer: {@code CheckScaleRepository.getSampleLogTallyDetailSummary}. Consumer: {@code
 * CheckScaleService} sample-flow enrichment.
 */
public record SampleLogTallyDetailSummary(
    String documentNumber,
    Integer version,
    Double netVolume,
    Integer pieces,
    String speciesCode,
    String speciesGrade,
    String productCode,
    Integer top,
    Integer butt,
    Double netLength)
    implements ProductGradeSummaryDetail, TallyDetailSummaryRow {}
