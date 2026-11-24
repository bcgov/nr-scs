package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * One row in the Species / Product / Grade roll-up shown on the check-scale
 * preview and stored alongside a persisted check scale.
 *
 * <p>Producer: {@code CheckScaleService} (aggregated from log-tally detail rows)
 * or {@code CheckScaleRepository.getSpgSummary} (legacy SPG package).
 * Consumer: {@code CheckScaleApiMapper} when projecting to the API DTO.
 */
public record SpeciesSummary(
    String speciesCode,
    String speciesGrade,
    String productCode,
    Integer orgPieces,
    Double orgNetVolume,
    Double orgNetValue,
    Integer chkPieces,
    Double chkNetVolume,
    Double chkNetValue) {}
