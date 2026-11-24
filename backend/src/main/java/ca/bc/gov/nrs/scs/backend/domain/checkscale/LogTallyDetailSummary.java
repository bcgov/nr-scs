package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * Row from the LOG_TALLY detail-summary view — sourced from
 * {@code SCS_LOG_TALLY_DTL_SMMRY_VW_PKG.search_recs}.
 *
 * <p>Not the same as {@link LogTallyDetail} (raw table); this is the
 * pre-aggregated view-side roll-up read by {@code CheckScaleRepository
 * .getLogTallyDetailSummary} and consumed by {@code CheckScaleService}
 * when computing per-document SPG roll-ups and totals.
 */
public record LogTallyDetailSummary(
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
