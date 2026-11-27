package ca.bc.gov.nrs.scs.backend.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.exception.JwtSigningKeyException;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Header;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class JwtRequestFilterTest {

  @Mock private JWTService jwtService;
  @Mock private HttpServletRequest request;
  @Mock private HttpServletResponse response;
  @Mock private FilterChain chain;

  private JwtRequestFilter filter;

  @BeforeEach
  void setUp() {
    filter = new JwtRequestFilter(jwtService);
    SecurityContextHolder.clearContext();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  // ─── No / invalid Authorization header ──────────────────────────────────────

  @Test
  void doFilterInternal_continuesChainWhenNoAuthorizationHeader() throws Exception {
    when(request.getHeader("Authorization")).thenReturn(null);

    filter.doFilterInternal(request, response, chain);

    verify(chain).doFilter(request, response);
    verify(jwtService, never()).extractUserGuid(org.mockito.ArgumentMatchers.anyString());
    assertNull(SecurityContextHolder.getContext().getAuthentication());
  }

  // ─── Happy path – token valid, no existing authentication ───────────────────

  @Test
  void doFilterInternal_setsPrincipalToUserGuidAndDetailsToIdpUsername() throws Exception {
    // Principal must be the federated IdP user GUID (idir_user_guid — IDIR euser GUID — or bceid_user_guid),
    // NOT the token sub; details is the IdP username used for audit fields.
    when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
    when(jwtService.extractUserGuid("valid.token")).thenReturn("F5E59074276C40558FF6A17CF1AB3EC2");
    when(jwtService.extractUserId("valid.token")).thenReturn("JSMITH");
    when(jwtService.extractAuthorities("valid.token"))
        .thenReturn(List.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")));

    filter.doFilterInternal(request, response, chain);

    var auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertEquals("F5E59074276C40558FF6A17CF1AB3EC2", auth.getPrincipal());
    assertEquals("JSMITH", auth.getDetails());
    // The token's role survives, and RolePermissions expands it into the permissions it grants —
    // an administrator holds every one of them.
    var authorities = auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
    assertTrue(authorities.contains(Roles.SCS_SYS_ADMIN));
    assertTrue(authorities.containsAll(Permissions.ALL_PERMISSIONS),
        "an administrator's token should carry every permission");
    assertEquals(1 + Permissions.ALL_PERMISSIONS.size(), authorities.size(),
        "authorities should be exactly the role plus its permissions");
    verify(chain).doFilter(request, response);
    verify(response, never()).sendError(org.mockito.ArgumentMatchers.anyInt(),
        org.mockito.ArgumentMatchers.anyString());
  }

  // ─── Happy path – token valid, but context already has non-anonymous auth ───

  @Test
  void doFilterInternal_doesNotOverwriteExistingNonAnonymousAuthentication() throws Exception {
    // Pre-populate context with a real authentication
    var existing = new UsernamePasswordAuthenticationToken(
        "existing-user", null, List.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")));
    SecurityContextHolder.getContext().setAuthentication(existing);

    when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
    when(jwtService.extractUserGuid("valid.token")).thenReturn("11111111111111111111111111111111");
    when(jwtService.extractUserId("valid.token")).thenReturn("other-id");

    filter.doFilterInternal(request, response, chain);

    // Auth still belongs to the pre-existing principal
    assertEquals("existing-user", SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    verify(jwtService, never()).extractAuthorities(org.mockito.ArgumentMatchers.anyString());
    verify(chain).doFilter(request, response);
  }

  // ─── Happy path – context has anonymous auth (should be replaced) ───────────

  @Test
  void doFilterInternal_replacesAnonymousAuthenticationWithValidToken() throws Exception {
    var anon = new AnonymousAuthenticationToken(
        "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS")));
    SecurityContextHolder.getContext().setAuthentication(anon);

    when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
    when(jwtService.extractUserGuid("valid.token")).thenReturn("F5E59074276C40558FF6A17CF1AB3EC2");
    when(jwtService.extractUserId("valid.token")).thenReturn("idir-jsmith");
    when(jwtService.extractAuthorities("valid.token"))
        .thenReturn(List.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")));

    filter.doFilterInternal(request, response, chain);

    var auth = SecurityContextHolder.getContext().getAuthentication();
    assertEquals("F5E59074276C40558FF6A17CF1AB3EC2", auth.getPrincipal());
    verify(chain).doFilter(request, response);
  }

  // ─── Happy path – user GUID null (fail-open), no auth set ───────────────────

  @Test
  void doFilterInternal_continuesChainWhenExtractedUserGuidIsNull() throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Bearer valid.token");
    when(jwtService.extractUserGuid("valid.token")).thenReturn(null);
    when(jwtService.extractUserId("valid.token")).thenReturn(null);

    filter.doFilterInternal(request, response, chain);

    assertNull(SecurityContextHolder.getContext().getAuthentication());
    verify(jwtService, never()).extractAuthorities(org.mockito.ArgumentMatchers.anyString());
    verify(chain).doFilter(request, response);
  }

  // ─── JwtSigningKeyException ──────────────────────────────────────────────────

  @Test
  void doFilterInternal_returns401AndStopsChainOnJwtSigningKeyException() throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Bearer bad.key.token");
    when(jwtService.extractUserGuid("bad.key.token"))
        .thenThrow(new JwtSigningKeyException("key error", new RuntimeException()));

    filter.doFilterInternal(request, response, chain);

    verify(response).sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token signature.");
    verify(chain, never()).doFilter(request, response);
  }

  // ─── ExpiredJwtException ────────────────────────────────────────────────────

  @Test
  void doFilterInternal_returns401AndStopsChainOnExpiredJwtException() throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Bearer expired.token");
    when(jwtService.extractUserGuid("expired.token"))
        .thenThrow(new ExpiredJwtException(mock(Header.class), mock(Claims.class), "Expired"));

    filter.doFilterInternal(request, response, chain);

    verify(response).sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token has expired.");
    verify(chain, never()).doFilter(request, response);
  }

  // ─── Generic JwtException ───────────────────────────────────────────────────

  @Test
  void doFilterInternal_returns401AndStopsChainOnGenericJwtException() throws Exception {
    when(request.getHeader("Authorization")).thenReturn("Bearer malformed.token");
    when(jwtService.extractUserGuid("malformed.token"))
        .thenThrow(new JwtException("malformed"));

    filter.doFilterInternal(request, response, chain);

    verify(response).sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token.");
    verify(chain, never()).doFilter(request, response);
  }
}

