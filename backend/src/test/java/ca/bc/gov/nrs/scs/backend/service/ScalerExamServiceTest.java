package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamDetail;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.model.ScalerTrainingTypeLov;
import ca.bc.gov.nrs.scs.backend.repository.ScalerExamRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScalerExamService tests")
class ScalerExamServiceTest {

  @Mock
  private ScalerExamRepository scalerExamRepository;

  @Mock
  private ScalerRepository scalerRepository;

  @Mock
  private LovService lovService;

  @InjectMocks
  private ScalerExamService service;

  private ScalerSummaryCore existingScaler(String licenceNo) {
    return new ScalerSummaryCore(licenceNo, null, null, null, null, null, null);
  }

  private ScalerExamRecord examRecord(String licenceNo, String classCode, String typeId) {
    return new ScalerExamRecord(
        licenceNo, classCode, typeId, LocalDate.of(2025, 1, 10),
        null, "SYSTEM", null, "SYSTEM", 1L);
  }

  private ScalerExamCommand examCommand(String typeId, LocalDate completionDate) {
    return new ScalerExamCommand(typeId, completionDate);
  }

  private void stubTypeLov() {
    when(lovService.getScalerTrainingTypeLov()).thenReturn(List.of(
        new ScalerTrainingTypeLov().code("SCEX").scalerTrainingClassCode("SC")));
  }

  @Test
  void getScalerExams_returnsProjectedListWhenScalerExists() {
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    when(scalerExamRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(examRecord("1234", "SC", "SCEX")));

    List<ScalerExamDetail> result = service.getScalerExams("1234");

    assertEquals(1, result.size());
    assertEquals("SCEX", result.get(0).getScalerTrainingTypeId().get());
    assertEquals("SC", result.get(0).getScalerTrainingClassCode().get());
    assertEquals(LocalDate.of(2025, 1, 10), result.get(0).getCompletionDate().get());
    verify(scalerExamRepository).findByScalerLicenceNo("1234");
  }

  @Test
  void getScalerExams_throwsNotFoundWhenScalerMissing() {
    when(scalerRepository.getScalerSummaryCore("9999")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScalerExams("9999"));

    assertEquals("No scaler found with licence number 9999", ex.getMessage());
    verify(scalerExamRepository, never()).findByScalerLicenceNo(any());
  }

  @Test
  void createScalerExam_resolvesClassCodeFromLovAndInserts() {
    ScalerExamCommand request = examCommand("SCEX", LocalDate.of(2025, 1, 10));
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    stubTypeLov();
    when(scalerExamRepository.insert("1234", "SC", "SCEX", LocalDate.of(2025, 1, 10)))
        .thenReturn(examRecord("1234", "SC", "SCEX"));

    ScalerExamDetail result = service.createScalerExam("1234", request);

    assertNotNull(result);
    // the class code comes from the LOV, never from the client
    verify(scalerExamRepository).insert("1234", "SC", "SCEX", LocalDate.of(2025, 1, 10));
  }

  @Test
  void createScalerExam_rejectsMissingType() {
    ScalerExamCommand request = examCommand(null, LocalDate.of(2025, 1, 10));
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerExam("1234", request));

    assertEquals("scalerTrainingTypeId is required.", ex.getMessage());
    verify(scalerExamRepository, never()).insert(any(), any(), any(), any());
  }

  @Test
  void createScalerExam_rejectsUnknownType() {
    ScalerExamCommand request = examCommand("NOPE", LocalDate.of(2025, 1, 10));
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    stubTypeLov();

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerExam("1234", request));

    assertEquals("Unknown exam / upgrade training type: NOPE", ex.getMessage());
    verify(scalerExamRepository, never()).insert(any(), any(), any(), any());
  }

  @Test
  void updateScalerExam_rejectsTypeChange() {
    ScalerExamCommand request = examCommand("OTHER", LocalDate.of(2025, 2, 20));
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScalerExam("1234", "SCEX", request));

    assertEquals("The training type cannot be changed on update.", ex.getMessage());
    verify(scalerExamRepository, never()).update(any(), any(), any(), any());
  }

  @Test
  void updateScalerExam_updatesWhenValid() {
    ScalerExamCommand request = examCommand("SCEX", LocalDate.of(2025, 2, 20));
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    stubTypeLov();
    when(scalerExamRepository.findById("1234", "SC", "SCEX")).thenReturn(examRecord("1234", "SC", "SCEX"));
    when(scalerExamRepository.update("1234", "SC", "SCEX", LocalDate.of(2025, 2, 20)))
        .thenReturn(examRecord("1234", "SC", "SCEX"));

    ScalerExamDetail result = service.updateScalerExam("1234", "SCEX", request);

    assertNotNull(result);
    verify(scalerExamRepository).update("1234", "SC", "SCEX", LocalDate.of(2025, 2, 20));
  }

  @Test
  void updateScalerExam_throwsNotFoundWhenExamMissing() {
    ScalerExamCommand request = examCommand("SCEX", LocalDate.of(2025, 2, 20));
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    stubTypeLov();
    when(scalerExamRepository.findById("1234", "SC", "SCEX")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateScalerExam("1234", "SCEX", request));

    assertEquals("No exam SCEX found for scaler 1234", ex.getMessage());
    verify(scalerExamRepository, never()).update(any(), any(), any(), any());
  }

  @Test
  void deleteScalerExam_deletesWhenExists() {
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    stubTypeLov();
    when(scalerExamRepository.findById("1234", "SC", "SCEX")).thenReturn(examRecord("1234", "SC", "SCEX"));

    service.deleteScalerExam("1234", "SCEX");

    verify(scalerExamRepository).delete("1234", "SC", "SCEX");
  }

  @Test
  void deleteScalerExam_throwsNotFoundWhenExamMissing() {
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(existingScaler("1234"));
    stubTypeLov();
    when(scalerExamRepository.findById("1234", "SC", "SCEX")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteScalerExam("1234", "SCEX"));

    assertEquals("No exam SCEX found for scaler 1234", ex.getMessage());
    verify(scalerExamRepository, never()).delete(eq("1234"), any(), any());
  }

  @Test
  void deleteFirstForScaler_deletesOnlyTheFirstExam() {
    // Legacy parity: only the first (get(0)) exam is removed; extras are left to block the scaler's
    // core delete via ORA-02292, so a multi-exam scaler is not deletable.
    when(scalerExamRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(examRecord("1234", "SC", "SCEX"), examRecord("1234", "SC", "OTHR")));

    service.deleteFirstForScaler("1234");

    verify(scalerExamRepository).delete("1234", "SC", "SCEX");
    verify(scalerExamRepository, never()).delete("1234", "SC", "OTHR");
  }
}
