package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScaleAuthCondition;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationListItem;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationSaveRequest;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.repository.ScalerAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;

@ExtendWith(MockitoExtension.class)
class ScalerAuthorizationServiceTest {

  @Mock private ScalerAuthorizationRepository repository;
  @Mock private ScalerRepository scalerRepository;
  @Mock private ClientScopeGuard clientScopeGuard;
  private ScalerAuthorizationService service;

  @BeforeEach
  void setUp() {
    service = new ScalerAuthorizationService(repository, scalerRepository, clientScopeGuard);
  }

  // ─── listScalerAuthorizations ────────────────────────────────────────────────

  @Test
  void listScalerAuthorizations_throwsWhenLicenceBlank() {
    assertThrows(BadRequestException.class,
        () -> service.listScalerAuthorizations("  "));
    verify(repository, never()).listScalerAuthorizationsByLicence(any());
  }

  @Test
  void listScalerAuthorizations_throwsWhenScalerNotFound() {
    when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.listScalerAuthorizations("1234"));
    verify(repository, never()).listScalerAuthorizationsByLicence(any());
  }

  @Test
  void listScalerAuthorizations_delegatesWhenScalerExists() {
    when(scalerRepository.getScalerSummaryCore("1234"))
        .thenReturn(new ScalerSummaryCore("1234", null, null, null, null, null, null));
    when(repository.listScalerAuthorizationsByLicence("1234")).thenReturn(List.of(
        new ScalerAuthorizationListEntry(
            4001L, null, null, "N", 1234L, List.of("A12345"), "Active", true)));

    List<ScalerAuthorizationListItem> result = service.listScalerAuthorizations("1234");

    assertEquals(1, result.size());
    assertEquals(4001L, result.get(0).getScalerAuthorizationId());
    verify(repository).listScalerAuthorizationsByLicence("1234");
  }

  // ─── removeScalerAuthorizationFromWorkbench ──────────────────────────────────

  @Test
  void removeFromWorkbench_throwsWhenUpdateReturnsFalse() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(false);

    assertThrows(ResourceNotFoundException.class,
        () -> service.removeScalerAuthorizationFromWorkbench(1L));
  }

  @Test
  void removeFromWorkbench_succeedsWhenUpdateReturnsTrue() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(true);

    service.removeScalerAuthorizationFromWorkbench(1L);

    verify(repository).setExpiryNotificationInd(1L, "Y");
  }

  // ─── getScalerAuthorization ──────────────────────────────────────────────────

  @Test
  void getScalerAuthorization_throwsWhenNotFound() {
    when(repository.getScalerAuthorization(1L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.getScalerAuthorization(1L));
  }

  @Test
  void getScalerAuthorization_returnsDetailWhenFound() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(1L);
    when(repository.getScalerAuthorization(1L)).thenReturn(detail);

    ScalerAuthorizationDetail result = service.getScalerAuthorization(1L);

    assertEquals(1L, result.getScalerAuthorizationId());
  }

  /**
   * Industry Scalers can read authorizations, and this endpoint is keyed on the authorization id
   * rather than a scaler licence number, so {@code ClientScopeInterceptor} cannot scope it from the
   * path — the service must ask the guard itself. Without this call an external user could read any
   * client's authorization by id.
   */
  @Test
  void getScalerAuthorization_appliesClientScopeGuardViaItsScaler() {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(1L);
    detail.setScalerLicenceNo("12345");
    when(repository.getScalerAuthorization(1L)).thenReturn(detail);

    service.getScalerAuthorization(1L);

    verify(clientScopeGuard).assertRecordScalerInScope("12345");
  }

  /**
   * Asked before the not-found is reported, so an id outside the caller's client and an id that does not
   * exist are indistinguishable to them — the 403-before-404 rule {@code ClientScopeInterceptor} applies
   * to path-addressed reads, which this id-addressed one used to break.
   */
  @Test
  void getScalerAuthorization_asksTheGuardBeforeReportingAnUnknownIdMissing() {
    when(repository.getScalerAuthorization(404L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.getScalerAuthorization(404L));

    verify(clientScopeGuard).assertRecordScalerInScope(null);
  }

  // ─── searchActiveScaleAuthConditions ────────────────────────────────────────

  @Test
  void searchActiveScaleAuthConditions_delegatesToRepository() {
    List<ScaleAuthCondition> expected = List.of();
    when(repository.searchActiveScaleAuthConditions("SCA", 1L, "t", "d", "Y", 5))
        .thenReturn(expected);

    List<ScaleAuthCondition> result =
        service.searchActiveScaleAuthConditions("SCA", 1L, "t", "d", "Y", 5);

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

  // ─── createScalerAuthorization – validation guards ───────────────────────────

  @Test
  void create_throwsWhenRequestNull() {
    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(null));
  }

  @Test
  void create_throwsWhenLicenceNoBlank() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setScalerLicenceNo("  ");

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenDistrictWideIndInvalid() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setDistrictWideInd("X");

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenEffectiveDateAfterExpiryDate() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 6, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2025, 1, 1));

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenJobFunctionIsSpecialButNoForestProducts() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setJobFunctions(List.of("S"));
    request.setAuthForestProducts(null);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenJobFunctionIsSpecialAndForestProductsEmpty() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setJobFunctions(List.of("S"));
    request.setAuthForestProducts(List.of());

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenDistrictNotWideAndNoScaleSites() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setDistrictWideInd("N");
    request.setScaleSites(null);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenDistrictNotWideAndScaleSitesEmpty() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setDistrictWideInd("N");
    request.setScaleSites(List.of());

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  // ─── createScalerAuthorization – post-create branches ───────────────────────

  @Test
  void create_throwsWhenRepositoryReturnsNull() {
    ScalerAuthorizationSaveRequest request = validRequest();
    when(repository.createScalerAuthorization(any())).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_throwsWhenCreatedIdIsNull() {
    ScalerAuthorizationSaveRequest request = validRequest();
    ScalerAuthorizationDetail withNullId = new ScalerAuthorizationDetail();
    withNullId.setScalerAuthorizationId(null);
    when(repository.createScalerAuthorization(any())).thenReturn(withNullId);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
  }

  @Test
  void create_setsExpiryNotificationToNWhenNull() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd(null);
    stubCreateAndGet(10L);

    service.createScalerAuthorization(request);

    assertEquals("N", request.getExpiryNotificationInd());
  }

  @Test
  void create_setsExpiryNotificationToNWhenBlank() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd("  ");
    stubCreateAndGet(10L);

    service.createScalerAuthorization(request);

    assertEquals("N", request.getExpiryNotificationInd());
  }

  @Test
  void create_preservesExpiryNotificationWhenAlreadySet() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setExpiryNotificationInd("Y");
    stubCreateAndGet(10L);

    service.createScalerAuthorization(request);

    assertEquals("Y", request.getExpiryNotificationInd());
  }

  @Test
  void create_districtWide_doesNotAddScaleSites() {
    ScalerAuthorizationSaveRequest request = validRequest(); // districtWideInd = "Y"
    stubCreateAndGet(10L);

    service.createScalerAuthorization(request);

    verify(repository, never()).addScaleSites(eq(10L), anyList());
  }

  @Test
  void create_notDistrictWide_addsScaleSites() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setDistrictWideInd("N");
    request.setScaleSites(List.of("SITE1"));
    stubCreateAndGet(10L);

    service.createScalerAuthorization(request);

    verify(repository).addScaleSites(eq(10L), eq(List.of("SITE1")));
  }

  @Test
  void create_addsConditionsJobFunctionsAndForestProducts() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setJobFunctions(List.of("R", "M"));
    request.setAuthForestProducts(List.of("FP1"));
    request.setConditions(List.of());
    stubCreateAndGet(10L);

    ScalerAuthorizationDetail result = service.createScalerAuthorization(request);

    assertNotNull(result);
    verify(repository).addConditions(eq(10L), anyList());
    verify(repository).addJobFunctions(eq(10L), eq(List.of("R", "M")));
    verify(repository).addAuthorizedForestProducts(eq(10L), eq(List.of("FP1")));
  }

  @Test
  void create_returnsFinalDetailFromGetAfterCreate() {
    ScalerAuthorizationSaveRequest request = validRequest();
    ScalerAuthorizationDetail created = new ScalerAuthorizationDetail();
    created.setScalerAuthorizationId(10L);
    ScalerAuthorizationDetail finalDetail = new ScalerAuthorizationDetail();
    finalDetail.setScalerAuthorizationId(10L);
    when(repository.createScalerAuthorization(any())).thenReturn(created);
    when(repository.getScalerAuthorization(10L)).thenReturn(finalDetail);

    ScalerAuthorizationDetail result = service.createScalerAuthorization(request);

    assertEquals(10L, result.getScalerAuthorizationId());
  }

  // ─── createScalerAuthorization – Reg/Dist required ──────────────────────────

  @Test
  void create_throwsWhenOrgUnitNoNull() {
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setOrgUnitNo(null);

    assertThrows(BadRequestException.class,
        () -> service.createScalerAuthorization(request));
    verify(repository, never()).createScalerAuthorization(any());
  }

  // ─── updateScalerAuthorization – guards ──────────────────────────────────────

  @Test
  void update_throwsWhenRequestNull() {
    assertThrows(BadRequestException.class,
        () -> service.updateScalerAuthorization(1L, null));
    verify(repository, never()).updateScalerAuthorization(any());
  }

  @Test
  void update_throwsWhenNotFound() {
    when(repository.getScalerAuthorization(1L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.updateScalerAuthorization(1L, validRequest()));
    verify(repository, never()).updateScalerAuthorization(any());
  }

  @Test
  void update_nonLetter_validationErrorPropagates() {
    when(repository.getScalerAuthorization(1L)).thenReturn(existingDetail(false));
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setScalerLicenceNo("   "); // trips validateUpdateRequest → validateCreateRequest

    assertThrows(BadRequestException.class,
        () -> service.updateScalerAuthorization(1L, request));
    verify(repository, never()).updateScalerAuthorization(any());
  }

  // ─── updateScalerAuthorization – letter-locked branch ────────────────────────

  @Test
  void update_letterLocked_appliesEditableFieldsAndSkipsValidationAndAssociations() {
    ScalerAuthorizationDetail existing = existingDetail(true);
    existing.setScalerLicenceNo("ORIGINAL");
    existing.setCancellationDate(LocalDate.of(2020, 6, 1));
    existing.setCancellationReasonTxt("OLD REASON");
    when(repository.getScalerAuthorization(1L)).thenReturn(existing);
    when(repository.updateScalerAuthorization(any())).thenReturn(existing);

    // An otherwise-INVALID request (blank licence) still succeeds: the letter-lock path skips validation
    // and applies the fields that stay editable once a letter exists — expiry, cancellation date and
    // cancellation reason — from the request; every locked field comes from the existing record.
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setScalerLicenceNo("   ");
    request.setAuthorizationExpiryDate(LocalDate.of(2031, 3, 15));
    request.setCancellationDate(LocalDate.of(2031, 4, 1));
    request.setCancellationReasonTxt("NEW REASON");

    service.updateScalerAuthorization(1L, request);

    ArgumentCaptor<ScalerAuthorizationRecord> captor =
        ArgumentCaptor.forClass(ScalerAuthorizationRecord.class);
    verify(repository).updateScalerAuthorization(captor.capture());
    ScalerAuthorizationRecord record = captor.getValue();
    assertEquals(LocalDate.of(2031, 3, 15), record.authorizationExpiryDate()); // new expiry applied
    assertEquals(LocalDate.of(2031, 4, 1), record.cancellationDate());         // new cancellation date applied
    assertEquals("NEW REASON", record.cancellationReasonTxt());                // new cancellation reason applied
    assertEquals("ORIGINAL", record.scalerLicenceNo());                        // locked field kept, not request
    // Associations are NOT rewritten in the letter-lock path.
    verify(repository, never()).deleteScalerAuthorizationAssociations(any());
    verify(repository, never()).addConditions(any(), anyList());
  }

  @Test
  void update_letterLocked_throwsWhenRepositoryReturnsNull() {
    when(repository.getScalerAuthorization(1L)).thenReturn(existingDetail(true));
    when(repository.updateScalerAuthorization(any())).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.updateScalerAuthorization(1L, validRequest()));
  }

  // ─── updateScalerAuthorization – non-letter branch ───────────────────────────

  @Test
  void update_nonLetter_throwsWhenRepositoryReturnsNull() {
    when(repository.getScalerAuthorization(1L)).thenReturn(existingDetail(false));
    when(repository.updateScalerAuthorization(any())).thenReturn(null);

    assertThrows(BadRequestException.class,
        () -> service.updateScalerAuthorization(1L, validRequest()));
    verify(repository, never()).deleteScalerAuthorizationAssociations(any());
  }

  @Test
  void update_nonLetter_districtWide_rewritesAssociationsAndSkipsScaleSites() {
    ScalerAuthorizationDetail existing = existingDetail(false);
    when(repository.getScalerAuthorization(1L)).thenReturn(existing);
    when(repository.updateScalerAuthorization(any())).thenReturn(existing);
    ScalerAuthorizationSaveRequest request = validRequest(); // districtWideInd = "Y"
    request.setJobFunctions(List.of("R"));

    ScalerAuthorizationDetail result = service.updateScalerAuthorization(1L, request);

    assertNotNull(result);
    verify(repository).deleteScalerAuthorizationAssociations(1L);
    verify(repository).addConditions(eq(1L), anyList());
    verify(repository).addJobFunctions(eq(1L), eq(List.of("R")));
    verify(repository).addAuthorizedForestProducts(eq(1L), anyList());
    verify(repository, never()).addScaleSites(eq(1L), anyList());
  }

  @Test
  void update_nonLetter_notDistrictWide_addsScaleSites() {
    ScalerAuthorizationDetail existing = existingDetail(false);
    when(repository.getScalerAuthorization(1L)).thenReturn(existing);
    when(repository.updateScalerAuthorization(any())).thenReturn(existing);
    ScalerAuthorizationSaveRequest request = validRequest();
    request.setDistrictWideInd("N");
    request.setScaleSites(List.of("SITE1"));

    service.updateScalerAuthorization(1L, request);

    verify(repository).addScaleSites(eq(1L), eq(List.of("SITE1")));
  }

  // ─── deleteScalerAuthorization ───────────────────────────────────────────────

  @Test
  void delete_throwsWhenNotFound() {
    when(repository.getScalerAuthorization(1L)).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.deleteScalerAuthorization(1L));
    verify(repository, never()).deleteScalerAuthorization(any());
  }

  @Test
  void delete_throwsWhenLetterExists() {
    when(repository.getScalerAuthorization(1L)).thenReturn(existingDetail(true));

    assertThrows(BadRequestException.class,
        () -> service.deleteScalerAuthorization(1L));
    verify(repository, never()).deleteScalerAuthorization(any());
    verify(repository, never()).deleteScalerAuthorizationAssociations(any());
  }

  @Test
  void delete_happyPathDeletesAssociationsThenRecord() {
    when(repository.getScalerAuthorization(1L)).thenReturn(existingDetail(false));

    service.deleteScalerAuthorization(1L);

    verify(repository).deleteScalerAuthorizationAssociations(1L);
    verify(repository).deleteScalerAuthorization(1L);
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  /** An existing persisted authorization (id 1) with the given letter-exists flag. */
  private ScalerAuthorizationDetail existingDetail(boolean letterExists) {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(1L);
    detail.setScalerLicenceNo("EXISTING_LIC");
    detail.setOrgUnitNo(1L);
    detail.setDistrictWideInd("Y");
    detail.setAuthorizationEffectiveDate(LocalDate.of(2020, 1, 1));
    detail.setAuthorizationExpiryDate(LocalDate.of(2020, 12, 31));
    detail.setLetterExists(letterExists);
    return detail;
  }

  /** A fully-valid request with districtWideInd=Y, no special job functions. */
  private ScalerAuthorizationSaveRequest validRequest() {
    ScalerAuthorizationSaveRequest request = new ScalerAuthorizationSaveRequest();
    request.setScalerLicenceNo("LIC001");
    request.setOrgUnitNo(1L);
    request.setDistrictWideInd("Y");
    request.setAuthorizationEffectiveDate(LocalDate.of(2025, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2025, 12, 31));
    request.setJobFunctions(List.of("R"));
    request.setAuthForestProducts(List.of());
    request.setConditions(List.of());
    request.setScaleSites(List.of());
    request.setExpiryNotificationInd("N");
    return request;
  }

  private void stubCreateAndGet(Long id) {
    ScalerAuthorizationDetail detail = new ScalerAuthorizationDetail();
    detail.setScalerAuthorizationId(id);
    when(repository.createScalerAuthorization(any())).thenReturn(detail);
    when(repository.getScalerAuthorization(id)).thenReturn(detail);
  }
}

