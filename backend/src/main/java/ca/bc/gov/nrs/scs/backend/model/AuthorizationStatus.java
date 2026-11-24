package ca.bc.gov.nrs.scs.backend.model;

import java.util.Locale;

public enum AuthorizationStatus {
  VALID,
  ACTIVE,
  CANCELLED,
  EXPIRED;

  public static AuthorizationStatus from(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String v = value.trim().toUpperCase(Locale.ROOT);
    if ("A".equals(v) || "ACTIVE".equals(v)) {
      return ACTIVE;
    }
    if ("C".equals(v) || "CANCELLED".equals(v) || "CANCELED".equals(v)) {
      return CANCELLED;
    }
    if ("E".equals(v) || "EXPIRED".equals(v)) {
      return EXPIRED;
    }
    if ("VALID".equals(v)) {
      return VALID;
    }
    return null;
  }

  /** Canonical value used when sending to Jasper. ACTIVE -> VALID, others map to their name. */
  public String toJasperValue() {
    if (this == ACTIVE) {
      return VALID.name();
    }
    return this.name();
  }
}
