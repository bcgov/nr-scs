package ca.bc.gov.nrs.scs.backend.config;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;
import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import ca.bc.gov.nrs.scs.backend.security.RolePermissions;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;
import ca.bc.gov.nrs.scs.backend.service.SystemStatusService;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/**
 * Verifies the {@link SecurityConfig} URL authorization rules for {@code /api/**} across HTTP
 * methods — the <b>coarse</b> layer, which admits any recognized SCS role and refuses everything
 * else. The <b>fine</b> layer that decides what a recognized role may actually do lives in
 * {@code @RequiresPermission} method security; a couple of tests here cross the seam to show the two
 * composing, and {@code ControllerAuthorizationConventionTest} is what guarantees every real handler
 * carries the annotation.
 */
@DisplayName("SecurityConfig authorization tests")
@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = SecurityConfigAuthorizationTest.TestContext.class)
// Mock mode (no JWKS configured) is only permitted in a local/dev environment; declare DEV so
// SecurityConfig's fail-closed guard allows the context to start.
@TestPropertySource(properties = "scs.app.environment=DEV")
class SecurityConfigAuthorizationTest {

  @Autowired private WebApplicationContext context;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  }

  @Test
  @WithMockUser(authorities = Roles.SCS_SYS_ADMIN)
  void systemAdminCanAccessApiAcrossMethods() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
    mockMvc.perform(post(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
    mockMvc.perform(put(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
    mockMvc.perform(delete(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
  }

  /** {@code SCS_VIEWER} is not one of the eleven SCS roles, so it never clears the coarse gate. */
  @Test
  @WithMockUser(authorities = "SCS_VIEWER")
  void unrecognizedRoleIsForbiddenFromApiAcrossMethods() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
    mockMvc.perform(post(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
    mockMvc.perform(put(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
    mockMvc.perform(delete(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
  }

  /**
   * The public {@code /api/system-status} probe must remain reachable by a non-administrator (who is
   * otherwise forbidden from the API), so the SPA can read the enable/disable flag. Also confirms the
   * migrated {@link org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher}
   * permit rule matches correctly.
   */
  @Test
  @WithMockUser(authorities = "SCS_VIEWER")
  void systemStatusEndpointIsPublicForNonAdmin() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/system-status")).andExpect(status().isOk());
  }

  /**
   * The authentication an external role held <b>without</b> a forest client number actually produces —
   * built through {@code RolePermissions.expandAuthorities}, the same call both filters make, rather
   * than a hand-written empty authority. It withholds a {@linkplain Roles#CLIENT_SCOPED_ROLES
   * client-scoped} role's authority as well as its permissions, so the token carries nothing.
   */
  private static ScsAuthenticationToken ownerWithNoClient() {
    var roles = List.of(new SimpleGrantedAuthority(Roles.SCS_OWNER));
    var authorities = RolePermissions.expandAuthorities(roles, Set.of());
    return new ScsAuthenticationToken("bceid-user", authorities, UserAccessScope.ofClients(Set.of()));
  }

  /**
   * A misconfigured FAM group ({@code SCS_OWNER} rather than {@code SCS_OWNER_00001074}) is refused the
   * API at <b>this</b> gate. Until 2026-08-20 the role authority survived, so the caller cleared this
   * rule and was refused by method security instead — one 403 per handler rather than no access. The
   * assertion is on the composed behaviour: the real token, against the real rules.
   */
  @Test
  void externalRoleWithNoClientNumberIsForbiddenFromApi() throws Exception {
    var caller = authentication(ownerWithNoClient());

    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping").with(caller))
        .andExpect(status().isForbidden());
    mockMvc.perform(post(ApiConstants.API_BASE_PATH + "/ping").with(caller))
        .andExpect(status().isForbidden());
    mockMvc.perform(put(ApiConstants.API_BASE_PATH + "/ping").with(caller))
        .andExpect(status().isForbidden());
    mockMvc.perform(delete(ApiConstants.API_BASE_PATH + "/ping").with(caller))
        .andExpect(status().isForbidden());
  }

  /**
   * The block must not take the SPA down with it: this probe and the app shell stay {@code permitAll},
   * which is what lets the frontend render {@code /unauthorized} for the same user instead of failing to
   * load. {@code hasWelcomeAccess} discounts the role on that side for the same reason.
   */
  @Test
  void systemStatusStaysReachableForAnExternalRoleWithNoClientNumber() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/system-status")
            .with(authentication(ownerWithNoClient())))
        .andExpect(status().isOk());
  }

  /** The same role <i>with</i> a client number clears this gate — the block is the missing client. */
  @Test
  void externalRoleWithAClientNumberClearsTheGate() throws Exception {
    var roles = List.of(new SimpleGrantedAuthority(Roles.SCS_OWNER));
    var authorities = RolePermissions.expandAuthorities(roles, Set.of("00001074"));
    var caller = new ScsAuthenticationToken(
        "bceid-user", authorities, UserAccessScope.ofClients(Set.of("00001074")));

    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping").with(authentication(caller)))
        .andExpect(status().isOk());
  }

  /**
   * An exact-but-wrong admin-like role. The coarse gate admits only the eleven {@code SCS_} roles, so
   * {@code APT_SYS_ADMIN} never reaches a handler however administrative its name looks.
   */
  @Test
  @WithMockUser(authorities = "APT_SYS_ADMIN")
  void wrongAdminRoleIsForbiddenFromApiAcrossMethods() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
    mockMvc.perform(post(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
    mockMvc.perform(put(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
    mockMvc.perform(delete(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isForbidden());
  }

  /**
   * A recognized non-administrator role passes this coarse URL gate. That is the whole point of the
   * two-layer design: the URL rule only asks "is this a known SCS role?", and what the caller may
   * actually do is decided per handler by {@code @RequiresPermission} — see
   * {@link #recognizedRoleWithoutThePermissionIsForbidden()} for the layer that denies, and
   * {@code ControllerAuthorizationConventionTest} for the build-time guarantee that no real handler
   * ships un-annotated (this test's {@code /ping} is deliberately bare to isolate the URL layer).
   */
  @Test
  @WithMockUser(authorities = Roles.SCS_CLERICAL)
  void recognizedRolePassesTheCoarseApiGate() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/welcome")).andExpect(status().isOk());
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
  }

  /**
   * The second layer: past the URL gate, a recognized role that does not hold the handler's
   * permission is refused by method security — the same 403 the legacy
   * {@code ScsWebADERequestProcessor.processRoles} produced for a denied action.
   */
  @Test
  @WithMockUser(authorities = Roles.SCS_CLERICAL)
  void recognizedRoleWithoutThePermissionIsForbidden() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/guarded")).andExpect(status().isForbidden());
  }

  /** Holding the permission itself clears both layers. */
  @Test
  @WithMockUser(authorities = {Roles.SCS_CLERICAL, Permissions.MAINTAIN_SYSTEM_READ})
  void recognizedRoleWithThePermissionIsAllowed() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/guarded")).andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = Roles.SCS_SYS_ADMIN)
  void welcomeEndpointIsReachableByAdmin() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/welcome")).andExpect(status().isOk());
  }

  /** A user whose only authority is not one of the defined roles is blocked from the welcome endpoint. */
  @Test
  @WithMockUser(authorities = "APT_SYS_ADMIN")
  void welcomeEndpointIsForbiddenForUndefinedRole() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/welcome")).andExpect(status().isForbidden());
  }

  /**
   * Documents why local mock mode never blocks: with no JWKS configured, SecurityConfig
   * installs {@link ca.bc.gov.nrs.scs.backend.filter.MockRequestFilter}, which injects a
   * {@code SCS_SYS_ADMIN} user on every otherwise-unauthenticated request. So an
   * unauthenticated call to the API succeeds in this mode, regardless of the caller's real
   * token/role. (No {@code @WithMockUser} here, so the mock filter is what authenticates us.)
   */
  @Test
  void mockModeInjectsAdminUserAndPermitsApiAcrossMethods() throws Exception {
    mockMvc.perform(get(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
    mockMvc.perform(post(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
    mockMvc.perform(put(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
    mockMvc.perform(delete(ApiConstants.API_BASE_PATH + "/ping")).andExpect(status().isOk());
  }

  @Configuration
  @EnableWebMvc
  @Import({SecurityConfig.class, MethodSecurityConfig.class})
  static class TestContext {

    /** Required so SecurityConfig's {@code @Value("${...:default}")} placeholders resolve. */
    @Bean
    static PropertySourcesPlaceholderConfigurer propertyConfigurer() {
      return new PropertySourcesPlaceholderConfigurer();
    }

    /** SecurityConfig depends on a JWTService provider; a mock suffices (mock mode is active). */
    @Bean
    JWTService jwtService() {
      return Mockito.mock(JWTService.class);
    }

    /**
     * SecurityConfig's filter chain wires in the system enable/disable filter; provide the service
     * in the enabled state so these authorization tests exercise the normal (system-up) rules.
     */
    @Bean
    SystemStatusService systemStatusService() {
      return new SystemStatusService(true);
    }

    @Bean
    PingController pingController() {
      return new PingController();
    }
  }

  @RestController
  static class PingController {
    @GetMapping(ApiConstants.API_BASE_PATH + "/ping")
    String ping() {
      return "pong";
    }

    @GetMapping(ApiConstants.API_BASE_PATH + "/system-status")
    String systemStatus() {
      return "{\"enabled\":true}";
    }

    @GetMapping(ApiConstants.API_BASE_PATH + "/welcome")
    String welcome() {
      return "{\"applicationVersion\":\"test\"}";
    }

    /** Stands in for a real handler: past the URL gate, the annotation is what decides. */
    @RequiresPermission(Permissions.MAINTAIN_SYSTEM_READ)
    @GetMapping(ApiConstants.API_BASE_PATH + "/guarded")
    String guarded() {
      return "guarded";
    }

    @PostMapping(ApiConstants.API_BASE_PATH + "/ping")
    String create() {
      return "created";
    }

    @PutMapping(ApiConstants.API_BASE_PATH + "/ping")
    String update() {
      return "updated";
    }

    @DeleteMapping(ApiConstants.API_BASE_PATH + "/ping")
    String remove() {
      return "removed";
    }
  }
}
