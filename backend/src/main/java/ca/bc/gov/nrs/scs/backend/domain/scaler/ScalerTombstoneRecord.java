package ca.bc.gov.nrs.scs.backend.domain.scaler;

/**
 * Scaler tombstone (header identity strip), read from {@code scs_scaler_tombstone_vw_pkg.search_recs}.
 * Produced by {@code ScalerRepository.getScalerTombstone}; projected to the generated
 * {@code ScalerTombstone} by {@code ScalerApiMapper}. {@code scalerLicenceNo} is the DB
 * {@code scaler_license_no} column value.
 */
public record ScalerTombstoneRecord(
    String scalerLicenceNo,
    String clientName,
    String legalFirstName,
    String regionName,
    String districtName) {}
