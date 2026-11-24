package ca.bc.gov.nrs.scs.backend.domain.workbench;

import java.time.LocalDate;

/** Criteria for the mark-site workbench grid ({@code scs_mark_site_des_wb_vw_pkg.search_recs}). */
public record MarkSiteDesignationSearchCriteria(
    Long authorizationId,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String timberMark,
    Long regionId,
    Long districtId,
    Integer primarySort,
    Integer secondarySort) {
}
