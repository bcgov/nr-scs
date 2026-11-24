package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import org.openapitools.jackson.nullable.JsonNullable;

@ExtendWith(MockitoExtension.class)
class ScaleSiteAuthorizationServiceTest {

  @Mock private ScaleSiteAuthorizationRepository repository;
  @Mock private ScaleSiteRepository scaleSiteRepository;
  @Mock private SystemSettingRepository systemSettingRepository;

  @Mock private ClientScopeGuard clientScopeGuard;

  private ScaleSiteAuthorizationService service;

  @BeforeEach
  void setUp() {
    service = new ScaleSiteAuthorizationService(
        repository, scaleSiteRepository, systemSettingRepository, clientScopeGuard);
  }

  // ─── listScaleSiteAuthorizations ────────────────────────────────────────────

  @Test
  void listScaleSiteAuthorizations_throwsWhenIdBlank() {
    assertThrows(BadRequestException.class,
        () -> service.listScaleSiteAuthorizations("  "));
    verify(repository, org.mockito.Mockito.never()).listScaleSiteAuthorizationsByScaleSite(any());
  }

  @Test
  void listScaleSiteAuthorizations_throwsWhenScaleSiteNotFound() {
    when(scaleSiteRepository.getScaleSite("A12345")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.listScaleSiteAuthorizations("A12345"));
    verify(repository, org.mockito.Mockito.never()).listScaleSiteAuthorizationsByScaleSite(any());
  }

  @Test
  void listScaleSiteAuthorizations_delegatesWhenScaleSiteExists() {
    when(scaleSiteRepository.getScaleSite("A12345"))
        .thenReturn(new ScaleSiteCore("A12345", "Main Yard", "Victoria"));
    when(repository.listScaleSiteAuthorizationsByScaleSite("A12345")).thenReturn(List.of(
        new ScaleSiteAuthorizationListEntry(
            7001L, "A12345", null, null, null, "N", null, null, null, "Active", true,
            null, null, null, null, null)));

    List<ScaleSiteAuthorizationDetail> result = service.listScaleSiteAuthorizations("A12345");

    assertEquals(1, result.size());
    assertEquals(7001L, result.get(0).getScaleSiteAuthorizationId());
    verify(repository).listScaleSiteAuthorizationsByScaleSite("A12345");
  }


  // ─── removeScaleSiteAuthorizationFromWorkbench ──────────────────────────────

  @Test
  void removeFromWorkbench_throwsWhenUpdateReturnsFalse() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(false);

    assertThrows(ResourceNotFoundException.class,
        () -> service.removeScaleSiteAuthorizationFromWorkbench(1L));
  }

  @Test
  void removeFromWorkbench_succeedsWhenUpdateReturnsTrue() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(true);

    service.removeScaleSiteAuthorizationFromWorkbench(1L);

    verify(repository).setExpiryNotificationInd(1L, "Y");
  }

  // ─── getScaleSiteAuthorization ───────────────────────────────────────────────

  @Test
  void getScaleSiteAuthorization_throwsWhenNotFound() {
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.getScaleSiteAuthorization(1L));
  }

  @Test
  void getScaleSiteAuthorization_returnsDetailWhenFound() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(1L);
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(detail);

    ScaleSiteAuthorizationDetail result = service.getScaleSiteAuthorization(1L);

    assertEquals(1L, result.getScaleSiteAuthorizationId());
  }

  /**
   * The endpoint is keyed on the authorization id, so {@code ClientScopeInterceptor} cannot scope it from
   * the path — the guard has to be called here, on the authorization's own site. Without it a Scale Site
   * Owner (which holds {@code SCALE_SITE_AUTHORIZATION_READ}) could read any authorization by id,
   * including one belonging to another company's site. Verified as a live 200 before the fix.
   */
  @Test
  void getScaleSiteAuthorization_appliesClientScopeGuardViaItsSite() {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(1L);
    detail.setScaleSiteIdNmbr("019V");
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(detail);

    service.getScaleSiteAuthorization(1L);

    verify(clientScopeGuard).assertRecordSiteInScope("019V");
  }

  /**
   * The guard runs before the not-found check, so a restricted caller gets the same 403 for an id that
   * does not exist as for one belonging to another company — {@code ClientScopeInterceptor}'s
   * 403-before-404 rule, which this endpoint would otherwise contradict by answering 404 and handing an
   * external caller an existence oracle over the authorization keyspace. The guard decides which it is;
   * the service only has to ask before it speaks.
   */
  @Test
  void getScaleSiteAuthorization_asksTheGuardBeforeReportingAnUnknownIdMissing() {
    when(repository.getScaleSiteAuthorization(404L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.getScaleSiteAuthorization(404L));

    verify(clientScopeGuard).assertRecordSiteInScope(null);
  }

  // ─── searchActiveScaleSiteAuthConditions ────────────────────────────────────

  @Test
  void searchActiveScaleSiteAuthConditions_delegatesToRepository() {
    List<ScaleAuthCondition> expected = List.of();
    when(repository.searchActiveScaleAuthConditions("SIA", 1L, "t", "d", "Y", 10))
        .thenReturn(expected);

    List<ScaleAuthCondition> result =
        service.searchActiveScaleSiteAuthConditions("SIA", 1L, "t", "d", "Y", 10);

    assertEquals(expected, result);
  }

  // ─── getScaleAuthTemplateConditions ─────────────────────────────────────────

  @Test
  void getScaleAuthTemplateConditions_delegatesToRepository() {
    List<ScaleAuthCondition> expected = List.of();
    when(repository.getScaleAuthTemplateConditions(7L)).thenReturn(expected);

    List<ScaleAuthCondition> result = service.getScaleAuthTemplateConditions(7L);

    assertEquals(expected, result);
  }

  // ─── createScaleSiteAuthorization – validation guards ────────────────────────

  @Test
  void create_throwsWhenRequestNull() {
    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(null));
  }

  @Test
  void create_throwsWhenSiteNumberBlank() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setScaleSiteIdNmbr("  ");

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenEffectiveDateNull() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setAuthorizationEffectiveDate(null);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenExpiryDateNull() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setAuthorizationExpiryDate(null);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenExpectedVolumeNull() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpectedScaleVolume(null);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenExpectedVolumeNegative() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpectedScaleVolume(-1L);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenEffectiveAfterExpiry() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 6, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2025, 1, 1));

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenScaleSiteDoesNotExist() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    when(scaleSiteRepository.getScaleSite("SITE1")).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  // ─── validateMaxAuthorizationLength – all branches ──────────────────────────

  @Test
  void create_succeedsWhenSalmSettingAbsent() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    stubCreateAndGet(10L);

    ScaleSiteAuthorizationDetail result = service.createScaleSiteAuthorization(request);

    assertNotNull(result);
    verify(repository).addConditions(eq(10L), anyList());
  }

  @Test
  void create_succeedsWhenSalmSettingIsNonNumeric() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.of("abc"));
    stubCreateAndGet(10L);

    assertNotNull(service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_succeedsWhenSalmSettingIsZero() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.of("0"));
    stubCreateAndGet(10L);

    assertNotNull(service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_succeedsWhenSalmSettingIsNegative() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.of("-1"));
    stubCreateAndGet(10L);

    assertNotNull(service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_succeedsWhenSalmSettingIsBlankString() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.of("  "));
    stubCreateAndGet(10L);

    assertNotNull(service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenAuthLengthExceedsMax() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2026, 2, 1)); // > 1 year
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.of("1"));

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_succeedsWhenAuthLengthEqualsMax() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2026, 1, 1)); // exactly 1 year
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.of("1"));
    stubCreateAndGet(10L);

    assertNotNull(service.createScaleSiteAuthorization(request));
  }

  // ─── createScaleSiteAuthorization – post-create branches ────────────────────

  @Test
  void create_throwsWhenRepositoryReturnsNullAfterCreate() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    when(repository.createScaleSiteAuthorization(any())).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_throwsWhenCreatedIdIsNull() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    ScaleSiteAuthorizationDetail withNullId = new ScaleSiteAuthorizationDetail();
    withNullId.setScaleSiteAuthorizationId(null);
    when(repository.createScaleSiteAuthorization(any())).thenReturn(withNullId);

    assertThrows(BadRequestException.class,
        () -> service.createScaleSiteAuthorization(request));
  }

  @Test
  void create_setsExpiryNotificationToNWhenNull() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd(null);
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    stubCreateAndGet(10L);

    service.createScaleSiteAuthorization(request);

    assertEquals("N", request.getExpiryNotificationInd());
  }

  @Test
  void create_setsExpiryNotificationToNWhenBlank() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd("  ");
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    stubCreateAndGet(10L);

    service.createScaleSiteAuthorization(request);

    assertEquals("N", request.getExpiryNotificationInd());
  }

  @Test
  void create_preservesExpiryNotificationWhenAlreadySet() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd("Y");
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    stubCreateAndGet(10L);

    service.createScaleSiteAuthorization(request);

    assertEquals("Y", request.getExpiryNotificationInd());
  }

  @Test
  void create_addsConditionsAndReturnsFinalDetailFromGet() {
    ScaleAuthConditionRef condRef = new ScaleAuthConditionRef()
        .scaleConditionClassCode("SIA")
        .scaleAuthConditionId(42L);
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setConditions(List.of(condRef));
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());

    ScaleSiteAuthorizationDetail created = new ScaleSiteAuthorizationDetail();
    created.setScaleSiteAuthorizationId(10L);
    ScaleSiteAuthorizationDetail finalDetail = new ScaleSiteAuthorizationDetail();
    finalDetail.setScaleSiteAuthorizationId(10L);
    when(repository.createScaleSiteAuthorization(any())).thenReturn(created);
    when(repository.getScaleSiteAuthorization(10L)).thenReturn(finalDetail);

    ScaleSiteAuthorizationDetail result = service.createScaleSiteAuthorization(request);

    assertEquals(10L, result.getScaleSiteAuthorizationId());
    verify(repository).addConditions(10L, List.of(condRef));
  }

  // ─── updateScaleSiteAuthorization ───────────────────────────────────────────

  @Test
  void update_throwsWhenRequestNull() {
    assertThrows(BadRequestException.class, () -> service.updateScaleSiteAuthorization(1L, null));
  }

  @Test
  void update_throwsWhenAuthorizationNotFound() {
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.updateScaleSiteAuthorization(1L, validRequest()));
  }

  @Test
  void update_whenALetterExists_onlyTheCancellationFieldsChange() {
    ScaleSiteAuthorizationDetail existing = existingDetail(1L, true);
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setScaleSiteIdNmbr("OTHER-SITE");
    request.setCancellationDate(LocalDate.of(2025, 6, 1));
    request.setCancellationReasonTxt("site closed");
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existing);
    when(repository.updateScaleSiteAuthorization(any())).thenReturn(existing);

    ScaleSiteAuthorizationDetail result = service.updateScaleSiteAuthorization(1L, request);

    assertSame(existing, result);
    ArgumentCaptor<ScaleSiteAuthorizationRecord> captor =
        ArgumentCaptor.forClass(ScaleSiteAuthorizationRecord.class);
    verify(repository).updateScaleSiteAuthorization(captor.capture());
    ScaleSiteAuthorizationRecord record = captor.getValue();
    assertEquals(1L, record.scaleSiteAuthorizationId());
    assertEquals("SITE1", record.scaleSiteIdNmbr(), "the stored site wins over the request");
    assertEquals("ARCS-1", record.letterArcsFileNumber());
    assertEquals(LocalDate.of(2024, 1, 1), record.authorizationEffectiveDate());
    assertEquals(LocalDate.of(2026, 12, 31), record.authorizationExpiryDate());
    assertEquals("Y", record.expiryNotificationInd());
    assertEquals(500L, record.expectedScaleVolume());
    assertEquals(LocalDate.of(2025, 6, 1), record.cancellationDate());
    assertEquals("site closed", record.cancellationReasonTxt());
    assertEquals("ENTRY", record.entryUserid());
    verify(repository, never()).deleteSiteAuthorizationConditions(any(), any());
    verify(repository, never()).addConditions(any(), any());
    verify(scaleSiteRepository, never()).getScaleSite(any());
  }

  @Test
  void update_whenALetterExists_throwsWhenTheRepositoryReturnsNull() {
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existingDetail(1L, true));
    when(repository.updateScaleSiteAuthorization(any())).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.updateScaleSiteAuthorization(1L, validRequest()));
  }

  @Test
  void update_withoutALetter_validatesReplacesConditionsAndReturnsTheRefreshedDetail() {
    ScaleAuthCondition oldCondition = new ScaleAuthCondition().scaleAuthConditionId(1L);
    ScaleAuthConditionRef newRef = new ScaleAuthConditionRef()
        .scaleConditionClassCode("SIA")
        .scaleAuthConditionId(2L);
    ScaleSiteAuthorizationDetail existing = existingDetail(1L, false);
    existing.setConditions(List.of(oldCondition));
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd("");
    request.setConditions(List.of(newRef));
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existing);
    when(repository.updateScaleSiteAuthorization(any())).thenReturn(existing);

    ScaleSiteAuthorizationDetail result = service.updateScaleSiteAuthorization(1L, request);

    assertSame(existing, result);
    ArgumentCaptor<ScaleSiteAuthorizationRecord> captor =
        ArgumentCaptor.forClass(ScaleSiteAuthorizationRecord.class);
    verify(repository).updateScaleSiteAuthorization(captor.capture());
    ScaleSiteAuthorizationRecord record = captor.getValue();
    assertEquals(1L, record.scaleSiteAuthorizationId());
    assertEquals("SITE1", record.scaleSiteIdNmbr());
    assertEquals(LocalDate.of(2025, 1, 1), record.authorizationEffectiveDate());
    assertEquals(LocalDate.of(2025, 12, 31), record.authorizationExpiryDate());
    assertEquals("N", record.expiryNotificationInd(), "a blank indicator defaults to N");
    assertEquals(100L, record.expectedScaleVolume());
    assertEquals("ENTRY", record.entryUserid());
    verify(repository).deleteSiteAuthorizationConditions(1L, List.of(oldCondition));
    verify(repository).addConditions(1L, List.of(newRef));
  }

  @Test
  void update_withoutALetter_keepsAnExplicitExpiryNotificationIndicator() {
    ScaleSiteAuthorizationDetail existing = existingDetail(1L, false);
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd("Y");
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existing);
    when(repository.updateScaleSiteAuthorization(any())).thenReturn(existing);

    service.updateScaleSiteAuthorization(1L, request);

    ArgumentCaptor<ScaleSiteAuthorizationRecord> captor =
        ArgumentCaptor.forClass(ScaleSiteAuthorizationRecord.class);
    verify(repository).updateScaleSiteAuthorization(captor.capture());
    assertEquals("Y", captor.getValue().expiryNotificationInd());
  }

  @Test
  void update_withoutALetter_throwsWhenTheRepositoryReturnsNull() {
    stubExistingSite();
    when(systemSettingRepository.findSystemSettingValue("SALM")).thenReturn(Optional.empty());
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existingDetail(1L, false));
    when(repository.updateScaleSiteAuthorization(any())).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.updateScaleSiteAuthorization(1L, validRequest()));
    verify(repository, never()).addConditions(any(), any());
  }

  @Test
  void update_withoutALetter_stillRunsTheCreateValidation() {
    ScaleSiteAuthorizationSaveRequest request = validRequest();
    request.setExpectedScaleVolume(-1L);
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existingDetail(1L, false));

    assertThrows(BadRequestException.class, () -> service.updateScaleSiteAuthorization(1L, request));
    verify(repository, never()).updateScaleSiteAuthorization(any());
  }

  // ─── deleteScaleSiteAuthorization ───────────────────────────────────────────

  @Test
  void delete_throwsWhenAuthorizationNotFound() {
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.deleteScaleSiteAuthorization(1L));
    verify(repository, never()).deleteScaleSiteAuthorization(any());
  }

  @Test
  void delete_refusesWhenALetterExists() {
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existingDetail(1L, true));

    assertThrows(BadRequestException.class, () -> service.deleteScaleSiteAuthorization(1L));
    verify(repository, never()).deleteSiteAuthorizationConditions(any(), any());
    verify(repository, never()).deleteScaleSiteAuthorization(any());
  }

  @Test
  void delete_removesTheConditionsBeforeTheAuthorization() {
    ScaleAuthCondition condition = new ScaleAuthCondition().scaleAuthConditionId(7L);
    ScaleSiteAuthorizationDetail existing = existingDetail(1L, false);
    existing.setConditions(List.of(condition));
    when(repository.getScaleSiteAuthorization(1L)).thenReturn(existing);

    service.deleteScaleSiteAuthorization(1L);

    InOrder inOrder = inOrder(repository);
    inOrder.verify(repository).deleteSiteAuthorizationConditions(1L, List.of(condition));
    inOrder.verify(repository).deleteScaleSiteAuthorization(1L);
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private ScaleSiteAuthorizationDetail existingDetail(Long id, boolean letterExists) {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(id);
    detail.setScaleSiteIdNmbr("SITE1");
    detail.setLetterArcsFileNumber("ARCS-1");
    detail.setAuthorizationEffectiveDate(LocalDate.of(2024, 1, 1));
    detail.setAuthorizationExpiryDate(LocalDate.of(2026, 12, 31));
    detail.setExpiryNotificationInd("Y");
    detail.setExpectedScaleVolume(500L);
    detail.setEntryUserid(JsonNullable.of("ENTRY"));
    detail.setLetterExists(letterExists);
    detail.setConditions(List.of());
    return detail;
  }

  private ScaleSiteAuthorizationSaveRequest validRequest() {
    ScaleSiteAuthorizationSaveRequest request = new ScaleSiteAuthorizationSaveRequest();
    request.setScaleSiteIdNmbr("SITE1");
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2025, 12, 31));
    request.setExpectedScaleVolume(100L);
    request.setExpiryNotificationInd("N");
    request.setConditions(List.of());
    return request;
  }

  private void stubExistingSite() {
    when(scaleSiteRepository.getScaleSite("SITE1"))
        .thenReturn(new ScaleSiteCore("SITE1", "Main Yard", "Victoria"));
  }

  private void stubCreateAndGet(Long id) {
    ScaleSiteAuthorizationDetail detail = new ScaleSiteAuthorizationDetail();
    detail.setScaleSiteAuthorizationId(id);
    when(repository.createScaleSiteAuthorization(any())).thenReturn(detail);
    when(repository.getScaleSiteAuthorization(id)).thenReturn(detail);
  }
}

