package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.exception.JwtSigningKeyException;
import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("JWTService tests")
class JWTServiceTest {

  private static final String ISSUER = "https://test.loginproxy.gov.bc.ca/auth/realms/standard";
  private static final String CLIENT_ID = "scs-test-1234";

  private final JWTService service = new JWTService();

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void extractUserId_returnsIdpUsernameClaim() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of(
            "idir_username", "JSMITH",
            "preferred_username", "f5e59074276c40558ff6a17cf1ab3ec2@azureidir",
            "email", "person@example.com"));

    assertEquals("JSMITH", jwtService.extractUserId(token));
  }

  @Test
  void extractUserId_returnsNullWhenIdpUsernameAbsentEvenIfOtherIdentityClaimsPresent()
      throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    // No idir_username / bceid_username claim: we must not fall back to subject/email/etc.
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("preferred_username", "preferred", "email", "person@example.com"));

    assertNull(jwtService.extractUserId(token));
  }

  @Test
  void extractAuthorities_mapsSysAdminRoleCaseInsensitively() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("client_roles", List.of("scs_sys_admin")));

    List<GrantedAuthority> authorities = jwtService.extractAuthorities(token);

    assertEquals(1, authorities.size());
    assertTrue(authorities.stream().anyMatch(a -> Roles.SCS_SYS_ADMIN.equals(a.getAuthority())));
  }

  @Test
  void extractAuthorities_mapsAllDefinedRolesCaseInsensitively() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    // Mixed casing on purpose: matching is case-insensitive and normalizes to the canonical name.
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("client_roles", List.of("scs_clerical", "SCS_OWNER", "SomeOtherGroup")));

    List<String> authorities = jwtService.extractAuthorities(token).stream()
        .map(GrantedAuthority::getAuthority)
        .toList();

    assertEquals(2, authorities.size());
    assertTrue(authorities.contains(Roles.SCS_CLERICAL));
    assertTrue(authorities.contains(Roles.SCS_OWNER));
  }

  @Test
  void extractAuthorities_grantsExternalRoleFromClientScopedGroup() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    // FAM delivers the external role client-scoped as SCS_OWNER_<clientNumber>; grant the base role.
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("client_roles", List.of("SCS_OWNER_00001074")));

    List<String> authorities = jwtService.extractAuthorities(token).stream()
        .map(GrantedAuthority::getAuthority)
        .toList();

    assertEquals(List.of(Roles.SCS_OWNER), authorities);
    // The client number is data scope, not an authority.
    assertEquals(Set.of("00001074"), jwtService.extractForestClientNumbers(token));
  }

  @Test
  void extractAuthorities_ignoresUnrecognisedGroups() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("client_roles", List.of("SCS_EDITOR", "SCS_VIEWER", "SomeOtherGroup")));

    assertTrue(jwtService.extractAuthorities(token).isEmpty());
  }

  @Test
  void extractAuthorities_doesNotMatchSuffixedAdminGroup() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    // Roles are matched exactly; a suffixed variant must not be treated as the role.
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("client_roles", List.of("SCS_SYS_ADMIN_1")));

    assertTrue(jwtService.extractAuthorities(token).isEmpty());
  }

  @Test
  void extractUserId_returnsIdpUsernameAndIgnoresGuidAndOtherClaims() {
    // For the AUDIT user id, the IdP username wins: idir_user_guid (the IDIR euser GUID) and `sub`
    // (a realm-internal id) are both ignored here — the GUID identity is resolved by extractUserGuid.
    Claims claims = Jwts.claims()
        .add("idir_username", "JSMITH")
        .add("idir_user_guid", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("preferred_username", "f5e59074276c40558ff6a17cf1ab3ec2@azureidir")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertEquals("JSMITH", service.extractUserId(claims));
  }

  @Test
  void extractUserId_returnsNullWhenIdpUsernameBlankAndDoesNotFallBack() {
    // A blank IdP username must not fall back to other identity claims or the GUID.
    Claims claims = Jwts.claims()
        .add("idir_username", "   ")
        .add("preferred_username", "f5e59074276c40558ff6a17cf1ab3ec2@azureidir")
        .add("idir_user_guid", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertNull(service.extractUserId(claims));
  }

  @Test
  void extractUserId_returnsNullWhenIdpUsernameClaimAbsent() {
    Claims claims = Jwts.claims()
        .add("idir_user_guid", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("email", "person@example.com")
        .build();

    assertNull(service.extractUserId(claims));
  }

  @Test
  void extractUserGuid_returnsIdpUserIdGuidNotSubject() {
    // The GUID identity is idir_user_guid (the IDIR euser GUID), never the token `sub`.
    Claims claims = Jwts.claims()
        .add("idir_user_guid", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("idir_username", "JSMITH")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertEquals("F5E59074276C40558FF6A17CF1AB3EC2", service.extractUserGuid(claims));
  }

  @Test
  void extractUserGuid_returnsNullWhenIdpUserIdClaimAbsent() {
    Claims claims = Jwts.claims()
        .add("idir_username", "JSMITH")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertNull(service.extractUserGuid(claims));
  }

  // ─── extractForestClientNumbers — FAM forest-client-scoped groups ──────

  @Test
  void extractForestClientNumbers_returnsSingleClientPadded() {
    Claims claims = Jwts.claims().add("client_roles", List.of("SCS_INDUSTRY_SCALER_1074")).build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_returnsAllClientsForMultiClientUser() {
    Claims claims = Jwts.claims()
        .add("client_roles", List.of("SCS_INDUSTRY_SCALER_1074", "SCS_INDUSTRY_SCALER_5821"))
        .build();

    assertEquals(Set.of("00001074", "00005821"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_recognisesOwnerRole() {
    Claims claims = Jwts.claims().add("client_roles", List.of("SCS_OWNER_55")).build();

    assertEquals(Set.of("00000055"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_leavesAlreadyPaddedClientNumberUnchanged() {
    Claims claims =
        Jwts.claims().add("client_roles", List.of("SCS_INDUSTRY_SCALER_00001074")).build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_matchesRoleCaseInsensitively() {
    Claims claims = Jwts.claims().add("client_roles", List.of("scs_industry_scaler_1074")).build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_ignoresSysAdminAndUnrelatedGroups() {
    // A SYS_ADMIN / internal user carries no forest-client-scoped groups → empty (unrestricted).
    Claims claims = Jwts.claims()
        .add("client_roles", List.of("SCS_SYS_ADMIN", "SomeOtherGroup"))
        .build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_keepsOnlyTheClientScopedGroupFromAMixedSet() {
    Claims claims = Jwts.claims()
        .add("client_roles", List.of("SCS_SYS_ADMIN", "SCS_INDUSTRY_SCALER_1074"))
        .build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_ignoresRoleWithoutClientSuffix() {
    // A bare role (no _<clientNumber> suffix) must be ignored rather than mis-parsed.
    Claims claims = Jwts.claims().add("client_roles", List.of("SCS_INDUSTRY_SCALER")).build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_ignoresEntryWithEmptyClientNumber() {
    Claims claims = Jwts.claims().add("client_roles", List.of("SCS_INDUSTRY_SCALER_")).build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_doesNotMatchLongerRoleSharingPrefix() {
    // A longer role that shares the prefix has a non-numeric suffix, so it must not be mis-parsed.
    Claims claims =
        Jwts.claims().add("client_roles", List.of("SCS_INDUSTRY_SCALER_MANAGER_1074")).build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_returnsEmptyWhenGroupsClaimAbsent() {
    Claims claims = Jwts.claims().add("idir_username", "JSMITH").build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_parsesFromSignedToken() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("client_roles", List.of("SCS_OWNER_1074")));

    assertEquals(Set.of("00001074"), jwtService.extractForestClientNumbers(token));
  }

  @Test
  void validateToken_returnsTrueForMatchingUserAndUnexpiredToken() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of());

    UserDetails details = User.withUsername("subject-user").password("x").authorities(List.of()).build();
    assertTrue(jwtService.validateToken(token, details));
  }

  @Test
  void validateToken_throwsForExpiredToken() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().minusSeconds(30),
        Map.of());

    UserDetails details = User.withUsername("subject-user").password("x").authorities(List.of()).build();
    assertThrows(ExpiredJwtException.class, () -> jwtService.validateToken(token, details));
  }

  @Test
  void getAuthenticatedUsername_returnsExpectedValueForAuthenticationStates() {
    JWTService jwtService = new JWTService();

    assertNull(jwtService.getAuthenticatedUsername());

    SecurityContextHolder.getContext().setAuthentication(
        new AnonymousAuthenticationToken(
            "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANON"))));
    assertNull(jwtService.getAuthenticatedUsername());

    TestingAuthenticationToken auth = new TestingAuthenticationToken("principal", "creds");
    auth.setAuthenticated(true);
    auth.setDetails("idir-user");
    SecurityContextHolder.getContext().setAuthentication(auth);
    assertEquals("idir-user", jwtService.getAuthenticatedUsername());
  }

  @Test
  void extractSubject_throwsWhenProviderNotInitialized() {
    JWTService jwtService = new JWTService();

    assertThrows(JwtSigningKeyException.class, () -> jwtService.extractSubject("token"));
  }

  @Test
  void parsing_acceptsTokenWithExpectedIssuerAndAuthorizedParty() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "issuerUri", ISSUER);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        ISSUER,
        CLIENT_ID,
        Map.of("idir_username", "JSMITH"));

    assertEquals("JSMITH", jwtService.extractUserId(token));
  }

  @Test
  void parsing_rejectsTokenFromDifferentIssuer() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "issuerUri", ISSUER);

    // Correctly signed, but minted by a different realm (issuer).
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        "https://test.loginproxy.gov.bc.ca/auth/realms/OTHER",
        CLIENT_ID,
        Map.of("idir_username", "JSMITH"));

    assertThrows(IncorrectClaimException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void parsing_rejectsTokenIssuedToAnotherApplication() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "issuerUri", ISSUER);

    // Correctly signed by the shared realm, but issued to a different CSS integration (azp).
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        ISSUER,
        "some-other-app",
        Map.of("idir_username", "JSMITH"));

    assertThrows(JwtException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void parsing_rejectsTokenWithoutAuthorizedParty() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        null,
        null,
        Map.of("idir_username", "JSMITH"));

    assertThrows(JwtException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void parsing_rejectsEveryTokenWhenNoClientIdIsConfigured() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "clientId", "");

    String token = buildToken(fixture.privateKey(), Instant.now().plusSeconds(600), Map.of());

    assertThrows(JwtException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void init_refusesToStartWithAnIssuerButNoClientId() {
    JWTService jwtService = new JWTService();
    ReflectionTestUtils.setField(jwtService, "issuerUri", ISSUER);
    ReflectionTestUtils.setField(jwtService, "clientId", " ");

    assertThrows(IllegalStateException.class, jwtService::init);
  }

  @Test
  void expectedIssuer_stripsWhitespaceAndTrailingSlash_andDerivesTheJwksUri() {
    // A trailing space on the variable would otherwise land mid-URI in the composed JWKS URI.
    JWTService jwtService = new JWTService();
    ReflectionTestUtils.setField(jwtService, "issuerUri", " " + ISSUER + "/ ");

    assertEquals(ISSUER, jwtService.expectedIssuer());
    assertEquals(ISSUER + "/protocol/openid-connect/certs", jwtService.jwksUri());
  }

  @Test
  void expectedIssuer_isNullWhenNotConfigured() {
    assertNull(new JWTService().expectedIssuer());
  }

  // ------------------------------------------------------------------ Keycloak claim shapes

  @Test
  void extractRoleClaims_readsClientRolesAndResourceAccessForThisClientOnly() {
    JWTService jwtService = new JWTService();
    ReflectionTestUtils.setField(jwtService, "clientId", CLIENT_ID);
    Claims claims = Jwts.claims()
        .add("client_roles", List.of("SCS_CLERICAL"))
        .add("resource_access", Map.of(
            CLIENT_ID, Map.of("roles", List.of("SCS_OWNER_00001074", "SCS_CLERICAL")),
            "account", Map.of("roles", List.of("manage-account"))))
        .build();

    assertEquals(List.of("SCS_CLERICAL", "SCS_OWNER_00001074"), jwtService.extractRoleClaims(claims));
  }

  @Test
  void extractRoleClaims_dropsFamBookkeepingEntries() {
    JWTService jwtService = new JWTService();
    ReflectionTestUtils.setField(jwtService, "clientId", CLIENT_ID);
    Claims claims = Jwts.claims()
        .add("client_roles", List.of("FAM:EXPIRES:2026-09-30:SCS_CLERICAL", "SCS_CLERICAL", " "))
        .build();

    assertEquals(List.of("SCS_CLERICAL"), jwtService.extractRoleClaims(claims));
  }

  @Test
  void extractUserGuid_fallsBackToPreferredUsernameAndUpperCases() {
    Claims claims = Jwts.claims()
        .add("preferred_username", "f5e59074276c40558ff6a17cf1ab3ec2@azureidir")
        .build();

    assertEquals("F5E59074276C40558FF6A17CF1AB3EC2", service.extractUserGuid(claims));
  }

  @Test
  void extractUserGuid_usesBceidGuidForBusinessBceidUsers() {
    Claims claims = Jwts.claims()
        .add("bceid_user_guid", "ab12cd34ef56ab12cd34ef56ab12cd34")
        .add("bceid_username", "acme-user")
        .build();

    assertEquals("AB12CD34EF56AB12CD34EF56AB12CD34", service.extractUserGuid(claims));
    assertEquals("acme-user", service.extractUserId(claims));
  }

  @Test
  void extractUserId_doesNotFallBackToTheGuid() {
    // Unlike nr-cbr: the audit user id is a username or nothing — a GUID there would stop matching
    // rows written by the legacy application.
    Claims claims = Jwts.claims()
        .add("idir_user_guid", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("preferred_username", "f5e59074276c40558ff6a17cf1ab3ec2@azureidir")
        .build();

    assertNull(service.extractUserId(claims));
  }

  // ------------------------------------------------------------------ resolveUsername
  // Moved here from ReportService.resolveUsername: the authenticated user, else the Bearer token's IdP username
  // claim, else its subject, else null.

  @Test
  void resolveUsername_prefersTheAuthenticatedUserAndNeverParsesTheToken() {
    JWTService jwtService = new JWTService();
    TestingAuthenticationToken auth = new TestingAuthenticationToken("principal", "creds");
    auth.setAuthenticated(true);
    auth.setDetails("idir-user");
    SecurityContextHolder.getContext().setAuthentication(auth);

    // An unparseable token: had it been parsed this would throw, so the session user must win outright.
    assertEquals("idir-user", jwtService.resolveUsername("Bearer not-a-jwt"));
  }

  @Test
  void resolveUsername_fallsBackToTheTokensIdpUsername() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    String token = buildToken(fixture.privateKey(), Instant.now().plusSeconds(600),
        Map.of("idir_username", "JSMITH"));

    assertEquals("JSMITH", jwtService.resolveUsername("Bearer " + token));
  }

  @Test
  void resolveUsername_fallsBackToTheTokensSubjectWhenItHasNoIdpUsername() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    String token = buildToken(fixture.privateKey(), Instant.now().plusSeconds(600), Map.of());

    assertEquals("subject-user", jwtService.resolveUsername("Bearer " + token));
  }

  private TokenFixture configureServiceWithRsaProvider(JWTService service) throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    KeyPair keyPair = generator.generateKeyPair();

    JwkProvider provider = mock(JwkProvider.class);
    Jwk jwk = mock(Jwk.class);
    when(jwk.getPublicKey()).thenReturn(keyPair.getPublic());
    when(provider.get("kid-1")).thenReturn(jwk);

    ReflectionTestUtils.setField(service, "provider", provider);
    ReflectionTestUtils.setField(service, "clientId", CLIENT_ID);
    return new TokenFixture(keyPair.getPrivate(), keyPair.getPublic());
  }

  private String buildToken(
      PrivateKey privateKey,
      Instant expiry,
      Map<String, Object> claims) {
    return buildToken(privateKey, expiry, null, CLIENT_ID, claims);
  }

  private String buildToken(
      PrivateKey privateKey,
      Instant expiry,
      String issuer,
      String authorizedParty,
      Map<String, Object> claims) {
    io.jsonwebtoken.JwtBuilder builder = Jwts.builder()
        .header().add("kid", "kid-1").and()
        .subject("subject-user")
        .expiration(Date.from(expiry));

    if (issuer != null) {
      builder.issuer(issuer);
    }
    if (authorizedParty != null) {
      builder.claim("azp", authorizedParty);
    }
    claims.forEach(builder::claim);

    return builder.signWith(privateKey, Jwts.SIG.RS256).compact();
  }

  private record TokenFixture(PrivateKey privateKey, PublicKey publicKey) {}
}

