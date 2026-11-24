package ca.bc.gov.nrs.scs.backend.security.annotations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.scs.backend.config.MethodSecurityConfig;
import ca.bc.gov.nrs.scs.backend.config.SecurityConfig;
import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.security.JWTService;
import ca.bc.gov.nrs.scs.backend.service.SystemStatusService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/**
 * Verifies {@link RequiresPermission} enforces the named permission through Spring method security.
 *
 * <p>The point of exercising a real request (rather than only reading the annotation) is the
 * {@code {value}} placeholder: it only resolves because {@link MethodSecurityConfig} registers an
 * {@code AnnotationTemplateExpressionDefaults} bean. If that bean is ever removed the expression is
 * evaluated literally, and {@link #callerWithThePermissionIsAllowed()} is what catches it.
 *
 * <p>The guarded endpoint sits outside {@code /api/**} so the URL rules in {@code SecurityConfig}
 * permit it and the annotation is the only thing gating the call.
 */
@DisplayName("RequiresPermission annotation tests")
@ExtendWith(SpringExtension.class)
@WebAppConfiguration
@ContextConfiguration(classes = RequiresPermissionTest.TestContext.class)
// Mock mode (no JWKS configured) is only permitted in a local/dev environment; declare DEV so
// SecurityConfig's fail-closed guard allows the context to start.
@TestPropertySource(properties = "scs.app.environment=DEV")
class RequiresPermissionTest {

  /** Non-{@code /api} path so SecurityConfig's URL rules permit it; only the annotation gates it. */
  static final String GUARDED_PATH = "/test/scaler-read";

  @Autowired private WebApplicationContext context;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  }

  @Test
  @DisplayName("is meta-annotated with a templated @PreAuthorize")
  void annotationIsTemplatedPreAuthorize() {
    PreAuthorize preAuthorize = RequiresPermission.class.getAnnotation(PreAuthorize.class);
    assertNotNull(preAuthorize, "@RequiresPermission must be meta-annotated with @PreAuthorize");
    assertEquals("hasAuthority('{value}')", preAuthorize.value());
  }

  @Test
  @DisplayName("a caller holding the permission is allowed (proves {value} templating resolves)")
  @WithMockUser(authorities = Permissions.SCALER_READ)
  void callerWithThePermissionIsAllowed() throws Exception {
    mockMvc.perform(get(GUARDED_PATH)).andExpect(status().isOk());
  }

  @Test
  @DisplayName("a caller holding a different permission is forbidden")
  @WithMockUser(authorities = Permissions.MSD_READ)
  void callerWithADifferentPermissionIsForbidden() throws Exception {
    mockMvc.perform(get(GUARDED_PATH)).andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("holding the role alone is not enough — permissions must be expanded onto the token")
  @WithMockUser(authorities = Roles.SCS_INDUSTRY_SCALER)
  void roleAuthorityAloneIsForbidden() throws Exception {
    mockMvc.perform(get(GUARDED_PATH)).andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("a caller with no authorities is forbidden")
  @WithMockUser(authorities = {})
  void callerWithNoAuthoritiesIsForbidden() throws Exception {
    mockMvc.perform(get(GUARDED_PATH)).andExpect(status().isForbidden());
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

    /** SecurityConfig's filter chain wires in the system enable/disable filter; enabled here. */
    @Bean
    SystemStatusService systemStatusService() {
      return new SystemStatusService(true);
    }

    @Bean
    GuardedController guardedController() {
      return new GuardedController();
    }
  }

  /** Test controller whose single handler is guarded solely by {@link RequiresPermission}. */
  @RestController
  static class GuardedController {
    @RequiresPermission(Permissions.SCALER_READ)
    @GetMapping(GUARDED_PATH)
    public String scalerReadOnly() {
      return "ok";
    }
  }
}
