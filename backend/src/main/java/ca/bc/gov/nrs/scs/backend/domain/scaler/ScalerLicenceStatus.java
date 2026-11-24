package ca.bc.gov.nrs.scs.backend.domain.scaler;

/**
 * Scaler licence status derived by {@code scs_scaler_license_status_vw}. These four are the complete
 * set the view emits; the enum name equals the DB/wire value. Read by
 * {@code ScalerRepository.getScalerSummaryStatus} and projected verbatim to the {@code ScalerSummary}
 * wire string by {@code ScalerApiMapper}.
 */
public enum ScalerLicenceStatus {
  VALID,
  EXPIRED,
  CANCELLED,
  SUSPENDED;

  /**
   * Lenient by design: unrecognized values return null rather than throwing, matching the read-path
   * treatment of {@link ScalerLicenceType} (a dirty status degrades to an unset field, not a failed
   * load). The status column has no leading/trailing whitespace, but trim/upper-case for safety.
   */
  public static ScalerLicenceStatus fromCode(String value) {
    if (value == null) return null;
    return switch (value.trim().toUpperCase()) {
      case "VALID" -> VALID;
      case "EXPIRED" -> EXPIRED;
      case "CANCELLED" -> CANCELLED;
      case "SUSPENDED" -> SUSPENDED;
      default -> null;
    };
  }
}
