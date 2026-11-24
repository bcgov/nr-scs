package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import java.util.List;

/**
 * Pre-aggregated species / product / grade summary for a legacy check scale.
 * Returned by {@code SCS_CHECK_SCALE_SPG_SUMMRY_PKG.search_recs}; name preserved
 * because it matches the legacy Oracle package.
 *
 * <p>Producer: {@code CheckScaleRepository.getSpgSummary}.
 * Consumer: {@code CheckScaleService} enrichment path for legacy check scales.
 */
public record CheckScaleSpgSummary(
    Double origNetVolume,
    Double chkNetVolume,
    Integer origPieces,
    Integer chkPieces,
    List<SpeciesSummary> speciesSummary) {}
