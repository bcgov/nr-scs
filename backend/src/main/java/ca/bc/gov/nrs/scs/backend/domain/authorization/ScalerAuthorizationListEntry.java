package ca.bc.gov.nrs.scs.backend.domain.authorization;

import java.time.LocalDate;
import java.util.List;

/**
 * A single row in the scaler Authorizations tab list, enriched server-side with the authorized
 * sites, a computed status, and a letter-exists flag. Mirrors the legacy
 * {@code scalerAuthorizationList.jsp} columns.
 */
public record ScalerAuthorizationListEntry(
    Long scalerAuthorizationId,
    LocalDate authorizationEffectiveDate,
    LocalDate authorizationExpiryDate,
    String districtWideInd,
    Long orgUnitNo,
    List<String> authorizedSites,
    String status,
    boolean letterExists) {}
