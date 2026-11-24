package ca.bc.gov.nrs.scs.backend.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method (or an entire controller) as rate limited under the given
 * {@link RateLimitCategory}. {@link RateLimitInterceptor} reads this off the matched
 * {@code HandlerMethod} — a method-level annotation wins over a class-level one — so the limit
 * travels with the endpoint instead of being inferred from a URL substring. An endpoint with no
 * {@code @RateLimited} is not throttled.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
  RateLimitCategory value();
}
