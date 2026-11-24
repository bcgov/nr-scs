package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.Locale;

/**
 * JDBC bind shape for the {@code scs_check_scale_pkg} write procs — {@code insert_rec} and
 * {@code update_rec} share an identical parameter list, so one shape serves both. Build it with
 * {@link #fromCreateCommand} (insert) or {@link #fromUpdateCommand} (update). For HBCS rows only the
 * refs + user-supplied fields are bound; all HBS-derived columns stay null and are resolved at read
 * time from the linked log_tally row (CHECK_SCALE CK constraint).
 *
 * <p>Producer: {@code CheckScaleService}. Consumer: {@code CheckScaleRepository.createCheckScale} /
 * {@code updateCheckScale}.
 */
public record CheckScaleParams(
    String ckscType,
    String checkScaleTypeCode,
    String partialInd,
    YesNo followedGoodPractice,
    YesNo originalWithinStandard,
    YesNo checkReplacesOriginal,
    String commentTxt,
    Double originalScaleNetValue,
    Double checkScaleNetValue,
    String chkLogTallyDocNo,
    Integer chkLogTallyVer,
    String chkSampleLogTallyDocNo,
    Integer chkSampleLogTallyVer,
    String orgLogTallyDocNo,
    Integer orgLogTallyVer,
    String orgSampleLogTallyDocNo,
    Integer orgSampleLogTallyVer,
    String originalScalerLicenceNo,
    String checkScalerLicenceNo,
    String secondScalerLicenceNo,
    String scaleSiteIdNmbr,
    String timberMark,
    String loadArrivalNumber,
    Integer weighSlipNumber,
    String population,
    String stratum,
    Integer samplingYear,
    LocalDate originalScaleDate,
    Integer originalScaleReturnNo,
    Integer originalScaleTotalTops,
    Integer originalScaleTotalButts,
    Double originalScaleTotalLength,
    LocalDate chkScaleDate,
    Integer chkScaleReturnNo,
    Integer chkScaleTotalTops,
    Integer chkScaleTotalButts,
    Double chkScaleTotalLength,
    String entryUserid,
    String updateUserid) {

  private static final String HBCS_TYPE = "HBCS";

  /**
   * HBCS insert shape — only refs + user-supplied fields are bound; all HBS-derived columns stay
   * null and are resolved at read time from the linked log_tally row (CHECK_SCALE CK constraint).
   * {@code entryUserid} / {@code updateUserid} are populated by the repository from {@code
   * SecurityContext}.
   */
  public static CheckScaleParams fromCreateCommand(CheckScaleCreateCommand cmd) {
    boolean isSample = cmd instanceof SampleLogTallyCreateCommand;
    return new CheckScaleParams(
        cmd.ckscType(),
        cmd.checkScaleTypeCode(),
        null,
        cmd.followedGoodPractice(),
        cmd.originalWithinStandard(),
        null,
        cmd.commentTxt(),
        cmd.originalScaleNetValue(),
        cmd.checkScaleNetValue(),
        isSample ? null : cmd.checkDocNo(),
        isSample ? null : cmd.checkVersion(),
        isSample ? cmd.checkDocNo() : null,
        isSample ? cmd.checkVersion() : null,
        isSample ? null : cmd.originalDocNo(),
        isSample ? null : cmd.originalVersion(),
        isSample ? cmd.originalDocNo() : null,
        isSample ? cmd.originalVersion() : null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null);
  }

  /**
   * Summary check scale insert shape (legacy {@code SummaryCheckScaleAction.create}). The user
   * supplies the header fields directly (no tally-doc refs), so the licence / scale-site / timber-
   * mark / date / return columns carry real values — unlike the HBCS shape which nulls them. The
   * tally-doc refs, scale totals (tops/butts/length) and the header net values stay null: the net
   * values are derived from the SPG rows persisted separately. {@code entryUserid} /
   * {@code updateUserid} are populated by the repository from {@code SecurityContext}.
   */
  public static CheckScaleParams fromSummaryCreateCommand(SummaryCheckScaleCreateCommand cmd) {
    return summaryHeaderParams(cmd);
  }

  /**
   * Summary header update bind shape (legacy {@code SummaryCheckScaleAction.updateSummaryCheckScale}).
   * The user re-supplies the full header, so those columns come from {@code cmd} — including {@code
   * cksc_type} (return type). The service rejects a changed return type before this runs when the
   * record already has SPG rows, so {@code cmd.ckscType()} equals the stored value in that case;
   * on a zero-row record the change is allowed and persisted here (legacy parity). As with the
   * summary insert shape, the tally-doc refs, scale totals and header net values stay null (the net
   * values are derived from the separately-managed SPG rows); audit userids are set by the
   * repository.
   */
  public static CheckScaleParams fromSummaryUpdateCommand(
      SummaryCheckScaleUpdateCommand cmd, CheckScale loaded) {
    // cmd.ckscType() is locked once SPG rows exist (service guard); editable on a zero-row record.
    return summaryHeaderParams(cmd);
  }

  /**
   * Stores a user-supplied reference in the case the referenced record actually uses.
   *
   * <p>Scaler licence numbers, scale site numbers and timber marks are held upper-case. The existence
   * checks now fold case, so `001b` correctly resolves the scaler `001B` — but without folding here too
   * the check scale would be SAVED as `001b`, leaving the stored reference in a different case from the
   * record it points at. Normalising at the one place both the summary insert and update shapes converge
   * keeps the two in step.
   */
  private static String canonicalReference(String value) {
    return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
  }

  /**
   * The bind shape both summary flows share: header fields from the command; tally-doc refs, scale
   * totals and header net values null (the net values are derived from the separately-managed SPG
   * rows); audit userids left to the repository.
   */
  private static CheckScaleParams summaryHeaderParams(SummaryCheckScaleHeader cmd) {
    return new CheckScaleParams(
        cmd.ckscType(),
        cmd.checkScaleTypeCode(),
        YesNo.toCode(cmd.partialInd()),
        cmd.followedGoodPractice(),
        cmd.originalWithinStandard(),
        cmd.checkReplacesOriginal(),
        cmd.commentTxt(),
        null, // originalScaleNetValue — derived from SPG rows
        null, // checkScaleNetValue — derived from SPG rows
        null, // chkLogTallyDocNo
        null, // chkLogTallyVer
        null, // chkSampleLogTallyDocNo
        null, // chkSampleLogTallyVer
        null, // orgLogTallyDocNo
        null, // orgLogTallyVer
        null, // orgSampleLogTallyDocNo
        null, // orgSampleLogTallyVer
        canonicalReference(cmd.originalScalerLicenceNo()),
        canonicalReference(cmd.checkScalerLicenceNo()),
        null, // secondScalerLicenceNo
        canonicalReference(cmd.scaleSiteIdNmbr()),
        canonicalReference(cmd.timberMark()),
        cmd.loadArrivalNumber(),
        cmd.weighSlipNumber(),
        null, // population
        null, // stratum
        null, // samplingYear
        cmd.originalScaleDate(),
        cmd.originalScaleReturnNo(),
        null, // originalScaleTotalTops
        null, // originalScaleTotalButts
        null, // originalScaleTotalLength
        cmd.chkScaleDate(),
        cmd.chkScaleReturnNo(),
        null, // chkScaleTotalTops
        null, // chkScaleTotalButts
        null, // chkScaleTotalLength
        null, // entryUserid — set by repository
        null); // updateUserid — set by repository
  }

  /**
   * Update bind shape (legacy P077). {@code update_rec} rewrites every column, so the six editable
   * fields come from {@code cmd} and the rest from the stored {@code loaded} record — but how the
   * "rest" is bound depends on the check-scale type, because the read path enriches differently:
   *
   * <ul>
   *   <li><b>HBCS</b>: the HBS-derived columns are populated by read-time enrichment but stored
   *       null (CKSC_CK1–CK4 require them null on an HBCS row), so they are re-bound null. Binding
   *       the enriched values back would violate the constraints (e.g. CKSC_CK4 on weigh_slip).
   *   <li><b>Legacy types (LGCS/SLTSCS/LTSCS/SFPSCS)</b>: those columns hold real stored data (only
   *       volume/pieces are SPG-overlaid on read, and those aren't written), so they are preserved —
   *       mirroring the legacy {@code mapObjects(dto, this, true)} forward-copy and keeping the row
   *       valid (e.g. CKSC_CK4 requires a non-null load_arrival or weigh_slip on those types).
   * </ul>
   *
   * {@code checkScaleId} is passed separately to {@code CheckScaleRepository.updateCheckScale}; the
   * audit userids are set by the repository.
   */
  public static CheckScaleParams fromUpdateCommand(CheckScaleUpdateCommand cmd, CheckScale loaded) {
    return HBCS_TYPE.equals(loaded.ckscType())
        ? hbcsUpdateParams(cmd, loaded)
        : legacyUpdateParams(cmd, loaded);
  }

  private static CheckScaleParams hbcsUpdateParams(CheckScaleUpdateCommand cmd, CheckScale loaded) {
    return new CheckScaleParams(
        loaded.ckscType(),
        cmd.checkScaleTypeCode(),
        loaded.partialInd(),
        cmd.followedGoodPractice(),
        cmd.originalWithinStandard(),
        null, // check_replaces — enriched on read; CKSC_CK2 requires null on HBCS
        cmd.commentTxt(),
        cmd.originalScaleNetValue(),
        cmd.checkScaleNetValue(),
        TallyDoc.docNoOf(loaded.chkLogTally()),
        TallyDoc.versionOf(loaded.chkLogTally()),
        TallyDoc.docNoOf(loaded.chkSampleLogTally()),
        TallyDoc.versionOf(loaded.chkSampleLogTally()),
        TallyDoc.docNoOf(loaded.orgLogTally()),
        TallyDoc.versionOf(loaded.orgLogTally()),
        TallyDoc.docNoOf(loaded.orgSampleLogTally()),
        TallyDoc.versionOf(loaded.orgSampleLogTally()),
        // All HBS-derived columns stay null — resolved at read time.
        null, null, null, null, null, null, null,
        null, null, null,
        null, null, null, null, null,
        null, null, null, null, null,
        null, null);
  }

  private static CheckScaleParams legacyUpdateParams(
      CheckScaleUpdateCommand cmd, CheckScale loaded) {
    ScaleSide org = loaded.originalScale();
    ScaleSide chk = loaded.checkScale();
    return new CheckScaleParams(
        loaded.ckscType(),
        cmd.checkScaleTypeCode(),
        loaded.partialInd(),
        cmd.followedGoodPractice(),
        cmd.originalWithinStandard(),
        loaded.checkReplacesOriginal(),
        cmd.commentTxt(),
        cmd.originalScaleNetValue(),
        cmd.checkScaleNetValue(),
        TallyDoc.docNoOf(loaded.chkLogTally()),
        TallyDoc.versionOf(loaded.chkLogTally()),
        TallyDoc.docNoOf(loaded.chkSampleLogTally()),
        TallyDoc.versionOf(loaded.chkSampleLogTally()),
        TallyDoc.docNoOf(loaded.orgLogTally()),
        TallyDoc.versionOf(loaded.orgLogTally()),
        TallyDoc.docNoOf(loaded.orgSampleLogTally()),
        TallyDoc.versionOf(loaded.orgSampleLogTally()),
        loaded.originalScalerLicenceNo(),
        loaded.checkScalerLicenceNo(),
        loaded.secondScalerLicenceNo(),
        loaded.scaleSiteIdNmbr(),
        loaded.timberMark(),
        loaded.loadArrivalNumber(),
        loaded.weighSlipNumber(),
        loaded.population(),
        loaded.stratum(),
        loaded.samplingYear(),
        org.scaleDate(),
        org.returnNo(),
        org.totalTops(),
        org.totalButts(),
        org.totalLength(),
        chk.scaleDate(),
        chk.returnNo(),
        chk.totalTops(),
        chk.totalButts(),
        chk.totalLength(),
        null,
        null);
  }
}
