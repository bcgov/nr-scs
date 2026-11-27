package ca.bc.gov.nrs.scs.backend.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class SecurityContextUtilsTest {

  // A representative IdP user GUID and the IdP username it maps to.
  private static final String GUID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";
  private static final String IDP_USERNAME = "JSMITH";

  @BeforeEach
  void setUp() {
    SecurityContextHolder.clearContext();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  private static void setAuthentication(String principalName, Object details) {
    var auth = new UsernamePasswordAuthenticationToken(
        principalName, null, List.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")));
    auth.setDetails(details);
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  @Test
  void currentUserIdOrSystem_returnsIdpUsernameFromDetailsRatherThanGuidPrincipal() {
    // The JWT filter puts the GUID in the principal and the idp_username in details.
    setAuthentication(GUID, IDP_USERNAME);

    assertEquals(IDP_USERNAME, SecurityContextUtils.currentUserIdOrSystem());
  }

  @Test
  void currentUserIdOrSystem_throwsWhenAuthenticatedButDetailsAbsent() {
    // An authenticated request must carry the idp_username; we never fall back to the
    // principal name (the GUID), so a missing idp_username is a hard failure.
    setAuthentication(GUID, null);

    assertThrows(IllegalStateException.class, SecurityContextUtils::currentUserIdOrSystem);
  }

  @Test
  void currentUserIdOrSystem_throwsWhenAuthenticatedButDetailsBlank() {
    setAuthentication(GUID, "   ");

    assertThrows(IllegalStateException.class, SecurityContextUtils::currentUserIdOrSystem);
  }

  @Test
  void currentUserIdOrSystem_returnsSystemWhenNoAuthentication() {
    SecurityContextHolder.clearContext();

    assertEquals("SYSTEM", SecurityContextUtils.currentUserIdOrSystem());
  }

  @Test
  void currentUserGuidOrNull_returnsGuidFromPrincipalName() {
    setAuthentication(GUID, IDP_USERNAME);

    assertEquals(GUID, SecurityContextUtils.currentUserGuidOrNull());
  }

  // ─── client-restriction scope ───────────────────────────────────────

  private static void setClientScopedAuthentication(Set<String> clientNumbers) {
    var auth = new ScsAuthenticationToken(
        GUID,
        List.of(new SimpleGrantedAuthority("SCS_INDUSTRY_SCALER")),
        UserAccessScope.ofClients(clientNumbers));
    auth.setDetails(IDP_USERNAME);
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  @Test
  void currentUserClientNumbers_returnsScopeForClientRestrictedUser() {
    setClientScopedAuthentication(Set.of("00001074", "00005821"));

    assertEquals(Set.of("00001074", "00005821"), SecurityContextUtils.currentUserClientNumbers());
    assertTrue(SecurityContextUtils.isClientRestricted());
  }

  @Test
  void currentUserClientNumbers_emptyAndUnrestrictedForInternalScsToken() {
    var auth = new ScsAuthenticationToken(
        GUID, List.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")), UserAccessScope.internal());
    auth.setDetails(IDP_USERNAME);
    SecurityContextHolder.getContext().setAuthentication(auth);

    assertTrue(SecurityContextUtils.currentUserClientNumbers().isEmpty());
    assertFalse(SecurityContextUtils.isClientRestricted());
  }

  @Test
  void currentUserClientNumbers_emptyAndUnrestrictedForNonScsAuthentication() {
    // An internal user authenticated via the stock token is never client-restricted.
    setAuthentication(GUID, IDP_USERNAME);

    assertTrue(SecurityContextUtils.currentUserClientNumbers().isEmpty());
    assertFalse(SecurityContextUtils.isClientRestricted());
  }

  @Test
  void currentUserClientNumbers_emptyAndUnrestrictedWhenNoAuthentication() {
    SecurityContextHolder.clearContext();

    assertTrue(SecurityContextUtils.currentUserClientNumbers().isEmpty());
    assertFalse(SecurityContextUtils.isClientRestricted());
  }

  @Test
  void currentUserClientNumber_returnsTheSingleClientForSingleClientUser() {
    setClientScopedAuthentication(Set.of("00001074"));

    assertEquals("00001074", SecurityContextUtils.currentUserClientNumber());
  }

  @Test
  void currentUserClientNumber_refusesMultiClientUserWithForbidden() {
    // SCS supports one client per login; a multi-client token is refused (403) until the
    // selected-org picker is built (deferred).
    setClientScopedAuthentication(Set.of("00001074", "00005821"));

    assertThrows(ForbiddenException.class, SecurityContextUtils::currentUserClientNumber);
  }

  @Test
  void currentUserClientNumber_throwsIllegalStateForUserWithNoClientScope() {
    // Called without the isClientRestricted() guard on an internal user (no client scope) — a
    // programming error, distinct from the multi-client business refusal.
    setAuthentication(GUID, IDP_USERNAME);

    assertThrows(IllegalStateException.class, SecurityContextUtils::currentUserClientNumber);
  }

  @Test
  void assertClientAccess_allowsWhenRecordClientMatches() {
    setClientScopedAuthentication(Set.of("00001074"));

    assertDoesNotThrow(() -> SecurityContextUtils.assertClientAccess("00001074"));
  }

  @Test
  void assertClientAccess_refusesWhenRecordClientDiffers() {
    setClientScopedAuthentication(Set.of("00001074"));

    assertThrows(ForbiddenException.class, () -> SecurityContextUtils.assertClientAccess("00009999"));
  }

  @Test
  void assertClientAccess_refusesNullRecordClientForRestrictedUser() {
    // Fail-closed: a record with no client number is denied to a client-restricted user.
    setClientScopedAuthentication(Set.of("00001074"));

    assertThrows(ForbiddenException.class, () -> SecurityContextUtils.assertClientAccess(null));
  }

  @Test
  void assertClientAccess_noOpForInternalUser() {
    // Internal user (stock token, not client-restricted): any record's client is accessible.
    setAuthentication(GUID, IDP_USERNAME);

    assertDoesNotThrow(() -> SecurityContextUtils.assertClientAccess("00009999"));
  }

  /**
   * {@code hasRole} reads the role authority the filters add alongside the permissions it expands to,
   * so it matches the canonical {@code Roles} name exactly. {@code ClientScopeGuard} keys each external
   * role's data scope on it.
   */
  @Test
  void hasRole_matchesTheRoleAuthorityTheFiltersAdd() {
    setClientScopedAuthentication(Set.of("00001074"));

    assertTrue(SecurityContextUtils.hasRole("SCS_INDUSTRY_SCALER"));
    assertFalse(SecurityContextUtils.hasRole("SCS_OWNER"));
  }

  @Test
  void hasRole_isFalseForNullRoleAndUnauthenticatedRequest() {
    assertFalse(SecurityContextUtils.hasRole("SCS_OWNER"));

    setClientScopedAuthentication(Set.of("00001074"));
    assertFalse(SecurityContextUtils.hasRole(null));
  }
}
