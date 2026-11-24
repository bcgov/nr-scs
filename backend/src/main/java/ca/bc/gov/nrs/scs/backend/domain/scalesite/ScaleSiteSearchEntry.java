package ca.bc.gov.nrs.scs.backend.domain.scalesite;

/**
 * One row of a scale-site search result set.
 *
 * <p>Produced by {@code ScaleSiteRepository.searchScaleSites(criteria)} from the
 * {@code scs_scale_site_search_vw_pkg.search_recs} view package, and projected to
 * {@code ScaleSiteSearchResult} by {@code ScaleSiteApiMapper.toSearchResultResponses(...)}.
 *
 * <p>{@code ownerClientNumber} is already left-padded to the legacy 8-char width
 * by the repository.
 */
public record ScaleSiteSearchEntry(
    String scaleSiteIdNmbr,
    String siteName,
    String region,
    String district,
    String methodTypeCodeName,
    String ownerClientNumber,
    String ownerClientLocnCode) {}
