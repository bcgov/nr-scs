package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.time.OffsetDateTime;

public record ScaleSiteSummaryCore(
    String scaleSiteIdNmbr,
    Long orgUnitNo,
    String ownerClientNumber,
    String ownerClientLocnCode,
    String siteName,
    String siteLocation,
    String timberBrand,
    Integer latitudeDegrees,
    Integer latitudeMinutes,
    Integer latitudeSeconds,
    Integer longitudeDegrees,
    Integer longitudeMinutes,
    Integer longitudeSeconds,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
