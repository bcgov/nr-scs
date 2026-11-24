package ca.bc.gov.nrs.scs.backend.domain.marksitedesignation;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record HaulingMarkAuthorizationDetail(
    Long id,
    String timberMark,
    Long orgUnitNo,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String districtWideInd,
    LocalDate letterIssuedDate,
    String letterIssuedByUserId,
    String letterArcsFileNo,
    String timberDescriptionTxt,
    String timberGeographicLocation,
    Long populationNumber,
    Long estimatedVolume,
    Long estimatedTruckLoadNo,
    String transportationDateDesc,
    String otherRequirementsTxt,
    String entryUserid,
    OffsetDateTime entryTimestamp,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
