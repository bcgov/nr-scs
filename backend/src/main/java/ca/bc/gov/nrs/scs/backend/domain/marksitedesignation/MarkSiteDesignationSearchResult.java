package ca.bc.gov.nrs.scs.backend.domain.marksitedesignation;

import java.time.LocalDate;

/**
 * A mark site designation row returned by the general timber-mark query (Queries &gt; Mark Site
 * Designations). Unlike the workbench search, this is not limited to expiring records. Sourced from
 * {@code scs_haul_mark_auth_srch_vw_pkg.search_recs}.
 */
public record MarkSiteDesignationSearchResult(
    Long haulingMarkAuthorizationId,
    String timberMark,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String orgUnitName) {}
