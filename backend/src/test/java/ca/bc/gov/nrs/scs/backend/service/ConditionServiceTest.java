package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.ConditionRepository;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.dao.DataIntegrityViolationException;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConditionServiceTest {

  @Mock private ConditionRepository repository;
  @InjectMocks private ConditionService service;

  @Test
  void searchConditions_delegatesToRepository() {
    LocalDate date = LocalDate.of(2025, 1, 1);
    when(repository.searchConditions(
            "SIA", 1L, "title", "desc", "Y", 10, date, date))
        .thenReturn(List.of());

    service.searchConditions("SIA", 1L, "title", "desc", "Y", 10, date, date);

    verify(repository)
        .searchConditions("SIA", 1L, "title", "desc", "Y", 10, date, date);
  }

  @Test
  void getCondition_throwsWhenNotFound() {
    when(repository.getCondition("SIA", 1L)).thenReturn(null);

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.getCondition("SIA", 1L));
  }

  @Test
  void getCondition_returnsDetail() {
    ScaleAuthConditionDetail detail = new ScaleAuthConditionDetail();
    detail.setScaleAuthConditionId(1L);
    when(repository.getCondition("SIA", 1L)).thenReturn(detail);

    ScaleAuthConditionDetail result = service.getCondition("SIA", 1L);

    assertEquals(1L, result.getScaleAuthConditionId());
  }

  @Test
  void createCondition_throwsWhenRepositoryReturnsNull() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    when(repository.createCondition(any())).thenReturn(null);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenIdIsNull() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    ScaleAuthConditionDetail detail = new ScaleAuthConditionDetail();
    detail.setScaleAuthConditionId(null);
    when(repository.createCondition(any())).thenReturn(detail);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_returnsDetail() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    ScaleAuthConditionDetail detail = new ScaleAuthConditionDetail();
    detail.setScaleAuthConditionId(1L);
    when(repository.createCondition(any())).thenReturn(detail);

    ScaleAuthConditionDetail result = service.createCondition(request);

    assertEquals(1L, result.getScaleAuthConditionId());
  }

  @Test
  void createCondition_throwsWhenClassCodeBlank() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("", true);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenTitleBlank() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setScaleAuthConditionTitle("");

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenDescBlank() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setScaleAuthConditionDesc("");

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenMinistryStdIndBlank() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setMinistryStandardInd("");

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenMinistryStdIndNotYesNo() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setMinistryStandardInd("X");

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenSortOrderNull() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setSortOrderNo(null);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenSortOrderNegative() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setSortOrderNo(-1);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenSortOrderTooLarge() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setSortOrderNo(10000);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenEffectiveDateNull() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setEffectiveDate(null);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenExpiryBeforeEffective() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setEffectiveDate(LocalDate.of(2025, 2, 1));
    request.setExpiryDate(LocalDate.of(2025, 1, 1));

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenSiaHasNoSiteMethodTypes() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SIA", true);
    request.setSiteMethodTypeCodes(null);

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenMsdHasSiteMethodTypes() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("MSD", true);
    request.setSiteMethodTypeCodes(List.of("A"));

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void createCondition_throwsWhenScaHasSiteMethodTypes() {
    ScaleAuthConditionCreateRequest request = buildCreateRequest("SCA", true);
    request.setSiteMethodTypeCodes(List.of("A"));

    assertThrows(BadRequestException.class, () -> service.createCondition(request));
  }

  @Test
  void updateCondition_throwsWhenClassCodeChanged() {
    ScaleAuthConditionUpdateRequest request = new ScaleAuthConditionUpdateRequest();
    request.setScaleConditionClassCode("MSD");

    assertThrows(
        BadRequestException.class,
        () -> service.updateCondition("SIA", 1L, request));
  }

  @Test
  void updateCondition_throwsWhenNotFound() {
    ScaleAuthConditionUpdateRequest request = buildUpdateRequest("MSD");
    when(repository.getCondition("MSD", 1L)).thenReturn(null);

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateCondition("MSD", 1L, request));
  }

  @Test
  void updateCondition_throwsWhenRepositoryReturnsNull() {
    ScaleAuthConditionUpdateRequest request = buildUpdateRequest("MSD");
    ScaleAuthConditionDetail existing = new ScaleAuthConditionDetail();
    when(repository.getCondition("MSD", 1L)).thenReturn(existing);
    when(repository.updateCondition(eq("MSD"), eq(1L), any())).thenReturn(null);

    assertThrows(
        BadRequestException.class,
        () -> service.updateCondition("MSD", 1L, request));
  }

  @Test
  void updateCondition_returnsDetail() {
    ScaleAuthConditionUpdateRequest request = buildUpdateRequest("MSD");
    ScaleAuthConditionDetail existing = new ScaleAuthConditionDetail();
    ScaleAuthConditionDetail updated = new ScaleAuthConditionDetail();
    updated.setScaleAuthConditionId(1L);
    when(repository.getCondition("MSD", 1L)).thenReturn(existing);
    when(repository.updateCondition(eq("MSD"), eq(1L), any())).thenReturn(updated);

    ScaleAuthConditionDetail result = service.updateCondition("MSD", 1L, request);

    assertEquals(1L, result.getScaleAuthConditionId());
  }

  @Test
  void deleteCondition_throwsWhenNotFound() {
    when(repository.getCondition("SIA", 1L)).thenReturn(null);

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteCondition("SIA", 1L));
  }

  @Test
  void deleteCondition_throwsWhenHasDependents() {
    ScaleAuthConditionDetail detail = new ScaleAuthConditionDetail();
    detail.setDependentChildExists(true);
    when(repository.getCondition("SIA", 1L)).thenReturn(detail);

    assertThrows(
        BadRequestException.class,
        () -> service.deleteCondition("SIA", 1L));
  }

  @Test
  void deleteCondition_succeeds() {
    ScaleAuthConditionDetail detail = new ScaleAuthConditionDetail();
    detail.setDependentChildExists(false);
    when(repository.getCondition("SIA", 1L)).thenReturn(detail);

    service.deleteCondition("SIA", 1L);

    verify(repository).deleteCondition("SIA", 1L);
  }

  @Test
  void deleteCondition_translatesFkViolationTo400() {
    // Backstop: the pre-check passes (no dependents) but a concurrent FK violation is raised at the
    // delete; it must surface as a clean 400, not a raw database error.
    ScaleAuthConditionDetail detail = new ScaleAuthConditionDetail();
    detail.setDependentChildExists(false);
    when(repository.getCondition("SIA", 1L)).thenReturn(detail);
    doThrow(new DataIntegrityViolationException("ORA-02292")).when(repository).deleteCondition("SIA", 1L);

    assertThrows(BadRequestException.class, () -> service.deleteCondition("SIA", 1L));
  }

  private ScaleAuthConditionCreateRequest buildCreateRequest(String classCode, boolean hasSiteTypes) {
    ScaleAuthConditionCreateRequest req = new ScaleAuthConditionCreateRequest();
    req.setScaleConditionClassCode(classCode);
    req.setScaleAuthConditionTitle("Title");
    req.setScaleAuthConditionDesc("Description");
    req.setMinistryStandardInd("Y");
    req.setSortOrderNo(1);
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    req.setExpiryDate(LocalDate.of(2025, 12, 31));
    if (hasSiteTypes && "SIA".equalsIgnoreCase(classCode)) {
      req.setSiteMethodTypeCodes(List.of("A"));
    } else if (!hasSiteTypes) {
      req.setSiteMethodTypeCodes(null);
    }
    return req;
  }

  private ScaleAuthConditionUpdateRequest buildUpdateRequest(String classCode) {
    ScaleAuthConditionUpdateRequest req = new ScaleAuthConditionUpdateRequest();
    req.setScaleConditionClassCode(classCode);
    req.setScaleAuthConditionTitle("Title");
    req.setScaleAuthConditionDesc("Description");
    req.setMinistryStandardInd("Y");
    req.setSortOrderNo(1);
    req.setEffectiveDate(LocalDate.of(2025, 1, 1));
    req.setExpiryDate(LocalDate.of(2025, 12, 31));
    return req;
  }
}
