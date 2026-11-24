package ca.bc.gov.nrs.scs.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.annotation.AnnotationTemplateExpressionDefaults;

/**
 * Enables method security for the controllers. Both details below have broken production once; keep them.
 *
 * <p><b>Must live in the same context as the controllers.</b> Under Spring Boot there is a single
 * application context, so this holds by construction; it mattered in the WAR build, whose
 * {@code WebAppInitializer} split a root and a servlet child context. Method security works through an auto-proxy
 * {@code BeanPostProcessor}, which only sees beans from its own context, so declaring it in the root
 * (with {@code SecurityConfig}) leaves controllers unproxied and every {@code @RequiresPermission}
 * silently ignored — a privilege escalation, since {@code /api/**} admits any recognized role and
 * relies on those annotations to decide.
 *
 * <p><b>{@code proxyTargetClass}</b> for the reason {@code WebConfig} sets it on
 * {@code MethodValidationPostProcessor}: controllers implement the generated {@code *Api} interfaces, so
 * a default JDK proxy drops their class-level {@code @RestController} and every route 404s.
 *
 * <p>{@code MethodSecurityContextWiringTest} pins both.
 */
@Configuration
@EnableMethodSecurity(proxyTargetClass = true)
public class MethodSecurityConfig {

  /**
   * Resolves {@code {value}} in {@link ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission}'s
   * {@code @PreAuthorize("hasAuthority('{value}')")}. Without it the expression is literal and every
   * annotated endpoint denies (fails closed). {@code static} to beat the method-security infrastructure.
   */
  @Bean
  static AnnotationTemplateExpressionDefaults annotationTemplateExpressionDefaults() {
    return new AnnotationTemplateExpressionDefaults();
  }
}
