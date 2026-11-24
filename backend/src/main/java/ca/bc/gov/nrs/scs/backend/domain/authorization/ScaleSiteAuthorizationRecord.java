package ca.bc.gov.nrs.scs.backend.domain.authorization;

import java.time.LocalDate;

public record ScaleSiteAuthorizationRecord(
    Long scaleSiteAuthorizationId,
    String scaleSiteIdNmbr,
    String letterArcsFileNumber,
    LocalDate authorizationEffectiveDate,
    LocalDate authorizationExpiryDate,
    String expiryNotificationInd,
    Long expectedScaleVolume,
    LocalDate cancellationDate,
    String cancellationReasonTxt,
    String entryUserid) {}
