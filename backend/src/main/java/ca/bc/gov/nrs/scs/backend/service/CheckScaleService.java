package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleParams;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSpgSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleStats;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationResult;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CommonCheckHeaderSource;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CommonOriginalHeaderSource;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyHeader;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ProductGradeSummaryDetail;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ReturnType;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyHeader;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleFilter;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleTab;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDetailRow;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDetailSummaryRow;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDoc;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationField;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationFieldError;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.repository.CheckScaleRepository;
import ca.bc.gov.nrs.scs.backend.repository.ExistenceResult;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CheckScaleService {

  private static final String HBS_LOOKUP_FAILED_PREFIX = "HBS lookup failed: ";
  private static final String SPG_KEY_DELIMITER = "|";
  private static final String EMPTY_STRING = "";

  private final CheckScaleRepository repository;

  public CheckScaleService(CheckScaleRepository repository) {
    this.repository = repository;
  }

  public ScalerCheckScaleTab getScalerCheckScaleTab(String scalerLicenceNo, String filterLabel) {
    SCSUtils.requireText(scalerLicenceNo, "Scaler licence number is required.");
    String licence = scalerLicenceNo.trim();
    ScalerCheckScaleFilter filter = ScalerCheckScaleFilter.fromLabel(filterLabel);
    List<CheckScaleSummary> checkScales =
        repository.searchScalerCheckScaleSummaries(filter, licence);
    CheckScaleStats stats =
        checkScales.isEmpty()
            ? CheckScaleStats.EMPTY
            : repository.calculateCheckScaleStats(filter, licence);
    return new ScalerCheckScaleTab(stats, checkScales);
  }

  public List<CheckScaleSummary> getScaleSiteCheckScales(
      String scaleSiteIdNmbr, String checkScaleTypeCode) {
    SCSUtils.requireText(scaleSiteIdNmbr, "Scale site number is required.");
    String typeCode =
        (checkScaleTypeCode == null || checkScaleTypeCode.isBlank())
            ? null
            : checkScaleTypeCode.trim();
    return repository.searchScaleSiteCheckScaleSummaries(scaleSiteIdNmbr.trim(), typeCode);
  }

  public CheckScaleValidationResult validate(CheckScaleValidationCommand cmd) {
    List<ValidationFieldError> errors = new ArrayList<>();
    boolean isSample = cmd instanceof SampleLogTallyValidationCommand;
    String chkDoc = cmd.checkDocNo();
    Integer chkVer = cmd.checkVersion();
    String orgDoc = cmd.originalDocNo();
    Integer orgVer = cmd.originalVersion();

    checkHbsExists(
        errors,
        chkDoc,
        chkVer,
        isSample,
        ValidationField.CHECK_SCALE_DDN,
        "Check Scale DDN '" + chkDoc + "' does not exist in HBS.");
    checkHbsExists(
        errors,
        orgDoc,
        orgVer,
        isSample,
        ValidationField.ORIGINAL_SCALE_DDN,
        "Original Scale DDN '" + orgDoc + "' does not exist in HBS.");

    checkDdnsAreDistinct(errors, chkDoc, orgDoc);
    checkNoExistingCheckScaleForCheckDdn(errors, isSample, chkDoc, chkVer);
    checkNoExistingCheckScaleForOriginalDdn(errors, isSample, orgDoc, orgVer);
    checkOriginalNotAtMaxChecks(errors, isSample, orgDoc, orgVer);

    if (!errors.isEmpty()) {
      return new CheckScaleValidationResult(false, errors, null);
    }

    try {
      CheckScale draft = buildEnrichedDraft(cmd);
      return new CheckScaleValidationResult(true, List.of(), draft);
    } catch (Exception ex) {
      errors.add(
          new ValidationFieldError(
              ValidationField.CHECK_SCALE_DDN,
              "Could not retrieve CheckScale payload: " + ex.getMessage()));
      return new CheckScaleValidationResult(false, errors, null);
    }
  }

  private void checkHbsExists(
      List<ValidationFieldError> errors,
      String doc,
      Integer ver,
      boolean isSample,
      ValidationField field,
      String missingMessage) {
    if (doc == null || doc.isBlank()) {
      return;
    }
    ExistenceResult res = repository.existsHbsRecord(doc, ver, isSample);
    if (res == null) {
      errors.add(new ValidationFieldError(field, HBS_LOOKUP_FAILED_PREFIX + "unknown error"));
    } else if (res.getErrorMessage() != null) {
      errors.add(new ValidationFieldError(field, HBS_LOOKUP_FAILED_PREFIX + res.getErrorMessage()));
    } else if (!res.exists()) {
      errors.add(new ValidationFieldError(field, missingMessage));
    }
  }

  private void checkDdnsAreDistinct(
      List<ValidationFieldError> errors, String chkDoc, String orgDoc) {
    if (chkDoc == null || orgDoc == null || chkDoc.isBlank() || orgDoc.isBlank()) {
      return;
    }
    if (chkDoc.equals(orgDoc)) {
      String msg = "Check Scale DDN and Original Scale DDN cannot be the same.";
      errors.add(new ValidationFieldError(ValidationField.CHECK_SCALE_DDN, msg));
      errors.add(new ValidationFieldError(ValidationField.ORIGINAL_SCALE_DDN, msg));
    }
  }

  private void checkNoExistingCheckScaleForCheckDdn(
      List<ValidationFieldError> errors, boolean isSample, String chkDoc, Integer chkVer) {
    if (chkDoc == null || chkDoc.isBlank()) {
      return;
    }
    if (!findByCheckDdn(isSample, chkDoc, chkVer).isEmpty()) {
      errors.add(
          new ValidationFieldError(
              ValidationField.CHECK_SCALE_DDN,
              "A check scale already exists for Check Scale DDN '" + chkDoc + "'."));
    }
  }

  private void checkNoExistingCheckScaleForOriginalDdn(
      List<ValidationFieldError> errors, boolean isSample, String orgDoc, Integer orgVer) {
    if (orgDoc == null || orgDoc.isBlank()) {
      return;
    }
    // Legacy semantics: search by chkDDN equals our orgDDN — guards against the original being
    // someone else's prior check scale.
    if (!findByCheckDdn(isSample, orgDoc, orgVer).isEmpty()) {
      errors.add(
          new ValidationFieldError(
              ValidationField.ORIGINAL_SCALE_DDN,
              "Original Scale DDN '" + orgDoc + "' has already been used as a check scale."));
    }
  }

  private void checkOriginalNotAtMaxChecks(
      List<ValidationFieldError> errors, boolean isSample, String orgDoc, Integer orgVer) {
    if (orgDoc == null || orgDoc.isBlank()) {
      return;
    }
    // Legacy rule: max 2 prior check scales per original; the rule fires when 2+ already exist.
    if (findByOriginalDdn(isSample, orgDoc, orgVer).size() > 1) {
      errors.add(
          new ValidationFieldError(
              ValidationField.ORIGINAL_SCALE_DDN,
              "Maximum check scales already exist for Original Scale DDN '" + orgDoc + "'."));
    }
  }

  private List<CheckScale> findByCheckDdn(boolean isSample, String doc, Integer ver) {
    return repository.searchCheckScales(
        CheckScaleSearchCriteria.forCheckLookup(isSample, doc, ver));
  }

  private List<CheckScale> findByOriginalDdn(boolean isSample, String doc, Integer ver) {
    return repository.searchCheckScales(
        CheckScaleSearchCriteria.forOriginalLookup(isSample, doc, ver));
  }

  private CheckScale buildEnrichedDraft(CheckScaleValidationCommand cmd) {
    return switch (cmd) {
      case LogTallyValidationCommand log -> buildLogTallyDraft(log);
      case SampleLogTallyValidationCommand sample -> buildSampleDraft(sample);
    };
  }

  private CheckScale buildLogTallyDraft(LogTallyValidationCommand cmd) {
    String chkDoc = cmd.checkDocNo();
    Integer chkVer = cmd.checkVersion();
    String orgDoc = cmd.originalDocNo();
    Integer orgVer = cmd.originalVersion();

    LogTallyHeader chkHeader = repository.getLogTallyHeader(chkDoc, chkVer);
    LogTallyHeader orgHeader = repository.getLogTallyHeader(orgDoc, orgVer);
    Totals chkTotals = totalsFromDetails(repository.getLogTallyDetail(chkDoc, chkVer));
    Totals orgTotals = totalsFromDetails(repository.getLogTallyDetail(orgDoc, orgVer));
    List<SpeciesSummary> species =
        compileSpeciesSummary(
            repository.getLogTallyDetailSummary(orgDoc, orgVer),
            repository.getLogTallyDetailSummary(chkDoc, chkVer));

    return assembleDraft(
        cmd, chkHeader, orgHeader, SampleExclusive.EMPTY, chkTotals, orgTotals, species);
  }

  private CheckScale buildSampleDraft(SampleLogTallyValidationCommand cmd) {
    String chkDoc = cmd.checkDocNo();
    Integer chkVer = cmd.checkVersion();
    String orgDoc = cmd.originalDocNo();
    Integer orgVer = cmd.originalVersion();

    SampleLogTallyHeader chkHeader = repository.getSampleLogTallyHeader(chkDoc, chkVer);
    SampleLogTallyHeader orgHeader = repository.getSampleLogTallyHeader(orgDoc, orgVer);
    Totals chkTotals = totalsFromDetails(repository.getSampleLogTallyDetail(chkDoc, chkVer));
    Totals orgTotals = totalsFromDetails(repository.getSampleLogTallyDetail(orgDoc, orgVer));
    List<SpeciesSummary> species =
        compileSpeciesSummary(
            repository.getSampleLogTallyDetailSummary(orgDoc, orgVer),
            repository.getSampleLogTallyDetailSummary(chkDoc, chkVer));

    return assembleDraft(
        cmd,
        chkHeader,
        orgHeader,
        extractSampleExclusive(chkHeader),
        chkTotals,
        orgTotals,
        species);
  }

  private CheckScale assembleDraft(
      CheckScaleValidationCommand cmd,
      CommonCheckHeaderSource chkHeader,
      CommonOriginalHeaderSource orgHeader,
      SampleExclusive sampleExclusive,
      Totals chkTotals,
      Totals orgTotals,
      List<SpeciesSummary> species) {
    CommonCheckFields chk = extractCheckFields(chkHeader);
    CommonOriginalFields org = extractOriginalFields(orgHeader);

    TallyDoc chkTallyDoc = new TallyDoc(cmd.checkDocNo(), cmd.checkVersion());
    TallyDoc orgTallyDoc = new TallyDoc(cmd.originalDocNo(), cmd.originalVersion());

    ScaleSide orgScaleSide =
        new ScaleSide(
            org.scaleDate(),
            org.scaleReturnNo(),
            orgTotals.tops(),
            orgTotals.butts(),
            orgTotals.length(),
            orgTotals.volume(),
            orgTotals.pieces());

    ScaleSide chkScaleSide =
        new ScaleSide(
            chk.scaleDate(),
            chk.scaleReturnNo(),
            chkTotals.tops(),
            chkTotals.butts(),
            chkTotals.length(),
            chkTotals.volume(),
            chkTotals.pieces());

    return new CheckScale(
        cmd instanceof SampleLogTallyValidationCommand,
        chkTallyDoc,
        orgTallyDoc,
        chk.checkReplacesOriginal(),
        org.scalerLicence(),
        chk.scalerLicence(),
        org.secondaryLicence(),
        chk.scaleSiteIdNmbr(),
        chk.timberMark(),
        chk.loadArrivalNumber(),
        sampleExclusive.weighSlipNumber(),
        sampleExclusive.population(),
        sampleExclusive.stratum(),
        sampleExclusive.samplingYear(),
        orgScaleSide,
        chkScaleSide,
        species);
  }

  public List<CheckScale> search(CheckScaleSearchCriteria criteria) {
    List<CheckScale> rows = repository.searchCheckScales(criteria);
    if (rows == null || rows.isEmpty()) {
      return rows == null ? List.of() : rows;
    }
    List<CheckScale> out = new ArrayList<>(rows.size());
    for (CheckScale cs : rows) {
      out.add(enrichForRead(cs));
    }
    return out;
  }

  /**
   * Lightweight existence check by primary key. Unlike {@link #search}, this deliberately skips the
   * read-enrichment pipeline (log-tally / sample / SPG summary lookups): callers validating a
   * foreign-key reference only need to know the row is present, and enrichment adds several
   * round-trips and its own failure surface that must not fail an otherwise-valid caller.
   */
  public boolean existsById(Long checkScaleId) {
    if (checkScaleId == null) {
      return false;
    }
    List<CheckScale> rows = repository.searchCheckScales(CheckScaleSearchCriteria.forId(checkScaleId));
    return rows != null && !rows.isEmpty();
  }

  private CheckScale enrichForRead(CheckScale cs) {
    if (notBlank(TallyDoc.docNoOf(cs.chkLogTally()))) {
      return enrichFromLogTally(cs);
    }
    if (notBlank(TallyDoc.docNoOf(cs.chkSampleLogTally()))) {
      return enrichFromSampleLogTally(cs);
    }
    return enrichFromLegacySpg(cs);
  }

  private CheckScale enrichFromLegacySpg(CheckScale cs) {
    if (cs.checkScaleId() == null) {
      return cs;
    }
    CheckScaleSpgSummary spg = fetchSpgSummaryOrNull(cs.checkScaleId());
    return spg == null ? cs : overlaySpgSummary(cs, spg);
  }

  private CheckScaleSpgSummary fetchSpgSummaryOrNull(Long checkScaleId) {
    try {
      return repository.getSpgSummary(checkScaleId);
    } catch (Exception ignored) {
      // Some environments can't execute the SPG_SUMMRY package; treat as missing.
      return null;
    }
  }

  private static CheckScale overlaySpgSummary(CheckScale cs, CheckScaleSpgSummary spg) {
    return cs.withOriginalScale(
            cs.originalScale()
                .withTotalVolume(spg.origNetVolume())
                .withTotalPieces(spg.origPieces()))
        .withCheckScale(
            cs.checkScale().withTotalVolume(spg.chkNetVolume()).withTotalPieces(spg.chkPieces()))
        .withSpeciesSummary(spg.speciesSummary());
  }

  private CheckScale enrichFromLogTally(CheckScale cs) {
    String chkDoc = TallyDoc.docNoOf(cs.chkLogTally());
    Integer chkVer = TallyDoc.versionOf(cs.chkLogTally());
    String orgDoc = TallyDoc.docNoOf(cs.orgLogTally());
    Integer orgVer = TallyDoc.versionOf(cs.orgLogTally());

    LogTallyHeader chkHeader = repository.getLogTallyHeader(chkDoc, chkVer);
    LogTallyHeader orgHeader = repository.getLogTallyHeader(orgDoc, orgVer);

    List<LogTallyDetailSummary> orgSummary = repository.getLogTallyDetailSummary(orgDoc, orgVer);
    List<LogTallyDetailSummary> chkSummary = repository.getLogTallyDetailSummary(chkDoc, chkVer);

    Totals orgTotals = totalsFromSummaries(orgSummary);
    Totals chkTotals = totalsFromSummaries(chkSummary);
    List<SpeciesSummary> species = compileSpeciesSummary(orgSummary, chkSummary);

    return applyEnrichment(
        cs, chkHeader, orgHeader, SampleExclusive.EMPTY, orgTotals, chkTotals, species);
  }

  private CheckScale enrichFromSampleLogTally(CheckScale cs) {
    String chkDoc = TallyDoc.docNoOf(cs.chkSampleLogTally());
    Integer chkVer = TallyDoc.versionOf(cs.chkSampleLogTally());
    String orgDoc = TallyDoc.docNoOf(cs.orgSampleLogTally());
    Integer orgVer = TallyDoc.versionOf(cs.orgSampleLogTally());

    SampleLogTallyHeader chkHeader = repository.getSampleLogTallyHeader(chkDoc, chkVer);
    SampleLogTallyHeader orgHeader = repository.getSampleLogTallyHeader(orgDoc, orgVer);

    List<SampleLogTallyDetailSummary> orgSummary =
        repository.getSampleLogTallyDetailSummary(orgDoc, orgVer);
    List<SampleLogTallyDetailSummary> chkSummary =
        repository.getSampleLogTallyDetailSummary(chkDoc, chkVer);

    Totals orgTotals = totalsFromSummaries(orgSummary);
    Totals chkTotals = totalsFromSummaries(chkSummary);
    List<SpeciesSummary> species = compileSpeciesSummary(orgSummary, chkSummary);

    return applyEnrichment(
        cs, chkHeader, orgHeader, extractSampleExclusive(chkHeader), orgTotals, chkTotals, species);
  }

  private CheckScale applyEnrichment(
      CheckScale cs,
      CommonCheckHeaderSource chkHeader,
      CommonOriginalHeaderSource orgHeader,
      SampleExclusive sampleExclusive,
      Totals orgTotals,
      Totals chkTotals,
      List<SpeciesSummary> species) {

    CommonCheckFields chk = extractCheckFields(chkHeader);
    CommonOriginalFields org = extractOriginalFields(orgHeader);

    ScaleSide orgScaleSide =
        new ScaleSide(
            org.scaleDate(),
            org.scaleReturnNo(),
            orgTotals.tops(),
            orgTotals.butts(),
            orgTotals.length(),
            orgTotals.volume(),
            orgTotals.pieces());

    ScaleSide chkScaleSide =
        new ScaleSide(
            chk.scaleDate(),
            chk.scaleReturnNo(),
            chkTotals.tops(),
            chkTotals.butts(),
            chkTotals.length(),
            chkTotals.volume(),
            chkTotals.pieces());

    return cs.withCheckReplacesOriginal(chk.checkReplacesOriginal())
        .withOriginalScalerLicenceNo(org.scalerLicence())
        .withCheckScalerLicenceNo(chk.scalerLicence())
        .withSecondScalerLicenceNo(org.secondaryLicence())
        .withScaleSiteIdNmbr(chk.scaleSiteIdNmbr())
        .withTimberMark(chk.timberMark())
        .withLoadArrivalNumber(chk.loadArrivalNumber())
        .withWeighSlipNumber(sampleExclusive.weighSlipNumber())
        .withPopulation(sampleExclusive.population())
        .withStratum(sampleExclusive.stratum())
        .withSamplingYear(sampleExclusive.samplingYear())
        .withOriginalScale(orgScaleSide)
        .withCheckScale(chkScaleSide)
        .withSpeciesSummary(species);
  }

  @Transactional
  public Long createCheckScale(CheckScaleCreateCommand cmd) {
    requireNotNull(cmd.checkScaleTypeCode(), "Check Scale Type is required.");
    requireNotNull(cmd.followedGoodPractice(), "Followed Good Practices is required.");
    requireNotNull(cmd.originalWithinStandard(), "Original Within Standard is required.");
    requireNotNull(cmd.originalScaleNetValue(), "Original Scale Net Value is required.");
    requireNotNull(cmd.checkScaleNetValue(), "Check Scale Net Value is required.");

    if (!notBlank(cmd.checkDocNo()) || !notBlank(cmd.originalDocNo())) {
      throw new BadRequestException("Both Check and Original document refs must be supplied.");
    }

    Long id = repository.createCheckScale(CheckScaleParams.fromCreateCommand(cmd));
    if (id == null) {
      throw new BadRequestException("Check scale could not be created.");
    }
    return id;
  }

  /**
   * Updates the six editable fields of an existing HBCS check scale (legacy P077). Loads the stored
   * row to recover the immutable doc refs (and to 404 on a missing id), then persists via
   * {@code update_rec}. The update touches only the six editable fields — refs and HBS-derived data
   * are unchanged — so the response is built by overlaying the new values onto the already-enriched
   * record rather than paying for a second search + enrichment round-trip.
   */
  @Transactional
  public CheckScale updateCheckScale(CheckScaleUpdateCommand cmd) {
    requireNotNull(cmd.checkScaleId(), "Check Scale id is required.");
    requireNotNull(cmd.checkScaleTypeCode(), "Check Scale Type is required.");
    requireNotNull(cmd.followedGoodPractice(), "Followed Good Practices is required.");
    requireNotNull(cmd.originalWithinStandard(), "Original Within Standard is required.");
    requireNotNull(cmd.originalScaleNetValue(), "Original Scale Net Value is required.");
    requireNotNull(cmd.checkScaleNetValue(), "Check Scale Net Value is required.");

    CheckScale existing = loadById(cmd.checkScaleId());
    repository.updateCheckScale(
        cmd.checkScaleId(), CheckScaleParams.fromUpdateCommand(cmd, existing));
    return existing
        .withCheckScaleTypeCode(cmd.checkScaleTypeCode())
        .withFollowedGoodPractice(cmd.followedGoodPractice())
        .withOriginalWithinStandard(cmd.originalWithinStandard())
        .withCommentTxt(cmd.commentTxt())
        .withOriginalScaleNetValue(cmd.originalScaleNetValue())
        .withCheckScaleNetValue(cmd.checkScaleNetValue());
  }

  /**
   * Deletes a detail check scale and its SPG-summary children (legacy {@code CheckScaleAction.delete}
   * → {@code scs_check_scale_pkg.delete_rec}). Loads first so a missing id 404s rather than silently
   * no-opping; the SPG children cascade in the stored procedure. Legacy applied no application-level
   * guard here — a restricting child FK (if any) surfaces through the global DB-error handler, and the
   * legacy "with existing letter" guard was never wired for check scales.
   */
  @Transactional
  public void deleteCheckScale(Long checkScaleId) {
    if (checkScaleId == null) {
      throw new BadRequestException("Check Scale id is required.");
    }
    loadById(checkScaleId);
    repository.deleteCheckScale(checkScaleId);
  }

  private CheckScale loadById(Long checkScaleId) {
    List<CheckScale> rows = search(CheckScaleSearchCriteria.forId(checkScaleId));
    if (rows.isEmpty()) {
      throw new ResourceNotFoundException("No check scale found with id " + checkScaleId);
    }
    CheckScale found = rows.get(0);
    // Detail-only resource: a summary check scale id is "not found" here, never mutated — mirrors
    // SummaryCheckScaleService.loadById rejecting a detail id. Keeps the detail update/delete
    // endpoints (CHECK_SCALE_UPDATE / CHECK_SCALE_DELETE) from acting on a summary record even if a
    // future role split ever granted one delete permission without the other.
    if (ReturnType.isSummaryCkscType(found.ckscType())) {
      throw new ResourceNotFoundException("No check scale found with id " + checkScaleId);
    }
    return found;
  }

  private static final class Totals {
    private double volume;
    private int pieces;
    private int tops;
    private int butts;
    private double length;

    Double volume() {
      return volume;
    }

    Integer pieces() {
      return pieces;
    }

    Integer tops() {
      return tops;
    }

    Integer butts() {
      return butts;
    }

    Double length() {
      return length;
    }

    void accumulate(TallyDetailRow r) {
      if (r == null) return;
      Integer t = r.top();
      Integer b = r.butt();
      Double l = r.length();
      BigDecimal n = r.netVolume();
      pieces += computePieces(t);
      if (t != null) tops += t;
      if (b != null) butts += b;
      if (l != null) length += l;
      if (n != null) volume += n.doubleValue();
    }

    void accumulate(TallyDetailSummaryRow r) {
      if (r == null) return;
      if (r.netVolume() != null) volume += r.netVolume();
      if (r.pieces() != null) pieces += r.pieces();
      if (r.top() != null) tops += r.top();
      if (r.butt() != null) butts += r.butt();
      if (r.netLength() != null) length += r.netLength();
    }

    private static int computePieces(Integer top) {
      if (top == null) return 1;
      return top > 0 ? top : 1;
    }
  }

  /** Common check-header values shared by log-tally and sample-log-tally flavors. */
  private record CommonCheckFields(
      String scalerLicence,
      String loadArrivalNumber,
      String timberMark,
      String scaleSiteIdNmbr,
      YesNo checkReplacesOriginal,
      LocalDate scaleDate,
      Integer scaleReturnNo) {}

  /** Common original-header values shared by log-tally and sample-log-tally flavors. */
  private record CommonOriginalFields(
      String scalerLicence, String secondaryLicence, LocalDate scaleDate, Integer scaleReturnNo) {}

  /** Sample-log-tally check-header values that don't exist on the log-tally header. */
  private record SampleExclusive(
      String population, String stratum, Integer samplingYear, Integer weighSlipNumber) {
    static final SampleExclusive EMPTY = new SampleExclusive(null, null, null, null);
  }

  private static CommonCheckFields extractCheckFields(CommonCheckHeaderSource h) {
    if (h == null) {
      return new CommonCheckFields(null, null, null, null, null, null, null);
    }
    return new CommonCheckFields(
        h.primaryLicenseNumber(),
        h.loadArrivalNumber(),
        h.timberMark(),
        h.scaleSiteIdNmbr(),
        YesNo.fromCode(h.checkReplacesOriginalInd()),
        h.scaleDate(),
        h.returnNumber());
  }

  private static CommonOriginalFields extractOriginalFields(CommonOriginalHeaderSource h) {
    if (h == null) {
      return new CommonOriginalFields(null, null, null, null);
    }
    return new CommonOriginalFields(
        h.primaryLicenseNumber(), h.secondaryLicenseNumber(), h.scaleDate(), h.returnNumber());
  }

  private static SampleExclusive extractSampleExclusive(SampleLogTallyHeader h) {
    if (h == null) {
      return new SampleExclusive(null, null, null, null);
    }
    return new SampleExclusive(
        h.populationNumber(),
        h.stratumNumber(),
        h.samplingYear(),
        tryParseInt(h.sampledWeighSlip()));
  }

  private static Totals totalsFromDetails(List<? extends TallyDetailRow> rows) {
    Totals t = new Totals();
    if (rows == null) return t;
    for (TallyDetailRow r : rows) t.accumulate(r);
    return t;
  }

  private static Totals totalsFromSummaries(List<? extends TallyDetailSummaryRow> rows) {
    Totals t = new Totals();
    if (rows == null) return t;
    for (TallyDetailSummaryRow r : rows) t.accumulate(r);
    return t;
  }

  private static List<SpeciesSummary> compileSpeciesSummary(
      List<? extends ProductGradeSummaryDetail> orgRows,
      List<? extends ProductGradeSummaryDetail> chkRows) {
    Map<String, SpeciesAccumulator> map = new LinkedHashMap<>();
    accumulateRows(map, orgRows, true);
    accumulateRows(map, chkRows, false);
    return finalizeSpeciesSummary(map);
  }

  private static void accumulateRows(
      Map<String, SpeciesAccumulator> map,
      List<? extends ProductGradeSummaryDetail> rows,
      boolean original) {
    if (rows == null) return;
    for (ProductGradeSummaryDetail r : rows) {
      if (r == null) continue;
      String sp = nullToEmpty(r.speciesCode());
      String pr = nullToEmpty(r.productCode());
      String gr = nullToEmpty(r.speciesGrade());
      String key = sp + SPG_KEY_DELIMITER + pr + SPG_KEY_DELIMITER + gr;
      map.computeIfAbsent(key, k -> new SpeciesAccumulator(sp, gr, pr)).accumulate(r, original);
    }
  }

  private static List<SpeciesSummary> finalizeSpeciesSummary(Map<String, SpeciesAccumulator> map) {
    return map.values().stream().map(SpeciesAccumulator::toSummary).toList();
  }

  private static final class SpeciesAccumulator {
    private final String speciesCode;
    private final String speciesGrade;
    private final String productCode;
    private int orgPieces;
    private double orgNetVolume;
    private int chkPieces;
    private double chkNetVolume;

    SpeciesAccumulator(String speciesCode, String speciesGrade, String productCode) {
      this.speciesCode = speciesCode;
      this.speciesGrade = speciesGrade;
      this.productCode = productCode;
    }

    void accumulate(ProductGradeSummaryDetail row, boolean original) {
      int pcs = row.pieces() == null ? 0 : row.pieces();
      double vol = row.netVolume() == null ? 0.0 : row.netVolume();
      if (original) {
        orgPieces += pcs;
        orgNetVolume += vol;
      } else {
        chkPieces += pcs;
        chkNetVolume += vol;
      }
    }

    SpeciesSummary toSummary() {
      // Net value is a summary-check-scale concept; the log-tally roll-up has no per-species value.
      return new SpeciesSummary(
          speciesCode, speciesGrade, productCode, orgPieces, orgNetVolume, null, chkPieces, chkNetVolume, null);
    }
  }

  private static boolean notBlank(String value) {
    return value != null && !value.isBlank();
  }

  private static String nullToEmpty(String s) {
    return s == null ? EMPTY_STRING : s;
  }

  private static Integer tryParseInt(String s) {
    if (s == null) return null;
    String t = s.trim();
    if (t.isEmpty()) return null;
    try {
      return Integer.valueOf(t);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private static <T> void requireNotNull(T value, String message) {
    if (value == null) {
      throw new BadRequestException(message);
    }
  }
}
