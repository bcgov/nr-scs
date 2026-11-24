package ca.bc.gov.nrs.scs.backend.domain.contacts;

public record ClientContactSearchEntry(
    Long clientContactId,
    String contactName,
    String clientNumber,
    String clientLocnCode,
    String businessPhone,
    String emailAddress
) {}
