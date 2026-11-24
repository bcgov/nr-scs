package ca.bc.gov.nrs.scs.backend.domain.workbench;

import java.time.LocalDate;

/** Criteria for the scale-site workbench grid ({@code scs_scale_site_auth_wb_vw_pkg.search_recs}). */
public record ScaleSiteAuthorizationWorkbenchSearchCriteria(
    Long scaleSiteAuthorizationId,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String scaleSiteNumber,
    String scaleSiteName,
    Long regionId,
    Long districtId,
    Integer primarySort,
    Integer secondarySort) {
}
