package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import ca.bc.gov.nrs.scs.backend.dto.ExamUpgradeRow;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgrade;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgradeUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ExamUpgradeRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("ExamUpgradeService Tests")
class ExamUpgradeServiceTest {

  @Mock private ExamUpgradeRepository repository;

  @InjectMocks private ExamUpgradeService service;

  private ExamUpgradeRow createRow(String classCode, String typeId) {
    ExamUpgradeRow r = new ExamUpgradeRow();
    r.setScalerTrainingClassCode(classCode);
    r.setScalerTrainingTypeId(typeId);
    r.setLicenceAccreditInd("Y");
    r.setDescription("desc");
    r.setEffectiveDate(LocalDate.of(2025, 1, 1));
    r.setExpiryDate(null);
    r.setEntryUserid("system");
    return r;
  }

  @Test
  void listExamUpgrades_returns_list() {
    when(repository.findAll(null)).thenReturn(List.of(createRow("EXAM", "001")));
    List<ExamUpgrade> result = service.getAllExamUpgrades(null);
    assertEquals(1, result.size());
    assertEquals("001", result.get(0).getScalerTrainingTypeId());
    verify(repository).findAll(null);
  }

  @Nested
  class GetTests {
    @Test
    void getExamUpgrade_found() {
      when(repository.findByClassCodeAndTypeId("EXAM", "001")).thenReturn(createRow("EXAM", "001"));
      ExamUpgrade out = service.getExamUpgrade("EXAM", "001");
      assertNotNull(out);
      assertEquals("EXAM", out.getScalerTrainingClassCode());
      assertEquals("001", out.getScalerTrainingTypeId());
    }

    @Test
    void getExamUpgrade_notFound_throws() {
      when(repository.findByClassCodeAndTypeId("EXAM", "999")).thenReturn(null);
      assertThrows(ResourceNotFoundException.class, () -> service.getExamUpgrade("EXAM", "999"));
    }
  }

  @Nested
  class CreateTests {
    @Test
    void createExamUpgrade_valid() {
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("EXAM");
      req.setLicenceAccreditInd("Y");
      req.setDescription("d");
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));

      when(repository.save(any())).thenReturn(createRow("EXAM", "001"));

      ExamUpgrade created = service.createExamUpgrade(req);
      assertNotNull(created);
      assertEquals("001", created.getScalerTrainingTypeId());
      verify(repository).save(any());
    }

    @Test
    void createExamUpgrade_missingClass_throws() {
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("");
      req.setLicenceAccreditInd("Y");
      req.setDescription("d");
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));
      assertThrows(BadRequestException.class, () -> service.createExamUpgrade(req));
    }

    @Test
    void createExamUpgrade_throwsWhenLicenceAccreditMissing() {
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("EXAM");
      req.setLicenceAccreditInd(null);
      req.setDescription("d");
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.createExamUpgrade(req));
      assertEquals("Licence Accredit? is required.", ex.getMessage());
      verify(repository, never()).save(any());
    }

    @Test
    void createExamUpgrade_throwsWhenDescriptionMissing() {
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("EXAM");
      req.setLicenceAccreditInd("Y");
      req.setDescription(null);
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.createExamUpgrade(req));
      assertEquals("Description is required.", ex.getMessage());
      verify(repository, never()).save(any());
    }

    @Test
    void createExamUpgrade_throwsWhenEffectiveDateMissing() {
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("EXAM");
      req.setLicenceAccreditInd("Y");
      req.setDescription("d");
      req.setEffectiveDate(null);

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.createExamUpgrade(req));
      assertEquals("Effective Date is required.", ex.getMessage());
      verify(repository, never()).save(any());
    }

    @Test
    void createExamUpgrade_throwsWhenDescriptionOverLength() {
      // SCS-561: reject an over-length description in the service so non-UI callers get a specific
      // 400 instead of the generic DB procedure error (DESCRIPTION is VARCHAR2(120)).
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("EXAM");
      req.setLicenceAccreditInd("Y");
      req.setDescription("A".repeat(121));
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.createExamUpgrade(req));
      assertEquals("Description can not be greater than 120 characters.", ex.getMessage());
      verify(repository, never()).save(any());
    }

    @Test
    void createExamUpgrade_throwsWhenTrailingWhitespacePushesRawLengthOverLimit() {
      // SCS-561 regression: the guard must measure the raw value the repository persists, not the
      // trimmed length. 118 visible chars + 5 trailing spaces = 123 raw, which overflows VARCHAR2(120)
      // even though trim().length() is 118 — the exact non-UI bypass the guard exists to catch.
      ExamUpgradeCreateRequest req = new ExamUpgradeCreateRequest();
      req.setScalerTrainingClassCode("EXAM");
      req.setLicenceAccreditInd("Y");
      req.setDescription("A".repeat(118) + "     ");
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.createExamUpgrade(req));
      assertEquals("Description can not be greater than 120 characters.", ex.getMessage());
      verify(repository, never()).save(any());
    }
  }

  @Nested
  class UpdateTests {
    @Test
    void updateExamUpgrade_valid() {
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd("N");
      req.setDescription("updated");
      req.setEffectiveDate(LocalDate.of(2025, 2, 1));

      when(repository.update(eq("EXAM"), eq("001"), any())).thenReturn(createRow("EXAM", "001"));

      ExamUpgrade updated = service.updateExamUpgrade("EXAM", "001", req);
      assertNotNull(updated);
      assertEquals("001", updated.getScalerTrainingTypeId());
      verify(repository).update(eq("EXAM"), eq("001"), any());
    }

    @Test
    void updateExamUpgrade_missingPathParams_throws() {
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd("N");
      req.setDescription("x");
      req.setEffectiveDate(LocalDate.of(2025, 2, 1));
      assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("", "001", req));
      assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("EXAM", "", req));
    }

    @Test
    void updateExamUpgrade_repositoryReturnsNull_throws() {
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd("N");
      req.setDescription("x");
      req.setEffectiveDate(LocalDate.of(2025, 2, 1));
      when(repository.update(eq("EXAM"), eq("002"), any())).thenReturn(null);
      assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("EXAM", "002", req));
    }

    @Test
    void updateExamUpgrade_throwsWhenLicenceAccreditMissing() {
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd(null);
      req.setDescription("x");
      req.setEffectiveDate(LocalDate.of(2025, 2, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("EXAM", "001", req));
      assertEquals("Licence Accredit? is required.", ex.getMessage());
      verify(repository, never()).update(any(), any(), any());
    }

    @Test
    void updateExamUpgrade_throwsWhenDescriptionMissing() {
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd("N");
      req.setDescription(null);
      req.setEffectiveDate(LocalDate.of(2025, 2, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("EXAM", "001", req));
      assertEquals("Description is required.", ex.getMessage());
      verify(repository, never()).update(any(), any(), any());
    }

    @Test
    void updateExamUpgrade_throwsWhenEffectiveDateMissing() {
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd("N");
      req.setDescription("x");
      req.setEffectiveDate(null);

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("EXAM", "001", req));
      assertEquals("Effective Date is required.", ex.getMessage());
    }

    @Test
    void updateExamUpgrade_throwsWhenDescriptionOverLength() {
      // SCS-561: same over-length guard on the update path.
      ExamUpgradeUpdateRequest req = new ExamUpgradeUpdateRequest();
      req.setLicenceAccreditInd("Y");
      req.setDescription("A".repeat(121));
      req.setEffectiveDate(LocalDate.of(2025, 1, 1));

      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.updateExamUpgrade("EXAM", "001", req));
      assertEquals("Description can not be greater than 120 characters.", ex.getMessage());
      verify(repository, never()).update(any(), any(), any());
      verify(repository, never()).update(any(), any(), any());
    }
  }

  @Test
  void delete_callsRepository() {
    doNothing().when(repository).delete("EXAM", "001");
    service.deleteExamUpgrade("EXAM", "001");
    verify(repository).delete("EXAM", "001");
  }

  @Test
  void delete_withDependents_throwsBadRequestWithMeaningfulMessage() {
    // The FK (SRTR_SCTY_FK) violation surfaces as a DataIntegrityViolationException; the service must
    // translate it to a domain 400 with a "cannot be deleted" message rather than let it become a 500.
    doThrow(new DataIntegrityViolationException("ORA-02292: child record found"))
        .when(repository).delete("EXM", "2");
    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.deleteExamUpgrade("EXM", "2"));
    assertTrue(ex.getMessage().contains("cannot be deleted"),
        "message should explain the record cannot be deleted, was: " + ex.getMessage());
  }
}
