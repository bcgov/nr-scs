package ca.bc.gov.nrs.scs.backend.domain.authorization;

import java.time.LocalDate;

public record ScalerAuthorizationRecord(
    Long scalerAuthorizationId,
    String scalerLicenceNo,
    Long orgUnitNo,
    String districtWideInd,
    String letterArcsFileNumber,
    LocalDate authorizationEffectiveDate,
    LocalDate authorizationExpiryDate,
    String expiryNotificationInd,
    LocalDate cancellationDate,
    String cancellationReasonTxt,
    String entryUserid) {}
