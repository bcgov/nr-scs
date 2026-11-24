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
import io.jsonwebtoken.MissingClaimException;
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
            "custom:idp_username", "JSMITH",
            "preferred_username", "preferred",
            "idir_username", "idir-user",
            "email", "person@example.com"));

    assertEquals("JSMITH", jwtService.extractUserId(token));
  }

  @Test
  void extractUserId_returnsNullWhenIdpUsernameAbsentEvenIfOtherIdentityClaimsPresent()
      throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    // No custom:idp_username claim: we must not fall back to subject/email/etc.
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
        Map.of("cognito:groups", List.of("scs_sys_admin")));

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
        Map.of("cognito:groups", List.of("scs_clerical", "SCS_OWNER", "SomeOtherGroup")));

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
        Map.of("cognito:groups", List.of("SCS_OWNER_00001074")));

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
        Map.of("cognito:groups", List.of("SCS_EDITOR", "SCS_VIEWER", "SomeOtherGroup")));

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
        Map.of("cognito:groups", List.of("SCS_SYS_ADMIN_1")));

    assertTrue(jwtService.extractAuthorities(token).isEmpty());
  }

  @Test
  void extractUserId_returnsIdpUsernameAndIgnoresGuidAndOtherClaims() {
    // For the AUDIT user id, idp_username wins: custom:idp_user_id (the IDIR euser GUID) and `sub`
    // (the Cognito GUID) are both ignored here — the GUID identity is resolved by extractUserGuid.
    Claims claims = Jwts.claims()
        .add("custom:idp_username", "JSMITH")
        .add("custom:idp_user_id", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("idir_username", "idir-user")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertEquals("JSMITH", service.extractUserId(claims));
  }

  @Test
  void extractUserId_returnsNullWhenIdpUsernameBlankAndDoesNotFallBack() {
    // Blank idp_username must not fall back to other identity claims or the GUID.
    Claims claims = Jwts.claims()
        .add("custom:idp_username", "   ")
        .add("idir_username", "idir-user")
        .add("custom:idp_user_id", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertNull(service.extractUserId(claims));
  }

  @Test
  void extractUserId_returnsNullWhenIdpUsernameClaimAbsent() {
    Claims claims = Jwts.claims()
        .add("custom:idp_user_id", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("email", "person@example.com")
        .build();

    assertNull(service.extractUserId(claims));
  }

  @Test
  void extractUserGuid_returnsIdpUserIdGuidNotSubject() {
    // The GUID identity is custom:idp_user_id (the IDIR euser GUID), never the Cognito `sub`.
    Claims claims = Jwts.claims()
        .add("custom:idp_user_id", "F5E59074276C40558FF6A17CF1AB3EC2")
        .add("custom:idp_username", "JSMITH")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertEquals("F5E59074276C40558FF6A17CF1AB3EC2", service.extractUserGuid(claims));
  }

  @Test
  void extractUserGuid_returnsNullWhenIdpUserIdClaimAbsent() {
    Claims claims = Jwts.claims()
        .add("custom:idp_username", "JSMITH")
        .add("sub", "11111111-1111-1111-1111-111111111111")
        .build();

    assertNull(service.extractUserGuid(claims));
  }

  // ─── extractForestClientNumbers — FAM forest-client-scoped groups ──────

  @Test
  void extractForestClientNumbers_returnsSingleClientPadded() {
    Claims claims = Jwts.claims().add("cognito:groups", List.of("SCS_INDUSTRY_SCALER_1074")).build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_returnsAllClientsForMultiClientUser() {
    Claims claims = Jwts.claims()
        .add("cognito:groups", List.of("SCS_INDUSTRY_SCALER_1074", "SCS_INDUSTRY_SCALER_5821"))
        .build();

    assertEquals(Set.of("00001074", "00005821"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_recognisesOwnerRole() {
    Claims claims = Jwts.claims().add("cognito:groups", List.of("SCS_OWNER_55")).build();

    assertEquals(Set.of("00000055"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_leavesAlreadyPaddedClientNumberUnchanged() {
    Claims claims =
        Jwts.claims().add("cognito:groups", List.of("SCS_INDUSTRY_SCALER_00001074")).build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_matchesRoleCaseInsensitively() {
    Claims claims = Jwts.claims().add("cognito:groups", List.of("scs_industry_scaler_1074")).build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_ignoresSysAdminAndUnrelatedGroups() {
    // A SYS_ADMIN / internal user carries no forest-client-scoped groups → empty (unrestricted).
    Claims claims = Jwts.claims()
        .add("cognito:groups", List.of("SCS_SYS_ADMIN", "SomeOtherGroup"))
        .build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_keepsOnlyTheClientScopedGroupFromAMixedSet() {
    Claims claims = Jwts.claims()
        .add("cognito:groups", List.of("SCS_SYS_ADMIN", "SCS_INDUSTRY_SCALER_1074"))
        .build();

    assertEquals(Set.of("00001074"), service.extractForestClientNumbers(claims));
  }

  @Test
  void extractForestClientNumbers_ignoresRoleWithoutClientSuffix() {
    // A bare role (no _<clientNumber> suffix) must be ignored rather than mis-parsed.
    Claims claims = Jwts.claims().add("cognito:groups", List.of("SCS_INDUSTRY_SCALER")).build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_ignoresEntryWithEmptyClientNumber() {
    Claims claims = Jwts.claims().add("cognito:groups", List.of("SCS_INDUSTRY_SCALER_")).build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_doesNotMatchLongerRoleSharingPrefix() {
    // A longer role that shares the prefix has a non-numeric suffix, so it must not be mis-parsed.
    Claims claims =
        Jwts.claims().add("cognito:groups", List.of("SCS_INDUSTRY_SCALER_MANAGER_1074")).build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_returnsEmptyWhenGroupsClaimAbsent() {
    Claims claims = Jwts.claims().add("custom:idp_username", "JSMITH").build();

    assertTrue(service.extractForestClientNumbers(claims).isEmpty());
  }

  @Test
  void extractForestClientNumbers_parsesFromSignedToken() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        Map.of("cognito:groups", List.of("SCS_OWNER_1074")));

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
  void parsing_acceptsTokenWithExpectedIssuerAndAudience() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "configuredIssuer", "https://issuer.example/pool");
    ReflectionTestUtils.setField(jwtService, "audience", "client-123");

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        "https://issuer.example/pool",
        "client-123",
        Map.of("custom:idp_username", "JSMITH"));

    assertEquals("JSMITH", jwtService.extractUserId(token));
  }

  @Test
  void parsing_rejectsTokenFromDifferentIssuer() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "configuredIssuer", "https://issuer.example/pool");

    // Correctly signed, but minted by a different user pool (issuer).
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        "https://issuer.example/OTHER_POOL",
        null,
        Map.of("custom:idp_username", "JSMITH"));

    assertThrows(IncorrectClaimException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void parsing_rejectsTokenWithWrongAudience() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "configuredIssuer", "https://issuer.example/pool");
    ReflectionTestUtils.setField(jwtService, "audience", "client-123");

    // Correctly signed and same issuer, but issued for a different app client (audience).
    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        "https://issuer.example/pool",
        "some-other-client",
        Map.of("custom:idp_username", "JSMITH"));

    assertThrows(IncorrectClaimException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void parsing_rejectsTokenMissingRequiredAudience() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    ReflectionTestUtils.setField(jwtService, "audience", "client-123");

    String token = buildToken(
        fixture.privateKey(),
        Instant.now().plusSeconds(600),
        null,
        null,
        Map.of("custom:idp_username", "JSMITH"));

    assertThrows(MissingClaimException.class, () -> jwtService.extractSubject(token));
  }

  @Test
  void expectedIssuer_derivesFromJwksUriWhenNotConfiguredExplicitly() {
    JWTService jwtService = new JWTService();
    ReflectionTestUtils.setField(jwtService, "jwksUri",
        "https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_Abc123/.well-known/jwks.json");

    assertEquals(
        "https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_Abc123",
        jwtService.expectedIssuer());
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
        Map.of("custom:idp_username", "JSMITH"));

    assertEquals("JSMITH", jwtService.resolveUsername("Bearer " + token));
  }

  @Test
  void resolveUsername_fallsBackToTheTokensSubjectWhenItHasNoIdpUsername() throws Exception {
    JWTService jwtService = new JWTService();
    TokenFixture fixture = configureServiceWithRsaProvider(jwtService);
    String token = buildToken(fixture.privateKey(), Instant.now().plusSeconds(600), Map.of());

    assertEquals("subject-user", jwtService.resolveUsername("Bearer " + token));
  }

  @Test
  void resolveUsername_isNullWithNoUserAndNoBearerHeader() {
    JWTService jwtService = new JWTService();

    assertNull(jwtService.resolveUsername(null));
    assertNull(jwtService.resolveUsername("Basic dXNlcjpwYXNz"));
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
    return new TokenFixture(keyPair.getPrivate(), keyPair.getPublic());
  }

  private String buildToken(
      PrivateKey privateKey,
      Instant expiry,
      Map<String, Object> claims) {
    return buildToken(privateKey, expiry, null, null, claims);
  }

  private String buildToken(
      PrivateKey privateKey,
      Instant expiry,
      String issuer,
      String audience,
      Map<String, Object> claims) {
    io.jsonwebtoken.JwtBuilder builder = Jwts.builder()
        .header().add("kid", "kid-1").and()
        .subject("subject-user")
        .expiration(Date.from(expiry));

    if (issuer != null) {
      builder.issuer(issuer);
    }
    if (audience != null) {
      builder.audience().add(audience).and();
    }
    claims.forEach(builder::claim);

    return builder.signWith(privateKey, Jwts.SIG.RS256).compact();
  }

  private record TokenFixture(PrivateKey privateKey, PublicKey publicKey) {}
}

