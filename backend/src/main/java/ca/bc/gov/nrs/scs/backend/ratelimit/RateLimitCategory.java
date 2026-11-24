package ca.bc.gov.nrs.scs.backend.ratelimit;

/**
 * The throttled endpoint categories. Each has its own bucket configuration so the expensive
 * report renders can be limited more tightly than the cheaper search queries. Endpoints opt in via
 * the {@link RateLimited} annotation, which carries the category.
 */
public enum RateLimitCategory {
  /** Jasper report generation (the {@code ReportController} endpoints). Expensive — tight limit. */
  REPORT,
  /** Search/query endpoints (the {@code search*} endpoints). Cheaper — looser limit. */
  SEARCH
}
