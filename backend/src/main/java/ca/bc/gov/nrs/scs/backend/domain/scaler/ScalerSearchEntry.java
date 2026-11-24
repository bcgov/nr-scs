package ca.bc.gov.nrs.scs.backend.domain.scaler;

/**
 * One row of the Scaler Search results, read from {@code scs_queries_scalars_vw_pkg.search_recs}.
 * Produced by {@code ScalerRepository.searchScalers}; projected to the generated {@code ScalerResult}
 * by {@code ScalerApiMapper}.
 */
public record ScalerSearchEntry(
    String scalerLicenceNo,
    String orgUnitName,
    String clientName,
    String legalFirstName,
    String legalMiddleName,
    String licenceType,
    String scalerClientLoc) {}
