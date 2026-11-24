package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.resolveSort;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.padClientNumberCriterion;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.BritishColumbiaCoordinateValidator;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCoordinate;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSite;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSitePriorityCode;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteScalingMethod;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteTombstone;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteApiMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScaleSiteService {

  private static final Logger logger = LoggerFactory.getLogger(ScaleSiteService.class);
  private static final Set<Integer> PRIMARY_SORTS = Set.of(1, 11, 10, 3, 8, 7);
  private static final Set<Integer> SECONDARY_SORTS = Set.of(0, 1, 11, 10, 3, 8, 7);
  private static final Set<String> METHOD_TYPES = Set.of("W", "P", "S", "C");
  private static final Pattern TIMBER_BRAND_PATTERN = Pattern.compile("[A-Z]{3}.*");
  private static final int TIMBER_BRAND_MIN_LENGTH = 6;
  private static final int TIMBER_BRAND_MAX_LENGTH = 7;
  private static final int SITE_NAME_MAX_LENGTH = 40;
  private static final int SITE_LOCATION_MAX_LENGTH = 200;
  private static final int OWNER_CLIENT_NUMBER_MAX_LENGTH = 8;
  private static final int OWNER_CLIENT_LOCN_CODE_MAX_LENGTH = 2;

  private final LovService lovService;
  private final ScaleSiteRepository scaleSiteRepository;
  private final ClientRepository clientRepository;
  private final ClientScopeGuard clientScopeGuard;

  public ScaleSiteService(
      ScaleSiteRepository scaleSiteRepository,
      LovService lovService,
      ClientRepository clientRepository,
      ClientScopeGuard clientScopeGuard) {
    this.scaleSiteRepository = scaleSiteRepository;
    this.lovService = lovService;
    this.clientRepository = clientRepository;
    this.clientScopeGuard = clientScopeGuard;
  }

  @Transactional
  public ScaleSiteSummary createScaleSite(ScaleSite domain) {
    validateForSave(domain);

    // TODO: re-add OrgUnitUserValidator-style access check when the user-role model lands.

    String generatedId = scaleSiteRepository.createScaleSite(domain);
    if (generatedId == null) {
      throw new IllegalStateException("scs_scale_site_pkg.insert_rec did not return a generated scaleSiteIdNmbr.");
    }

    for (SiteScalingMethod method : domain.scalingMethods()) {
      scaleSiteRepository.createSiteScalingMethod(generatedId, method);
    }

    ScaleSite persisted = loadScaleSite(generatedId);
    return ScaleSiteApiMapper.toScaleSiteSummary(persisted, resolveRegDistDisplay(persisted.orgUnitNo()));
  }

  @Transactional
  public ScaleSiteSummary updateScaleSite(ScaleSite incoming) {
    if (incoming.scaleSiteIdNmbr() == null) {
      throw new BadRequestException("Scale site number is required.");
    }

    ScaleSite existing = loadScaleSite(incoming.scaleSiteIdNmbr());
    validateForSave(incoming);

    // TODO: re-add OrgUnitUserValidator-style access check when the user-role model lands.

    scaleSiteRepository.updateScaleSite(incoming);

    scaleSiteRepository.deleteSiteScalingMethodsForSite(incoming.scaleSiteIdNmbr(), existing.scalingMethods());
    for (SiteScalingMethod method : incoming.scalingMethods()) {
      scaleSiteRepository.createSiteScalingMethod(incoming.scaleSiteIdNmbr(), method);
    }

    ScaleSite reloaded = loadScaleSite(incoming.scaleSiteIdNmbr());
    return ScaleSiteApiMapper.toScaleSiteSummary(reloaded, resolveRegDistDisplay(reloaded.orgUnitNo()));
  }

  private ScaleSite loadScaleSite(String scaleSiteIdNmbr) {
    ScaleSiteSummaryCore core = scaleSiteRepository.getScaleSiteSummaryCore(scaleSiteIdNmbr);
    SCSUtils.requireFound(core, "No scale site found with scale site number " + scaleSiteIdNmbr);

    List<SiteScalingMethod> methods = scaleSiteRepository.getScaleSiteSummarySiteTypes(scaleSiteIdNmbr);

    return new ScaleSite(
        core.scaleSiteIdNmbr(),
        core.siteName(),
        core.ownerClientNumber(),
        core.ownerClientLocnCode(),
        core.orgUnitNo(),
        core.siteLocation(),
        core.timberBrand(),
        toCoordinate(core.latitudeDegrees(), core.latitudeMinutes(), core.latitudeSeconds()),
        toCoordinate(core.longitudeDegrees(), core.longitudeMinutes(), core.longitudeSeconds()),
        methods,
        core.entryTimestamp(),
        core.entryUserid(),
        core.updateTimestamp(),
        core.updateUserid(),
        core.revisionCount());
  }

  private static ScaleSiteCoordinate toCoordinate(Integer degrees, Integer minutes, Integer seconds) {
    if (degrees == null && minutes == null && seconds == null) {
      return null;
    }
    return new ScaleSiteCoordinate(degrees, minutes, seconds);
  }

  private void validateForSave(ScaleSite domain) {
    requireString("Site name", domain.siteName(), SITE_NAME_MAX_LENGTH);
    requireString("Site location", domain.siteLocation(), SITE_LOCATION_MAX_LENGTH);
    requireString("Owner client number", domain.ownerClientNumber(), OWNER_CLIENT_NUMBER_MAX_LENGTH);
    requireString("Owner client location code", domain.ownerClientLocnCode(), OWNER_CLIENT_LOCN_CODE_MAX_LENGTH);

    if (domain.orgUnitNo() == null) {
      throw new BadRequestException("Organization unit is required.");
    }

    validateScalingMethods(domain.scalingMethods());
    validateTimberBrand(domain.timberBrand());
    validateCoordinates(domain.latitude(), domain.longitude());

    if (!clientRepository.checkClientExists(domain.ownerClientNumber(), domain.ownerClientLocnCode())) {
      throw new UnprocessableEntityException(
          "Owner client " + domain.ownerClientNumber() + " / " + domain.ownerClientLocnCode() + " does not exist.");
    }
  }

  private static void requireString(String label, String value, int maxLength) {
    SCSUtils.requireText(value, label + " is required.");
    if (value.length() > maxLength) {
      throw new BadRequestException(label + " must be " + maxLength + " characters or fewer.");
    }
  }

  private static void validateScalingMethods(List<SiteScalingMethod> methods) {
    if (methods == null || methods.isEmpty()) {
      throw new BadRequestException("At least one scaling method is required.");
    }

    int primaryCount = 0;
    Set<String> seenCodes = new HashSet<>();
    for (SiteScalingMethod method : methods) {
      String code = method.scaleMethodTypeCode();
      SCSUtils.requireText(code, "Each scaling method requires a scale method type code.");
      if (!seenCodes.add(code)) {
        throw new UnprocessableEntityException("Scaling method codes must be distinct.");
      }
      if (ScaleSitePriorityCode.PRIMARY.equals(method.scaleSitePriorityCode())) {
        primaryCount++;
      }
    }

    if (primaryCount != 1) {
      throw new BadRequestException(
          "Exactly one scaling method must have priority code \"" + ScaleSitePriorityCode.PRIMARY + "\".");
    }
  }

  private static void validateTimberBrand(String timberBrand) {
    if (timberBrand == null) {
      return;
    }
    if (!TIMBER_BRAND_PATTERN.matcher(timberBrand).matches()
        || timberBrand.length() < TIMBER_BRAND_MIN_LENGTH
        || timberBrand.length() > TIMBER_BRAND_MAX_LENGTH) {
      throw new BadRequestException("Timber brand format must be 'LLLXXX' or 'LLLXXXX'.");
    }
  }

  private static void validateCoordinates(ScaleSiteCoordinate latitude, ScaleSiteCoordinate longitude) {
    boolean latitudeProvided = latitude != null;
    boolean longitudeProvided = longitude != null;

    if (latitudeProvided != longitudeProvided) {
      throw new BadRequestException("Latitude and longitude must both be provided or both be omitted.");
    }
    if (!latitudeProvided) {
      return;
    }

    requireCoordinateRange("Latitude", latitude, 90);
    requireCoordinateRange("Longitude", longitude, 180);

    if (!BritishColumbiaCoordinateValidator.isWithinBritishColumbia(latitude, longitude)) {
      throw new BadRequestException("The coordinates specified are not within the boundaries of BC.");
    }
  }

  private static void requireCoordinateRange(String label, ScaleSiteCoordinate scaleSiteCoordinate, int maxAbsoluteDegrees) {
    Integer degrees = scaleSiteCoordinate.degrees();
    Integer minutes = scaleSiteCoordinate.minutes();
    Integer seconds = scaleSiteCoordinate.seconds();

    if (degrees == null || minutes == null || seconds == null) {
      throw new BadRequestException(label + " requires degrees, minutes, and seconds.");
    }
    if (degrees < -maxAbsoluteDegrees || degrees > maxAbsoluteDegrees) {
      throw new BadRequestException(
          label + " degrees must be between -" + maxAbsoluteDegrees + " and " + maxAbsoluteDegrees + ".");
    }
    if (minutes < 0 || minutes > 59) {
      throw new BadRequestException(label + " minutes must be between 0 and 59.");
    }
    if (seconds < 0 || seconds > 59) {
      throw new BadRequestException(label + " seconds must be between 0 and 59.");
    }
  }

  public List<ScaleSiteSearchResult> searchScaleSites(ScaleSiteSearchCriteria criteria) {
    int resolvedPrimarySort = resolveSort(criteria.primarySort(), PRIMARY_SORTS, 1);
    int resolvedSecondarySort = resolveSort(criteria.secondarySort(), SECONDARY_SORTS, 0);
    Set<String> normalizedMethodTypes = normalizeMethodTypes(criteria.methodTypes());

    // Client-restricted external users see only their own forest client — one client per login,
    // legacy ScaleSiteSearchAction "override if user messed with the form" — so the request's owner
    // client is ignored. Internal users search the owner client they asked for.
    String effectiveOwnerClientNumber = SecurityContextUtils.isClientRestricted()
        ? SecurityContextUtils.currentUserClientNumber()
        : padClientNumberCriterion(criteria.ownerClientNumber());

    ScaleSiteSearchCriteria normalized = new ScaleSiteSearchCriteria(
        upperOrNull(criteria.scaleSiteIdNmbr()),
        criteria.orgUnitNo(),
        upperOrNull(criteria.siteName()),
        effectiveOwnerClientNumber,
        upperOrNull(criteria.ownerClientLocnCode()),
        List.copyOf(normalizedMethodTypes),
        resolvedPrimarySort,
        resolvedSecondarySort);

    return ScaleSiteApiMapper.toSearchResultResponses(scaleSiteRepository.searchScaleSites(normalized));
  }

  public ScaleSiteTombstone getScaleSiteTombstone(String scaleSiteIdNmbr) {
    String normalizedScaleSiteIdNmbr =
        SCSUtils.requireText(upperOrNull(scaleSiteIdNmbr), "Scale site number is required.");

    ScaleSiteTombstoneRecord tombstone =
        scaleSiteRepository.getScaleSiteTombstone(normalizedScaleSiteIdNmbr);

    if (tombstone == null) {
      throw new ResourceNotFoundException(
          "No scale site tombstone found with scale site number " + normalizedScaleSiteIdNmbr);
    }

    return ScaleSiteApiMapper.toTombstoneResponse(tombstone);
  }

  /**
   * Whether a scale site exists for the given number (legacy {@code ScaleSiteBo.validateScaleSite}).
   * Unlike {@link #getScaleSiteSummary} (get-or-404), this returns a boolean for callers doing
   * referential validation. The number is folded to upper case before the lookup (site numbers are
   * stored upper-case), and check-scale writes fold the same way before binding the FK, so a hit here
   * still means the write won't trip the FK. Blank input is treated as "not found".
   */
  public boolean scaleSiteExists(String scaleSiteIdNmbr) {
    if (SCSUtils.isBlank(scaleSiteIdNmbr)) {
      return false;
    }
    // Site numbers are stored upper-case; fold so `019v` finds `019V`. Matches how
    // ScaleSiteContactService and ScaleSiteActivityService already normalise this identifier.
    return scaleSiteRepository.getScaleSite(upperOrNull(scaleSiteIdNmbr)) != null;
  }

  public ScaleSiteSummary getScaleSiteSummary(String scaleSiteIdNmbr) {
    String normalizedScaleSiteIdNmbr =
        SCSUtils.requireText(upperOrNull(scaleSiteIdNmbr), "Scale site number is required.");

    ScaleSite scaleSite = loadScaleSite(normalizedScaleSiteIdNmbr);
    // Owner *or* authorized, via the shared guard — not assertClientAccess(ownerClientNumber), which
    // sees only ownership. An industry scaler reaches a site through their client's authorization at
    // it, and the site is routinely owned by another company, so an owner-only check here refused
    // exactly the records roles-permissions.md §4 grants — regardless of what the interceptor allowed.
    clientScopeGuard.assertScaleSiteInScope(normalizedScaleSiteIdNmbr);
    return ScaleSiteApiMapper.toScaleSiteSummary(
        scaleSite, resolveRegDistDisplay(scaleSite.orgUnitNo()));
  }

  private String resolveRegDistDisplay(Long orgUnitNo) {
    if (orgUnitNo == null) {
      return null;
    }

    String requestedCode = String.valueOf(orgUnitNo);
    List<RegionDistrictLov> regionDistricts = lovService.getRegionDistrictLov(requestedCode, null);
    logger.debug("RegionDistrictLov results for orgUnitNo {}: {}", orgUnitNo, regionDistricts);

    return regionDistricts.stream()
        .filter(regionDistrict -> requestedCode.equals(getNullable(regionDistrict.getCode())))
        .findFirst()
        .map(regionDistrict -> {
          String description = trimToNull(getNullable(regionDistrict.getDescription()));
          logger.debug(
              "Matched RegionDistrictLov for orgUnitNo {} with code='{}', description='{}'",
              orgUnitNo,
              getNullable(regionDistrict.getCode()),
              description);
          return description;
        })
        .orElseGet(() -> {
          logger.debug("No RegionDistrictLov match found for orgUnitNo {}", orgUnitNo);
          return null;
        });
  }

  private Set<String> normalizeMethodTypes(List<String> methodTypes) {
    Set<String> normalized = new HashSet<>();
    if (methodTypes == null) {
      return normalized;
    }

    for (String methodType : methodTypes) {
      if (methodType == null || methodType.isBlank()) {
        continue;
      }

      String value = upperOrNull(methodType);
      if (!METHOD_TYPES.contains(value)) {
        throw new BadRequestException("Invalid methodTypes value: " + methodType);
      }
      normalized.add(value);
    }

    return normalized;
  }

}

