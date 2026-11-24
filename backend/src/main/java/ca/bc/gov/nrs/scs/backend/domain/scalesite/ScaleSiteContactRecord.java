package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

public record ScaleSiteContactRecord(
    Long clientContactId,
    String scaleSiteIdNmbr,
    YesNo primaryContactInd,
    String contactName,
    String contactRoleDescription,
    String businessPhone,
    String cellPhone,
    String faxNumber,
    String emailAddress,
    YesNo siteInformationAccessInd,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount
) {

  /**
   * Returns a copy with the CLIENT_CONTACT person fields (name, phones, email) overlaid.
   * These come from a separate read; the rest of the record is preserved.
   */
  public ScaleSiteContactRecord withPersonDetails(
      String contactName,
      String businessPhone,
      String cellPhone,
      String faxNumber,
      String emailAddress) {
    return new ScaleSiteContactRecord(
        clientContactId,
        scaleSiteIdNmbr,
        primaryContactInd,
        contactName,
        contactRoleDescription,
        businessPhone,
        cellPhone,
        faxNumber,
        emailAddress,
        siteInformationAccessInd,
        effectiveDate,
        expiryDate,
        entryTimestamp,
        entryUserid,
        updateTimestamp,
        updateUserid,
        revisionCount);
  }
}
