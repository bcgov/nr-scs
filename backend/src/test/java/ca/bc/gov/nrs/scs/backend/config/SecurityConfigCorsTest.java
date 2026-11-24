package ca.bc.gov.nrs.scs.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Verifies the property-driven CORS bean in {@link SecurityConfig}: it builds an exact-origin,
 * credentialed config when configured, disables CORS when unset, and refuses a wildcard origin
 * (which would be insecure with allowCredentials=true).
 */
@DisplayName("SecurityConfig CORS tests")
class SecurityConfigCorsTest {

  private SecurityConfig securityConfigWithOrigins(String origins) {
    SecurityConfig config = new SecurityConfig();
    ReflectionTestUtils.setField(config, "corsAllowedOrigins", origins);
    return config;
  }

  private CorsConfiguration resolve(CorsConfigurationSource source) {
    if (source instanceof UrlBasedCorsConfigurationSource urlSource) {
      return urlSource.getCorsConfigurations().get("/**");
    }
    // The blank-origins case returns a lambda source that always yields no configuration.
    return source.getCorsConfiguration(null);
  }

  @Test
  void buildsExactOriginCredentialedConfigWhenConfigured() {
    CorsConfigurationSource source = securityConfigWithOrigins(
        "https://apps.nrs.gov.bc.ca, http://apps.nrs.gov.bc.ca").corsConfigurationSource();

    CorsConfiguration config = resolve(source);
    assertNotNull(config);
    assertEquals(
        List.of("https://apps.nrs.gov.bc.ca", "http://apps.nrs.gov.bc.ca"),
        config.getAllowedOrigins());
    assertEquals(Boolean.TRUE, config.getAllowCredentials());
    assertTrue(config.getAllowedMethods().contains("OPTIONS"));
  }

  @Test
  void disablesCorsWhenOriginsBlank() {
    CorsConfigurationSource source = securityConfigWithOrigins("   ").corsConfigurationSource();
    assertNull(resolve(source), "Blank origins should yield no CORS configuration");
  }

  @Test
  void refusesWildcardOriginWithCredentials() {
    SecurityConfig config = securityConfigWithOrigins("https://apps.nrs.gov.bc.ca, *");
    IllegalStateException ex =
        assertThrows(IllegalStateException.class, config::corsConfigurationSource);
    assertTrue(ex.getMessage().contains("*"));
  }
}
