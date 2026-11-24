package ca.bc.gov.nrs.scs.backend.domain.inspection;

import java.time.LocalDate;

/**
 * JDBC bind shape for {@code scs_site_inspection_pkg.create_inspection_report}.
 *
 * <p>Built by the service from {@link InspectionCreateCommand} after normalization,
 * LOV validation, and inspector-GUID resolution. Passed to
 * {@code ScaleSiteInspectionRepository.createScaleSiteInspectionBase(params)}.
 *
 * <p>Carries only the base-row parameters the package expects. Scaling methods
 * and question responses are inserted separately by sibling repository methods.
 * Indicator field is plain {@code "Y"}/{@code "N"} — bind values, not domain types.
 */
public record InspectionCreateParams(
    String scaleSiteIdNmbr,
    LocalDate inspectionDate,
    String inspectorUserGuid,
    String siteOperatorPresentInd,
    String comments,
    String inspectionTypeCode,
    Long previousInspectionId,
    String recipient) {}
