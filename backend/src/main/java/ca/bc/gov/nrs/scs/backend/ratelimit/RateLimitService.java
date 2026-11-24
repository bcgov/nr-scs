package ca.bc.gov.nrs.scs.backend.ratelimit;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.function.Supplier;

/**
 * In-memory, per-instance token-bucket rate limiter (Bucket4j). Buckets are created lazily and
 * keyed by {@code category|clientKey}, so each user (or IP) gets an independent allowance per
 * throttled {@link RateLimitCategory}.
 *
 * <p>Buckets live in a bounded, self-evicting Caffeine cache: an idle key is dropped after
 * {@link #BUCKET_TTL} (re-created on the next request, which is correct — a long-idle bucket would
 * have refilled to capacity anyway), and the cache is capped at {@link #MAX_BUCKETS} entries so a
 * flood of distinct keys (e.g. spoofed {@code X-Forwarded-For} on an anonymous path) cannot grow
 * the map without bound.
 *
 * <p>State is local to the JVM. Behind multiple instances the effective limit is
 * {@code limit × instances}; this is intentional for abuse-throttling. A distributed backing store
 * (e.g. Redis/Hazelcast) would be required only if hard global limits become necessary.
 */
public class RateLimitService {

  /** Drop a bucket after this long with no access; it would have refilled to capacity by then. */
  private static final Duration BUCKET_TTL = Duration.ofMinutes(15);

  /** Hard cap on live buckets so distinct-key floods cannot exhaust the heap. */
  private static final long MAX_BUCKETS = 100_000;

  /** Outcome of a consume attempt: whether it was allowed and, if not, how long to back off. */
  public record Decision(boolean allowed, long retryAfterSeconds) {}

  private final Map<RateLimitCategory, Supplier<Bucket>> bucketFactories =
      new EnumMap<>(RateLimitCategory.class);
  private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
      .maximumSize(MAX_BUCKETS)
      .expireAfterAccess(BUCKET_TTL)
      .build();

  public RateLimitService(
      int reportsCapacity,
      Duration reportsRefill,
      int searchCapacity,
      Duration searchRefill) {
    bucketFactories.put(RateLimitCategory.REPORT, () -> newBucket(reportsCapacity, reportsRefill));
    bucketFactories.put(RateLimitCategory.SEARCH, () -> newBucket(searchCapacity, searchRefill));
  }

  private static Bucket newBucket(int capacity, Duration refill) {
    Bandwidth limit = Bandwidth.builder()
        .capacity(capacity)
        .refillGreedy(capacity, refill)
        .build();
    return Bucket.builder().addLimit(limit).build();
  }

  /**
   * Attempts to consume a single token from the bucket for {@code (category, clientKey)}.
   *
   * @return a {@link Decision} — {@code allowed=true} when a token was available; otherwise
   *     {@code allowed=false} with the (rounded-up, ≥1) seconds to wait before a token frees up.
   */
  public Decision tryConsume(RateLimitCategory category, String clientKey) {
    Bucket bucket = buckets.get(
        category.name() + '|' + clientKey, key -> bucketFactories.get(category).get());

    ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
    if (probe.isConsumed()) {
      return new Decision(true, 0);
    }

    long nanos = probe.getNanosToWaitForRefill();
    long retryAfterSeconds = Math.max(1, (nanos + 999_999_999L) / 1_000_000_000L);
    return new Decision(false, retryAfterSeconds);
  }
}
