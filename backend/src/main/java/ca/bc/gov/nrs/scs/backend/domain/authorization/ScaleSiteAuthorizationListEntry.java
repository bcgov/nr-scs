package ca.bc.gov.nrs.scs.backend.domain.authorization;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * A single row in the scale site Authorizations tab list, carrying the view-computed status and a
 * letter-exists flag re-derived from the letter table. Mirrors the legacy
 * {@code ScaleSiteAuthorizationsAction} list.
 */
public record ScaleSiteAuthorizationListEntry(
    Long scaleSiteAuthorizationId,
    String scaleSiteIdNmbr,
    String letterArcsFileNumber,
    LocalDate authorizationEffectiveDate,
    LocalDate authorizationExpiryDate,
    String expiryNotificationInd,
    Long expectedScaleVolume,
    LocalDate cancellationDate,
    String cancellationReasonTxt,
    String status,
    boolean letterExists,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
