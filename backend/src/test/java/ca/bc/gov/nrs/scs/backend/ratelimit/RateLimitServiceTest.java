package ca.bc.gov.nrs.scs.backend.ratelimit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("RateLimitService token buckets")
class RateLimitServiceTest {

  // Long refill window so the bucket does not visibly refill within a test run.
  private static final Duration ONE_HOUR = Duration.ofHours(1);

  private RateLimitService service(int reportsCapacity, int searchCapacity) {
    return new RateLimitService(reportsCapacity, ONE_HOUR, searchCapacity, ONE_HOUR);
  }

  @Test
  void allowsUpToCapacityThenBlocks() {
    RateLimitService service = service(2, 60);

    assertTrue(service.tryConsume(RateLimitCategory.REPORT, "user:a").allowed());
    assertTrue(service.tryConsume(RateLimitCategory.REPORT, "user:a").allowed());

    RateLimitService.Decision blocked = service.tryConsume(RateLimitCategory.REPORT, "user:a");
    assertFalse(blocked.allowed());
    assertTrue(blocked.retryAfterSeconds() >= 1, "blocked decision must report a positive retry-after");
  }

  @Test
  void keysAreIsolatedFromEachOther() {
    RateLimitService service = service(1, 60);

    assertTrue(service.tryConsume(RateLimitCategory.REPORT, "user:a").allowed());
    assertFalse(service.tryConsume(RateLimitCategory.REPORT, "user:a").allowed());

    // A different caller has its own independent bucket.
    assertTrue(service.tryConsume(RateLimitCategory.REPORT, "user:b").allowed());
  }

  @Test
  void categoriesAreIsolatedFromEachOther() {
    RateLimitService service = service(1, 1);

    // Exhaust REPORT for this key.
    assertTrue(service.tryConsume(RateLimitCategory.REPORT, "user:a").allowed());
    assertFalse(service.tryConsume(RateLimitCategory.REPORT, "user:a").allowed());

    // SEARCH for the same key is a separate bucket and still has capacity.
    assertTrue(service.tryConsume(RateLimitCategory.SEARCH, "user:a").allowed());
  }

  @Test
  void searchUsesItsOwnLargerCapacity() {
    RateLimitService service = service(1, 3);

    for (int i = 0; i < 3; i++) {
      assertTrue(service.tryConsume(RateLimitCategory.SEARCH, "user:a").allowed(),
          "search request " + (i + 1) + " should be allowed within capacity");
    }
    assertFalse(service.tryConsume(RateLimitCategory.SEARCH, "user:a").allowed());
  }

  @Test
  void retryAfterRoundsUpToAtLeastOneSecond() {
    RateLimitService service = service(1, 60);
    service.tryConsume(RateLimitCategory.REPORT, "user:a");

    RateLimitService.Decision blocked = service.tryConsume(RateLimitCategory.REPORT, "user:a");
    assertFalse(blocked.allowed());
    // Refill of 1 token over an hour => wait is well under an hour but never rounded down to 0.
    assertTrue(blocked.retryAfterSeconds() >= 1);
    assertEquals(blocked.retryAfterSeconds(), Math.max(1, blocked.retryAfterSeconds()));
  }
}
