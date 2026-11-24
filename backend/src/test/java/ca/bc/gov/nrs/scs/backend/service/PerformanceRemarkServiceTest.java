package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkRecord;
import ca.bc.gov.nrs.scs.backend.domain.performanceremark.PerformanceRemarkUpdateCommand;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerPerformanceRemarkDetail;
import ca.bc.gov.nrs.scs.backend.repository.PerformanceRemarkRepository;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("PerformanceRemarkService tests")
class PerformanceRemarkServiceTest {

  private static final LocalDate LOGGED_ON = LocalDate.of(2025, 1, 10);

  @Mock
  private PerformanceRemarkRepository performanceRemarkRepository;

  @Mock
  private ScalerService scalerService;

  @Mock
  private LovService lovService;

  @Mock
  private CheckScaleService checkScaleService;

  @InjectMocks
  private PerformanceRemarkService service;

  private PerformanceRemarkRecord remark(String actnCode, String outcmCode) {
    return new PerformanceRemarkRecord(
        1001L, "1234", LOGGED_ON, "JSMITH", "Late submission",
        actnCode, outcmCode, "free text outcome",
        null, 55001L, null, null, "JSMITH", null, "JSMITH", 1L);
  }

  private PerformanceRemarkCreateCommand createCommand(String actnCode, String outcmCode) {
    return new PerformanceRemarkCreateCommand(
        LOGGED_ON, "Late submission", actnCode, outcmCode, null, null, null, null);
  }

  private PerformanceRemarkUpdateCommand updateCommand(String actnCode, String outcmCode) {
    return new PerformanceRemarkUpdateCommand(
        LOGGED_ON, "Late submission", actnCode, outcmCode, null, null, null, null);
  }

  private static FieldErrorDetail onlyFieldError(FieldValidationException ex) {
    assertEquals(1, ex.getFieldErrors().size());
    return ex.getFieldErrors().get(0);
  }

  @Test
  void getScalerPerformanceRemarks_resolvesIssueTypeDescriptions() {
    when(scalerService.scalerExists("1234")).thenReturn(true);
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_ACTN_CODE"))
        .thenReturn(Map.of("W", "Warning"));
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_OUTCM_CODE"))
        .thenReturn(Map.of("R", "Resolved"));
    when(performanceRemarkRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(remark("W", "R")));

    List<ScalerPerformanceRemarkDetail> result = service.getScalerPerformanceRemarks("1234");

    assertEquals(1, result.size());
    ScalerPerformanceRemarkDetail detail = result.get(0);
    assertEquals("W", detail.getScalerPerformanceActnCode().get());
    assertEquals("Warning", detail.getScalerPerformanceActnDescription().get());
    assertEquals("R", detail.getScalerPerformanceOutcmCode().get());
    assertEquals("Resolved", detail.getScalerPerformanceOutcmDescription().get());
    assertEquals(1001L, detail.getScalerPerformanceRemarkId().get());
    assertEquals(55001L, detail.getCheckScaleId().get());
  }

  @Test
  void getScalerPerformanceRemarks_nullDescriptionsWhenCodesUnknown() {
    when(scalerService.scalerExists("1234")).thenReturn(true);
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_ACTN_CODE")).thenReturn(Map.of());
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_OUTCM_CODE")).thenReturn(Map.of());
    when(performanceRemarkRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(remark(null, null)));

    List<ScalerPerformanceRemarkDetail> result = service.getScalerPerformanceRemarks("1234");

    assertEquals(1, result.size());
    assertNull(result.get(0).getScalerPerformanceActnDescription().get());
    assertNull(result.get(0).getScalerPerformanceOutcmDescription().get());
  }

  @Test
  void getScalerPerformanceRemarks_nullMappedDescriptionFallsThrough() {
    // A code present in the LOV map but with a null description (LovService maps blank -> null)
    // must reach the client as null so it can fall back to the raw code, not as "".
    Map<String, String> actn = new HashMap<>();
    actn.put("W", null);
    when(scalerService.scalerExists("1234")).thenReturn(true);
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_ACTN_CODE")).thenReturn(actn);
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_OUTCM_CODE"))
        .thenReturn(Map.of("R", "Resolved"));
    when(performanceRemarkRepository.findByScalerLicenceNo("1234"))
        .thenReturn(List.of(remark("W", "R")));

    List<ScalerPerformanceRemarkDetail> result = service.getScalerPerformanceRemarks("1234");

    assertEquals(1, result.size());
    assertNull(result.get(0).getScalerPerformanceActnDescription().get());
    assertEquals("Resolved", result.get(0).getScalerPerformanceOutcmDescription().get());
  }

  @Test
  void getScalerPerformanceRemarks_throwsNotFoundWhenScalerMissing() {
    when(scalerService.scalerExists("9999")).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.getScalerPerformanceRemarks("9999"));

    assertEquals("No scaler found with licence number 9999", ex.getMessage());
    verify(performanceRemarkRepository, never()).findByScalerLicenceNo(any());
  }

  @Test
  void createScalerPerformanceRemark_insertsAndResolvesDescriptionsWhenValid() {
    PerformanceRemarkCreateCommand command = createCommand("W", null);
    when(scalerService.scalerExists("1234")).thenReturn(true);
    when(performanceRemarkRepository.insert("1234", command)).thenReturn(remark("W", null));
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_ACTN_CODE"))
        .thenReturn(Map.of("W", "Warning"));
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_OUTCM_CODE")).thenReturn(Map.of());

    ScalerPerformanceRemarkDetail result = service.createScalerPerformanceRemark("1234", command);

    assertEquals("W", result.getScalerPerformanceActnCode().get());
    assertEquals("Warning", result.getScalerPerformanceActnDescription().get());
    verify(performanceRemarkRepository).insert("1234", command);
  }

  @Test
  void createScalerPerformanceRemark_throwsNotFoundWhenScalerMissing() {
    when(scalerService.scalerExists("9999")).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.createScalerPerformanceRemark("9999", createCommand("W", null)));

    assertEquals("No scaler found with licence number 9999", ex.getMessage());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerPerformanceRemark_rejectsWhenBothActionAndOutcome() {
    when(scalerService.scalerExists("1234")).thenReturn(true);

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerPerformanceRemark("1234", createCommand("W", "R")));

    assertEquals("Either an action or an outcome must be selected, but not both.", ex.getMessage());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerPerformanceRemark_rejectsWhenNeitherActionNorOutcome() {
    when(scalerService.scalerExists("1234")).thenReturn(true);

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.createScalerPerformanceRemark("1234", createCommand(null, null)));

    assertEquals("Either an action or an outcome must be selected, but not both.", ex.getMessage());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerPerformanceRemark_rejectsFutureDateOfIncident() {
    PerformanceRemarkCreateCommand command = new PerformanceRemarkCreateCommand(
        LocalDate.now().plusDays(1), "Late submission", "W", null, null, null, null, null);
    when(scalerService.scalerExists("1234")).thenReturn(true);

    FieldValidationException ex = assertThrows(
        FieldValidationException.class,
        () -> service.createScalerPerformanceRemark("1234", command));

    FieldErrorDetail detail = onlyFieldError(ex);
    assertEquals("loggedTimestamp", detail.field());
    assertEquals("Date of incident cannot be in the future.", detail.message());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerPerformanceRemark_rejectsSuspendStartAfterSuspendEnd() {
    PerformanceRemarkCreateCommand command = new PerformanceRemarkCreateCommand(
        LOGGED_ON, "Late submission", "W", null, null,
        LocalDate.of(2025, 3, 1), LocalDate.of(2025, 2, 1), null);
    when(scalerService.scalerExists("1234")).thenReturn(true);

    FieldValidationException ex = assertThrows(
        FieldValidationException.class,
        () -> service.createScalerPerformanceRemark("1234", command));

    FieldErrorDetail detail = onlyFieldError(ex);
    assertEquals("suspendEndDate", detail.field());
    assertEquals("Suspension start date must be on or before the suspension end date.", detail.message());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerPerformanceRemark_rejectsBlankDescription() {
    PerformanceRemarkCreateCommand command = new PerformanceRemarkCreateCommand(
        LOGGED_ON, "   ", "W", null, null, null, null, null);
    when(scalerService.scalerExists("1234")).thenReturn(true);

    FieldValidationException ex = assertThrows(
        FieldValidationException.class,
        () -> service.createScalerPerformanceRemark("1234", command));

    FieldErrorDetail detail = onlyFieldError(ex);
    assertEquals("performanceRemarkDesc", detail.field());
    assertEquals("Description is required.", detail.message());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void createScalerPerformanceRemark_rejectsMissingCheckScale() {
    PerformanceRemarkCreateCommand command = new PerformanceRemarkCreateCommand(
        LOGGED_ON, "Late submission", "W", null, null, null, null, 55001L);
    when(scalerService.scalerExists("1234")).thenReturn(true);
    when(checkScaleService.existsById(55001L)).thenReturn(false);

    FieldValidationException ex = assertThrows(
        FieldValidationException.class,
        () -> service.createScalerPerformanceRemark("1234", command));

    FieldErrorDetail detail = onlyFieldError(ex);
    assertEquals("checkScaleId", detail.field());
    assertEquals("A check scale could not be found for 55001.", detail.message());
    verify(performanceRemarkRepository, never()).insert(any(), any());
  }

  @Test
  void updateScalerPerformanceRemark_updatesAndResolvesDescriptionsWhenValid() {
    PerformanceRemarkUpdateCommand command = updateCommand("W", null);
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remark("W", null));
    when(performanceRemarkRepository.update("1234", 1001L, command)).thenReturn(remark("W", null));
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_ACTN_CODE"))
        .thenReturn(Map.of("W", "Warning"));
    when(lovService.getStaticLovDescriptionMap("SCALER_PERFORMANCE_OUTCM_CODE")).thenReturn(Map.of());

    ScalerPerformanceRemarkDetail result =
        service.updateScalerPerformanceRemark("1234", 1001L, command);

    assertEquals("W", result.getScalerPerformanceActnCode().get());
    assertEquals("Warning", result.getScalerPerformanceActnDescription().get());
    verify(performanceRemarkRepository).update("1234", 1001L, command);
  }

  @Test
  void updateScalerPerformanceRemark_throwsNotFoundWhenRemarkMissing() {
    when(performanceRemarkRepository.findById(1001L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateScalerPerformanceRemark("1234", 1001L, updateCommand("W", null)));

    assertEquals(
        "No performance remark found with id 1001 for scaler 1234", ex.getMessage());
    verify(performanceRemarkRepository, never()).update(any(), any(), any());
  }

  @Test
  void updateScalerPerformanceRemark_throwsNotFoundWhenRemarkBelongsToDifferentScaler() {
    // The remark exists but under a different scaler — a mismatch must read as not-found, not update.
    PerformanceRemarkRecord otherScalerRemark = new PerformanceRemarkRecord(
        1001L, "5678", LOGGED_ON, "JSMITH", "Late submission",
        "W", null, null, null, null, null, null, "JSMITH", null, "JSMITH", 1L);
    when(performanceRemarkRepository.findById(1001L)).thenReturn(otherScalerRemark);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateScalerPerformanceRemark("1234", 1001L, updateCommand("W", null)));

    assertEquals(
        "No performance remark found with id 1001 for scaler 1234", ex.getMessage());
    verify(performanceRemarkRepository, never()).update(any(), any(), any());
  }

  @Test
  void updateScalerPerformanceRemark_rejectsWhenBothActionAndOutcome() {
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remark("W", null));

    BadRequestException ex = assertThrows(
        BadRequestException.class,
        () -> service.updateScalerPerformanceRemark("1234", 1001L, updateCommand("W", "R")));

    assertEquals("Either an action or an outcome must be selected, but not both.", ex.getMessage());
    verify(performanceRemarkRepository, never()).update(any(), any(), any());
  }

  @Test
  void updateScalerPerformanceRemark_rejectsFutureDateOfIncident() {
    PerformanceRemarkUpdateCommand command = new PerformanceRemarkUpdateCommand(
        LocalDate.now().plusDays(1), "Late submission", "W", null, null, null, null, null);
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remark("W", null));

    FieldValidationException ex = assertThrows(
        FieldValidationException.class,
        () -> service.updateScalerPerformanceRemark("1234", 1001L, command));

    FieldErrorDetail detail = onlyFieldError(ex);
    assertEquals("loggedTimestamp", detail.field());
    assertEquals("Date of incident cannot be in the future.", detail.message());
    verify(performanceRemarkRepository, never()).update(any(), any(), any());
  }

  @Test
  void deleteScalerPerformanceRemark_deletesWhenRemarkExists() {
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remark("W", null));

    service.deleteScalerPerformanceRemark("1234", 1001L);

    verify(performanceRemarkRepository).delete(1001L);
  }

  @Test
  void deleteScalerPerformanceRemark_throwsNotFoundWhenRemarkMissing() {
    when(performanceRemarkRepository.findById(1001L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteScalerPerformanceRemark("1234", 1001L));

    assertEquals(
        "No performance remark found with id 1001 for scaler 1234", ex.getMessage());
    verify(performanceRemarkRepository, never()).delete(any());
  }

  // --- Licence case folding: scalerExists folds case, so every query/write must use the folded value.

  private PerformanceRemarkRecord remarkFor(String licenceNo) {
    return new PerformanceRemarkRecord(
        1001L, licenceNo, LOGGED_ON, "JSMITH", "Late submission",
        "W", null, null, null, null, null, null, "JSMITH", null, "JSMITH", 1L);
  }

  @Test
  void getScalerPerformanceRemarks_foldsLowerCaseLicenceForGuardAndQuery() {
    when(scalerService.scalerExists("AB12")).thenReturn(true);
    when(lovService.getStaticLovDescriptionMap(any())).thenReturn(Map.of());
    when(performanceRemarkRepository.findByScalerLicenceNo("AB12"))
        .thenReturn(List.of(remarkFor("AB12")));

    List<ScalerPerformanceRemarkDetail> result = service.getScalerPerformanceRemarks("  ab12 ");

    assertEquals(1, result.size());
    verify(scalerService).scalerExists("AB12");
    verify(performanceRemarkRepository).findByScalerLicenceNo("AB12");
  }

  @Test
  void createScalerPerformanceRemark_insertsUpperCasedLicence() {
    PerformanceRemarkCreateCommand command = createCommand("W", null);
    when(scalerService.scalerExists("AB12")).thenReturn(true);
    when(performanceRemarkRepository.insert("AB12", command)).thenReturn(remarkFor("AB12"));

    service.createScalerPerformanceRemark("ab12", command);

    verify(performanceRemarkRepository).insert("AB12", command);
    verify(performanceRemarkRepository, never()).insert("ab12", command);
  }

  @Test
  void updateScalerPerformanceRemark_lowerCaseLicenceMatchesStoredRemark() {
    PerformanceRemarkUpdateCommand command = updateCommand("W", null);
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remarkFor("AB12"));
    when(performanceRemarkRepository.update("AB12", 1001L, command)).thenReturn(remarkFor("AB12"));

    service.updateScalerPerformanceRemark("ab12", 1001L, command);

    verify(performanceRemarkRepository).update("AB12", 1001L, command);
    verify(performanceRemarkRepository, never()).update("ab12", 1001L, command);
  }

  @Test
  void deleteScalerPerformanceRemark_lowerCaseLicenceMatchesStoredRemark() {
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remarkFor("AB12"));

    service.deleteScalerPerformanceRemark("ab12", 1001L);

    verify(performanceRemarkRepository).delete(1001L);
  }

  @Test
  void deleteScalerPerformanceRemark_blankLicenceIsNotFoundNotNpe() {
    when(performanceRemarkRepository.findById(1001L)).thenReturn(remarkFor("AB12"));

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteScalerPerformanceRemark("   ", 1001L));
    verify(performanceRemarkRepository, never()).delete(any());
  }
}
