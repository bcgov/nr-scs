package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.time.LocalDate;

/**
 * One authorization's coverage of one scale site, from {@code scs_site_auth_scalers_vw_pkg}.
 *
 * <p>This is the authorization → site relationship as the database defines it: the view UNIONs the
 * explicitly listed sites of a site-specific authorization with <i>every</i> site in the org unit of a
 * district-wide one, so both kinds of coverage arrive as rows.
 *
 * <p>Distinct from {@link AuthorizedScalerSummary}, which backs the Authorized Scalers tab and carries
 * display fields (client name, appointment types) at the cost of joins that drop rows — see
 * {@code ScaleSiteAuthorizedScalerRepository}. This record carries only what an access decision needs,
 * and the raw dates rather than a computed status, because there is no status column to read here.
 */
public record SiteAuthorizationCoverage(
    Long scalerAuthorizationId,
    String scalerLicenceNo,
    String scaleSiteIdNmbr,
    String districtWideInd,
    LocalDate authorizationEffectiveDate,
    LocalDate authorizationExpiryDate,
    LocalDate cancellationDate) {}
