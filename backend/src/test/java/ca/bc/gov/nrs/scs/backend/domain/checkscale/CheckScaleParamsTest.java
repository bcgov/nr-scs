package ca.bc.gov.nrs.scs.backend.domain.checkscale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Guards the type-dependent update bind shape. The six editable fields always come from the command.
 * For HBCS rows the HBS-derived columns are enriched on read but stored null (CKSC_CK1–CK4), so they
 * are re-bound null; for the legacy types those columns hold real stored data and are preserved
 * (legacy P077 {@code mapObjects} forward-copy). Binding the wrong one violates a CHECK constraint —
 * e.g. an enriched weigh_slip on an HBCS row trips CKSC_CK4.
 */
class CheckScaleParamsTest {

  private static CheckScaleUpdateCommand command() {
    return new CheckScaleUpdateCommand(5L, "FCS", YesNo.Y, YesNo.N, "looks good", 100.0, 99.5);
  }

  /** HBCS record as returned by the enriching read: HBS-derived columns carry non-null values. */
  private static CheckScale loadedHbcs() {
    return new CheckScale(
        5L, "type", "HBCS", "P", YesNo.N, YesNo.N, YesNo.Y, "old comment", 1.0, 2.0,
        new TallyDoc("CHK-L", 1), null, new TallyDoc("ORG-L", 2), null,
        "ENR-LIC", "ENR-LIC2", "ENR-LIC3", "ENR-SITE", "ENR-MARK", "ENR-LOAD", 9701,
        "POP", "STR", 2002,
        new ScaleSide(null, null, 9, 9, 9.9, 9.9, 9),
        new ScaleSide(null, null, 8, 8, 8.8, 8.8, 8),
        null, null, null, null, null, null);
  }

  /** A stored (non-HBCS) record whose every non-editable column carries a distinct sentinel value. */
  private static CheckScale loadedLegacy() {
    return new CheckScale(
        5L, "type", "SFPSCS", "P", YesNo.N, YesNo.N, YesNo.Y, "old comment", 1.0, 2.0,
        new TallyDoc("CHK-L", 1), null, new TallyDoc("ORG-L", 2), null,
        "ORIG-LIC", "CHK-LIC", "SECOND-LIC", "SITE", "MARK", "LOAD-1", 7,
        "POP", "STR", 2002,
        new ScaleSide(null, null, 9, 9, 9.9, 9.9, 9),
        new ScaleSide(null, null, 8, 8, 8.8, 8.8, 8),
        null, null, null, null, null, null);
  }

  @Test
  void fromUpdateCommand_takesEditableFieldsFromCommand() {
    CheckScaleParams p = CheckScaleParams.fromUpdateCommand(command(), loadedHbcs());

    assertEquals("FCS", p.checkScaleTypeCode());
    assertEquals(YesNo.Y, p.followedGoodPractice());
    assertEquals(YesNo.N, p.originalWithinStandard());
    assertEquals("looks good", p.commentTxt());
    assertEquals(100.0, p.originalScaleNetValue());
    assertEquals(99.5, p.checkScaleNetValue());
  }

  @Test
  void fromUpdateCommand_hbcs_keepsTypeRefsPartialInd_andNullsEnrichedColumns() {
    CheckScaleParams p = CheckScaleParams.fromUpdateCommand(command(), loadedHbcs());

    assertEquals("HBCS", p.ckscType());
    assertEquals("P", p.partialInd());
    assertEquals("CHK-L", p.chkLogTallyDocNo());
    assertEquals(1, p.chkLogTallyVer());
    assertEquals("ORG-L", p.orgLogTallyDocNo());
    assertEquals(2, p.orgLogTallyVer());

    // Enriched HBS-derived columns must not be persisted (stored null, resolved at read time).
    assertNull(p.checkReplacesOriginal());
    assertNull(p.originalScalerLicenceNo());
    assertNull(p.checkScalerLicenceNo());
    assertNull(p.scaleSiteIdNmbr());
    assertNull(p.timberMark());
    assertNull(p.loadArrivalNumber()); // both must stay null or CKSC_CK4 rejects the HBCS row
    assertNull(p.weighSlipNumber());
    assertNull(p.population());
    assertNull(p.samplingYear());
    assertNull(p.originalScaleTotalTops());
    assertNull(p.chkScaleTotalLength());
  }

  @Test
  void fromUpdateCommand_legacy_preservesStoredColumns() {
    CheckScaleParams p = CheckScaleParams.fromUpdateCommand(command(), loadedLegacy());

    assertEquals("SFPSCS", p.ckscType());
    assertEquals("P", p.partialInd());
    assertEquals(YesNo.Y, p.checkReplacesOriginal());
    assertEquals("ORIG-LIC", p.originalScalerLicenceNo());
    assertEquals("CHK-LIC", p.checkScalerLicenceNo());
    assertEquals("SITE", p.scaleSiteIdNmbr());
    assertEquals("MARK", p.timberMark());
    // load_arrival / weigh_slip must survive or CKSC_CK4 rejects the non-HBCS row.
    assertEquals("LOAD-1", p.loadArrivalNumber());
    assertEquals(7, p.weighSlipNumber());
    assertEquals("POP", p.population());
    assertEquals(2002, p.samplingYear());
    assertEquals(9, p.originalScaleTotalTops());
    assertEquals(8.8, p.chkScaleTotalLength());
  }

  private static SummaryCheckScaleCreateCommand summaryCreateCommand(
      String originalScaler, String checkScaler, String site, String mark) {
    return new SummaryCheckScaleCreateCommand(
        "LTSCS",
        "FULL",
        YesNo.Y,
        YesNo.Y,
        YesNo.Y,
        YesNo.N,
        "comment",
        originalScaler,
        checkScaler,
        site,
        mark,
        "LA1",
        1,
        LocalDate.of(2026, 1, 5),
        10,
        LocalDate.of(2026, 1, 6),
        11,
        List.of());
  }

  /**
   * The stored reference must end up in the SAME case as the record it points at. The existence
   * checks fold case (typing {@code 001b} resolves scaler {@code 001B}), so without folding on the
   * write path the row would validate against {@code 001B} but be SAVED as {@code 001b} — a stored
   * FK spelled differently from its target. Both summary shapes converge on one bind method, so one
   * assertion per flow covers the pair.
   */
  @Test
  void summaryCreate_upperCasesTheReferenceColumnsAndTrimsThem() {
    CheckScaleParams params = CheckScaleParams.fromSummaryCreateCommand(
        summaryCreateCommand("001b", "  002c  ", "019v", "abc123"));

    assertEquals("001B", params.originalScalerLicenceNo());
    assertEquals("002C", params.checkScalerLicenceNo());
    assertEquals("019V", params.scaleSiteIdNmbr());
    assertEquals("ABC123", params.timberMark());
  }

  @Test
  void summaryCreate_leavesNullReferencesNull() {
    // Optional references must stay null rather than becoming "", which would bind an empty FK.
    CheckScaleParams params =
        CheckScaleParams.fromSummaryCreateCommand(summaryCreateCommand("001B", null, null, null));

    assertEquals("001B", params.originalScalerLicenceNo());
    assertNull(params.checkScalerLicenceNo());
    assertNull(params.scaleSiteIdNmbr());
    assertNull(params.timberMark());
  }

  @Test
  void summaryUpdate_foldsTheSameWayAsCreate() {
    // The update shape delegates to the same bind method; pinned so a future split cannot drift.
    SummaryCheckScaleCreateCommand create = summaryCreateCommand("001b", "002c", "019v", "abc123");
    SummaryCheckScaleUpdateCommand update = new SummaryCheckScaleUpdateCommand(
        create.ckscType(),
        create.checkScaleTypeCode(),
        create.partialInd(),
        create.followedGoodPractice(),
        create.originalWithinStandard(),
        create.checkReplacesOriginal(),
        create.commentTxt(),
        create.originalScalerLicenceNo(),
        create.checkScalerLicenceNo(),
        create.scaleSiteIdNmbr(),
        create.timberMark(),
        create.loadArrivalNumber(),
        create.weighSlipNumber(),
        create.originalScaleDate(),
        create.originalScaleReturnNo(),
        create.chkScaleDate(),
        create.chkScaleReturnNo());

    CheckScaleParams params = CheckScaleParams.fromSummaryUpdateCommand(update, null);

    assertEquals("001B", params.originalScalerLicenceNo());
    assertEquals("019V", params.scaleSiteIdNmbr());
  }
}
