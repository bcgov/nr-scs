package ca.bc.gov.nrs.scs.backend.domain.shared;

public enum YesNo {
  Y,
  N;

  public String displayLabel() {
    return this == Y ? "Yes" : "No";
  }

  /**
   * Lenient by design: unrecognized codes return null rather than throwing, because this is
   * used on read paths over legacy data where a single dirty indicator value must degrade to
   * a blank cell, not fail the whole query. Write paths needing strict validation should use
   * {@code SCSUtils.requireYesNo} before converting.
   */
  public static YesNo fromCode(String code) {
    if (code == null) return null;
    return switch (code.trim().toUpperCase()) {
      case "Y" -> Y;
      case "N" -> N;
      default -> null;
    };
  }

  public static String toCode(YesNo value) {
    return value == null ? null : value.name();
  }

  public static String toLabel(YesNo value) {
    return value == null ? null : value.displayLabel();
  }
}
