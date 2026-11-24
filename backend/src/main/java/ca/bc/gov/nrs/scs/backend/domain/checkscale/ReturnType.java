package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

/**
 * Domain representation of a summary check-scale return type. Mirrors the API wire enum
 * (LOG_TALLY / SAMPLE_LOG_TALLY / SPECIAL_FOREST_PRODUCT) but owns the legacy encoding and the
 * behavioural rules the generated wire enum cannot carry (it is regenerated, disposable code):
 *
 * <ul>
 *   <li>{@link #ckscType()} — the legacy {@code CheckScaleBo} cksc_type code persisted to
 *       {@code check_scale.cksc_type}, deliberately kept off the public API contract.
 *   <li>{@link #resolvePartialInd(YesNo)} — LT/SLT force {@code partial_ind = Y}; SFP is
 *       user-supplied.
 *   <li>{@link #isSpecialForestProduct()} — drives the legacy SPG product/grade blanking rule.
 * </ul>
 *
 * <p>Built from the wire value at the API-mapper boundary via {@link #fromWire(String)}, mirroring
 * the {@code YesNo.fromCode}/{@code YesNo.toCode} pattern — the domain never sees the generated
 * enum type, only its string value.
 */
public enum ReturnType {
  LOG_TALLY("LTSCS"),
  SAMPLE_LOG_TALLY("SLTSCS"),
  SPECIAL_FOREST_PRODUCT("SFPSCS");

  private final String ckscType;

  ReturnType(String ckscType) {
    this.ckscType = ckscType;
  }

  /** Legacy cksc_type code persisted to {@code check_scale.cksc_type}. */
  public String ckscType() {
    return ckscType;
  }

  /** Whether this is the Special Forest Product flavor (drives SPG product/grade blanking). */
  public boolean isSpecialForestProduct() {
    return this == SPECIAL_FOREST_PRODUCT;
  }

  /**
   * Resolves the legacy {@code partial_ind} rule: LT/SLT force {@code Y}; SFP keeps the
   * user-submitted value (which may be {@code null} — the service rejects that downstream).
   */
  public YesNo resolvePartialInd(YesNo submitted) {
    return isSpecialForestProduct() ? submitted : YesNo.Y;
  }

  /**
   * Maps the API wire value (the generated enum's {@code getValue()}) to the domain type. Kept as an
   * explicit switch rather than {@link #valueOf} so the wire contract is documented and a divergent
   * wire value fails loudly.
   */
  public static ReturnType fromWire(String wireValue) {
    return switch (wireValue) {
      case "LOG_TALLY" -> LOG_TALLY;
      case "SAMPLE_LOG_TALLY" -> SAMPLE_LOG_TALLY;
      case "SPECIAL_FOREST_PRODUCT" -> SPECIAL_FOREST_PRODUCT;
      default -> throw new IllegalArgumentException("Unknown return type: " + wireValue);
    };
  }

  /**
   * Maps a stored legacy {@code cksc_type} code back to the domain type — the inverse of
   * {@link #ckscType()}. Used when operating on an already-persisted summary check scale (e.g.
   * adding an SPG row), where the return type is recovered from the stored record rather than a
   * request.
   */
  public static ReturnType fromCkscType(String ckscType) {
    for (ReturnType rt : values()) {
      if (rt.ckscType.equals(ckscType)) {
        return rt;
      }
    }
    throw new IllegalArgumentException("Unknown summary cksc_type: " + ckscType);
  }

  /**
   * Whether the stored {@code cksc_type} belongs to a summary check scale (LTSCS/SLTSCS/SFPSCS).
   * Lets callers guard against operating on a detail/log-tally record before {@link #fromCkscType}
   * (which throws on a non-summary code).
   */
  public static boolean isSummaryCkscType(String ckscType) {
    for (ReturnType rt : values()) {
      if (rt.ckscType.equals(ckscType)) {
        return true;
      }
    }
    return false;
  }
}
