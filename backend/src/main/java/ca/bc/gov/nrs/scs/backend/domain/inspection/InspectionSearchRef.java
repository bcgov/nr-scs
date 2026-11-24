package ca.bc.gov.nrs.scs.backend.domain.inspection;

/**
 * Locator pair for an inspection — the inspection id plus the scale site it lives under.
 *
 * <p>Returned by {@code ScaleSiteInspectionRepository.searchScaleSiteInspectionByInspectionId(id)}
 * from {@code SCS_SCALE_SITE_INSPCTNS_VW_PKG.search_recs}. The "Ref" suffix marks
 * this as a thin reference type, not the full inspection — used to confirm
 * existence and route the caller to the right scale site.
 */
public record InspectionSearchRef(
    String scaleSiteIdNmbr,
    Long inspectionId) {}
