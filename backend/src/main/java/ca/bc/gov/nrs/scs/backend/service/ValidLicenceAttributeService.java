package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.service.LovService.gradingLovKey;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireNotNull;

import ca.bc.gov.nrs.scs.backend.domain.validlicenceattribute.ValidLicenceAttribute;
import ca.bc.gov.nrs.scs.backend.dto.ValidLicenceAttributeRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeDetail;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ValidLicenceAttributeRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ValidLicenceAttributeMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ValidLicenceAttributeService {

  private static final Logger log = LogManager.getLogger(ValidLicenceAttributeService.class);

  private static final String DEPENDENT_RECORDS_MESSAGE =
      "The current record has been associated to a Scaler and cannot be deleted. "
          + "You can expire this record by setting an expiry date.";

  private final ValidLicenceAttributeRepository repository;
  private final LovService lovService;

  public ValidLicenceAttributeService(
      ValidLicenceAttributeRepository repository,
      LovService lovService) {
    this.repository = repository;
    this.lovService = lovService;
  }

  public List<ValidLicenceAttributeDetail> searchValidLicenceAttributes(
      String scaleGradingSystemCode, String scalerAppointmentType) {
    List<ValidLicenceAttributeRow> rows =
        repository.search(scaleGradingSystemCode, scalerAppointmentType);
    Map<String, GradingCodeAppointmentTypeLov> lovMap = lovService.getGradingCodeAppointmentTypeLovMap();
    Map<String, String> actingMap = lovService.getAppointmentTypeActingMap();
    return rows.stream()
        .map(ValidLicenceAttributeMapper::toDomain)
        .map(ValidLicenceAttributeMapper::toDetail)
        .peek(d -> enrichWithDescription(d, lovMap, actingMap))
        .toList();
  }

  public ValidLicenceAttributeDetail getValidLicenceAttribute(
      String scaleGradingSystemCode, String scalerAppointmentType) {
    ValidLicenceAttributeRow row =
        repository.findByPk(scaleGradingSystemCode, scalerAppointmentType);
    if (row == null) {
      throw new ResourceNotFoundException(
          "No valid licence attribute found for grading system '"
              + scaleGradingSystemCode + "' and appointment type '" + scalerAppointmentType + "'.");
    }
    return getLicenceAttributeDetail(scaleGradingSystemCode, scalerAppointmentType, row);
  }

  private ValidLicenceAttributeDetail getLicenceAttributeDetail(String scaleGradingSystemCode, String scalerAppointmentType, ValidLicenceAttributeRow row) {
    boolean dependent = repository.hasDependentAppointments(scaleGradingSystemCode, scalerAppointmentType);
    ValidLicenceAttribute domain = ValidLicenceAttributeMapper.toDomain(row, dependent);
    ValidLicenceAttributeDetail detail = ValidLicenceAttributeMapper.toDetail(domain);
    Map<String, GradingCodeAppointmentTypeLov> lovMap = lovService.getGradingCodeAppointmentTypeLovMap();
    enrichWithDescription(detail, lovMap, lovService.getAppointmentTypeActingMap());
    return detail;
  }

  // Valid licence attribute mutations must evict the two grading-code/appointment-type LOV caches
  // (LovService.getGradingCodeAppointmentTypeLov + ...LovMap, both fed by SCS_SGCD_SAPT_LOV_VW_PKG,
  // which is a view over this very table). Without eviction a newly added attribute is invisible to
  // the Scaler > Appointments > Add Appointment dropdown and the Scaler create/edit appointment
  // picker for the cache's 24h TTL, and the description enrichment below keeps resolving to null —
  // the reported "newly added licence attributes do not appear in dropdowns" bug. allEntries because
  // the list cache is unkeyed and the map cache is keyed by grading code + appointment type, so a
  // single new combination invalidates whichever entry a reader holds.
  //
  // Evicting *after* the method body (the @CacheEvict default) is deliberate: enrichWithDescription
  // below runs inside the transaction, so an evict-first would let a cold cache be repopulated from
  // an uncommitted read and poison it for 24h if the transaction rolled back. The trade-off is that
  // the create/update response itself carries the pre-evict (null) description; nothing renders it —
  // the maintenance list reloads and the create flow forwards to a fresh GET, both post-evict.
  @CacheEvict(
      value = {"lov-grading-code-appointment-type", "lov-grading-code-appointment-type-map"},
      allEntries = true)
  @Transactional
  public ValidLicenceAttributeDetail createValidLicenceAttribute(
      ValidLicenceAttributeCreateRequest request) {
    validateCreateRequest(request);

    ValidLicenceAttributeRow existing =
        repository.findByPk(request.getScaleGradingSystemCode(), request.getScalerAppointmentType());
    if (existing != null) {
      throw new BadRequestException(
          "A valid licence attribute with grading system '" + request.getScaleGradingSystemCode()
              + "' and appointment type '" + request.getScalerAppointmentType() + "' already exists.");
    }

    ValidLicenceAttributeRow createdRow = repository.insert(request);
    if (createdRow == null) {
      throw new BadRequestException("Valid licence attribute could not be created.");
    }
    return getLicenceAttributeDetail(request.getScaleGradingSystemCode(), request.getScalerAppointmentType(), createdRow);
  }

  @CacheEvict(
      value = {"lov-grading-code-appointment-type", "lov-grading-code-appointment-type-map"},
      allEntries = true)
  @Transactional
  public ValidLicenceAttributeDetail updateValidLicenceAttribute(
      String scaleGradingSystemCode,
      String scalerAppointmentType,
      ValidLicenceAttributeUpdateRequest request) {
    ValidLicenceAttributeRow existingRow =
        repository.findByPk(scaleGradingSystemCode, scalerAppointmentType);
    if (existingRow == null) {
      throw new ResourceNotFoundException(
          "No valid licence attribute found for grading system '"
              + scaleGradingSystemCode + "' and appointment type '" + scalerAppointmentType + "'.");
    }
    validateUpdateRequest(request);

    ValidLicenceAttributeRow updatedRow =
        repository.update(scaleGradingSystemCode, scalerAppointmentType, request);
    if (updatedRow == null) {
      throw new BadRequestException("Valid licence attribute could not be updated.");
    }
    return getLicenceAttributeDetail(scaleGradingSystemCode, scalerAppointmentType, updatedRow);
  }

  @CacheEvict(
      value = {"lov-grading-code-appointment-type", "lov-grading-code-appointment-type-map"},
      allEntries = true)
  @Transactional
  public void deleteValidLicenceAttribute(String scaleGradingSystemCode, String scalerAppointmentType) {
    ValidLicenceAttributeRow existingRow =
        repository.findByPk(scaleGradingSystemCode, scalerAppointmentType);
    if (existingRow == null) {
      throw new ResourceNotFoundException(
          "No valid licence attribute found for grading system '"
              + scaleGradingSystemCode + "' and appointment type '" + scalerAppointmentType + "'.");
    }
    if (repository.hasDependentAppointments(scaleGradingSystemCode, scalerAppointmentType)) {
      throw new BadRequestException(DEPENDENT_RECORDS_MESSAGE);
    }
    try {
      repository.delete(scaleGradingSystemCode, scalerAppointmentType);
    } catch (DataIntegrityViolationException ex) {
      // TOCTOU backstop: the hasDependentAppointments check above passed, but a scaler appointment
      // can be inserted between the check and the delete. Deleting this single parent row can only
      // realistically violate an FK (ORA-02292) — unique/NOT NULL/check violations aren't reachable
      // from this DELETE — so classify it as dependent records. Logged so the actual constraint
      // stays traceable.
      log.warn("Integrity violation deleting valid licence attribute {} / {}",
          scaleGradingSystemCode, scalerAppointmentType, ex);
      throw new BadRequestException(DEPENDENT_RECORDS_MESSAGE);
    }
  }

  private void validateCreateRequest(ValidLicenceAttributeCreateRequest request) {
    if (request.getScaleGradingSystemCode() == null || request.getScaleGradingSystemCode().isBlank()) {
      throw new BadRequestException("Grading System Code is required.");
    }
    if (request.getScalerAppointmentType() == null || request.getScalerAppointmentType().isBlank()) {
      throw new BadRequestException("Appointment Type is required.");
    }
    LocalDate effectiveDate = requireNotNull(request.getEffectiveDate(), "Effective Date is required.");
    LocalDate expiryDate = getNullable(request.getExpiryDate());
    requireDateOrder(effectiveDate, expiryDate, "Expiry Date must be on or after Effective Date.");
  }

  private void validateUpdateRequest(ValidLicenceAttributeUpdateRequest request) {
    LocalDate effectiveDate = requireNotNull(request.getEffectiveDate(), "Effective Date is required.");
    LocalDate expiryDate = getNullable(request.getExpiryDate());
    requireDateOrder(effectiveDate, expiryDate, "Expiry Date must be on or after Effective Date.");
  }

  private void enrichWithDescription(ValidLicenceAttributeDetail detail,
      Map<String, GradingCodeAppointmentTypeLov> lovMap,
      Map<String, String> actingMap) {
    String gradingCode = getNullable(detail.getScaleGradingSystemCode());
    String apptType = getNullable(detail.getScalerAppointmentType());
    if (gradingCode == null || apptType == null) return;
    GradingCodeAppointmentTypeLov lov = lovMap.get(gradingLovKey(gradingCode, apptType));
    if (lov != null) {
      detail.setScalerAppointmentTypeDescription(JsonNullable.of(getNullable(lov.getDescription())));
    }
    String acting = actingMap.get(apptType);
    detail.setScalerAppointmentTypeActing(JsonNullable.of(acting));
  }
}
