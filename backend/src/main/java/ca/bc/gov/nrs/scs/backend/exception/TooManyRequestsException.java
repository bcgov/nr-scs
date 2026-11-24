package ca.bc.gov.nrs.scs.backend.exception;

/**
 * Raised by the rate-limiting interceptor when a caller exceeds the allowed request rate for a
 * throttled endpoint category (search / reports). Mapped to HTTP 429 by
 * {@link GlobalApiExceptionHandler}, including a {@code Retry-After} hint.
 */
public class TooManyRequestsException extends RuntimeException {

  private final long retryAfterSeconds;

  public TooManyRequestsException(String message, long retryAfterSeconds) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** Seconds the caller should wait before retrying (used for the {@code Retry-After} header). */
  public long getRetryAfterSeconds() {
    return retryAfterSeconds;
  }
}
