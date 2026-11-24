package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * A reference to one tally document — either a LOG_TALLY or a SAMPLE_LOG_TALLY
 * record — by its document number and version. CheckScale holds up to four:
 * the check + original side, each in either flavor.
 */
public record TallyDoc(String docNo, Integer version) {

  /** Convenience null-aware accessor — returns null if this ref or its docNo is null. */
  public static String docNoOf(TallyDoc ref) {
    return ref == null ? null : ref.docNo();
  }

  /** Convenience null-aware accessor — returns null if this ref or its version is null. */
  public static Integer versionOf(TallyDoc ref) {
    return ref == null ? null : ref.version();
  }
}
