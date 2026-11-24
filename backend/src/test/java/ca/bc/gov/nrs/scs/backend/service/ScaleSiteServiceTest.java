package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSite;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSitePriorityCode;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteScalingMethod;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.exception.UnprocessableEntityException;
import ca.bc.gov.nrs.scs.backend.model.Coordinate;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteSummary;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteTombstone;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.SiteScalingMethodInput;
import ca.bc.gov.nrs.scs.backend.model.SiteScalingMethodInput.ScaleSitePriorityCodeEnum;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteApiMapper;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatcher;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSiteService tests")
class ScaleSiteServiceTest {

  @Mock
  private LovService lovService;

  @Mock
  private ScaleSiteRepository scaleSiteRepository;

  @Mock
  private ClientRepository clientRepository;

  @Mock
  private ClientScopeGuard clientScopeGuard;

  @InjectMocks
  private ScaleSiteService service;

  @Test
  void scaleSiteExists_trueWhenFound_falseWhenMissingOrBlank() {
    when(scaleSiteRepository.getScaleSite("0001"))
        .thenReturn(new ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore("0001", "Site", "Loc"));
    when(scaleSiteRepository.getScaleSite("9999")).thenReturn(null);

    assertTrue(service.scaleSiteExists("0001"));
    assertFalse(service.scaleSiteExists("9999"));
    assertFalse(service.scaleSiteExists(null));
  }

  @Test
  void scaleSiteExists_foldsCaseSoALowerCaseNumberResolvesTheStoredRecord() {
    // Site numbers are stored upper-case and the repository binds the value straight into the SP,
    // so without folding `019v` reported a real site as non-existent and blocked the check-scale save.
    when(scaleSiteRepository.getScaleSite("019V"))
        .thenReturn(new ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore("019V", "Site", "Loc"));

    assertTrue(service.scaleSiteExists("019v"));
    assertTrue(service.scaleSiteExists("  019v  "));
  }

  @Test
  void searchScaleSites_normalizesInputsAndDelegates() {
    when(scaleSiteRepository.searchScaleSites(any(ScaleSiteSearchCriteria.class))).thenReturn(
        List.of(new ScaleSiteSearchEntry("SITE001", null, null, null, null, null, null)));

    ScaleSiteSearchCriteria input = new ScaleSiteSearchCriteria(
        " site001 ", 100L, " %main% ", "123456", " 00 ", List.of("w", "S"), 1, 0);
    List<ScaleSiteSearchResult> result = service.searchScaleSites(input);

    assertEquals(1, result.size());
    assertEquals("SITE001", result.getFirst().getScaleSiteIdNmbr().get());
    org.mockito.ArgumentCaptor<ScaleSiteSearchCriteria> captor =
        org.mockito.ArgumentCaptor.forClass(ScaleSiteSearchCriteria.class);
    verify(scaleSiteRepository).searchScaleSites(captor.capture());
    ScaleSiteSearchCriteria forwarded = captor.getValue();
    assertEquals("SITE001", forwarded.scaleSiteIdNmbr());
    assertEquals(100L, forwarded.orgUnitNo());
    assertEquals("%MAIN%", forwarded.siteName());
    assertEquals("00123456", forwarded.ownerClientNumber());
    assertEquals("00", forwarded.ownerClientLocnCode());
    assertEquals(Set.of("W", "S"), Set.copyOf(forwarded.methodTypes()));
    assertEquals(1, forwarded.primarySort());
    assertEquals(0, forwarded.secondarySort());
  }

  @Test
  void searchScaleSites_rejectsInvalidMethodType() {
    ScaleSiteSearchCriteria criteria = new ScaleSiteSearchCriteria(
        null, null, null, null, null, List.of("X"), 1, 0);
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.searchScaleSites(criteria));

    assertEquals("Invalid methodTypes value: X", ex.getMessage());
  }

  @Test
  void searchScaleSites_rejectsInvalidPrimarySort() {
    ScaleSiteSearchCriteria criteria = new ScaleSiteSearchCriteria(
        null, null, null, null, null, null, 999, 0);
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.searchScaleSites(criteria));

    assertEquals("Invalid sort value: 999", ex.getMessage());
  }

  @Test
  void searchScaleSites_rejectsInvalidSecondarySort() {
    ScaleSiteSearchCriteria criteria = new ScaleSiteSearchCriteria(
        null, null, null, null, null, null, 1, 999);
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.searchScaleSites(criteria));

    assertEquals("Invalid sort value: 999", ex.getMessage());
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  private static void authenticateClientRestricted(String... clientNumbers) {
    SecurityContextHolder.getContext().setAuthentication(
        new ScsAuthenticationToken("guid", List.of(), UserAccessScope.ofClients(Set.of(clientNumbers))));
  }

  @Test
  @DisplayName("client-restricted single-client user: overrides the request owner client with the user's own")
  void searchScaleSites_clientRestricted_singleClientOverride() {
    authenticateClientRestricted("00001074");
    when(scaleSiteRepository.searchScaleSites(any(ScaleSiteSearchCriteria.class)))
        .thenReturn(List.of(new ScaleSiteSearchEntry("SITE1", null, null, null, null, "00001074", null)));

    // The request passes a different owner client; it must be ignored in favour of the user's own.
    ScaleSiteSearchCriteria input = new ScaleSiteSearchCriteria(
        null, null, null, "99999999", null, List.of(), 1, 0);
    List<ScaleSiteSearchResult> result = service.searchScaleSites(input);

    assertEquals(1, result.size());
    ArgumentCaptor<ScaleSiteSearchCriteria> captor = ArgumentCaptor.forClass(ScaleSiteSearchCriteria.class);
    verify(scaleSiteRepository).searchScaleSites(captor.capture());
    assertEquals("00001074", captor.getValue().ownerClientNumber());
  }

  @Test
  @DisplayName("client-restricted user with multiple clients: refused (single client per login only)")
  void searchScaleSites_clientRestricted_multipleClientsRefused() {
    authenticateClientRestricted("00001074", "00005821");
    ScaleSiteSearchCriteria input = new ScaleSiteSearchCriteria(
        null, null, null, "99999999", null, List.of(), 1, 0);

    assertThrows(ForbiddenException.class, () -> service.searchScaleSites(input));
    verify(scaleSiteRepository, never()).searchScaleSites(any(ScaleSiteSearchCriteria.class));
  }

  @Test
  void getScaleSiteTombstone_normalizesInputAndDelegates() {
    when(scaleSiteRepository.getScaleSiteTombstone("SITE001"))
        .thenReturn(new ScaleSiteTombstoneRecord(
            "SITE001",
            "MAIN YARD",
            "South Coast Natural Resource Region",
            "South Island District"));

    ScaleSiteTombstone result = service.getScaleSiteTombstone(" site001 ");

    assertTrue(result.getScaleSiteIdNmbr().isPresent());
    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertTrue(result.getRegionName().isPresent());
    assertEquals("South Coast Natural Resource Region", result.getRegionName().get());
    verify(scaleSiteRepository).getScaleSiteTombstone("SITE001");
  }

  @Test
  void getScaleSiteTombstone_notFound_throwsResourceNotFound() {
    when(scaleSiteRepository.getScaleSiteTombstone("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScaleSiteTombstone("site001"));

    assertEquals("No scale site tombstone found with scale site number SITE001", ex.getMessage());
  }

  @Test
  void getScaleSiteSummary_assemblesSafeSummaryFields() {
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001"))
        .thenReturn(new ScaleSiteSummaryCore(
            "SITE001",
            100L,
            "12345678",
            "00",
            "MAIN YARD",
            "Nanaimo",
            "TB-123",
            49,
            10,
            22,
            123,
            56,
            31,
            null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes("SITE001"))
        .thenReturn(List.of(
            new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY),
            new SiteScalingMethod("P", ScaleSitePriorityCode.SECONDARY)));
    when(lovService.getRegionDistrictLov("100", null))
        .thenReturn(List.of(
            new RegionDistrictLov()
                .code("999")
                .description("DSE - Selkirk Natural Resource District"),
            new RegionDistrictLov()
                .code("100")
                .description("RKB - Selkirk Natural Resource District")));

    ScaleSiteSummary result = service.getScaleSiteSummary(" site001 ");

    assertTrue(result.getScaleSiteIdNmbr().isPresent());
    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertTrue(result.getTimberBrand().isPresent());
    assertEquals("TB-123", result.getTimberBrand().get());
    assertTrue(result.getRegDistDisplay().isPresent());
    assertEquals("RKB - Selkirk Natural Resource District", result.getRegDistDisplay().get());
    assertTrue(result.getSiteTypes().isPresent());
    assertEquals(2, result.getSiteTypes().get().size());
    assertEquals("W", result.getSiteTypes().get().getFirst().getScaleMethodTypeCode().get());
    verify(lovService).getRegionDistrictLov("100", null);
    verify(scaleSiteRepository).getScaleSiteSummaryCore("SITE001");
    verify(scaleSiteRepository).getScaleSiteSummarySiteTypes("SITE001");
  }

  @Test
  void getScaleSiteSummary_missingScaleSiteNumber_throwsBadRequest() {
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.getScaleSiteSummary("  "));

    assertEquals("Scale site number is required.", ex.getMessage());
  }

  @Test
  void getScaleSiteSummary_notFound_throwsResourceNotFound() {
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScaleSiteSummary("site001"));

    assertEquals("No scale site found with scale site number SITE001", ex.getMessage());
  }

  @Test
  @DisplayName("getScaleSiteSummary: own owner client allowed")
  void getScaleSiteSummary_clientRestricted_ownClient_allowed() {
    authenticateClientRestricted("12345678");
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001"))
        .thenReturn(new ScaleSiteSummaryCore(
            "SITE001", 100L, "12345678", "00", "MAIN YARD", "Nanaimo, BC", "ABC123",
            49, 10, 22, -123, 56, 31, null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes("SITE001"))
        .thenReturn(List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));
    when(lovService.getRegionDistrictLov("100", null))
        .thenReturn(List.of(new RegionDistrictLov().code("100").description("RKB")));

    ScaleSiteSummary result = service.getScaleSiteSummary("SITE001");

    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
  }

  /**
   * The scope decision belongs to {@link ClientScopeGuard} (owner <b>or</b> authorized), not to this
   * service. It previously compared the caller's client to the site's owner directly, which refused every
   * site reached by authorization rather than ownership — the read an Industry Scaler is entitled to.
   */
  @Test
  @DisplayName("getScaleSiteSummary: a refusal from the scope guard propagates, before the LOV resolve")
  void getScaleSiteSummary_clientRestricted_guardRefusal_forbidden() {
    authenticateClientRestricted("00009999");
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001"))
        .thenReturn(new ScaleSiteSummaryCore(
            "SITE001", 100L, "12345678", "00", "MAIN YARD", "Nanaimo, BC", "ABC123",
            49, 10, 22, -123, 56, 31, null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes("SITE001"))
        .thenReturn(List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));
    doThrow(new ForbiddenException("You do not have access to this record."))
        .when(clientScopeGuard).assertScaleSiteInScope("SITE001");

    assertThrows(ForbiddenException.class, () -> service.getScaleSiteSummary("SITE001"));
    verify(lovService, never()).getRegionDistrictLov(any(), any());
  }

  /**
   * The regression guard for that bug: the service must delegate rather than judge ownership itself, so a
   * site owned by <em>another</em> client is still returned when the guard allows it — which is what the
   * guard does when the caller's client holds an authorization there.
   */
  @Test
  @DisplayName("getScaleSiteSummary: another owner's site is returned when the guard allows it")
  void getScaleSiteSummary_clientRestricted_authorizedAtAnotherOwnersSite_allowed() {
    authenticateClientRestricted("00001110");
    when(scaleSiteRepository.getScaleSiteSummaryCore("019V"))
        .thenReturn(new ScaleSiteSummaryCore(
            "019V", 100L, "00009999", "00", "MAIN YARD", "Nanaimo, BC", "ABC123",
            49, 10, 22, -123, 56, 31, null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes("019V"))
        .thenReturn(List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));
    when(lovService.getRegionDistrictLov("100", null))
        .thenReturn(List.of(new RegionDistrictLov().code("100").description("RKB")));

    ScaleSiteSummary result = service.getScaleSiteSummary("019V");

    assertEquals("019V", result.getScaleSiteIdNmbr().get());
    verify(clientScopeGuard).assertScaleSiteInScope("019V");
  }

  // ---------------------------------------------------------------------------
  // createScaleSite
  // ---------------------------------------------------------------------------

  @Test
  void createScaleSite_happyPath_orchestratesInsertsAndProjectsResponse() {
    ScaleSiteCreateRequest request = validRequest();

    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(true);
    when(scaleSiteRepository.createScaleSite(any(ScaleSite.class))).thenReturn("SITE001");
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001"))
        .thenReturn(new ScaleSiteSummaryCore(
            "SITE001", 100L, "12345678", "00", "MAIN YARD", "Nanaimo, BC", "ABC123",
            49, 10, 22, -123, 56, 31,
            null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes("SITE001"))
        .thenReturn(List.of(
            new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY),
            new SiteScalingMethod("P", ScaleSitePriorityCode.SECONDARY)));
    when(lovService.getRegionDistrictLov("100", null))
        .thenReturn(List.of(
            new RegionDistrictLov().code("100").description("RKB - Selkirk Natural Resource District")));

    ScaleSiteSummary result = service.createScaleSite(ScaleSiteApiMapper.toDomain(request));

    assertTrue(result.getScaleSiteIdNmbr().isPresent());
    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
    assertTrue(result.getRegDistDisplay().isPresent());
    assertEquals("RKB - Selkirk Natural Resource District", result.getRegDistDisplay().get());

    verify(scaleSiteRepository).createScaleSite(any(ScaleSite.class));
    verify(scaleSiteRepository).createSiteScalingMethod(eq("SITE001"), methodWithCode("W"));
    verify(scaleSiteRepository).createSiteScalingMethod(eq("SITE001"), methodWithCode("P"));
  }

  @Test
  void createScaleSite_blankSiteName_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().siteName("   ");
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Site name is required.", ex.getMessage());
  }

  @Test
  void createScaleSite_siteNameTooLong_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().siteName("X".repeat(41));
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Site name must be 40 characters or fewer.", ex.getMessage());
  }

  @Test
  void createScaleSite_blankSiteLocation_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().siteLocation("");
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Site location is required.", ex.getMessage());
  }

  @Test
  void createScaleSite_missingOrgUnit_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().orgUnitNo(null);
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Organization unit is required.", ex.getMessage());
  }

  @Test
  void createScaleSite_blankOwnerClient_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().ownerClientNumber("  ");
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Owner client number is required.", ex.getMessage());
  }

  @Test
  void createScaleSite_emptyScalingMethods_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().scalingMethods(List.of());
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("At least one scaling method is required.", ex.getMessage());
  }

  @Test
  void createScaleSite_noPrimaryScalingMethod_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().scalingMethods(List.of(
        new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.S),
        new SiteScalingMethodInput("P", ScaleSitePriorityCodeEnum.T)));
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals(
        "Exactly one scaling method must have priority code \"" + ScaleSitePriorityCode.PRIMARY + "\".",
        ex.getMessage());
  }

  @Test
  void createScaleSite_twoPrimaryScalingMethods_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().scalingMethods(List.of(
        new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.P),
        new SiteScalingMethodInput("P", ScaleSitePriorityCodeEnum.P)));
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals(
        "Exactly one scaling method must have priority code \"" + ScaleSitePriorityCode.PRIMARY + "\".",
        ex.getMessage());
  }

  @Test
  void createScaleSite_duplicateScalingMethodCodes_throwsUnprocessable() {
    ScaleSiteCreateRequest req = validRequest().scalingMethods(List.of(
        new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.P),
        new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.S)));
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    UnprocessableEntityException ex = assertThrows(
        UnprocessableEntityException.class, () -> service.createScaleSite(domain));
    assertEquals("Scaling method codes must be distinct.", ex.getMessage());
  }

  @Test
  void createScaleSite_invalidTimberBrand_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest().timberBrand("12abc");
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Timber brand format must be 'LLLXXX' or 'LLLXXXX'.", ex.getMessage());
  }

  @Test
  void createScaleSite_timberBrandIsUppercasedBeforePersistence() {
    ScaleSiteCreateRequest request = validRequest().timberBrand("abc123");

    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(true);
    when(scaleSiteRepository.createScaleSite(any(ScaleSite.class))).thenReturn("SITE001");
    stubReadbackForId("SITE001", "ABC123");

    service.createScaleSite(ScaleSiteApiMapper.toDomain(request));

    verify(scaleSiteRepository).createScaleSite(scaleSiteWithTimberBrand("ABC123"));
  }

  @Test
  void createScaleSite_siteNameIsUppercasedBeforePersistence() {
    ScaleSiteCreateRequest request = validRequest().siteName("main yard");

    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(true);
    when(scaleSiteRepository.createScaleSite(any(ScaleSite.class))).thenReturn("SITE001");
    stubReadbackForId("SITE001", "ABC123");

    service.createScaleSite(ScaleSiteApiMapper.toDomain(request));

    verify(scaleSiteRepository).createScaleSite(scaleSiteWithSiteName("MAIN YARD"));
  }

  @Test
  void createScaleSite_latitudeWithoutLongitude_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest()
        .latitude(new Coordinate(49, 10, 22))
        .longitude(null);
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Latitude and longitude must both be provided or both be omitted.", ex.getMessage());
  }

  @Test
  void createScaleSite_latitudeOutOfRange_throwsBadRequest() {
    ScaleSiteCreateRequest req = validRequest()
        .latitude(new Coordinate(91, 0, 0))
        .longitude(new Coordinate(-123, 56, 31));
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("Latitude degrees must be between -90 and 90.", ex.getMessage());
  }

  @Test
  void createScaleSite_coordinatesOutsideBritishColumbia_throwsBadRequest() {
    // Toronto — valid lat/long ranges but outside the BC boundary polygon.
    ScaleSiteCreateRequest req = validRequest()
        .latitude(new Coordinate(43, 39, 0))
        .longitude(new Coordinate(-79, 23, 0));
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaleSite(domain));
    assertEquals("The coordinates specified are not within the boundaries of BC.", ex.getMessage());
  }

  @Test
  void createScaleSite_clientDoesNotExist_throwsUnprocessable() {
    ScaleSiteCreateRequest req = validRequest();
    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(false);

    ScaleSite domain = ScaleSiteApiMapper.toDomain(req);
    UnprocessableEntityException ex = assertThrows(
        UnprocessableEntityException.class, () -> service.createScaleSite(domain));
    assertEquals("Owner client 12345678 / 00 does not exist.", ex.getMessage());
    verify(scaleSiteRepository, never()).createScaleSite(any(ScaleSite.class));
  }

  @Test
  void createScaleSite_childInsertFailurePropagates() {
    ScaleSiteCreateRequest request = validRequest();

    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(true);
    when(scaleSiteRepository.createScaleSite(any(ScaleSite.class))).thenReturn("SITE001");
    org.mockito.Mockito.doThrow(new RuntimeException("ORA-12345"))
        .when(scaleSiteRepository).createSiteScalingMethod(anyString(), any(SiteScalingMethod.class));

    ScaleSite domain = ScaleSiteApiMapper.toDomain(request);
    RuntimeException ex = assertThrows(
        RuntimeException.class, () -> service.createScaleSite(domain));
    assertEquals("ORA-12345", ex.getMessage());
  }

  // ---------------------------------------------------------------------------
  // updateScaleSite
  // ---------------------------------------------------------------------------

  @Test
  void updateScaleSite_happyPath_loadsExistingValidatesUpdatesAndReconcilesMethods() {
    stubExistingSiteWithMethods(
        "SITE001",
        List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));
    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(true);
    when(lovService.getRegionDistrictLov("100", null))
        .thenReturn(List.of(
            new RegionDistrictLov().code("100").description("RKB - Selkirk Natural Resource District")));

    ScaleSiteSummary result = service.updateScaleSite(ScaleSiteApiMapper.toDomain(validUpdateRequest(), " site001 "));

    assertTrue(result.getScaleSiteIdNmbr().isPresent());
    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());

    verify(scaleSiteRepository).updateScaleSite(any(ScaleSite.class));
    verify(scaleSiteRepository).deleteSiteScalingMethodsForSite(
        org.mockito.ArgumentMatchers.eq("SITE001"),
        org.mockito.ArgumentMatchers.argThat((List<SiteScalingMethod> list) ->
            list.size() == 1 && "W".equals(list.get(0).scaleMethodTypeCode())));
    verify(scaleSiteRepository).createSiteScalingMethod(eq("SITE001"), methodWithCode("W"));
    verify(scaleSiteRepository).createSiteScalingMethod(eq("SITE001"), methodWithCode("P"));
  }

  @Test
  void updateScaleSite_blankId_throwsBadRequest() {
    ScaleSiteUpdateRequest req = validUpdateRequest();
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "  ");
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScaleSite(domain));
    assertEquals("Scale site number is required.", ex.getMessage());
  }

  @Test
  void updateScaleSite_missingScaleSite_throwsResourceNotFound() {
    when(scaleSiteRepository.getScaleSiteSummaryCore("SITE001")).thenReturn(null);

    ScaleSiteUpdateRequest req = validUpdateRequest();
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "site001");
    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateScaleSite(domain));
    assertEquals("No scale site found with scale site number SITE001", ex.getMessage());
    verify(scaleSiteRepository, never()).updateScaleSite(any(ScaleSite.class));
  }

  @Test
  void updateScaleSite_clientDoesNotExist_throwsUnprocessable() {
    stubExistingSiteWithMethods(
        "SITE001",
        List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));
    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(false);

    ScaleSiteUpdateRequest req = validUpdateRequest();
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "SITE001");
    UnprocessableEntityException ex = assertThrows(
        UnprocessableEntityException.class,
        () -> service.updateScaleSite(domain));
    assertEquals("Owner client 12345678 / 00 does not exist.", ex.getMessage());
    verify(scaleSiteRepository, never()).updateScaleSite(any(ScaleSite.class));
    verify(scaleSiteRepository, never()).deleteSiteScalingMethodsForSite(anyString(), any());
  }

  @Test
  void updateScaleSite_noPrimaryScalingMethod_throwsBadRequest() {
    stubExistingSiteWithMethods(
        "SITE001",
        List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));

    ScaleSiteUpdateRequest req = validUpdateRequest().scalingMethods(List.of(
        new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.S),
        new SiteScalingMethodInput("P", ScaleSitePriorityCodeEnum.T)));

    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "SITE001");
    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScaleSite(domain));
    assertEquals(
        "Exactly one scaling method must have priority code \"" + ScaleSitePriorityCode.PRIMARY + "\".",
        ex.getMessage());
    verify(scaleSiteRepository, never()).updateScaleSite(any(ScaleSite.class));
  }

  @Test
  void updateScaleSite_childInsertFailurePropagates() {
    stubExistingSiteWithMethods(
        "SITE001",
        List.of(new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY)));
    when(clientRepository.checkClientExists("12345678", "00")).thenReturn(true);
    org.mockito.Mockito.doThrow(new RuntimeException("ORA-12345"))
        .when(scaleSiteRepository).createSiteScalingMethod(anyString(), any(SiteScalingMethod.class));

    ScaleSiteUpdateRequest req = validUpdateRequest();
    ScaleSite domain = ScaleSiteApiMapper.toDomain(req, "SITE001");
    RuntimeException ex = assertThrows(
        RuntimeException.class,
        () -> service.updateScaleSite(domain));
    assertEquals("ORA-12345", ex.getMessage());
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------

  private static ScaleSiteCreateRequest validRequest() {
    ScaleSiteCreateRequest request = new ScaleSiteCreateRequest(
        "MAIN YARD",
        "12345678",
        "00",
        100L,
        "Nanaimo, BC",
        List.of(
            new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.P),
            new SiteScalingMethodInput("P", ScaleSitePriorityCodeEnum.S)));
    request.setLatitude(new Coordinate(49, 10, 22));
    request.setLongitude(new Coordinate(-123, 56, 31));
    return request;
  }

  private void stubReadbackForId(String id, String timberBrand) {
    when(scaleSiteRepository.getScaleSiteSummaryCore(id))
        .thenReturn(new ScaleSiteSummaryCore(
            id, 100L, "12345678", "00", "MAIN YARD", "Nanaimo, BC", timberBrand,
            49, 10, 22, -123, 56, 31,
            null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes(id))
        .thenReturn(List.of(new SiteScalingMethod("W", "1")));
  }

  private void stubExistingSiteWithMethods(
      String id, List<SiteScalingMethod> existingTypes) {
    when(scaleSiteRepository.getScaleSiteSummaryCore(id))
        .thenReturn(new ScaleSiteSummaryCore(
            id, 100L, "12345678", "00", "MAIN YARD", "Nanaimo, BC", "ABC123",
            49, 10, 22, -123, 56, 31,
            null, null, null, null, null));
    when(scaleSiteRepository.getScaleSiteSummarySiteTypes(id)).thenReturn(existingTypes);
  }

  private static ScaleSiteUpdateRequest validUpdateRequest() {
    ScaleSiteUpdateRequest request = new ScaleSiteUpdateRequest(
        "MAIN YARD",
        "12345678",
        "00",
        100L,
        "Nanaimo, BC",
        List.of(
            new SiteScalingMethodInput("W", ScaleSitePriorityCodeEnum.P),
            new SiteScalingMethodInput("P", ScaleSitePriorityCodeEnum.S)));
    request.setLatitude(new Coordinate(49, 10, 22));
    request.setLongitude(new Coordinate(-123, 56, 31));
    return request;
  }

  private static org.mockito.ArgumentMatcher<SiteScalingMethod> hasMethodCode(String code) {
    return method -> method != null && code.equals(method.scaleMethodTypeCode());
  }

  private static SiteScalingMethod methodWithCode(String code) {
    return org.mockito.ArgumentMatchers.argThat(hasMethodCode(code));
  }

  private static String eq(String value) {
    return org.mockito.ArgumentMatchers.eq(value);
  }

  private static org.mockito.ArgumentMatcher<ScaleSite> hasTimberBrand(String timberBrand) {
    return ss -> ss != null && timberBrand.equals(ss.timberBrand());
  }

  private static ScaleSite scaleSiteWithTimberBrand(String timberBrand) {
    return org.mockito.ArgumentMatchers.argThat(hasTimberBrand(timberBrand));
  }

  private static ArgumentMatcher<ScaleSite> hasSiteName(String siteName) {
    return ss -> ss != null && siteName.equals(ss.siteName());
  }

  private static ScaleSite scaleSiteWithSiteName(String siteName) {
    return argThat(hasSiteName(siteName));
  }
}

