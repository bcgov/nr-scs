package ca.bc.gov.nrs.scs.backend.controller;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

/**
 * Enforces the authorization convention that makes the coarse {@code /api/**} rule in
 * {@code SecurityConfig} safe.
 *
 * <p>That rule admits <b>any recognised SCS role</b>, deliberately: what a caller may actually do is
 * decided per handler by {@link RequiresPermission}. The consequence is that a handler shipped
 * without the annotation is reachable by every logged-in user. {@link #everyEndpointRequiresAPermission()}
 * is the backstop that makes such a handler fail the build instead.
 *
 * <p>Supersedes the earlier {@code @IsScsEditor} convention (known debt H-7), which covered only
 * write endpoints and hardcoded {@code SCS_SYS_ADMIN}. This is a superset: every endpoint, read or
 * write, and expressed in permissions so a role other than the administrator can hold them.
 *
 * <p><b>What counts as a write</b> is taken from the handler's HTTP method, not its name. A name list
 * quietly stops covering mutations named with an unanticipated verb, and both the class-level form of
 * {@link RequiresPermission} and an unreadable mapping are treated as failures rather than skipped —
 * every way this backstop could pass without actually checking something is itself asserted.
 */
class ControllerAuthorizationConventionTest {

  private static final String CONTROLLER_PACKAGE = "ca.bc.gov.nrs.scs.backend.controller";

  /**
   * The HTTP methods that change state. Taken as the definition of "a write" rather than the handler's
   * name: a name-prefix list silently stops covering any mutation named with a verb nobody thought to
   * add ({@code cancel…}, {@code suspend…}, {@code issue…}), and the omission looks like a pass.
   */
  private static final Set<RequestMethod> WRITE_HTTP_METHODS =
      Set.of(RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE);

  /**
   * The CUD third of the matrix's CRUD verbs — the suffixes that denote a mutating capability. A
   * write endpoint gated on a {@code _READ}/{@code _QUERY} permission would let a read-only role
   * mutate data, so {@link #writeEndpointsRequireAWritePermission()} rejects it. Besides CUD:
   * {@code _LETTER} counts as mutating because letter generation persists a record, {@code _CANCEL}
   * covers the licence-cancellation capability the matrix grants to a different role set than scaler
   * edit, and {@code SYSTEM_ADMIN} covers the administrator-only operational endpoints.
   */
  private static final List<String> WRITE_PERMISSION_SUFFIXES =
      List.of("_CREATE", "_UPDATE", "_DELETE", "_LETTER", "_CANCEL");

  /**
   * Handlers intentionally left un-annotated because {@code SecurityConfig} makes them
   * {@code permitAll}. {@code /api/system-status} must answer an unauthenticated caller so the SPA
   * can render the "SCS is disabled" interstitial; adding a permission would break that.
   */
  private static final Set<String> PERMIT_ALL_HANDLERS =
      Set.of("SystemStatusController#getSystemStatus");

  /**
   * Handlers that answer POST without mutating anything. The report screens submit their criteria in a
   * request body — too large and too structured for a query string — so the verb is a transport choice
   * and {@code REPORT_READ} is the matrix's own gate for them. They either render a preview or queue
   * generation and delivery; no business record changes.
   *
   * <p>Named one at a time on purpose. A blanket exemption for {@code ReportController} would wave
   * through a genuinely mutating endpoint added to it later, whereas an unlisted POST must justify
   * itself by carrying a write permission.
   */
  private static final Set<String> READ_ONLY_POST_HANDLERS = Set.of(
      "ReportController#getScalerRegisterReport",
      "ReportController#getScaleSiteRegisterReport",
      "ReportController#getMarkSiteDesignationReport",
      "ReportController#getDesignatedMarksExceptionReport",
      "ReportController#getScalingAdministrationReport",
      "ReportController#getScalingExceptionReport",
      "ReportController#getDistrictCheckScalePerformanceReport",
      "ReportController#getDistrictSiteInspectionPerformanceReport",
      "ReportController#getScaleSiteComplianceReport");

  @Test
  @DisplayName("every controller endpoint declares a required permission")
  void everyEndpointRequiresAPermission() throws Exception {
    List<String> unprotected = new ArrayList<>();
    for (Class<?> controller : controllers()) {
      for (Method method : handlers(controller)) {
        String id = controller.getSimpleName() + "#" + method.getName();
        if (PERMIT_ALL_HANDLERS.contains(id)) {
          continue;
        }
        if (requiredPermission(controller, method) == null) {
          unprotected.add(id);
        }
      }
    }

    assertTrue(unprotected.isEmpty(),
        () -> "Endpoints missing @RequiresPermission — they would be reachable by every "
            + "authenticated role. Add the annotation: " + unprotected);
  }

  @Test
  @DisplayName("every declared permission is a known name from Permissions")
  void everyDeclaredPermissionIsKnown() throws Exception {
    List<String> unknown = new ArrayList<>();
    for (Class<?> controller : controllers()) {
      for (Method method : handlers(controller)) {
        RequiresPermission annotation = requiredPermission(controller, method);
        if (annotation != null && !Permissions.ALL_PERMISSIONS.contains(annotation.value())) {
          unknown.add(controller.getSimpleName() + "#" + method.getName()
              + " -> " + annotation.value());
        }
      }
    }

    assertTrue(unknown.isEmpty(),
        () -> "@RequiresPermission references names that are not in Permissions.ALL_PERMISSIONS "
            + "(a typo here silently denies everyone, since no role is ever granted the name): "
            + unknown);
  }

  @Test
  @DisplayName("state-changing endpoints are gated on a write permission, not a read one")
  void writeEndpointsRequireAWritePermission() throws Exception {
    List<String> readGated = new ArrayList<>();
    for (Class<?> controller : controllers()) {
      for (Method method : handlers(controller)) {
        String id = controller.getSimpleName() + "#" + method.getName();
        if (PERMIT_ALL_HANDLERS.contains(id) || READ_ONLY_POST_HANDLERS.contains(id)) {
          continue;
        }
        if (httpMethods(method).stream().noneMatch(WRITE_HTTP_METHODS::contains)) {
          continue;
        }
        RequiresPermission annotation = requiredPermission(controller, method);
        if (annotation == null) {
          continue; // reported by everyEndpointRequiresAPermission
        }
        String permission = annotation.value();
        boolean isWrite = Permissions.SYSTEM_ADMIN.equals(permission)
            || WRITE_PERMISSION_SUFFIXES.stream().anyMatch(permission::endsWith);
        if (!isWrite) {
          readGated.add(id + " -> " + permission);
        }
      }
    }

    assertTrue(readGated.isEmpty(),
        () -> "State-changing endpoints gated on a read-only permission, which would let a "
            + "read-only role mutate data: " + readGated);
  }

  /**
   * Every handler's HTTP method must be resolvable, or the check above silently skips it — the one
   * failure mode that would make a green run meaningless. Asserted separately so a handler whose
   * mapping cannot be read fails loudly instead of being quietly classified as a read.
   */
  @Test
  @DisplayName("every handler's HTTP method is resolvable, so no write is silently skipped")
  void everyHandlerHasAResolvableHttpMethod() throws Exception {
    List<String> unresolved = new ArrayList<>();
    for (Class<?> controller : controllers()) {
      for (Method method : handlers(controller)) {
        if (httpMethods(method).isEmpty()) {
          unresolved.add(controller.getSimpleName() + "#" + method.getName());
        }
      }
    }

    assertTrue(unresolved.isEmpty(),
        () -> "No @RequestMapping found for these handlers, so writeEndpointsRequireAWritePermission "
            + "cannot tell whether they mutate and would pass them over: " + unresolved);
  }

  /**
   * Method security proxies the controllers with CGLIB (see {@code MethodSecurityConfig}), and CGLIB
   * cannot override a {@code final} class or method — it skips them <em>silently</em>, leaving the
   * handler unguarded with no startup error. Nothing else would surface that, so it is asserted here.
   */
  @Test
  @DisplayName("controllers and their handlers are non-final, so CGLIB can apply the guard")
  void controllersAreProxyable() throws Exception {
    List<String> unproxyable = new ArrayList<>();

    for (Class<?> controller : controllers()) {
      if (Modifier.isFinal(controller.getModifiers())) {
        unproxyable.add(controller.getSimpleName() + " (final class)");
      }
      for (Method handler : handlers(controller)) {
        if (Modifier.isFinal(handler.getModifiers())) {
          unproxyable.add(controller.getSimpleName() + "#" + handler.getName() + " (final method)");
        }
      }
    }

    assertTrue(unproxyable.isEmpty(),
        () -> "CGLIB cannot advise these, so @RequiresPermission would be silently skipped: "
            + unproxyable);
  }

  /**
   * Neither exemption list may outlive the handlers it names. A stale entry is invisible — it exempts
   * nothing and no assertion notices — so a later handler that happens to reuse the name would inherit
   * an exemption nobody decided to grant it.
   */
  @Test
  @DisplayName("no exemption names a handler that no longer exists")
  void exemptionsReferenceLiveHandlers() throws Exception {
    List<Class<?>> controllers = controllers();
    Set<String> live = controllers.stream()
        .flatMap(controller -> handlers(controller).stream()
            .map(method -> controller.getSimpleName() + "#" + method.getName()))
        .collect(Collectors.toUnmodifiableSet());

    List<String> stale = Stream.concat(PERMIT_ALL_HANDLERS.stream(), READ_ONLY_POST_HANDLERS.stream())
        .filter(exemption -> !live.contains(exemption))
        .toList();

    assertTrue(stale.isEmpty(),
        () -> "These exemptions name handlers that no longer exist; remove them so they cannot "
            + "silently apply to a future handler of the same name: " + stale);
  }

  /**
   * The permission gating a handler: its own annotation, else the one its controller declares. No
   * controller uses the class-level form today, but honouring it here keeps the write and known-name
   * checks from being satisfied vacuously the day one does.
   */
  private static RequiresPermission requiredPermission(Class<?> controller, Method method) {
    RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
    return annotation != null ? annotation : controller.getAnnotation(RequiresPermission.class);
  }

  /**
   * The HTTP methods a handler answers. Most SCS controllers implement a generated {@code *Api}
   * interface that carries the {@code @RequestMapping}, so it is not present on the implementing
   * method — the interface that declares the same signature is searched as well. Empty when no mapping
   * is found anywhere, which {@link #everyHandlerHasAResolvableHttpMethod()} treats as a failure.
   */
  private static Set<RequestMethod> httpMethods(Method method) {
    RequestMapping mapping = AnnotatedElementUtils.findMergedAnnotation(method, RequestMapping.class);
    if (mapping == null) {
      for (Class<?> apiInterface : method.getDeclaringClass().getInterfaces()) {
        try {
          Method declared = apiInterface.getMethod(method.getName(), method.getParameterTypes());
          mapping = AnnotatedElementUtils.findMergedAnnotation(declared, RequestMapping.class);
          if (mapping != null) {
            break;
          }
        } catch (NoSuchMethodException notOnThisInterface) {
          // A controller may implement several interfaces; only one declares the handler.
        }
      }
    }
    return mapping == null
        ? Set.of()
        : Arrays.stream(mapping.method()).collect(Collectors.toUnmodifiableSet());
  }

  private static List<Class<?>> controllers() throws ClassNotFoundException {
    ClassPathScanningCandidateComponentProvider scanner =
        new ClassPathScanningCandidateComponentProvider(false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

    List<Class<?>> controllers = new ArrayList<>();
    for (var candidate : scanner.findCandidateComponents(CONTROLLER_PACKAGE)) {
      controllers.add(Class.forName(candidate.getBeanClassName()));
    }
    return controllers;
  }

  /**
   * The request-handling methods of a controller. Most SCS controllers implement a generated
   * {@code *Api} interface that carries the {@code @GetMapping}/{@code @PostMapping} metadata, so the
   * mapping annotation is not visible on the implementing method — the public declared methods are
   * the handlers, and the constructor/accessors are not public methods here.
   */
  private static List<Method> handlers(Class<?> controller) {
    List<Method> handlers = new ArrayList<>();
    for (Method method : controller.getDeclaredMethods()) {
      if (!Modifier.isPublic(method.getModifiers()) || method.isSynthetic()) {
        continue;
      }
      handlers.add(method);
    }
    return handlers;
  }

  @Test
  @DisplayName("the scan actually finds the controllers (guards against a silently empty sweep)")
  void scanFindsControllers() throws Exception {
    List<Class<?>> controllers = controllers();
    assertTrue(controllers.size() >= 30,
        () -> "Expected the controller package scan to find the full controller set; found "
            + controllers.size() + ". A broken scan would make the conventions above vacuous.");

    long annotated = controllers.stream()
        .flatMap(controller -> handlers(controller).stream())
        .filter(method -> method.isAnnotationPresent(RequiresPermission.class))
        .count();
    assertTrue(annotated >= 150,
        () -> "Expected ~168 annotated handlers; found " + annotated);
  }
}
