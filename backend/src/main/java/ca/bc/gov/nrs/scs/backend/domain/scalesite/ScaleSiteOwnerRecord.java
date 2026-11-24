package ca.bc.gov.nrs.scs.backend.domain.scalesite;

public record ScaleSiteOwnerRecord(
    String scaleSiteIdNmbr,
    String clientNumber,
    String clientLocnCode,
    String companyName,
    String lastName,
    String firstName,
    String businessPhone,
    String residentPhone,
    String cellPhone,
    String fax,
    String email,
    String address1,
    String address2,
    String address3,
    String city,
    String province,
    String country,
    String postalCode
) {}
