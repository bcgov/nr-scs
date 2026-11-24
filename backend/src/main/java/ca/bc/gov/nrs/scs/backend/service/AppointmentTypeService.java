package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.isYesNo;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.upperOrNull;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.mapNullable;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.AppointmentTypeRepository;
import java.time.LocalDate;
import java.util.List;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class AppointmentTypeService {

  private static final Logger log = LogManager.getLogger(AppointmentTypeService.class);

  private static final int CODE_MAX_LENGTH = 4;
  private static final int DESCRIPTION_MAX_LENGTH = 120;
  private static final String DEPENDENT_RECORDS_MESSAGE =
      "Appointment type has dependent records and cannot be deleted.";

  // Appointment-type mutations must evict every LOV cache derived from the appointment-type
  // tables (see the @CacheEvict annotations on each mutation below), otherwise the dropdowns keep
  // serving the stale pre-mutation list for the cache's 24h TTL — the reported "newly added
  // Appointment Type is missing from the Valid Licence Attributes and Queries - Scalers dropdowns"
  // bug (mirrors the ScaleAuthTemplateService fix). The evicted caches are:
  //   lov-appointment-type              — the plain appointment-type LOV (Queries - Scalers)
  //   lov-appointment-type-acting       — code->acting-ind map keyed by appointment type
  //   lov-grading-code-appointment-type[-map] — grading-code xref views join to the appointment
  //                                       type description, so a description edit changes them too
  // allEntries because these caches are keyed by search args and one appointment type maps to
  // whichever key a call site used.

  private final AppointmentTypeRepository repository;

  public AppointmentTypeService(AppointmentTypeRepository repository) {
    this.repository = repository;
  }

  public List<AppointmentType> getAppointmentTypes(
      String code,
      String description,
      String actingInd,
      LocalDate effectiveDate,
      LocalDate expiryDate
  ) {
    String normalizedCode = trimToNull(code);
    if (normalizedCode != null && normalizedCode.length() > CODE_MAX_LENGTH) {
      throw new BadRequestException("Appointment type code must be 4 characters or less.");
    }

    String normalizedActing = upperOrNull(actingInd);
    if (normalizedActing != null && !isYesNo(normalizedActing)) {
      throw new BadRequestException("Acting indicator must be Y or N.");
    }

    return repository.search(normalizedCode, trimToNull(description), normalizedActing, effectiveDate, expiryDate);
  }

  @CacheEvict(value = {"lov-appointment-type", "lov-appointment-type-acting",
      "lov-grading-code-appointment-type", "lov-grading-code-appointment-type-map"}, allEntries = true)
  public AppointmentType createAppointmentType(AppointmentTypeCreateRequest request) {
    validateCreateRequest(request);

    String code = upperOrNull(request.getCode());
    if (repository.findByCode(code) != null) {
      throw new BadRequestException("Appointment type " + code + " already exists.");
    }

    AppointmentTypeCreateRequest normalized = new AppointmentTypeCreateRequest(
        code,
        trimToNull(request.getDescription()),
        AppointmentTypeCreateRequest.ActingIndEnum.fromValue(upperOrNull(request.getActingInd().getValue())),
        request.getEffectiveDate(),
        request.getExpiryDate());

    return repository.create(normalized);
  }

  @CacheEvict(value = {"lov-appointment-type", "lov-appointment-type-acting",
      "lov-grading-code-appointment-type", "lov-grading-code-appointment-type-map"}, allEntries = true)
  public AppointmentType updateAppointmentType(String appointmentTypeCode, AppointmentTypeUpdateRequest request) {
    String code = SCSUtils.requireText(upperOrNull(appointmentTypeCode), "Appointment type code is required.");
    if (code.length() > CODE_MAX_LENGTH) {
      throw new BadRequestException("Appointment type code must be 4 characters or less.");
    }

    validateUpdateRequest(request);

    if (repository.findByCode(code) == null) {
      throw new ResourceNotFoundException("No appointment type found with code " + code);
    }

    AppointmentTypeUpdateRequest normalized = new AppointmentTypeUpdateRequest(
        trimToNull(request.getDescription()),
        AppointmentTypeUpdateRequest.ActingIndEnum.fromValue(upperOrNull(request.getActingInd().getValue())),
        request.getEffectiveDate(),
        request.getExpiryDate());

    return repository.update(code, normalized);
  }

  @CacheEvict(value = {"lov-appointment-type", "lov-appointment-type-acting",
      "lov-grading-code-appointment-type", "lov-grading-code-appointment-type-map"}, allEntries = true)
  public void deleteAppointmentType(String appointmentTypeCode) {
    String code = SCSUtils.requireText(upperOrNull(appointmentTypeCode), "Appointment type code is required.");
    if (code.length() > CODE_MAX_LENGTH) {
      throw new BadRequestException("Appointment type code must be 4 characters or less.");
    }

    if (repository.findByCode(code) == null) {
      throw new ResourceNotFoundException("No appointment type found with code " + code);
    }

    if (repository.hasDependentScalerAppointments(code)) {
      throw new BadRequestException(DEPENDENT_RECORDS_MESSAGE);
    }

    try {
      repository.delete(code);
    } catch (DataIntegrityViolationException ex) {
      // TOCTOU backstop: the pre-check above passed, but a child row can be inserted between the
      // check and the delete. Deleting this single parent row can only realistically violate an FK
      // (ORA-02292) — unique/NOT NULL/check violations aren't reachable from this DELETE — so
      // classify it as dependent records. Logged so the actual constraint stays traceable.
      log.warn("Integrity violation deleting appointment type {}", code, ex);
      throw new BadRequestException(DEPENDENT_RECORDS_MESSAGE);
    }
  }

  private void validateCreateRequest(AppointmentTypeCreateRequest request) {
    String code = SCSUtils.requireText(upperOrNull(request.getCode()), "Appointment type code is required.");
    if (code.length() > CODE_MAX_LENGTH) {
      throw new BadRequestException("Appointment type code must be 4 characters or less.");
    }

    validateCommon(
        trimToNull(request.getDescription()),
        upperOrNull(mapNullable(request.getActingInd(), AppointmentTypeCreateRequest.ActingIndEnum::getValue)),
        request.getEffectiveDate(),
        request.getExpiryDate());
  }

  private void validateUpdateRequest(AppointmentTypeUpdateRequest request) {
    validateCommon(
        trimToNull(request.getDescription()),
        upperOrNull(mapNullable(request.getActingInd(), AppointmentTypeUpdateRequest.ActingIndEnum::getValue)),
        request.getEffectiveDate(),
        request.getExpiryDate());
  }

  private void validateCommon(
      String description,
      String actingInd,
      LocalDate effectiveDate,
      LocalDate expiryDate
  ) {
    if (description == null) {
      throw new BadRequestException("Description is required.");
    }
    if (description.length() > DESCRIPTION_MAX_LENGTH) {
      throw new BadRequestException(
          "Appointment Description can not be greater than " + DESCRIPTION_MAX_LENGTH + " characters.");
    }
    if (actingInd == null) {
      throw new BadRequestException("Acting indicator is required.");
    }
    if (!isYesNo(actingInd)) {
      throw new BadRequestException("Acting indicator must be Y or N.");
    }
    if (effectiveDate == null) {
      throw new BadRequestException("Effective date is required.");
    }
    if (expiryDate == null) {
      throw new BadRequestException("Expiry date is required.");
    }

    requireDateOrder(effectiveDate, expiryDate,
        "Expiry date must be on or after Effective date.");
  }

}
