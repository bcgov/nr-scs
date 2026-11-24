package ca.bc.gov.nrs.scs.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockServletContext;
import org.springframework.validation.annotation.Validated;
import org.springframework.validation.beanvalidation.MethodValidationPostProcessor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Pins the context in which method security must be enabled.
 *
 * <p>The WAR uses a parent/child arrangement: {@code WebAppInitializer} puts {@code SecurityConfig} in
 * the root context and {@code WebConfig} — which component-scans the controllers — in the servlet
 * child. Method security works by registering an auto-proxy {@code BeanPostProcessor}, and a
 * post-processor only sees beans instantiated in its own context. So {@code @EnableMethodSecurity}
 * declared in the root leaves child-context controllers unproxied and every
 * {@code @RequiresPermission} silently ignored — with {@code /api/**} open to any recognized role,
 * that is a privilege escalation rather than a cosmetic gap.
 *
 * <p>The other method-security tests use a single flat context, so they cannot catch this.
 */
@DisplayName("method security must be enabled in the context that owns the controllers")
class MethodSecurityContextWiringTest {

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  private static void authenticateWithoutThePermission() {
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(
            "user", "n/a", AuthorityUtils.createAuthorityList("SOME_OTHER_PERMISSION")));
  }

  /** A guarded bean standing in for a controller. */
  static class GuardedBean {
    @RequiresPermission(Permissions.MAINTAIN_SYSTEM_UPDATE)
    public String guarded() {
      return "leaked";
    }
  }

  /** Stands in for the root context: no method security. */
  @Configuration
  static class RootContext {
  }

  /** Stands in for the servlet child context: the controllers, plus MethodSecurityConfig. */
  @Configuration
  static class ServletContext {
    @Bean
    GuardedBean guardedBean() {
      return new GuardedBean();
    }
  }

  /**
   * The production arrangement — {@link MethodSecurityConfig} registered in the child context that
   * owns the guarded beans, per {@code WebAppInitializer.getServletConfigClasses}.
   */
  @Test
  @DisplayName("a guarded bean is denied when method security is in its own (child) context")
  void guardedBeanIsEnforcedWhenMethodSecurityIsInItsContext() {
    try (var parent = new AnnotationConfigApplicationContext(RootContext.class);
        var child = new AnnotationConfigApplicationContext()) {
      child.setParent(parent);
      child.register(MethodSecurityConfig.class, ServletContext.class);
      child.refresh();

      GuardedBean bean = child.getBean(GuardedBean.class);
      authenticateWithoutThePermission();

      assertTrue(AopUtils.isAopProxy(bean),
          "The controller-hosting context must proxy guarded beans; an unproxied bean means "
              + "@EnableMethodSecurity is not in the context that owns the controllers, so every "
              + "@RequiresPermission is ignored at runtime.");
      assertThrows(AccessDeniedException.class, bean::guarded);
    }
  }

  /**
   * The regression this guards against: method security in the parent leaves child beans unproxied.
   * Asserted explicitly so the reason {@link MethodSecurityConfig} is a separate servlet-context
   * class cannot be lost — folding it back into {@code SecurityConfig} (root) reintroduces exactly
   * this, and the flat-context tests would not notice.
   */
  @Test
  @DisplayName("documents the trap: method security in the PARENT does not proxy child beans")
  void methodSecurityInParentContextDoesNotProxyChildBeans() {
    try (var parent = new AnnotationConfigApplicationContext(MethodSecurityConfig.class);
        var child = new AnnotationConfigApplicationContext()) {
      child.setParent(parent);
      child.register(ServletContext.class);
      child.refresh();

      GuardedBean bean = child.getBean(GuardedBean.class);
      authenticateWithoutThePermission();

      assertFalse(AopUtils.isAopProxy(bean));
      assertEquals("leaked", bean.guarded(), "unproxied: the annotation is not applied");
    }
  }

  /** Control: same context, denied. */
  @Test
  @DisplayName("a guarded bean in the SAME context as method security is denied")
  void guardedBeanInSameContextIsEnforced() {
    try (var context =
        new AnnotationConfigApplicationContext(MethodSecurityConfig.class, ServletContext.class)) {
      GuardedBean bean = context.getBean(GuardedBean.class);
      authenticateWithoutThePermission();

      assertThrows(AccessDeniedException.class, bean::guarded);
    }
  }

  /** Stands in for a generated {@code *Api} interface: {@code @Validated} and the mapping live here. */
  @Validated
  interface ProbeApi {
    @GetMapping("/method-security-wiring-probe")
    String probe();
  }

  /** Stands in for a real controller: {@code @RestController} on the class, mapping on the interface. */
  @RestController
  static class ProbeController implements ProbeApi {
    @Override
    @RequiresPermission(Permissions.MAINTAIN_SYSTEM_UPDATE)
    public String probe() {
      return "leaked";
    }
  }

  @Configuration
  static class ProbeServletContext {
    @Bean
    ProbeController probeController() {
      return new ProbeController();
    }

    @Bean
    RequestMappingHandlerMapping requestMappingHandlerMapping() {
      return new RequestMappingHandlerMapping();
    }

    /** Mirrors {@code WebConfig}: a second post-processor also proxying the controllers. */
    @Bean
    MethodValidationPostProcessor methodValidationPostProcessor() {
      MethodValidationPostProcessor processor = new MethodValidationPostProcessor();
      processor.setProxyTargetClass(true);
      return processor;
    }
  }

  /**
   * The second half of the wiring contract. Every real controller implements a generated {@code *Api}
   * interface, so without {@code proxyTargetClass} method security wraps them in JDK interface proxies
   * — which do not carry the class-level {@code @RestController}. {@code RequestMappingHandlerMapping}
   * then skips them and the whole API 404s.
   *
   * <p>The other method-security tests use interface-free test controllers, which get CGLIB proxies by
   * default and so pass with or without the flag. Only an interface-backed controller catches this.
   */
  @Test
  @DisplayName("guarded controllers stay routable: CGLIB proxy keeps @RestController discoverable")
  void guardedInterfaceBackedControllerRemainsAHandler() {
    try (var context = new AnnotationConfigWebApplicationContext()) {
      context.setServletContext(new MockServletContext());
      context.register(MethodSecurityConfig.class, ProbeServletContext.class);
      context.refresh();

      Object controller = context.getBean("probeController");
      assertTrue(AopUtils.isCglibProxy(controller),
          "A JDK interface proxy drops the class-level @RestController, so the controller is no "
              + "longer detected as a handler and its routes 404. @EnableMethodSecurity needs "
              + "proxyTargetClass = true.");

      boolean mapped = context.getBean(RequestMappingHandlerMapping.class)
          .getHandlerMethods()
          .keySet()
          .stream()
          .anyMatch(info -> info.toString().contains("/method-security-wiring-probe"));
      assertTrue(mapped, "the guarded controller's route must still be registered");

      authenticateWithoutThePermission();
      assertThrows(AccessDeniedException.class, ((ProbeApi) controller)::probe,
          "and it must still be guarded");
    }
  }
}
