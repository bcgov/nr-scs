package ca.bc.gov.nrs.scs.backend.ratelimit;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.lang.reflect.Method;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;

@DisplayName("RateLimitInterceptor")
class RateLimitInterceptorTest {

  private static final Duration ONE_HOUR = Duration.ofHours(1);
  private static final String USER_A = "11111111-1111-1111-1111-111111111111";
  private static final String USER_B = "22222222-2222-2222-2222-222222222222";

  private final HttpServletResponse response = mock(HttpServletResponse.class);

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  private RateLimitInterceptor interceptor(int capacity, boolean enabled) {
    RateLimitService service = new RateLimitService(capacity, ONE_HOUR, capacity, ONE_HOUR);
    return new RateLimitInterceptor(service, enabled);
  }

  private HttpServletRequest request() {
    HttpServletRequest request = mock(HttpServletRequest.class);
    lenient().when(request.getHeader("X-Forwarded-For")).thenReturn(null);
    lenient().when(request.getRemoteAddr()).thenReturn("203.0.113.7");
    return request;
  }

  private void authenticateAs(String guid) {
    var auth = new UsernamePasswordAuthenticationToken(
        guid, null, List.of(new SimpleGrantedAuthority("SCS_SYS_ADMIN")));
    SecurityContextHolder.getContext().setAuthentication(auth);
  }

  // --- handler fixtures: the interceptor classifies by the @RateLimited on the matched handler ---

  /** A method-level @RateLimited (search) and an un-annotated method on a non-annotated class. */
  static class SampleController {
    @RateLimited(RateLimitCategory.SEARCH)
    public void search() {}

    public void notLimited() {}
  }

  /** A class-level @RateLimited (report) applies to every method that has no method-level one. */
  @RateLimited(RateLimitCategory.REPORT)
  static class ReportSampleController {
    public void render() {}
  }

  private static HandlerMethod handler(Object bean, String methodName) {
    try {
      Method method = bean.getClass().getMethod(methodName);
      return new HandlerMethod(bean, method);
    } catch (NoSuchMethodException e) {
      throw new IllegalStateException(e);
    }
  }

  private static final HandlerMethod SEARCH_HANDLER = handler(new SampleController(), "search");
  private static final HandlerMethod REPORT_HANDLER = handler(new ReportSampleController(), "render");
  private static final HandlerMethod UNLIMITED_HANDLER = handler(new SampleController(), "notLimited");

  @Test
  void allowsUnannotatedHandlerWithoutConsuming() {
    RateLimitInterceptor interceptor = interceptor(1, true);
    HttpServletRequest request = request();

    // Even with capacity 1, a handler with no @RateLimited is never throttled.
    assertTrue(interceptor.preHandle(request, response, UNLIMITED_HANDLER));
    assertTrue(interceptor.preHandle(request, response, UNLIMITED_HANDLER));
  }

  @Test
  void allowsNonHandlerMethodRequests() {
    RateLimitInterceptor interceptor = interceptor(1, true);
    HttpServletRequest request = request();

    // Static-resource / CORS-preflight handlers are not HandlerMethods -> never throttled.
    assertTrue(interceptor.preHandle(request, response, new Object()));
    assertTrue(interceptor.preHandle(request, response, new Object()));
  }

  @Test
  void throttlesReportHandlerOnceCapacityExceeded() {
    RateLimitInterceptor interceptor = interceptor(1, true);
    authenticateAs(USER_A);
    HttpServletRequest request = request();

    // Category resolved from the class-level @RateLimited(REPORT).
    assertTrue(interceptor.preHandle(request, response, REPORT_HANDLER));
    assertThrows(TooManyRequestsException.class,
        () -> interceptor.preHandle(request, response, REPORT_HANDLER));
  }

  @Test
  void throttlesSearchHandlerOnceCapacityExceeded() {
    RateLimitInterceptor interceptor = interceptor(1, true);
    authenticateAs(USER_A);
    HttpServletRequest request = request();

    assertTrue(interceptor.preHandle(request, response, SEARCH_HANDLER));
    assertThrows(TooManyRequestsException.class,
        () -> interceptor.preHandle(request, response, SEARCH_HANDLER));
  }

  @Test
  void limitsAreScopedPerUser() {
    RateLimitInterceptor interceptor = interceptor(1, true);
    HttpServletRequest request = request();

    authenticateAs(USER_A);
    assertTrue(interceptor.preHandle(request, response, SEARCH_HANDLER));
    assertThrows(TooManyRequestsException.class,
        () -> interceptor.preHandle(request, response, SEARCH_HANDLER));

    // A different user has a fresh allowance.
    authenticateAs(USER_B);
    assertTrue(interceptor.preHandle(request, response, SEARCH_HANDLER));
  }

  @Test
  void fallsBackToIpWhenUnauthenticated() {
    RateLimitInterceptor interceptor = interceptor(1, true);
    HttpServletRequest request = request();

    // No authentication in the context -> keyed by IP; still enforced.
    assertTrue(interceptor.preHandle(request, response, SEARCH_HANDLER));
    assertThrows(TooManyRequestsException.class,
        () -> interceptor.preHandle(request, response, SEARCH_HANDLER));
  }

  @Test
  void bypassesEntirelyWhenDisabled() {
    RateLimitInterceptor interceptor = interceptor(1, false);
    authenticateAs(USER_A);
    HttpServletRequest request = request();

    // Disabled: never throttles even past capacity.
    assertTrue(interceptor.preHandle(request, response, REPORT_HANDLER));
    assertTrue(interceptor.preHandle(request, response, REPORT_HANDLER));
    assertTrue(interceptor.preHandle(request, response, REPORT_HANDLER));
  }
}
