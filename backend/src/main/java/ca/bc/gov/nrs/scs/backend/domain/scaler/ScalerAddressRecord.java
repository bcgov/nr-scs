package ca.bc.gov.nrs.scs.backend.domain.scaler;

/**
 * Domain record for the read-only Scaler Address tab.
 *
 * <p>Sourced from {@code scs_scaler_address_vw_pkg.search_recs}, which returns a single row per
 * scaler licence. Phone numbers are carried as stored (unformatted); display formatting is the
 * client's responsibility.
 */
public record ScalerAddressRecord(
    String scalerLicenceNo,
    String company,
    String lastName,
    String firstName,
    String businessPhone,
    String homePhone,
    String cellPhone,
    String faxNumber,
    String emailAddress,
    String address1,
    String address2,
    String address3,
    String city,
    String province,
    String country,
    String postalCode) {}
