package ca.bc.gov.nrs.scs.backend.domain.scaler;

/**
 * One licence-type row (code + resolved description) shown on the Scaler Summary panel, read from
 * {@code scs_slct_slcd_lov_vw_pkg.search_recs}. Produced by
 * {@code ScalerRepository.getScalerSummaryLicenceTypes}; consumed by {@link ScalerSummaryRecord}.
 * Distinct from the {@link ScalerLicenceType} enum: this carries the display description, not the
 * SCS/WA classification.
 */
public record ScalerLicenceTypeEntry(
    String code,
    String description) {}
