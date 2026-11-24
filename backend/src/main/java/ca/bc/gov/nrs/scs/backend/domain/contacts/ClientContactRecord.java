package ca.bc.gov.nrs.scs.backend.domain.contacts;

/**
 * The CLIENT_CONTACT person details (name, phones, email) that are not stored on
 * SCALE_SITE_CONTACT. Loaded separately and merged onto a {@code ScaleSiteContactRecord}
 * for the single-contact view, mirroring the legacy flow that loaded both DTOs.
 */
public record ClientContactRecord(
    Long clientContactId,
    String contactName,
    String businessPhone,
    String cellPhone,
    String faxNumber,
    String emailAddress
) {}
