package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;
import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamDetail;
import ca.bc.gov.nrs.scs.backend.repository.ScalerExamRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerExamApiMapper;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScalerExamService {

  private final ScalerExamRepository scalerExamRepository;
  private final ScalerRepository scalerRepository;
  private final LovService lovService;

  public ScalerExamService(
      ScalerExamRepository scalerExamRepository,
      ScalerRepository scalerRepository,
      LovService lovService
  ) {
    this.scalerExamRepository = scalerExamRepository;
    this.scalerRepository = scalerRepository;
    this.lovService = lovService;
  }

  public List<ScalerExamDetail> getScalerExams(String scalerLicenceNo) {
    assertScalerExists(scalerLicenceNo);
    return scalerExamRepository.findByScalerLicenceNo(scalerLicenceNo).stream()
        .map(ScalerExamApiMapper::toDetail)
        .toList();
  }

  @Transactional
  public ScalerExamDetail createScalerExam(String scalerLicenceNo, ScalerExamCommand command) {
    assertScalerExists(scalerLicenceNo);

    String typeId = trimToNull(command.scalerTrainingTypeId());
    if (typeId == null) {
      throw new BadRequestException("scalerTrainingTypeId is required.");
    }
    // The class code is derived from the training type LOV, never trusted from the client
    // (mirrors legacy TrainingTypeDelegate.readTrainingTypeCode).
    String classCode = resolveClassCode(typeId);

    ScalerExamRecord created =
        scalerExamRepository.insert(scalerLicenceNo, classCode, typeId, command.completionDate());
    return ScalerExamApiMapper.toDetail(created);
  }

  @Transactional
  public ScalerExamDetail updateScalerExam(
      String scalerLicenceNo,
      String scalerTrainingTypeId,
      ScalerExamCommand command
  ) {
    assertScalerExists(scalerLicenceNo);

    String pathTypeId = trimToNull(scalerTrainingTypeId);
    if (pathTypeId == null) {
      throw new BadRequestException("scalerTrainingTypeId is required.");
    }
    // The training type is immutable on update — only the completion date can change.
    String bodyTypeId = trimToNull(command.scalerTrainingTypeId());
    if (bodyTypeId != null && !bodyTypeId.equals(pathTypeId)) {
      throw new BadRequestException("The training type cannot be changed on update.");
    }

    String classCode = resolveClassCode(pathTypeId);
    assertExamExists(scalerLicenceNo, classCode, pathTypeId);

    ScalerExamRecord updated =
        scalerExamRepository.update(scalerLicenceNo, classCode, pathTypeId, command.completionDate());
    return ScalerExamApiMapper.toDetail(updated);
  }

  @Transactional
  public void deleteScalerExam(String scalerLicenceNo, String scalerTrainingTypeId) {
    assertScalerExists(scalerLicenceNo);

    String typeId = trimToNull(scalerTrainingTypeId);
    if (typeId == null) {
      throw new BadRequestException("scalerTrainingTypeId is required.");
    }
    String classCode = resolveClassCode(typeId);
    assertExamExists(scalerLicenceNo, classCode, typeId);

    scalerExamRepository.delete(scalerLicenceNo, classCode, typeId);
  }

  /**
   * Deletes one of the scaler's exams (if any) for the scaler-delete cascade
   * ({@code ScalerService.deleteScaler}). Legacy {@code ScalerDb.loadScaler} loaded only the first
   * {@code scTrains.get(0)} training row and {@code ScalerDelegate.deleteScaler} deleted just that
   * one; any further exam rows are intentionally left to block the scaler's core delete via
   * ORA-02292 — so a scaler with more than one exam is not deletable, matching legacy. One writer
   * per table: the scaler service delegates here rather than touching {@code scaler_training}
   * directly. The class code comes off the record, so no LOV round-trip is needed.
   */
  @Transactional
  public void deleteFirstForScaler(String scalerLicenceNo) {
    scalerExamRepository.findByScalerLicenceNo(scalerLicenceNo).stream()
        .findFirst()
        .ifPresent(exam -> scalerExamRepository.delete(
            exam.scalerLicenceNo(), exam.scalerTrainingClassCode(), exam.scalerTrainingTypeId()));
  }

  private String resolveClassCode(String typeId) {
    return lovService.getScalerTrainingTypeLov().stream()
        .filter(lov -> typeId.equals(getNullable(lov.getCode())))
        .map(lov -> getNullable(lov.getScalerTrainingClassCode()))
        .filter(Objects::nonNull)
        .findFirst()
        .orElseThrow(() -> new BadRequestException(
            "Unknown exam / upgrade training type: " + typeId));
  }

  private void assertScalerExists(String scalerLicenceNo) {
    if (scalerRepository.getScalerSummaryCore(scalerLicenceNo) == null) {
      throw new ResourceNotFoundException(
          "No scaler found with licence number " + scalerLicenceNo);
    }
  }

  private void assertExamExists(String scalerLicenceNo, String classCode, String typeId) {
    if (scalerExamRepository.findById(scalerLicenceNo, classCode, typeId) == null) {
      throw new ResourceNotFoundException(
          "No exam " + typeId + " found for scaler " + scalerLicenceNo);
    }
  }

}
