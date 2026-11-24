package ca.bc.gov.nrs.scs.backend.filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.security.RolePermissions;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@DisplayName("MockRequestFilter tests")
class MockRequestFilterTest {

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void injectsSysAdminAuthorityWhenNoAuthenticationPresent() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_CLERICAL", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertEquals("MOCK_GUID", auth.getPrincipal());
    assertEquals("MOCK_CLERICAL", auth.getDetails());
    List<String> authorities = auth.getAuthorities().stream().map(a -> a.getAuthority()).toList();
    assertTrue(authorities.contains(Roles.SCS_SYS_ADMIN));
    // The mock goes through the same RolePermissions expansion as the real JWT path, so the default
    // full-access mock carries every permission rather than a bare role.
    assertTrue(authorities.containsAll(Permissions.ALL_PERMISSIONS));
    verify(chain).doFilter(request, response);
  }

  @Test
  void injectsClientRestrictedScopeFromMockClientHeader() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_SCALER", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Client")).thenReturn("00001074");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    ScsAuthenticationToken scsAuth = assertInstanceOf(ScsAuthenticationToken.class, auth);
    assertTrue(scsAuth.scope().isClientRestricted());
    assertEquals(Set.of("00001074"), scsAuth.scope().clientNumbers());
    // No roles header → default SCS_SYS_ADMIN, so the dev mock still passes the /api gate.
    assertTrue(auth.getAuthorities().stream()
        .anyMatch(a -> Roles.SCS_SYS_ADMIN.equals(a.getAuthority())));
    verify(chain).doFilter(request, response);
  }

  @Test
  void combinesRolesAndClientFromHeaders() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_SCALER", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Roles")).thenReturn("SCS_INDUSTRY_SCALER");
    when(request.getHeader("X-Mock-Client")).thenReturn("00001074");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    ScsAuthenticationToken scsAuth = assertInstanceOf(ScsAuthenticationToken.class, auth);
    assertEquals(Set.of("00001074"), scsAuth.scope().clientNumbers());
    List<String> authorities = auth.getAuthorities().stream().map(a -> a.getAuthority()).toList();
    assertEquals(Roles.SCS_INDUSTRY_SCALER, authorities.get(0), "the role comes first");
    // Expanded to exactly the Industry Scaler column of the permission matrix — read-only, and
    // notably without the scale-site *search* permission or any write permission.
    assertTrue(authorities.contains(Permissions.SCALER_READ));
    assertTrue(authorities.contains(Permissions.SCALE_SITE_READ));
    assertFalse(authorities.contains(Permissions.SCALE_SITE_QUERY));
    assertFalse(authorities.contains(Permissions.SCALER_UPDATE));
    assertFalse(authorities.contains(Permissions.REPORT_READ));
    verify(chain).doFilter(request, response);
  }

  @Test
  void ignoresNonNumericMockClientHeader() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_SCALER", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Client")).thenReturn("%");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    ScsAuthenticationToken scsAuth = assertInstanceOf(ScsAuthenticationToken.class, auth);
    // Non-numeric client is rejected (mirrors the JWT path) → internal, unrestricted.
    assertFalse(scsAuth.scope().isClientRestricted());
    verify(chain).doFilter(request, response);
  }

  /**
   * Both header roles are read exactly as given, but {@code SCS_OWNER} is client-scoped and no client
   * is selected — so {@code RolePermissions.expandAuthorities} withholds it entirely, role authority
   * included, and only the internal role survives. Selecting a client brings it back; see
   * {@link #mockClientRestoresAClientScopedRole()}.
   */
  @Test
  void usesExactRolesFromMockRolesHeader() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_CLERICAL", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Roles")).thenReturn("SCS_CLERICAL, SCS_OWNER");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    List<String> authorities = auth.getAuthorities().stream()
        .map(a -> a.getAuthority())
        .toList();
    // The internal role arrives with its whole column. Read from the matrix rather than restated, so
    // enabling a role never rewrites this assertion — it did once, when SCS_CLERICAL was welcome-only
    // and the expected list was spelled out here.
    Set<String> expected = new LinkedHashSet<>();
    expected.add(Roles.SCS_CLERICAL);
    expected.addAll(RolePermissions.forRole(Roles.SCS_CLERICAL));
    assertEquals(expected, new LinkedHashSet<>(authorities));
    assertTrue(authorities.contains(Permissions.WELCOME_READ));
    assertFalse(authorities.contains("SCS_OWNER"),
        "a client-scoped role with no client selected is withheld outright, not carried as an "
            + "authority that would clear the coarse /api gate");
    verify(chain).doFilter(request, response);
  }

  /** The other half of the rule: with a client selected the same role brings its whole column. */
  @Test
  void mockClientRestoresAClientScopedRole() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_CLERICAL", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Roles")).thenReturn("SCS_OWNER");
    when(request.getHeader("X-Mock-Client")).thenReturn("00001074");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    List<String> authorities = auth.getAuthorities().stream()
        .map(a -> a.getAuthority())
        .toList();
    assertTrue(authorities.contains("SCS_OWNER"));
    assertTrue(authorities.contains(Permissions.SCALE_SITE_SUMMARY_READ));
    verify(chain).doFilter(request, response);
  }

  @Test
  void grantsNoAuthoritiesWhenMockRolesHeaderIsBlank() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_CLERICAL", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Roles")).thenReturn("");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertTrue(auth.getAuthorities().isEmpty());
    verify(chain).doFilter(request, response);
  }

  @Test
  void grantsNoAuthoritiesWhenMockRolesHeaderIsNoneSentinel() throws Exception {
    MockRequestFilter filter = new MockRequestFilter("MOCK_CLERICAL", "MOCK_GUID");
    FilterChain chain = mock(FilterChain.class);
    HttpServletRequest request = mock(HttpServletRequest.class);
    HttpServletResponse response = mock(HttpServletResponse.class);
    when(request.getHeader("X-Mock-Roles")).thenReturn("none");

    filter.doFilterInternal(request, response, chain);

    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    assertNotNull(auth);
    assertTrue(auth.getAuthorities().isEmpty());
    verify(chain).doFilter(request, response);
  }

  @Test
  void doesNotOverwriteExistingAuthentication() throws Exception {
    UsernamePasswordAuthenticationToken existing =
        new UsernamePasswordAuthenticationToken("real-user", null, List.of());
    SecurityContextHolder.getContext().setAuthentication(existing);

    MockRequestFilter filter = new MockRequestFilter("MOCK_CLERICAL", null);
    FilterChain chain = mock(FilterChain.class);

    filter.doFilterInternal(mock(HttpServletRequest.class), mock(HttpServletResponse.class), chain);

    assertEquals("real-user", SecurityContextHolder.getContext().getAuthentication().getPrincipal());
    verify(chain).doFilter(any(), any());
  }
}
