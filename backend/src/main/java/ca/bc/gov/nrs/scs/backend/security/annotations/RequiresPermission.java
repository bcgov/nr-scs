package ca.bc.gov.nrs.scs.backend.security.annotations;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Requires the caller to hold a functional permission from
 * {@link ca.bc.gov.nrs.scs.backend.constants.Permissions}.
 *
 * <pre>{@code
 * @Override
 * @RequiresPermission(Permissions.SCALER_READ)
 * public ResponseEntity<ScalerSummary> getScalerSummary(@PathVariable String scalerLicenceNo) { … }
 * }</pre>
 *
 * <p>Permission authorities are granted alongside role authorities by
 * {@link ca.bc.gov.nrs.scs.backend.security.RolePermissions#expandAuthorities}, so the check is a
 * plain {@code hasAuthority}. The {@code {value}} placeholder is substituted by Spring Security's
 * meta-annotation expression templating, enabled by the
 * {@code AnnotationTemplateExpressionDefaults} bean in
 * {@link ca.bc.gov.nrs.scs.backend.config.MethodSecurityConfig} — without that bean the expression is
 * taken literally and every call is denied, which is why
 * {@code RequiresPermissionTest} exercises a real request through the filter chain.
 *
 * <p>Every {@code /api/**} controller handler must carry this annotation;
 * {@code ControllerAuthorizationConventionTest} fails the build otherwise, which is what keeps the
 * coarse {@code /api/**} rule in {@code SecurityConfig} — any recognised role — from being an open
 * door. Supersedes the former {@code @IsScsEditor}, which covered write endpoints only and could
 * name just {@code SCS_SYS_ADMIN}.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAuthority('{value}')")
public @interface RequiresPermission {

  /** The required permission; must be one of {@code Permissions.ALL_PERMISSIONS}. */
  String value();
}
