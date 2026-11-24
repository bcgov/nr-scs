package ca.bc.gov.nrs.scs.backend.domain.workbench;

import java.time.LocalDate;

/** Criteria for the scaler workbench grid ({@code scs_scaler_auth_wb_vw_pkg.search_recs}). */
public record ScalerAuthorizationWorkbenchSearchCriteria(
    Long scalerAuthorizationId,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String scalerLicenceNumber,
    Long regionId,
    Long districtId,
    String scalerName,
    Integer primarySort,
    Integer secondarySort) {
}
