package ca.bc.gov.nrs.scs.backend.service;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ExamUpgradeRecord;
import ca.bc.gov.nrs.scs.backend.dto.ExamUpgradeRow;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgrade;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ExamUpgradeRepository;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.service.mapper.ExamUpgradeMapper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class ExamUpgradeService {
    // DESCRIPTION is VARCHAR2(120); reject over-length input here with a specific message rather than
    // letting it reach the DB and surface as the generic procedure error (SCS-561). Enforced in the
    // service — not via an OpenAPI maxLength/@Size — so the friendly message wins over the generic
    // VALIDATION_ERROR, matching AppointmentTypeService (its test documents the rationale).
    private static final int DESCRIPTION_MAX_LENGTH = 120;

    private final ExamUpgradeRepository repository;

    public ExamUpgradeService(ExamUpgradeRepository repository) {
        this.repository = repository;
    }

    public List<ExamUpgrade> getAllExamUpgrades(String classCode) {
        List<ExamUpgradeRow> rows = repository.findAll(classCode);
        return rows.stream()
                .map(ExamUpgradeMapper::toDomain)
                .map(ExamUpgradeMapper::toModel)
                .toList();
    }

    public ExamUpgrade getExamUpgrade(String classCode, String typeId) {
        ExamUpgradeRow row = repository.findByClassCodeAndTypeId(classCode, typeId);
        SCSUtils.requireFound(row, "No exam/upgrade found with class code '" + classCode + "' and type id '" + typeId + "'.");
        return ExamUpgradeMapper.toModel(ExamUpgradeMapper.toDomain(row));
    }

    // Exam/Upgrade (ScalerTrainingType) mutations must evict the "lov-scaler-training-type" cache
    // (LovService.getScalerTrainingTypeLov), otherwise the Exam/Upgrade dropdowns on the Scaler edit,
    // Scaler Exams/Upgrades create, and Scaler query pages keep serving the stale, pre-mutation list
    // for the cache's 24h TTL — an admin-added type never appears in those dropdowns.
    @CacheEvict(value = "lov-scaler-training-type", allEntries = true)
    @Transactional
    public ExamUpgrade createExamUpgrade(ExamUpgradeCreateRequest request) {
        validateCreateRequest(request);
        ExamUpgradeRow createdRow = repository.save(request);
        if (createdRow == null) {
            throw new BadRequestException("Exam / Upgrade could not be created.");
        }
        ExamUpgradeRecord domain = ExamUpgradeMapper.toDomain(createdRow);
        return ExamUpgradeMapper.toModel(domain);
    }

    @CacheEvict(value = "lov-scaler-training-type", allEntries = true)
    @Transactional
    public ExamUpgrade updateExamUpgrade(
            String classCode,
            String typeId,
            ExamUpgradeUpdateRequest request) {
        SCSUtils.requireText(classCode, "Type is required.");
        SCSUtils.requireText(typeId, "scalerTrainingTypeId is required");
        validateUpdateRequest(request);
        ExamUpgradeRow updatedRow = repository.update(classCode, typeId, request);
        if (updatedRow == null) {
            throw new BadRequestException("Exam / Upgrade could not be updated.");
        }
        ExamUpgradeRecord domain = ExamUpgradeMapper.toDomain(updatedRow);
        return ExamUpgradeMapper.toModel(domain);
    }

    @CacheEvict(value = "lov-scaler-training-type", allEntries = true)
    @Transactional
    public void deleteExamUpgrade(String classCode, String typeId) {
        try {
            repository.delete(classCode, typeId);
        } catch (DataIntegrityViolationException ex) {
            throw new BadRequestException("Exam / upgrade has dependent records and cannot be deleted.");
        }
    }

    private void validateCreateRequest(ExamUpgradeCreateRequest request) {
        if (SCSUtils.isBlank(request.getScalerTrainingClassCode())) {
            throw new BadRequestException("Type is required.");
        }
        validateRequiredFields(
                request.getLicenceAccreditInd(),
                request.getDescription(),
                request.getEffectiveDate());
    }

    private void validateUpdateRequest(ExamUpgradeUpdateRequest request) {
        validateRequiredFields(
                request.getLicenceAccreditInd(),
                request.getDescription(),
                request.getEffectiveDate());
    }

    private void validateRequiredFields(
            String licenceAccreditInd,
            String description,
            java.time.LocalDate effectiveDate) {
        SCSUtils.requireText(licenceAccreditInd, "Licence Accredit? is required.");
        SCSUtils.requireText(description, "Description is required.");
        // Measure the raw value the repository persists (it passes request.getDescription() straight
        // through, untrimmed). Trimming here would let a non-UI caller pass the guard with trailing
        // whitespace and still overflow VARCHAR2(120) at the DB — the generic SCS-561 this guard exists
        // to prevent. Matches AppointmentTypeService.validateCommon, which measures description.length().
        if (description.length() > DESCRIPTION_MAX_LENGTH) {
            throw new BadRequestException(
                    "Description can not be greater than " + DESCRIPTION_MAX_LENGTH + " characters.");
        }
        if (effectiveDate == null) {
            throw new BadRequestException("Effective Date is required.");
        }
    }
}
