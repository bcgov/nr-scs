package ca.bc.gov.nrs.scs.backend.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Verifies the fail-closed guard that prevents mock authentication mode (JWT disabled) from running
 * outside local development. See {@link SecurityConfig#assertMockAuthAllowedForEnvironment(String)}.
 */
class SecurityConfigMockAuthGuardTest {

  @Test
  @DisplayName("Permits mock mode for recognised local/dev environments (case/whitespace insensitive)")
  void allowsMockMode_forLocalAndDevEnvironments() {
    for (String env : List.of("DEV", "dev", "LOCAL", "local", " Dev ", "Local")) {
      assertDoesNotThrow(() -> SecurityConfig.assertMockAuthAllowedForEnvironment(env),
          () -> "expected mock mode to be permitted for environment '" + env + "'");
    }
  }

  @Test
  @DisplayName("Refuses to start in mock mode for any non-local environment")
  void rejectsMockMode_forDeployedEnvironments() {
    for (String env : List.of("PROD", "TEST", "DELIVERY", "TRAINING", "production", "anything-else")) {
      assertThrows(IllegalStateException.class,
          () -> SecurityConfig.assertMockAuthAllowedForEnvironment(env),
          () -> "expected mock mode to be refused for environment '" + env + "'");
    }
  }

  @Test
  @DisplayName("Fails closed when the environment is blank or unset (treated as deployed)")
  void rejectsMockMode_whenEnvironmentBlankOrNull() {
    assertThrows(IllegalStateException.class,
        () -> SecurityConfig.assertMockAuthAllowedForEnvironment(null));
    assertThrows(IllegalStateException.class,
        () -> SecurityConfig.assertMockAuthAllowedForEnvironment(""));
    assertThrows(IllegalStateException.class,
        () -> SecurityConfig.assertMockAuthAllowedForEnvironment("   "));
  }
}
