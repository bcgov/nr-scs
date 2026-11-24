package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireNotNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireText;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleParams;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ReturnType;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleSpgRowCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.repository.CheckScaleRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orchestrates the single-step summary check scale create (legacy
 * {@code SummaryCheckScaleAction.create}). A summary check scale is persisted as a {@code
 * check_scale} header row plus one or more SPG roll-up rows, both written through {@link
 * CheckScaleRepository} (which owns {@code scs_check_scale_pkg} and {@code
 * scs_check_scale_spg_summry_pkg}). Kept separate from {@link CheckScaleService} because the summary
 * flow is single-step and SPG-row driven, unlike the detail two-step HBCS validate/create flow.
 */
@Service
public class SummaryCheckScaleService {

  private final CheckScaleRepository repository;
  private final CheckScaleService checkScaleService;
  private final CheckScaleReferenceValidator referenceValidator;

  public SummaryCheckScaleService(
      CheckScaleRepository repository,
      CheckScaleService checkScaleService,
      CheckScaleReferenceValidator referenceValidator) {
    this.repository = repository;
    this.checkScaleService = checkScaleService;
    this.referenceValidator = referenceValidator;
  }

  /**
   * Summary check scale rows for the Scaler Summary Check Scales tab (legacy P132). Read-only list,
   * no statistics or filter.
   */
  public List<SummaryCheckScaleEntry> getScalerSummaryCheckScales(String scalerLicenceNo) {
    requireText(scalerLicenceNo, "Scaler licence number is required.");
    return repository.searchScalerSummaryCheckScales(scalerLicenceNo.trim());
  }

  /**
   * Validates and persists a summary check scale: the header via {@code insert_rec} (reusing {@link
   * CheckScaleRepository#createCheckScale}), then each SPG roll-up row. Atomic — a failure on any
   * SPG row rolls back the header.
   */
  @Transactional
  public Long createSummaryCheckScale(SummaryCheckScaleCreateCommand cmd) {
    validate(cmd);
    validateReferences(
        cmd.originalScalerLicenceNo(), cmd.checkScalerLicenceNo(), cmd.timberMark(), cmd.scaleSiteIdNmbr());

    ReturnType returnType = ReturnType.fromCkscType(cmd.ckscType());
    cmd.spgRows().forEach(row -> validateSpgRow(returnType, row));

    Long id = repository.createCheckScale(CheckScaleParams.fromSummaryCreateCommand(cmd));
    if (id == null) {
      throw new BadRequestException("Summary check scale could not be created.");
    }
    for (SummaryCheckScaleSpgRowCommand row : cmd.spgRows()) {
      repository.insertSpgSummaryRow(id, row);
    }
    return id;
  }

  /**
   * Validates and persists a summary check scale header update (legacy {@code
   * SummaryCheckScaleAction.updateSummaryCheckScale}). Loads the existing record (404 on a missing
   * id), enforces the return-type lock against the stored {@code cksc_type} once SPG rows exist
   * (a zero-row record keeps it editable, matching legacy), re-runs the full
   * cross-field header validation, then persists via {@code update_rec}. The header update does NOT
   * touch SPG rows. Returns the freshly re-loaded (SPG-overlaid) record so the form can re-display
   * the persisted values.
   */
  @Transactional
  public CheckScale updateSummaryCheckScale(Long checkScaleId, SummaryCheckScaleUpdateCommand cmd) {
    if (checkScaleId == null) {
      throw new BadRequestException("Check Scale id is required.");
    }

    CheckScale existing = loadById(checkScaleId);
    // Legacy updateSummaryCheckScale.jsp: the return type is locked only once the record has SPG
    // rows. A zero-row record (a legacy partial save) keeps it editable, so the change is allowed
    // and persisted here. Mirrors the JSP disabling the radios when speciesProductGradeList > 0.
    boolean hasSpgRows = existing.speciesSummary() != null && !existing.speciesSummary().isEmpty();
    boolean returnTypeChanged =
        existing.ckscType() == null || !existing.ckscType().equals(cmd.ckscType());
    if (hasSpgRows && returnTypeChanged) {
      throw new BadRequestException("Return Type cannot be changed.");
    }

    validateHeader(
        cmd.partialInd(),
        cmd.loadArrivalNumber(),
        cmd.weighSlipNumber(),
        cmd.originalScalerLicenceNo(),
        cmd.checkScalerLicenceNo(),
        cmd.originalScaleDate(),
        cmd.chkScaleDate());
    validateReferences(
        cmd.originalScalerLicenceNo(), cmd.checkScalerLicenceNo(), cmd.timberMark(), cmd.scaleSiteIdNmbr());

    repository.updateCheckScale(
        checkScaleId, CheckScaleParams.fromSummaryUpdateCommand(cmd, existing));
    return loadById(checkScaleId);
  }

  /**
   * Adds one SPG roll-up row to an existing summary check scale (legacy {@code
   * SummaryCheckScaleAction.addSpg}). Loads the record (404 on a missing id), recovers the stored
   * return type, applies the product/grade blanking for that return type, inserts the row, then
   * returns the freshly reloaded record so the SPG table and roll-up totals refresh. Does not touch
   * the header.
   */
  @Transactional
  public CheckScale addSpgRow(Long checkScaleId, SummaryCheckScaleSpgRowCommand row) {
    if (checkScaleId == null) {
      throw new BadRequestException("Check Scale id is required.");
    }
    CheckScale existing = loadById(checkScaleId);
    ReturnType returnType = ReturnType.fromCkscType(existing.ckscType());
    validateSpgRow(returnType, row);
    repository.insertSpgSummaryRow(checkScaleId, row.blankFor(returnType.isSpecialForestProduct()));
    return loadById(checkScaleId);
  }

  /**
   * Deletes one SPG roll-up row (legacy {@code SummaryCheckScaleAction.deleteSPGSummaryCheckScale})
   * identified by its composite key. 404s if no row matches the key (the delete SP no-ops silently
   * otherwise), enforces the legacy rule that the last remaining SPG row cannot be deleted, then
   * returns the freshly reloaded record. Does not touch the header.
   */
  @Transactional
  public CheckScale deleteSpgRow(Long checkScaleId, String species, String product, String grade) {
    if (checkScaleId == null) {
      throw new BadRequestException("Check Scale id is required.");
    }
    CheckScale existing = loadById(checkScaleId);

    List<SpeciesSummary> rows =
        existing.speciesSummary() == null ? List.of() : existing.speciesSummary();

    boolean keyExists = false;
    for (SpeciesSummary row : rows) {
      if (matchesSpgKey(row, species, product, grade)) {
        keyExists = true;
        break;
      }
    }
    if (!keyExists) {
      throw new ResourceNotFoundException("No matching species product grade row to delete.");
    }

    if (rows.size() <= 1) {
      throw new BadRequestException("Cannot delete the last remaining species product grade row.");
    }

    repository.deleteSpgSummaryRow(checkScaleId, species, product, grade);
    return loadById(checkScaleId);
  }

  /** Whether an SPG row matches the composite delete key (species / product / grade). */
  private static boolean matchesSpgKey(
      SpeciesSummary row, String species, String product, String grade) {
    return Objects.equals(row.speciesCode(), species)
        && Objects.equals(row.productCode(), product)
        && Objects.equals(row.speciesGrade(), grade);
  }

  /**
   * Deletes an entire summary check scale and its SPG rows (legacy {@code
   * SummaryCheckScaleAction.deleteSummaryCheckScale}). Loads first so a missing id 404s rather than
   * silently no-opping; the SPG children cascade in the stored procedure. The frontend navigates to
   * the create form after a successful delete.
   */
  @Transactional
  public void deleteSummaryCheckScale(Long checkScaleId) {
    if (checkScaleId == null) {
      throw new BadRequestException("Check Scale id is required.");
    }
    loadById(checkScaleId);
    repository.deleteCheckScale(checkScaleId);
  }

  private CheckScale loadById(Long checkScaleId) {
    List<CheckScale> rows = checkScaleService.search(CheckScaleSearchCriteria.forId(checkScaleId));
    if (rows.isEmpty()) {
      throw new ResourceNotFoundException(
          "No summary check scale found with id " + checkScaleId);
    }
    CheckScale found = rows.get(0);
    // Summary-only resource: a detail/log-tally id is "not found" here, never mutated.
    if (!ReturnType.isSummaryCkscType(found.ckscType())) {
      throw new ResourceNotFoundException(
          "No summary check scale found with id " + checkScaleId);
    }
    return found;
  }

  /**
   * Conditional SPG gating that bean validation can't express. The unconditional required fields
   * (species, pieces, volumes, values) are enforced by {@code @NotNull} on the request model before
   * this service runs; the product/grade requirement depends on the return type, so it lives here —
   * mirroring legacy {@code CheckScaleSpgSummaryBo.addSummarySPG}: a Special Forest Product row
   * requires a product, plus a grade when that product is {@code XM}; Log Tally / Sample Log Tally
   * requires a grade. Numeric precision is enforced by the DB column constraints (consistent with
   * the rest of the app — see the H-3 error-sanitizing item).
   */
  private void validateSpgRow(ReturnType returnType, SummaryCheckScaleSpgRowCommand row) {
    if (returnType.isSpecialForestProduct()) {
      if (isBlank(row.productCode())) {
        throw new BadRequestException("Product is required.");
      }
      if ("XM".equals(row.productCode()) && isBlank(row.gradeCode())) {
        throw new BadRequestException("Grade is required.");
      }
    } else if (isBlank(row.gradeCode())) {
      throw new BadRequestException("Grade is required.");
    }
  }

  /** Cross-field business rules for the create flow (delegates to the shared header checks). */
  private void validate(SummaryCheckScaleCreateCommand cmd) {
    validateHeader(
        cmd.partialInd(),
        cmd.loadArrivalNumber(),
        cmd.weighSlipNumber(),
        cmd.originalScalerLicenceNo(),
        cmd.checkScalerLicenceNo(),
        cmd.originalScaleDate(),
        cmd.chkScaleDate());
  }

  /**
   * Cross-field business rules shared by the create and update flows. Per-field "required" and
   * length checks are enforced by {@code @Valid} against the {@code @NotNull}/{@code @Size}
   * annotations on the generated request model (the controller returns a 400 with field-level
   * errors before this service runs), and the DB stored procedures enforce referential existence
   * (scaler / timber mark / scale site). The checks here are the ones bean validation cannot
   * express.
   */
  private void validateHeader(
      YesNo partialInd,
      String loadArrivalNumber,
      Integer weighSlipNumber,
      String originalScalerLicenceNo,
      String checkScalerLicenceNo,
      LocalDate originalScaleDate,
      LocalDate chkScaleDate) {
    // partialInd is nullable in the request (LT/SLT force Y in the mapper), so @Valid can't require
    // it; it is mandatory for SFP.
    requireNotNull(partialInd, "Partial Load is required.");

    boolean hasLoadArrival = !isBlank(loadArrivalNumber);
    boolean hasWeighSlip = weighSlipNumber != null;
    if (hasLoadArrival == hasWeighSlip) {
      throw new BadRequestException("Exactly one of Load Arrival # or Weigh Slip # is required.");
    }

    if (originalScalerLicenceNo != null
        && originalScalerLicenceNo.equalsIgnoreCase(checkScalerLicenceNo)) {
      throw new BadRequestException(
          "Check Scaler Licence # must differ from Original Scaler Licence #.");
    }

    requireDateOrder(
        originalScaleDate,
        chkScaleDate,
        "Original Date of Scale must be on or before Check Date of Scale.");
    LocalDate today = LocalDate.now();
    if (originalScaleDate.isAfter(today) || chkScaleDate.isAfter(today)) {
      throw new BadRequestException("Scale dates cannot be in the future.");
    }
  }

  /**
   * Referential existence checks (scaler licences, timber mark, scale site) — legacy parity with
   * {@code CheckScaleBo.validateSummaryCheckScale}. Collects all misses and raises one
   * {@link FieldValidationException} so the client gets per-field inline messages instead of a raw
   * {@code ORA-02291} FK violation from the insert/update.
   */
  private void validateReferences(
      String originalScalerLicenceNo, String checkScalerLicenceNo, String timberMark, String scaleSiteIdNmbr) {
    List<FieldErrorDetail> refErrors =
        referenceValidator.validate(originalScalerLicenceNo, checkScalerLicenceNo, timberMark, scaleSiteIdNmbr);
    if (!refErrors.isEmpty()) {
      throw new FieldValidationException(refErrors);
    }
  }
}
