package ca.bc.gov.nrs.scs.backend.domain.scalesite;

import java.time.OffsetDateTime;
import java.util.List;

public record ScaleSite(
    String scaleSiteIdNmbr,
    String siteName,
    String ownerClientNumber,
    String ownerClientLocnCode,
    Long orgUnitNo,
    String siteLocation,
    String timberBrand,
    ScaleSiteCoordinate latitude,
    ScaleSiteCoordinate longitude,
    List<SiteScalingMethod> scalingMethods,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
