package ca.bc.gov.nrs.scs.backend.domain.inspection;

import java.time.LocalDate;

/**
 * JDBC bind shape for {@code scs_site_inspection_pkg.update_inspection_report}.
 *
 * <p>Built by the service from {@link InspectionUpdateCommand} for the base-row
 * update; question response changes are applied separately via
 * {@code deleteInspectionResponse} + {@code insertInspectionResponse}.
 *
 * <p>Indicator field is plain {@code "Y"}/{@code "N"} — bind values, not domain types.
 */
public record InspectionUpdateParams(
    Long inspectionId,
    LocalDate inspectionDate,
    String inspector,
    String siteOperatorPresentInd,
    String comments) {}
