package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestion;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionDetail;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionSummary;
import ca.bc.gov.nrs.scs.backend.model.InspectionQuestionUpdateRequest;
import ca.bc.gov.nrs.scs.backend.repository.InspectionQuestionRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InspectionQuestionServiceTest {

  @Mock private InspectionQuestionRepository repository;
  @InjectMocks private InspectionQuestionService service;

  @Test
  void searchQuestions_delegatesToRepository() {
    List<InspectionQuestionSummary> expected = List.of();
    when(repository.searchQuestions(1L, "q", "Y", 10, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31)))
        .thenReturn(expected);

    List<InspectionQuestionSummary> result =
        service.searchQuestions(1L, "q", "Y", 10, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));

    assertEquals(expected, result);
  }

  @Test
  void getQuestion_throwsWhenMissing() {
    when(repository.getQuestionDetail(10L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.getQuestion(10L));
  }

  @Test
  void getQuestion_returnsDetailWhenFound() {
    InspectionQuestionDetail detail = detailWithId(10L);
    when(repository.getQuestionDetail(10L)).thenReturn(detail);

    assertEquals(detail, service.getQuestion(10L));
  }

  @Test
  void createQuestion_throwsWhenRepositoryReturnsNull() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    when(repository.createQuestion(request)).thenReturn(null);

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenCreatedIdIsNull() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    InspectionQuestion created = new InspectionQuestion();
    when(repository.createQuestion(request)).thenReturn(created);

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_replacesChildrenAndReturnsFreshDetail() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    InspectionQuestion created = new InspectionQuestion();
    created.setInspectionQuestionId(12L);
    InspectionQuestionDetail detail = detailWithId(12L);
    when(repository.createQuestion(request)).thenReturn(created);
    when(repository.getQuestionDetail(12L)).thenReturn(detail);

    InspectionQuestionDetail result = service.createQuestion(request);

    assertEquals(detail, result);
    verify(repository).replaceInspectionTypes(12L, List.of("CUT"));
    verify(repository).replaceScalingMethods(12L, List.of("M1"));
    verify(repository).replaceValidResponses(12L, List.of("Y", "N"), LocalDate.of(2026, 1, 1));
  }

  @Test
  void createQuestion_throwsWhenQuestionTextBlank() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setQuestionText(" ");

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenQuestionTextTooLong() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setQuestionText("a".repeat(201));

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenCommentRequiredInvalid() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setCommentRequiredInd("X");

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenSortOrderNull() {
    // The create/unused validation path now null-checks sortOrderNo (matching the used-question path's
    // validateSortAndExpiry) and returns a clean 400 instead of auto-unboxing into a NullPointerException.
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setSortOrderNo(null);

    BadRequestException ex =
        assertThrows(BadRequestException.class, () -> service.createQuestion(request));
    assertEquals("Sort order is required.", ex.getMessage());
  }

  @Test
  void createQuestion_throwsWhenSortOutOfRange() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setSortOrderNo(-1);

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenDateOrderInvalid() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setEffectiveDate(LocalDate.of(2026, 2, 1));
    request.setExpiryDate(LocalDate.of(2026, 1, 1));

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenInspectionTypeCodesEmpty() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setInspectionTypeCodes(List.of());

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenScalingMethodCodesEmpty() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setScalingMethodTypeCodes(List.of());

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void createQuestion_throwsWhenValidResponsesTooShort() {
    InspectionQuestionCreateRequest request = validCreateRequest();
    request.setValidResponseCodes(List.of("Y"));

    assertThrows(BadRequestException.class, () -> service.createQuestion(request));
  }

  @Test
  void updateQuestion_throwsWhenMissing() {
    when(repository.getQuestionDetail(22L)).thenReturn(null);

    InspectionQuestionUpdateRequest request = new InspectionQuestionUpdateRequest();
    assertThrows(ResourceNotFoundException.class, () -> service.updateQuestion(22L, request));
  }

  @Test
  void updateQuestion_usedQuestion_updatesOnlySortAndExpiry() {
    InspectionQuestionDetail existing = existingForUsedQuestionUpdate();
    InspectionQuestionUpdateRequest request = usedQuestionUpdateRequest(2, LocalDate.of(2026, 12, 31));
    InspectionQuestionDetail refreshed = detailWithId(22L);
    when(repository.getQuestionDetail(22L)).thenReturn(existing, refreshed);

    InspectionQuestionDetail result = service.updateQuestion(22L, request);

    assertEquals(refreshed, result);
    verify(repository).updateQuestion(eq(22L), any(InspectionQuestionUpdateRequest.class));
    verify(repository, never()).replaceInspectionTypes(eq(22L), any());
    verify(repository, never()).replaceScalingMethods(eq(22L), any());
    verify(repository, never()).replaceValidResponses(eq(22L), any(), any());
  }

  @Test
  void updateQuestion_usedQuestion_throwsWhenSortNull() {
    InspectionQuestionDetail existing = questionWithUsedFlag(true);
    when(repository.getQuestionDetail(22L)).thenReturn(existing);
    InspectionQuestionUpdateRequest request = usedQuestionUpdateRequest(null, LocalDate.of(2026, 12, 31));

    assertThrows(BadRequestException.class, () -> service.updateQuestion(22L, request));
  }

  @Test
  void updateQuestion_usedQuestion_throwsWhenSortOutOfRange() {
    InspectionQuestionDetail existing = questionWithUsedFlag(true);
    when(repository.getQuestionDetail(22L)).thenReturn(existing);
    InspectionQuestionUpdateRequest request = usedQuestionUpdateRequest(10000, LocalDate.of(2026, 12, 31));

    assertThrows(BadRequestException.class, () -> service.updateQuestion(22L, request));
  }

  @Test
  void updateQuestion_usedQuestion_throwsWhenExpiryNull() {
    InspectionQuestionDetail existing = questionWithUsedFlag(true);
    when(repository.getQuestionDetail(22L)).thenReturn(existing);
    InspectionQuestionUpdateRequest request = usedQuestionUpdateRequest(2, null);

    assertThrows(BadRequestException.class, () -> service.updateQuestion(22L, request));
  }

  @Test
  void updateQuestion_unusedQuestion_replacesChildren() {
    InspectionQuestionDetail existing = questionWithUsedFlag(false);
    InspectionQuestionUpdateRequest request = fullUpdateRequest();
    InspectionQuestionDetail refreshed = detailWithId(22L);
    when(repository.getQuestionDetail(22L)).thenReturn(existing, refreshed);

    InspectionQuestionDetail result = service.updateQuestion(22L, request);

    assertEquals(refreshed, result);
    verify(repository).updateQuestion(22L, request);
    verify(repository).replaceInspectionTypes(22L, List.of("CUT"));
    verify(repository).replaceScalingMethods(22L, List.of("M1"));
    verify(repository).replaceValidResponses(22L, List.of("Y", "N"), LocalDate.of(2026, 1, 1));
  }

  @Test
  void updateQuestion_unusedQuestion_throwsWhenValidResponsesTooShort() {
    // The update/unused path reuses the same validator as create; fewer than two valid responses
    // must be rejected with BadRequestException.
    InspectionQuestionDetail existing = questionWithUsedFlag(false);
    when(repository.getQuestionDetail(22L)).thenReturn(existing);
    InspectionQuestionUpdateRequest request = fullUpdateRequest();
    request.setValidResponseCodes(List.of("Y"));

    assertThrows(BadRequestException.class, () -> service.updateQuestion(22L, request));
  }

  @Test
  void deleteQuestion_throwsWhenMissing() {
    when(repository.getQuestionDetail(33L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.deleteQuestion(33L));
  }

  @Test
  void deleteQuestion_throwsWhenUsed() {
    InspectionQuestionDetail existing = questionWithUsedFlag(true);
    when(repository.getQuestionDetail(33L)).thenReturn(existing);

    assertThrows(BadRequestException.class, () -> service.deleteQuestion(33L));
  }

  @Test
  void deleteQuestion_removesChildrenAndDeletes() {
    InspectionQuestionDetail existing = questionWithUsedFlag(false);
    existing.setEffectiveDate(LocalDate.of(2025, 1, 1));
    when(repository.getQuestionDetail(33L)).thenReturn(existing);

    service.deleteQuestion(33L);

    verify(repository).replaceInspectionTypes(33L, List.of());
    verify(repository).replaceScalingMethods(33L, List.of());
    verify(repository).replaceValidResponses(33L, List.of(), LocalDate.of(2025, 1, 1));
    verify(repository).deleteQuestion(33L);
  }

  private InspectionQuestionCreateRequest validCreateRequest() {
    InspectionQuestionCreateRequest request = new InspectionQuestionCreateRequest();
    request.setQuestionText("Question text");
    request.setCommentRequiredInd("Y");
    request.setSortOrderNo(1);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));
    request.setInspectionTypeCodes(List.of("CUT"));
    request.setScalingMethodTypeCodes(List.of("M1"));
    request.setValidResponseCodes(List.of("Y", "N"));
    return request;
  }

  private InspectionQuestionUpdateRequest fullUpdateRequest() {
    InspectionQuestionUpdateRequest request = new InspectionQuestionUpdateRequest();
    request.setQuestionText("Question text");
    request.setCommentRequiredInd("Y");
    request.setSortOrderNo(2);
    request.setEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setExpiryDate(LocalDate.of(2026, 12, 31));
    request.setInspectionTypeCodes(List.of("CUT"));
    request.setScalingMethodTypeCodes(List.of("M1"));
    request.setValidResponseCodes(List.of("Y", "N"));
    return request;
  }

  private InspectionQuestionUpdateRequest usedQuestionUpdateRequest(Integer sortOrderNo, LocalDate expiryDate) {
    InspectionQuestionUpdateRequest request = new InspectionQuestionUpdateRequest();
    request.setSortOrderNo(sortOrderNo);
    request.setExpiryDate(expiryDate);
    return request;
  }

  private InspectionQuestionDetail questionWithUsedFlag(boolean used) {
    InspectionQuestionDetail existing = new InspectionQuestionDetail();
    existing.setQuestionUsed(used);
    return existing;
  }

  /** A distinct detail instance standing in for the re-read that follows a create/update. */
  private InspectionQuestionDetail detailWithId(Long inspectionQuestionId) {
    InspectionQuestionDetail detail = new InspectionQuestionDetail();
    detail.setInspectionQuestionId(inspectionQuestionId);
    return detail;
  }

  private InspectionQuestionDetail existingForUsedQuestionUpdate() {
    InspectionQuestionDetail existing = questionWithUsedFlag(true);
    existing.setQuestionText("Existing Question");
    existing.setCommentRequiredInd("Y");
    existing.setEffectiveDate(LocalDate.of(2025, 1, 1));
    existing.setInspectionTypeCodes(List.of("CUT"));
    existing.setScalingMethodTypeCodes(List.of("M1"));
    existing.setValidResponseCodes(List.of("Y", "N"));
    return existing;
  }
}
