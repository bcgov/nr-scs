package ca.bc.gov.nrs.scs.backend.domain.scaler;

/**
 * Assigned licence type codes from {@code scs_scaler_assignd_lic_typ_pkg}: Scaling ({@code SCS})
 * and Waste ({@code WA}).
 */
public enum ScalerLicenceType {
  SCS,
  WA;

  /**
   * Lenient by design: unrecognized codes return null rather than throwing, so a dirty legacy
   * indicator degrades to an ignored row on read paths instead of failing the whole load.
   */
  public static ScalerLicenceType fromCode(String code) {
    if (code == null) return null;
    return switch (code.trim().toUpperCase()) {
      case "SCS" -> SCS;
      case "WA" -> WA;
      default -> null;
    };
  }
}
