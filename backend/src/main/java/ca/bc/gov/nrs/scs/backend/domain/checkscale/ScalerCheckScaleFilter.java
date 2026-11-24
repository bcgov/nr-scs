package ca.bc.gov.nrs.scs.backend.domain.checkscale;

/**
 * The Scaler Check Scales tab filter, controlling which licence columns of the check scale
 * summary view are matched against the scaler's licence number. Labels match the legacy
 * dropdown; an unrecognized label behaves as {@link #ALL} (legacy silently defaults).
 *
 * <p>Producer: {@code CheckScaleService} from the {@code filter} query param.
 * Consumer: {@code CheckScaleRepository} licence-parameter binding for the summary-view
 * search and the stats calculation.
 *
 * <p>Deviation from legacy: for {@link #CHECK}, the legacy list query bound the secondary
 * check + secondary original columns while the stats call on the same screen bound the
 * primary + secondary check columns. The list binding was a legacy bug; both now match the
 * primary and secondary check licence columns.
 */
public enum ScalerCheckScaleFilter {
  ALL("All", true, true, true, true),
  PRIMARY("Primary", true, false, false, false),
  SECONDARY("Secondary", false, true, false, false),
  PRIMARY_SECONDARY("Primary/Secondary", true, true, false, false),
  CHECK("Check", false, false, true, true);

  private final String label;
  private final boolean matchPrimOrig;
  private final boolean matchSecOrig;
  private final boolean matchPrimCheck;
  private final boolean matchSecCheck;

  ScalerCheckScaleFilter(
      String label,
      boolean matchPrimOrig,
      boolean matchSecOrig,
      boolean matchPrimCheck,
      boolean matchSecCheck) {
    this.label = label;
    this.matchPrimOrig = matchPrimOrig;
    this.matchSecOrig = matchSecOrig;
    this.matchPrimCheck = matchPrimCheck;
    this.matchSecCheck = matchSecCheck;
  }

  public String primOrigLicenceNo(String scalerLicenceNo) {
    return matchPrimOrig ? scalerLicenceNo : null;
  }

  public String secOrigLicenceNo(String scalerLicenceNo) {
    return matchSecOrig ? scalerLicenceNo : null;
  }

  public String primCheckLicenceNo(String scalerLicenceNo) {
    return matchPrimCheck ? scalerLicenceNo : null;
  }

  public String secCheckLicenceNo(String scalerLicenceNo) {
    return matchSecCheck ? scalerLicenceNo : null;
  }

  public static ScalerCheckScaleFilter fromLabel(String label) {
    if (label == null) return ALL;
    for (ScalerCheckScaleFilter filter : values()) {
      if (filter.label.equalsIgnoreCase(label.trim())) {
        return filter;
      }
    }
    return ALL;
  }
}
