package ca.bc.gov.nrs.scs.backend.ratelimit;

import ca.bc.gov.nrs.scs.backend.constants.ApiConstants;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Wires the rate-limiting interceptor (M-10) for the search and report endpoints. Limits are
 * property-driven so ops can tune them per environment; the defaults are per-user-per-minute.
 *
 * <p>The service/interceptor are constructed here rather than exposed as beans: nothing else
 * depends on them, and the {@code @Value} fields are populated before {@code addInterceptors} runs.
 */
@Configuration
public class RateLimitConfig implements WebMvcConfigurer {

  @Value("${scs.rate-limit.enabled:true}")
  private boolean enabled;

  @Value("${scs.rate-limit.reports.capacity:10}")
  private int reportsCapacity;

  @Value("${scs.rate-limit.reports.refill-seconds:60}")
  private long reportsRefillSeconds;

  @Value("${scs.rate-limit.search.capacity:60}")
  private int searchCapacity;

  @Value("${scs.rate-limit.search.refill-seconds:60}")
  private long searchRefillSeconds;

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    RateLimitService rateLimitService = new RateLimitService(
        reportsCapacity, Duration.ofSeconds(reportsRefillSeconds),
        searchCapacity, Duration.ofSeconds(searchRefillSeconds));

    // Scope to the API; the interceptor itself decides which paths are throttled (reports/search).
    // A single trailing ** keeps this valid under Spring's PathPattern matching.
    registry.addInterceptor(new RateLimitInterceptor(rateLimitService, enabled))
        .addPathPatterns(ApiConstants.API_BASE_PATH + "/**");
  }
}
