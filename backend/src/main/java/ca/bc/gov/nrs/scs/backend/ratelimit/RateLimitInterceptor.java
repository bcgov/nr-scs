package ca.bc.gov.nrs.scs.backend.ratelimit;

import ca.bc.gov.nrs.scs.backend.exception.TooManyRequestsException;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Throttles the endpoints annotated with {@link RateLimited}. Runs after the security filter chain,
 * so it can key the limit by the authenticated user (falling back to client IP when
 * unauthenticated). Endpoints with no {@code @RateLimited} (and non-handler requests such as static
 * resources or CORS preflight) pass straight through. On exhaustion it raises
 * {@link TooManyRequestsException}, which the global handler maps to HTTP 429 with a
 * {@code Retry-After} header.
 */
public class RateLimitInterceptor implements HandlerInterceptor {

  private static final String FORWARDED_FOR_HEADER = "X-Forwarded-For";

  private final RateLimitService rateLimitService;
  private final boolean enabled;

  public RateLimitInterceptor(RateLimitService rateLimitService, boolean enabled) {
    this.rateLimitService = rateLimitService;
    this.enabled = enabled;
  }

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
    if (!enabled) {
      return true;
    }

    RateLimitCategory category = categoryFor(handler);
    if (category == null) {
      return true;
    }

    RateLimitService.Decision decision = rateLimitService.tryConsume(category, resolveClientKey(request));
    if (decision.allowed()) {
      return true;
    }

    throw new TooManyRequestsException(
        "Too many requests. Please slow down and try again shortly.", decision.retryAfterSeconds());
  }

  /**
   * The {@link RateLimited} category for the matched handler, or {@code null} when it is not a
   * controller method or carries no annotation. A method-level annotation takes precedence over a
   * class-level one.
   */
  private static RateLimitCategory categoryFor(Object handler) {
    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return null;
    }
    RateLimited annotation = handlerMethod.getMethodAnnotation(RateLimited.class);
    if (annotation == null) {
      annotation = handlerMethod.getBeanType().getAnnotation(RateLimited.class);
    }
    return annotation == null ? null : annotation.value();
  }

  /** Per-user key when authenticated; otherwise the client IP. Namespaced to avoid collisions. */
  private static String resolveClientKey(HttpServletRequest request) {
    String guid = SecurityContextUtils.currentUserGuidOrNull();
    if (guid != null) {
      return "user:" + guid;
    }
    return "ip:" + clientIp(request);
  }

  private static String clientIp(HttpServletRequest request) {
    // The app sits behind a gateway/proxy, so prefer the first X-Forwarded-For hop when present.
    String forwardedFor = request.getHeader(FORWARDED_FOR_HEADER);
    if (forwardedFor != null && !forwardedFor.isBlank()) {
      return forwardedFor.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}
