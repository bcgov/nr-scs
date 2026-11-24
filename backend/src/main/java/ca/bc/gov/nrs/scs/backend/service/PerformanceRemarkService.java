package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isBlank;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;

import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkCommand;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkRecord;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkUpdateCommand;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkDetail;
import ca.bc.gov.nrs.scs.backend.repository.PerformanceRemarkRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.PerformanceRemarkApiMapper;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PerformanceRemarkService {

  private static final String ACTN_LOV = "SCALER_PERFORMANCE_ACTN_CODE";
  private static final String OUTCM_LOV = "SCALER_PERFORMANCE_OUTCM_CODE";
  private static final ZoneId BC_ZONE = ZoneId.of("America/Vancouver");

  private final PerformanceRemarkRepository performanceRemarkRepository;
  private final ScalerService scalerService;
  private final LovService lovService;
  private final CheckScaleService checkScaleService;

  public PerformanceRemarkService(
      PerformanceRemarkRepository performanceRemarkRepository,
      ScalerService scalerService,
      LovService lovService,
      CheckScaleService checkScaleService
  ) {
    this.performanceRemarkRepository = performanceRemarkRepository;
    this.scalerService = scalerService;
    this.lovService = lovService;
    this.checkScaleService = checkScaleService;
  }

  /**
   * Loads a scaler's performance remarks, resolving the action / outcome LOV descriptions
   * (legacy "Issue Type" column) once for the whole list.
   */
  public List<ScalerPerformanceRemarkDetail> getScalerPerformanceRemarks(String rawScalerLicenceNo) {
    String scalerLicenceNo = normalizeLicenceNo(rawScalerLicenceNo);
    assertScalerExists(scalerLicenceNo);

    Map<String, String> actnDescriptions = lovService.getStaticLovDescriptionMap(ACTN_LOV);
    Map<String, String> outcmDescriptions = lovService.getStaticLovDescriptionMap(OUTCM_LOV);

    return performanceRemarkRepository.findByScalerLicenceNo(scalerLicenceNo).stream()
        .map(remark -> toDetail(remark, actnDescriptions, outcmDescriptions))
        .toList();
  }

  /**
   * Creates a performance remark for a scaler, mirroring the legacy
   * {@code ScalerPerformanceRemarkBo.validate} / {@code ScalerPerformanceRemarkCreateAction} rules,
   * then projects the inserted row back through the same LOV description resolution the list uses.
   */
  @Transactional
  public ScalerPerformanceRemarkDetail createScalerPerformanceRemark(
      String rawScalerLicenceNo,
      PerformanceRemarkCreateCommand command
  ) {
    String scalerLicenceNo = normalizeLicenceNo(rawScalerLicenceNo);
    assertScalerExists(scalerLicenceNo);
    validateRemarkRequest(command);

    PerformanceRemarkRecord created = performanceRemarkRepository.insert(scalerLicenceNo, command);

    return toDetail(
        created,
        lovService.getStaticLovDescriptionMap(ACTN_LOV),
        lovService.getStaticLovDescriptionMap(OUTCM_LOV));
  }

  /**
   * Updates a performance remark for a scaler, mirroring the legacy
   * {@code ScalerPerformanceRemarkBo.validate} (update branch) / {@code ScalerPerformanceRemarkUpdateAction}
   * rules. The record must exist and belong to the scaler in the path; the inserted row is projected
   * back through the same LOV description resolution the list uses.
   */
  @Transactional
  public ScalerPerformanceRemarkDetail updateScalerPerformanceRemark(
      String rawScalerLicenceNo,
      Long scalerPerformanceRemarkId,
      PerformanceRemarkUpdateCommand command
  ) {
    String scalerLicenceNo = normalizeLicenceNo(rawScalerLicenceNo);
    // The belongs-to check loads the row and confirms its licence; a found remark implies its
    // scaler exists (FK), so no separate scaler-existence round-trip is needed.
    assertRemarkBelongsToScaler(scalerLicenceNo, scalerPerformanceRemarkId);
    validateRemarkRequest(command);

    PerformanceRemarkRecord updated =
        performanceRemarkRepository.update(scalerLicenceNo, scalerPerformanceRemarkId, command);

    return toDetail(
        updated,
        lovService.getStaticLovDescriptionMap(ACTN_LOV),
        lovService.getStaticLovDescriptionMap(OUTCM_LOV));
  }

  /**
   * Deletes a performance remark from a scaler, mirroring the legacy
   * {@code ScalerPerformanceRemarkDeleteAction}. The record must exist and belong to the scaler in
   * the path.
   */
  @Transactional
  public void deleteScalerPerformanceRemark(String rawScalerLicenceNo, Long scalerPerformanceRemarkId) {
    String scalerLicenceNo = normalizeLicenceNo(rawScalerLicenceNo);
    // The belongs-to check already confirms the remark (and therefore its scaler) exists.
    assertRemarkBelongsToScaler(scalerLicenceNo, scalerPerformanceRemarkId);
    performanceRemarkRepository.delete(scalerPerformanceRemarkId);
  }

  /**
   * Shared create/update validation. The action/outcome "Issue Type" rule is a form-level
   * (cross-field) constraint surfaced as a banner; every other rule is field-scoped and accumulated
   * into a single {@link FieldValidationException} so the client can show each message inline against
   * its input (the {@code field} names match the request/form field keys) rather than parsing prose.
   */
  private void validateRemarkRequest(PerformanceRemarkCommand command) {
    boolean hasAction = !isBlank(command.scalerPerformanceActnCode());
    boolean hasOutcome = !isBlank(command.scalerPerformanceOutcmCode());
    if (hasAction == hasOutcome) {
      throw new BadRequestException(
          "Either an action or an outcome must be selected, but not both.");
    }

    List<FieldErrorDetail> errors = new ArrayList<>();

    LocalDate loggedTimestamp = command.loggedTimestamp();
    if (loggedTimestamp == null) {
      errors.add(new FieldErrorDetail("loggedTimestamp", "Date of incident is required."));
    } else if (loggedTimestamp.isAfter(LocalDate.now(BC_ZONE))) {
      errors.add(new FieldErrorDetail("loggedTimestamp", "Date of incident cannot be in the future."));
    }

    if (isBlank(command.performanceRemarkDesc())) {
      errors.add(new FieldErrorDetail("performanceRemarkDesc", "Description is required."));
    }

    LocalDate suspendStartDate = command.suspendStartDate();
    LocalDate suspendEndDate = command.suspendEndDate();
    if (suspendStartDate != null && suspendEndDate != null && suspendStartDate.isAfter(suspendEndDate)) {
      errors.add(new FieldErrorDetail(
          "suspendEndDate", "Suspension start date must be on or before the suspension end date."));
    }

    Long checkScaleId = command.checkScaleId();
    if (checkScaleId != null && !checkScaleService.existsById(checkScaleId)) {
      errors.add(new FieldErrorDetail(
          "checkScaleId", "A check scale could not be found for " + checkScaleId + "."));
    }

    if (!errors.isEmpty()) {
      throw new FieldValidationException(errors);
    }
  }

  private ScalerPerformanceRemarkDetail toDetail(
      PerformanceRemarkRecord remark,
      Map<String, String> actnDescriptions,
      Map<String, String> outcmDescriptions) {
    return PerformanceRemarkApiMapper.toDetail(
        remark,
        descriptionFor(actnDescriptions, remark.scalerPerformanceActnCode()),
        descriptionFor(outcmDescriptions, remark.scalerPerformanceOutcmCode()));
  }

  // The shared LOV map keys are upper-cased, so look up with the code upper-cased too. A null (or
  // blank-description) result lets the client fall back to the raw code.
  private static String descriptionFor(Map<String, String> descriptions, String code) {
    String key = upperOrNull(code);
    return key == null ? null : descriptions.get(key);
  }

  // Licence numbers are stored upper-case and scalerExists folds before its lookup, so every method
  // folds the path value once up front and uses it for the guard, the query and the write alike —
  // otherwise a lower-case licence passes the guard, then lists nothing (200 []), inserts a
  // lower-case licence, or fails the belongs-to comparison on update/delete.
  private static String normalizeLicenceNo(String scalerLicenceNo) {
    return upperOrNull(scalerLicenceNo);
  }

  private void assertScalerExists(String scalerLicenceNo) {
    if (!scalerService.scalerExists(scalerLicenceNo)) {
      throw new ResourceNotFoundException(
          "No scaler found with licence number " + scalerLicenceNo);
    }
  }

  // The remark id is the record's own key; confirm the loaded row's licence matches the path so a
  // remark can only be edited through its own scaler (compared trimmed — the stored licence is a
  // fixed-width column).
  private void assertRemarkBelongsToScaler(String scalerLicenceNo, Long scalerPerformanceRemarkId) {
    PerformanceRemarkRecord existing = scalerPerformanceRemarkId == null
        ? null
        : performanceRemarkRepository.findById(scalerPerformanceRemarkId);
    if (existing == null
        || scalerLicenceNo == null
        || !scalerLicenceNo.equals(trimToNull(existing.scalerLicenceNo()))) {
      throw new ResourceNotFoundException(
          "No performance remark found with id " + scalerPerformanceRemarkId
              + " for scaler " + scalerLicenceNo);
    }
  }
}
