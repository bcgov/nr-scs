package ca.bc.gov.nrs.scs.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

import ca.bc.gov.nrs.scs.backend.config.OracleTlsCompatibility;

/**
 * Spring Boot entry point. Replaces the WAR's {@code WebAppInitializer} (root + servlet child
 * contexts under an external Tomcat): everything now lives in one application context, started by
 * an embedded server.
 *
 * <p>{@link UserDetailsServiceAutoConfiguration} is excluded because authentication is entirely
 * header-driven (JWT bearer, or the local-only mock filter) — see {@code SecurityConfig}. Left in,
 * Boot would create an in-memory user with a generated password that nothing uses.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ScsApiApplication {

  public static void main(String[] args) {
    // Before anything opens a TLS connection: the shared Oracle database accepts only an RSA
    // key-exchange cipher, which Java 21.0.12+ disables by default (see OracleTlsCompatibility).
    OracleTlsCompatibility.allowRsaKeyExchange();
    SpringApplication.run(ScsApiApplication.class, args);
  }
}
