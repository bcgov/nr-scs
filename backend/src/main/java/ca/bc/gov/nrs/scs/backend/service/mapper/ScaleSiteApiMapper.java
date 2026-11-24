package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCoordinate;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSite;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteScalingMethod;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummarySiteType;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteTombstone;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.SiteScalingMethodInput;
import java.util.List;

public final class ScaleSiteApiMapper {

  private ScaleSiteApiMapper() {
  }

  public static ScaleSite toDomain(ScaleSiteCreateRequest request) {
    return new ScaleSite(
        null,
        // Site name is a searchable field; store it uppercased so the case-sensitive search
        // package finds the record regardless of how it was typed (site location is not searched).
        upperOrNull(request.getSiteName()),
        trimToNull(request.getOwnerClientNumber()),
        trimToNull(request.getOwnerClientLocnCode()),
        request.getOrgUnitNo(),
        trimToNull(request.getSiteLocation()),
        upperOrNull(getNullable(request.getTimberBrand())),
        toDomainCoordinate(request.getLatitude()),
        toDomainCoordinate(request.getLongitude()),
        toDomainScalingMethods(request.getScalingMethods()),
        null,
        null,
        null,
        null,
        null);
  }

  public static ScaleSite toDomain(ScaleSiteUpdateRequest request, String scaleSiteIdNmbr) {
    return new ScaleSite(
        upperOrNull(scaleSiteIdNmbr),
        // Site name is a searchable field; store it uppercased so the case-sensitive search
        // package finds the record regardless of how it was typed (site location is not searched).
        upperOrNull(request.getSiteName()),
        trimToNull(request.getOwnerClientNumber()),
        trimToNull(request.getOwnerClientLocnCode()),
        request.getOrgUnitNo(),
        trimToNull(request.getSiteLocation()),
        upperOrNull(getNullable(request.getTimberBrand())),
        toDomainCoordinate(request.getLatitude()),
        toDomainCoordinate(request.getLongitude()),
        toDomainScalingMethods(request.getScalingMethods()),
        null,
        null,
        null,
        null,
        null);
  }

  public static ScaleSiteSummary toScaleSiteSummary(ScaleSite scaleSite, String regDistDisplay) {
    ScaleSiteCoordinate latitude = scaleSite.latitude();
    ScaleSiteCoordinate longitude = scaleSite.longitude();

    List<ScaleSiteSummarySiteType> siteTypes = scaleSite.scalingMethods().stream()
        .map(method -> new ScaleSiteSummarySiteType()
            .priorityCode(method.scaleSitePriorityCode())
            .scaleMethodTypeCode(method.scaleMethodTypeCode()))
        .toList();

    return new ScaleSiteSummary()
        .scaleSiteIdNmbr(scaleSite.scaleSiteIdNmbr())
        .siteName(scaleSite.siteName())
        .ownerClientNumber(scaleSite.ownerClientNumber())
        .ownerClientLocnCode(scaleSite.ownerClientLocnCode())
        .orgUnitNo(scaleSite.orgUnitNo())
        .regDistDisplay(regDistDisplay)
        .timberBrand(scaleSite.timberBrand())
        .siteLocation(scaleSite.siteLocation())
        .latitudeDegrees(latitude == null ? null : latitude.degrees())
        .latitudeMinutes(latitude == null ? null : latitude.minutes())
        .latitudeSeconds(latitude == null ? null : latitude.seconds())
        .longitudeDegrees(longitude == null ? null : longitude.degrees())
        .longitudeMinutes(longitude == null ? null : longitude.minutes())
        .longitudeSeconds(longitude == null ? null : longitude.seconds())
        .siteTypes(siteTypes)
        .entryTimestamp(scaleSite.entryTimestamp())
        .entryUserid(scaleSite.entryUserid())
        .updateTimestamp(scaleSite.updateTimestamp())
        .updateUserid(scaleSite.updateUserid())
        .revisionCount(scaleSite.revisionCount());
  }

  private static ScaleSiteCoordinate toDomainCoordinate(ca.bc.gov.nrs.scs.backend.model.Coordinate apiCoordinate) {
    if (apiCoordinate == null) {
      return null;
    }
    return new ScaleSiteCoordinate(apiCoordinate.getDegrees(), apiCoordinate.getMinutes(), apiCoordinate.getSeconds());
  }

  public static ScaleSiteTombstone toTombstoneResponse(ScaleSiteTombstoneRecord tombstone) {
    return new ScaleSiteTombstone(tombstone.scaleSiteIdNmbr())
        .siteName(tombstone.siteName())
        .regionName(tombstone.regionName())
        .districtName(tombstone.districtName());
  }

  public static List<ScaleSiteSearchResult> toSearchResultResponses(List<ScaleSiteSearchEntry> entries) {
    if (entries == null) return List.of();
    return entries.stream()
        .map(ScaleSiteApiMapper::toSearchResultResponse)
        .toList();
  }

  private static ScaleSiteSearchResult toSearchResultResponse(ScaleSiteSearchEntry entry) {
    return new ScaleSiteSearchResult()
        .scaleSiteIdNmbr(entry.scaleSiteIdNmbr())
        .siteName(entry.siteName())
        .region(entry.region())
        .district(entry.district())
        .methodTypeCodeName(entry.methodTypeCodeName())
        .ownerClientNumber(entry.ownerClientNumber())
        .ownerClientLocnCode(entry.ownerClientLocnCode());
  }

  private static List<SiteScalingMethod> toDomainScalingMethods(List<SiteScalingMethodInput> inputs) {
    if (inputs == null) {
      return List.of();
    }
    return inputs.stream()
        .map(input -> new SiteScalingMethod(
            upperOrNull(input.getScaleMethodTypeCode()),
            input.getScaleSitePriorityCode() == null ? null : input.getScaleSitePriorityCode().getValue()))
        .toList();
  }
}
