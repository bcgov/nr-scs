package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.MarkSiteDesignationWorkbenchEntry;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScaleSiteAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.workbench.ScalerAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.model.AuthorizationRenewResult;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationWorkbenchResult;
import ca.bc.gov.nrs.scs.backend.repository.WorkbenchRepository;

@ExtendWith(MockitoExtension.class)
class WorkbenchServiceTest {

  @Mock private WorkbenchRepository workbenchRepository;
  private WorkbenchService service;

  @BeforeEach
  void setUp() {
    service = new WorkbenchService(workbenchRepository);
  }

  // ─── Renewal ─────────────────────────────────────────────────────────────────

  @Test
  void renewScalerAuthorization_setsNewIdWhenRepositoryReturnsOne() {
    when(workbenchRepository.renewScalerAuthorization(1L)).thenReturn(99L);

    AuthorizationRenewResult result = service.renewScalerAuthorization(1L);

    assertTrue(result.getNewAuthorizationId().isPresent());
    assertEquals(99L, result.getNewAuthorizationId().get());
  }

  @Test
  void renewScaleSiteAuthorization_setsNewIdWhenRepositoryReturnsOne() {
    when(workbenchRepository.renewScaleSiteAuthorization(5L)).thenReturn(99L);

    AuthorizationRenewResult result = service.renewScaleSiteAuthorization(5L);

    assertTrue(result.getNewAuthorizationId().isPresent());
    assertEquals(99L, result.getNewAuthorizationId().get());
  }

  @Test
  void renewMarkSiteDesignation_setsNewIdWhenRepositoryReturnsOne() {
    when(workbenchRepository.renewMarkSiteDesignation(10L)).thenReturn(11L);

    AuthorizationRenewResult result = service.renewMarkSiteDesignation(10L);

    assertTrue(result.getNewAuthorizationId().isPresent());
    assertEquals(11L, result.getNewAuthorizationId().get());
  }

  @Test
  void renew_leavesIdUndefinedWhenRepositoryReturnsNull() {
    when(workbenchRepository.renewScalerAuthorization(1L)).thenReturn(null);

    AuthorizationRenewResult result = service.renewScalerAuthorization(1L);

    assertFalse(result.getNewAuthorizationId().isPresent());
  }

  @Test
  void renewScaleSite_leavesIdUndefinedWhenRepositoryReturnsNull() {
    when(workbenchRepository.renewScaleSiteAuthorization(5L)).thenReturn(null);

    AuthorizationRenewResult result = service.renewScaleSiteAuthorization(5L);

    assertFalse(result.getNewAuthorizationId().isPresent());
  }

  @Test
  void renewMarkSite_leavesIdUndefinedWhenRepositoryReturnsNull() {
    when(workbenchRepository.renewMarkSiteDesignation(10L)).thenReturn(null);

    AuthorizationRenewResult result = service.renewMarkSiteDesignation(10L);

    assertFalse(result.getNewAuthorizationId().isPresent());
  }

  // ─── Workbench grids ─────────────────────────────────────────────────────────

  @Test
  void searchScalerAuthorizations_delegatesToRepository() {
    ScalerAuthorizationWorkbenchSearchCriteria criteria =
        new ScalerAuthorizationWorkbenchSearchCriteria(1L, null, null, "LIC001", null, null, null, 1, 2);
    List<ScalerAuthorizationWorkbenchResult> expected = List.of();
    when(workbenchRepository.searchScalerAuthorizations(criteria)).thenReturn(expected);

    assertEquals(expected, service.searchScalerAuthorizations(criteria));
    verify(workbenchRepository).searchScalerAuthorizations(criteria);
  }

  @Test
  void searchScaleSiteAuthorizations_delegatesToRepository() {
    ScaleSiteAuthorizationWorkbenchSearchCriteria criteria =
        new ScaleSiteAuthorizationWorkbenchSearchCriteria(1L, null, null, "S1", "name", 2L, 3L, 1, 2);
    List<ScaleSiteAuthorizationWorkbenchResult> expected = List.of();
    when(workbenchRepository.searchScaleSiteAuthorizations(criteria)).thenReturn(expected);

    assertEquals(expected, service.searchScaleSiteAuthorizations(criteria));
    verify(workbenchRepository).searchScaleSiteAuthorizations(criteria);
  }

  @Test
  void searchMarkSiteDesignations_appliesDefaultsAndUppercasesTimberMark() {
    MarkSiteDesignationWorkbenchEntry entry = new MarkSiteDesignationWorkbenchEntry(
        1L, null, null, "TM-1", 2L, 3L);
    when(workbenchRepository.searchMarkSiteDesignations(any(MarkSiteDesignationSearchCriteria.class)))
        .thenReturn(List.of(entry));

    List<MarkSiteDesignationWorkbenchResult> result = service.searchMarkSiteDesignations(
        new MarkSiteDesignationSearchCriteria(1L, null, null, "tm-1", 2L, 3L, null, null));

    assertEquals(1, result.size());
    verify(workbenchRepository).searchMarkSiteDesignations(new MarkSiteDesignationSearchCriteria(
        1L, null, null, "TM-1", 2L, 3L, 1, 0));
  }

  @Test
  void searchMarkSiteDesignations_throwsWhenPrimarySortInvalid() {
    MarkSiteDesignationSearchCriteria criteria =
        new MarkSiteDesignationSearchCriteria(1L, null, null, "tm-1", 2L, 3L, 99, 0);

    assertThrows(BadRequestException.class, () -> service.searchMarkSiteDesignations(criteria));
  }

  @Test
  void searchMarkSiteDesignations_throwsWhenSecondarySortInvalid() {
    MarkSiteDesignationSearchCriteria criteria =
        new MarkSiteDesignationSearchCriteria(1L, null, null, "tm-1", 2L, 3L, 1, 99);

    assertThrows(BadRequestException.class, () -> service.searchMarkSiteDesignations(criteria));
  }
}
