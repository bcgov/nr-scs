package ca.bc.gov.nrs.scs.backend.domain.inspection;

import java.time.LocalDate;

/**
 * Raw inspection row returned by {@code scs_site_inspection_pkg.get_inspection_report}.
 *
 * <p>The base inspection record without responses, scaling methods, or resolved
 * labels. Produced by {@code ScaleSiteInspectionRepository.getScaleSiteInspectionDetailBase(id)}
 * and used by the service to seed the {@link Inspection} aggregate.
 */
public record InspectionBase(
    String scaleSiteIdNmbr,
    String siteName,
    String siteLocation,
    LocalDate inspectionDate,
    String inspectionTypeCode,
    String inspectionTypeDescription,
    Long previousInspectionId,
    String recipient,
    String siteOperatorPresentInd,
    String inspector,
    String comments) {}
