package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.time.LocalDate;

/**
 * A scaler authorized at a scale site, backing the legacy Authorized Scalers tab. Read-only;
 * sourced from {@code scs_authorized_scalers_vw_pkg.search_recs} with a view-computed status.
 */
public record AuthorizedScalerSummary(
    Long scalerAuthorizationId,
    String scalerLicenceNo,
    String clientName,
    String status,
    String scalerAppointmentTypes,
    LocalDate authorizationEffectiveDate,
    LocalDate authorizationExpiryDate,
    String districtWideInd) {}
