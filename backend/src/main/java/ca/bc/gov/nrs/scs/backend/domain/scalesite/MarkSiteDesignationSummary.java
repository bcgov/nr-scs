package ca.bc.gov.nrs.scs.backend.domain.scalesite;

/**
 * A timber mark designated to a scale site, backing the legacy MSD tab. Read-only; sourced from
 * {@code scs_msd_vw_pkg.search_recs}.
 */
public record MarkSiteDesignationSummary(
    String timberMark,
    String scaleSiteIdNmbr,
    String ownerCliNumber) {}
