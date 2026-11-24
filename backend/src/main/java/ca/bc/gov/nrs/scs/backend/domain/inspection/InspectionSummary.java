package ca.bc.gov.nrs.scs.backend.domain.inspection;

import java.time.LocalDate;

/**
 * One row of the inspections-by-scale-site list.
 *
 * <p>Produced by {@code ScaleSiteInspectionRepository.getScaleSiteInspectionSummaries(scaleSiteIdNmbr)}
 * from the {@code SCS_SCALE_SITE_INSPCTNS_VW_PKG.search_recs} view package, and
 * projected to {@code ScaleSiteInspectionSummary} by the mapper for the list endpoint.
 */
public record InspectionSummary(
    String scaleSiteIdNmbr,
    Long inspectionId,
    String inspectionTypeDescription,
    String siteTypeDisplay,
    LocalDate inspectionDate,
    String inspector,
    String followUpInspectionIndicator) {}
