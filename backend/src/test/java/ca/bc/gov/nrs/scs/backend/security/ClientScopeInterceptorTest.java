package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteAuthorizationCoverage;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSummaryCore;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizedScalerRepository;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

@DisplayName("ClientScopeInterceptor — central forest-client data scoping")
class ClientScopeInterceptorTest {

  private static final String OWN_CLIENT = "00001074";
  private static final String OTHER_CLIENT = "00009999";

  private final ScalerRepository scalerRepository = mock(ScalerRepository.class);
  private final ScaleSiteRepository scaleSiteRepository = mock(ScaleSiteRepository.class);
  private final ScaleSiteAuthorizedScalerRepository authorizedScalerRepository =
      mock(ScaleSiteAuthorizedScalerRepository.class);
  private final ClientScopeInterceptor interceptor = new ClientScopeInterceptor(
      new ClientScopeGuard(scalerRepository, scaleSiteRepository, authorizedScalerRepository));

  private final HttpServletResponse response = mock(HttpServletResponse.class);

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  /**
   * The role matters, not just the client: each external role gets one bridge out of its own record
   * type and the other role's bridge is denied it, so every scoping test has to say which role is
   * asking. See the role table on {@link ClientScopeGuard}.
   */
  private static void authenticateIndustryScaler(String clientNumber) {
    authenticateExternal(clientNumber, Roles.SCS_INDUSTRY_SCALER);
  }

  private static void authenticateOwner(String clientNumber) {
    authenticateExternal(clientNumber, Roles.SCS_OWNER);
  }

  private static void authenticateExternal(String clientNumber, String... roles) {
    var authorities = Arrays.stream(roles)
        .map(SimpleGrantedAuthority::new)
        .collect(Collectors.toCollection(LinkedHashSet<GrantedAuthority>::new));
    var token = new ScsAuthenticationToken(
        "external-user", authorities, UserAccessScope.ofClients(Set.of(clientNumber)));
    token.setDetails("bceid-user");
    SecurityContextHolder.getContext().setAuthentication(token);
  }

  private static void authenticateInternal() {
    var token = new ScsAuthenticationToken(
        "internal-user",
        Set.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")),
        UserAccessScope.internal());
    token.setDetails("idir-user");
    SecurityContextHolder.getContext().setAuthentication(token);
  }

  private static HttpServletRequest requestWithPathVariables(Map<String, String> variables) {
    HttpServletRequest request = mock(HttpServletRequest.class);
    when(request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE))
        .thenReturn(variables);
    return request;
  }

  private void stubScalerClient(String licenceNo, String clientNumber) {
    ScalerSummaryCore core = mock(ScalerSummaryCore.class);
    when(core.clientNumber()).thenReturn(clientNumber);
    when(scalerRepository.getScalerSummaryCore(licenceNo)).thenReturn(core);
  }

  private void stubSiteOwnerClient(String siteId, String clientNumber) {
    ScaleSiteSummaryCore core = mock(ScaleSiteSummaryCore.class);
    when(core.ownerClientNumber()).thenReturn(clientNumber);
    when(scaleSiteRepository.getScaleSiteSummaryCore(siteId)).thenReturn(core);
  }

  /** The scalers belonging to the caller's forest client. */
  private void stubClientScalers(String... licenceNumbers) {
    when(scalerRepository.listLicenceNumbersForClient(OWN_CLIENT))
        .thenReturn(new LinkedHashSet<>(Arrays.asList(licenceNumbers)));
  }

  /** The sites a scaler holds a currently in-force authorization at — the owner's bridge. */
  private void stubScalerAuthorizedAtSites(String licenceNo, String... siteIds) {
    when(authorizedScalerRepository.listAuthorizationCoverageForScaler(licenceNo))
        .thenReturn(Arrays.stream(siteIds)
            .map(siteId -> new SiteAuthorizationCoverage(1L, licenceNo, siteId, "N",
                LocalDate.now().minusYears(1), LocalDate.now().plusYears(1), null))
            .toList());
  }

  /** Scalers with a currently in-force authorization at a site. */
  private void stubSiteAuthorizedScalers(String siteId, String... licenceNumbers) {
    when(authorizedScalerRepository.listAuthorizationCoverageForSite(siteId))
        .thenReturn(Arrays.stream(licenceNumbers)
            .map(licence -> authorization(licence, LocalDate.now().minusYears(1),
                LocalDate.now().plusYears(1), null))
            .toList());
  }

  private void stubSiteAuthorizations(String siteId, SiteAuthorizationCoverage... authorizations) {
    when(authorizedScalerRepository.listAuthorizationCoverageForSite(siteId))
        .thenReturn(List.of(authorizations));
  }

  /**
   * An authorization covering the site. State comes from the dates alone — the coverage view carries no
   * computed status, so cancellation is a date rather than the word "Cancelled".
   */
  private static SiteAuthorizationCoverage authorization(
      String licenceNo, LocalDate effective, LocalDate expiry, LocalDate cancellation) {
    return new SiteAuthorizationCoverage(1L, licenceNo, "777", "N", effective, expiry, cancellation);
  }

  @Nested
  @DisplayName("client-restricted (external) caller")
  class Restricted {

    @Test
    @DisplayName("is allowed through for a scaler belonging to their own client")
    void allowsOwnScaler() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("12345", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "12345")), response, new Object()));
    }

    @Test
    @DisplayName("is refused (403) for a scaler belonging to another client")
    void refusesOtherClientsScaler() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("99999", OTHER_CLIENT);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
    }

    /** The point of the interceptor: it covers sub-resources, not just the scaler detail read. */
    @Test
    @DisplayName("is refused for another client's scaler on any sub-resource path")
    void refusesOtherClientsScalerSubResources() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("99999", OTHER_CLIENT);

      // Every one of these was an unguarded read before this interceptor existed: exams,
      // appointments, performance remarks, authorizations, check scales, address, tombstone.
      var request = requestWithPathVariables(Map.of("scalerLicenceNo", "99999"));
      assertThrows(ForbiddenException.class,
          () -> interceptor.preHandle(request, response, new Object()));
    }

    @Test
    @DisplayName("is allowed through for a site owned by their own client")
    void allowsOwnScaleSite() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("520", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "520")), response, new Object()));
    }

    @Test
    @DisplayName("is refused (403) for another client's site they are not authorized at")
    void refusesOtherClientsScaleSite() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("12345");
      stubSiteAuthorizedScalers("777", "99999");

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /**
     * The §4 capability "view scale sites they are authorized to scale at": an industry scaler is
     * routinely authorized at a site owned by another company, so owner-only scoping would deny the
     * records the role exists to read.
     */
    @Test
    @DisplayName("is allowed through for another client's site their scaler is authorized at")
    void allowsOtherClientsSiteWhenAuthorizedThere() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("12345", "67890");
      stubSiteAuthorizedScalers("777", "99999", "67890");

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /**
     * The authorized-scalers view returns every status, so an authorization that lapsed years ago must
     * not keep granting the client's users access to that site's record forever.
     */
    @Test
    @DisplayName("is refused when their only authorization at the site has expired")
    void refusesExpiredAuthorization() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizations("777",
          authorization("67890", LocalDate.now().minusYears(5),
              LocalDate.now().minusYears(4), null));

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /** A cancelled authorization can still sit inside its date window, so status is checked too. */
    @Test
    @DisplayName("is refused when their only authorization at the site was cancelled")
    void refusesCancelledAuthorization() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizations("777",
          authorization("67890", LocalDate.now().minusYears(1),
              LocalDate.now().plusYears(1), LocalDate.now().minusMonths(2)));

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    @Test
    @DisplayName("is refused when their authorization has not taken effect yet")
    void refusesFutureDatedAuthorization() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizations("777",
          authorization("67890", LocalDate.now().plusMonths(1),
              LocalDate.now().plusYears(1), null));

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /** An expired authorization must not mask a live one held by another of the client's scalers. */
    @Test
    @DisplayName("is allowed when one authorization is in force alongside a lapsed one")
    void allowsWhenAnyAuthorizationIsInForce() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("12345", "67890");
      stubSiteAuthorizations("777",
          authorization("12345", LocalDate.now().minusYears(5),
              LocalDate.now().minusYears(4), null),
          authorization("67890", LocalDate.now().minusYears(1),
              LocalDate.now().plusYears(1), null));

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /**
     * A district-wide authorization names no sites of its own — it covers every site in its org unit —
     * and the coverage view expands it to one row per site. It must grant access exactly like a
     * site-specific one; the reported defect was a district-wide authorization (149514) whose sites were
     * all refused.
     */
    @Test
    @DisplayName("is allowed by a district-wide authorization, which names no sites itself")
    void allowsDistrictWideAuthorization() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizations("777",
          new SiteAuthorizationCoverage(149514L, "67890", "777", "Y",
              LocalDate.now().minusYears(1), LocalDate.now().plusYears(1), null));

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /**
     * The boundary the database itself defines: {@code scs_authorized_scalers_vw} reports 'Expired' when
     * {@code authorization_expiry_date <= sysdate}, so an authorization is out of force *on* its expiry
     * date. Pinned so the guard cannot drift from the status the user is shown.
     */
    @Test
    @DisplayName("is refused on the expiry date itself, matching the view's own status")
    void refusesOnTheExpiryDate() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizations("777",
          authorization("67890", LocalDate.now().minusYears(1), LocalDate.now(), null));

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /** A future cancellation date is not yet a cancellation — the view only treats it as one once due. */
    @Test
    @DisplayName("is allowed when a cancellation is scheduled but not yet effective")
    void allowsFutureDatedCancellation() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizations("777",
          authorization("67890", LocalDate.now().minusYears(1), LocalDate.now().plusYears(1),
              LocalDate.now().plusMonths(3)));

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    @Test
    @DisplayName("is refused when their client has no scalers at all")
    void refusesWhenClientHasNoScalers() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers();

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
      // No point asking who is authorized at the site when the client has no scalers.
      verify(authorizedScalerRepository, never()).listAuthorizationCoverageForSite(anyString());
    }

    @Test
    @DisplayName("does not look up authorizations for a site their own client owns")
    void skipsAuthorizationLookupForOwnedSite() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubSiteOwnerClient("520", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "520")), response, new Object()));
      verify(authorizedScalerRepository, never()).listAuthorizationCoverageForSite(anyString());
    }

    /** Fail closed: a record whose client is null must not be readable by a restricted caller. */
    @Test
    @DisplayName("is refused when the record carries no client number")
    void refusesRecordWithNullClient() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("12345", null);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "12345")), response, new Object()));
    }

    /**
     * Deliberate 403-before-404: an unknown id is refused rather than reported missing, so a
     * restricted caller cannot use the endpoint as an existence oracle over the keyspace.
     */
    @Test
    @DisplayName("is refused (not 404'd) for an id that does not exist")
    void refusesUnknownId() {
      authenticateIndustryScaler(OWN_CLIENT);
      when(scalerRepository.getScalerSummaryCore("00000")).thenReturn(null);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "00000")), response, new Object()));
    }

    @Test
    @DisplayName("checks both ids when a path carries a scaler and a site")
    void checksBothIds() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("12345", OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "12345", "scaleSiteIdNmbr", "777")),
          response, new Object()));
    }

    @Test
    @DisplayName("is allowed through on a path with no record id (e.g. a search)")
    void allowsPathsWithoutRecordIds() {
      authenticateIndustryScaler(OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of()), response, new Object()));
      verify(scalerRepository, never()).getScalerSummaryCore(anyString());
    }
  }

  /**
   * Scope is resolved per role, not per external caller: each of the two enabled roles gets one bridge
   * out of its own record type, and is denied the other's. Sharing one predicate between them
   * over-granted in both directions — see the role table on {@link ClientScopeGuard}.
   */
  @Nested
  @DisplayName("scope differs by role")
  class RoleScoping {

    /**
     * The blocking review finding. An owner whose client also employs a scaler authorized at another
     * company's site would otherwise deep-link that site's summary, contacts, authorizations and
     * inspections — records the owner's own scale-site search (owner-client only) never lists, and the
     * use cases deny. The industry scaler's identical request is allowed, two tests down.
     */
    @Test
    @DisplayName("an owner is refused another client's site even when their scaler is authorized there")
    void refusesOwnerOnAuthorizedButNotOwnedSite() {
      authenticateOwner(OWN_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubClientScalers("67890");
      stubSiteAuthorizedScalers("777", "67890");

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
    }

    /** The owner's own sites are of course still readable — the bridge is what is withheld. */
    @Test
    @DisplayName("an owner is allowed a site their own client owns")
    void allowsOwnerOnOwnedSite() {
      authenticateOwner(OWN_CLIENT);
      stubSiteOwnerClient("520", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "520")), response, new Object()));
    }

    /**
     * roles-permissions.md §4's first bullet for the owner — "view select information on scalers
     * authorized to scale at their sites" — and §1's legend, which defines this role's {@code (ltd)} as
     * exactly that. Without this branch the site record's Authorized Scalers tab linked every row to a
     * 403: the scalers listed there work for other companies by definition.
     */
    @Test
    @DisplayName("an owner is allowed a scaler authorized at a site their client owns")
    void allowsOwnerOnScalerAuthorizedAtOwnedSite() {
      authenticateOwner(OWN_CLIENT);
      stubScalerClient("99999", OTHER_CLIENT);
      stubScalerAuthorizedAtSites("99999", "777", "520");
      stubSiteOwnerClient("777", OTHER_CLIENT);
      stubSiteOwnerClient("520", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
    }

    @Test
    @DisplayName("an owner is refused a scaler authorized only at sites they do not own")
    void refusesOwnerOnScalerAuthorizedElsewhere() {
      authenticateOwner(OWN_CLIENT);
      stubScalerClient("99999", OTHER_CLIENT);
      stubScalerAuthorizedAtSites("99999", "777");
      stubSiteOwnerClient("777", OTHER_CLIENT);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
    }

    /**
     * The rule is the bridge and nothing else: a scaler filed under the owner's <i>own</i> forest client
     * is still refused unless it is authorized at a site that client owns. Dropped as a branch on
     * 2026-08-20 — {@code SCALER.CLIENT_NUMBER} is documented only as "Reference to CLIENT", so it
     * asserts an association rather than a current engagement, and §4 names the population by
     * authorization instead. This is the assertion that pins the narrower rule.
     */
    @Test
    @DisplayName("an owner is refused a scaler of their own client that is not authorized at their site")
    void refusesOwnerOnOwnClientScalerWithoutAuthorization() {
      authenticateOwner(OWN_CLIENT);
      stubScalerClient("12345", OWN_CLIENT);
      stubScalerAuthorizedAtSites("12345", "777");
      stubSiteOwnerClient("777", OTHER_CLIENT);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "12345")), response, new Object()));
    }

    /** Same scaler, same client — admitted once the authorization points at a site the owner owns. */
    @Test
    @DisplayName("an owner is allowed their own client's scaler when it is authorized at their site")
    void allowsOwnerOnOwnClientScalerAuthorizedAtOwnedSite() {
      authenticateOwner(OWN_CLIENT);
      stubScalerClient("12345", OWN_CLIENT);
      stubScalerAuthorizedAtSites("12345", "520");
      stubSiteOwnerClient("520", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "12345")), response, new Object()));
    }

    /**
     * The industry scaler's rule is the mirror and is unchanged: its own client's scalers, and the
     * ownership of the site they are authorized at is irrelevant to it.
     */
    @Test
    @DisplayName("an industry scaler is allowed their own client's scaler with no authorization at all")
    void allowsIndustryScalerOnOwnClientScalerRegardless() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("12345", OWN_CLIENT);

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "12345")), response, new Object()));
      verify(authorizedScalerRepository, never()).listAuthorizationCoverageForScaler(anyString());
    }

    /** An authorization out of force grants nothing in this direction either. */
    @Test
    @DisplayName("an owner is refused when the authorization at their site has expired")
    void refusesOwnerOnExpiredAuthorizationAtOwnedSite() {
      authenticateOwner(OWN_CLIENT);
      stubScalerClient("99999", OTHER_CLIENT);
      when(authorizedScalerRepository.listAuthorizationCoverageForScaler("99999"))
          .thenReturn(List.of(new SiteAuthorizationCoverage(1L, "99999", "520", "N",
              LocalDate.now().minusYears(5), LocalDate.now().minusYears(4), null)));

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
      // Nothing to resolve: the only authorization is out of force, so no site is worth looking up.
      verify(scaleSiteRepository, never()).getScaleSiteSummaryCore(anyString());
    }

    /**
     * The mirror of {@link #refusesOwnerOnAuthorizedButNotOwnedSite}: the scaler bridge belongs to the
     * owner, so an industry scaler gets no reach over another company's scaler just because that scaler
     * is authorized at a site their own client happens to own.
     */
    @Test
    @DisplayName("an industry scaler is refused another client's scaler authorized at a site they own")
    void refusesIndustryScalerOnScalerAuthorizedAtOwnedSite() {
      authenticateIndustryScaler(OWN_CLIENT);
      stubScalerClient("99999", OTHER_CLIENT);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
      // The owner's bridge is not even consulted.
      verify(authorizedScalerRepository, never()).listAuthorizationCoverageForScaler(anyString());
    }

    /**
     * A role SCS recognises but has not enabled carries no bridge at all — {@code welcomeOnly()} holds
     * no permission that reaches a record, but the guard must not depend on that to fail closed.
     */
    @Test
    @DisplayName("a client-restricted role with neither bridge reaches only its own client")
    void refusesOtherRolesOnBothBridges() {
      authenticateExternal(OWN_CLIENT, Roles.SCS_CLERICAL);
      stubScalerClient("99999", OTHER_CLIENT);
      stubSiteOwnerClient("777", OTHER_CLIENT);

      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
      assertThrows(ForbiddenException.class, () -> interceptor.preHandle(
          requestWithPathVariables(Map.of("scaleSiteIdNmbr", "777")), response, new Object()));
      verify(authorizedScalerRepository, never()).listAuthorizationCoverageForScaler(anyString());
      verify(authorizedScalerRepository, never()).listAuthorizationCoverageForSite(anyString());
    }
  }

  @Nested
  @DisplayName("internal caller")
  class Internal {

    /** Internal users must cost nothing: no lookup, no denial, regardless of whose record it is. */
    @Test
    @DisplayName("is allowed through without any lookup")
    void allowsWithoutLookup() {
      authenticateInternal();

      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999", "scaleSiteIdNmbr", "777")),
          response, new Object()));
      verify(scalerRepository, never()).getScalerSummaryCore(anyString());
      verify(scaleSiteRepository, never()).getScaleSiteSummaryCore(anyString());
    }

    @Test
    @DisplayName("an unauthenticated request is not scoped (authorization rules handle it)")
    void unauthenticatedIsNotScoped() {
      assertTrue(interceptor.preHandle(
          requestWithPathVariables(Map.of("scalerLicenceNo", "99999")), response, new Object()));
      verify(scalerRepository, never()).getScalerSummaryCore(anyString());
    }
  }

  @Nested
  @DisplayName("coverage of the API surface")
  class Coverage {

    private static final String CONTROLLER_PACKAGE = "ca.bc.gov.nrs.scs.backend.controller";

    /**
     * Endpoints whose <b>service</b> calls {@link ClientScopeGuard} itself, because the path names no
     * scaler or scale site for the interceptor to scope by. Each entry is a deliberate exception with a
     * guard behind it — not a permitted gap.
     *
     * <p><b>Keyed by {@code METHOD path}, not by path.</b> Guards are per handler, so a path-keyed list
     * asserted coverage the code did not have: {@code /scale-sites/inspection/{inspectionId}} was listed
     * on the strength of its GET while its DELETE reached no guard at all and its PUT reached one only
     * incidentally, after every write, via the detail read on its last line — a rollback rather than a
     * refusal.
     *
     * <p><b>Adding to this list is a security decision.</b> Do it only alongside a real service-level
     * guard, and prefer renaming the path to the {@code /scale-sites/{scaleSiteIdNmbr}/…} convention so
     * the interceptor covers it for free.
     */
    private static final Set<String> GUARDED_IN_SERVICE = Set.of(
        "GET /scale-sites/inspection/search",
        "GET /scale-sites/inspection/{inspectionId}",
        "GET /scale-sites/inspection/{inspectionId}/edit",
        "PUT /scale-sites/inspection/{inspectionId}",
        "DELETE /scale-sites/inspection/{inspectionId}",
        "GET /scale-site-authorizations/{scaleSiteAuthorizationId}",
        "GET /scaler-authorizations/{scalerAuthorizationId}",
        // Keyed on riskQuestionnaireId, so the interceptor cannot reach them. Each service resolves the
        // assessment's owning scaler / site and guards on that before its own not-found check. Added
        // 2026-09-02 with the client's grant of read-with-limitations to the two external roles.
        "GET /scaler-risk-assessments/{riskQuestionnaireId}",
        "GET /scale-site-risk-assessments/{riskQuestionnaireId}");

    /**
     * Searches whose service replaces the caller's client criterion with their own forest client (or,
     * for the owner's scaler search, filters the rows against the licence numbers the guard would
     * admit). They address no single record, so there is nothing for the interceptor to scope.
     */
    private static final Set<String> SCOPED_BY_SEARCH_OVERRIDE = Set.of(
        "GET /clients/search",
        "GET /scalers/search",
        "GET /scale-sites/search",
        // Both override the client criterion with the caller's own, exactly as /scalers/search and
        // /scale-sites/search do — the searches behind the two external roles' risk-assessment read
        "GET /scaler-risk-assessments/search",
        "GET /scale-site-risk-assessments/search");

    /**
     * Endpoints an external caller may reach that hold no client-owned data, so client scoping does not
     * apply. Reference-data lookups and the welcome page — plus the MSD family, which is scoped by
     * nothing on purpose: matrix §F grants {@code SCS_INDUSTRY_SCALER} plain {@code R} on "Query – Mark
     * Site Designations" and "Mark Site Designation", not {@code R (ltd)}, unlike every other row that
     * role holds. That is a business decision worth re-confirming rather than a hole to plug here; if it
     * is ever revised to {@code R (ltd)}, move these four rows to {@link #GUARDED_IN_SERVICE} and guard
     * them.
     */
    private static final Set<String> NOT_CLIENT_SCOPED = Set.of(
        "GET /welcome",
        "GET /static-lov",
        "GET /appointment-type-lov",
        "GET /grading-code-appointment-type-lov",
        "GET /region-district-lov",
        "GET /region-district-rollup-lov",
        "GET /scale-method-type-lov",
        "GET /scaler-training-type-lov",
        "GET /species-product-grade-xref-lov",
        "GET /templates/{filterField}",
        "GET /mark-site-designations",
        "GET /mark-site-designations/search",
        "GET /mark-site-designations/{authorizationId}",
        "GET /haul-mark-authorizations/search");

    /**
     * The test the two shipped cross-client reads should have failed. <b>Every endpoint a
     * client-restricted role can actually reach must be client-scoped</b> — by the interceptor (its path
     * carries a known id variable), by its own service, by a search override, or by being declared to
     * hold no client data.
     *
     * <p>This replaced a regex over {@code root.yaml} anchored to {@code /scalers/} and
     * {@code /scale-sites/}. That pattern could not see a sibling prefix, so the endpoints most in need
     * of checking were invisible to it: {@code /scale-site-authorizations/{scaleSiteAuthorizationId}} and
     * {@code /scaler-authorizations/{scalerAuthorizationId}} both had to be hand-guarded, and neither
     * ever entered the loop. Widening the alternation would only have moved the boundary; deriving the
     * surface from {@code @RequiresPermission} × {@link RolePermissions} removes it, and covers
     * {@code /check-scales/}, {@code /summary-check-scales/}, {@code /mark-site-designations/} and
     * anything added later under any prefix at all.
     *
     * <p>It also stays true as roles are enabled: the reachable set is computed from
     * {@link Roles#CLIENT_SCOPED_ROLES}, so filling in the next role's permission column fails this test
     * for every newly-reachable endpoint that is not yet scoped — which is exactly when that needs
     * deciding, rather than after the fact. An endpoint no client-restricted role can reach is asserted
     * against deliberately: it is not a hole, and pretending otherwise is what produced the false
     * assurance in the first place.
     */
    @Test
    @DisplayName("every endpoint a client-restricted role can reach is client-scoped")
    void everyExternallyReachableEndpointIsScoped() throws Exception {
      Set<String> externalPermissions = Roles.CLIENT_SCOPED_ROLES.stream()
          .flatMap(role -> RolePermissions.forRole(role).stream())
          .collect(Collectors.toSet());

      Map<String, String> reachable = new TreeMap<>();
      permissionsByEndpoint().forEach((endpoint, permission) -> {
        if (externalPermissions.contains(permission)) {
          reachable.put(endpoint, permission);
        }
      });

      Set<String> unscoped = reachable.entrySet().stream()
          .filter(entry -> !isScoped(entry.getKey()))
          .map(entry -> entry.getKey() + " (requires " + entry.getValue() + ")")
          .collect(Collectors.toCollection(TreeSet::new));

      assertTrue(reachable.size() > 15,
          () -> "Expected to find the endpoints reachable by SCS_INDUSTRY_SCALER / SCS_OWNER; found "
              + reachable.size() + ". A near-empty set makes the assertion below vacuous — check the "
              + "controller scan and RolePermissions.");
      assertTrue(unscoped.isEmpty(),
          () -> "These endpoints are reachable by a client-restricted role but nothing scopes them to "
              + "the caller's forest client, so an external user can read another client's records by "
              + "id. Either put the record id in the path as scalerLicenceNo/scaleSiteIdNmbr (the "
              + "interceptor then covers it), or call ClientScopeGuard in the service and list the "
              + "endpoint in GUARDED_IN_SERVICE:\n  " + String.join("\n  ", unscoped));
    }

    /** Whether {@code METHOD /path} is scoped by any of the four mechanisms above. */
    private boolean isScoped(String endpoint) {
      boolean coveredByInterceptor = ClientScopeInterceptor.SCOPED_PATH_VARIABLES.stream()
          .anyMatch(variable -> endpoint.contains("{" + variable + "}"));
      return coveredByInterceptor
          || GUARDED_IN_SERVICE.contains(endpoint)
          || SCOPED_BY_SEARCH_OVERRIDE.contains(endpoint)
          || NOT_CLIENT_SCOPED.contains(endpoint);
    }

    /**
     * Pins the service-guarded exceptions so the list cannot grow unnoticed. A new entry should be a
     * deliberate, reviewed decision — this fails the build until the expectation here is updated too.
     */
    @Test
    @DisplayName("the service-guarded exception list is exactly the nine known endpoints")
    void serviceGuardedExceptionsArePinned() {
      assertEquals(
          Set.of(
              "GET /scale-sites/inspection/search",
              "GET /scale-sites/inspection/{inspectionId}",
              "GET /scale-sites/inspection/{inspectionId}/edit",
              "PUT /scale-sites/inspection/{inspectionId}",
              "DELETE /scale-sites/inspection/{inspectionId}",
              "GET /scale-site-authorizations/{scaleSiteAuthorizationId}",
              "GET /scaler-authorizations/{scalerAuthorizationId}",
              "GET /scaler-risk-assessments/{riskQuestionnaireId}",
              "GET /scale-site-risk-assessments/{riskQuestionnaireId}"),
          GUARDED_IN_SERVICE);
    }

    /** The live map read off the annotations: {@code METHOD /path} → the permission it requires. */
    private static Map<String, String> permissionsByEndpoint() throws ClassNotFoundException {
      Map<String, String> map = new TreeMap<>();
      ClassPathScanningCandidateComponentProvider scanner =
          new ClassPathScanningCandidateComponentProvider(false);
      scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

      for (var candidate : scanner.findCandidateComponents(CONTROLLER_PACKAGE)) {
        Class<?> controller = Class.forName(candidate.getBeanClassName());
        for (Method handler : controller.getDeclaredMethods()) {
          if (!Modifier.isPublic(handler.getModifiers()) || handler.isSynthetic()) {
            continue;
          }
          RequestMapping mapping = mappingOf(handler);
          RequiresPermission required = handler.getAnnotation(RequiresPermission.class);
          if (mapping == null || required == null) {
            continue;
          }
          for (RequestMethod httpMethod : mapping.method()) {
            for (String path : mapping.value()) {
              map.put(httpMethod + " " + path, required.value());
            }
          }
        }
      }
      return map;
    }

    /**
     * The mapping declared for a handler. SCS controllers implement generated {@code *Api} interfaces
     * that carry the {@code @RequestMapping}, so the implementing method usually has none of its own and
     * the declaring interface has to be searched.
     */
    private static RequestMapping mappingOf(Method method) {
      RequestMapping mapping =
          AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
      if (mapping != null) {
        return mapping;
      }
      for (Class<?> apiInterface : method.getDeclaringClass().getInterfaces()) {
        try {
          Method declared = apiInterface.getMethod(method.getName(), method.getParameterTypes());
          RequestMapping declaredMapping =
              AnnotatedElementUtils.findMergedAnnotation(declared, RequestMapping.class);
          if (declaredMapping != null) {
            return declaredMapping;
          }
        } catch (NoSuchMethodException notOnThisInterface) {
          // A controller may implement several interfaces; only one declares the handler.
        }
      }
      return null;
    }

    @Test
    @DisplayName("the known-variable set is exactly the two documented names")
    void knownVariablesAreTheDocumentedTwo() {
      assertEquals(Set.of("scalerLicenceNo", "scaleSiteIdNmbr"),
          ClientScopeInterceptor.SCOPED_PATH_VARIABLES);
    }
  }
}
