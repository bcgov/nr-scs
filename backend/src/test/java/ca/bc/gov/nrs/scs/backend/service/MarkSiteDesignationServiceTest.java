package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;

import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.HaulingMarkAuthorizationDetail;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationTimberMarkHolder;
import ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationUpdateCommand;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.MarkSiteDesignationSearchResult;
import ca.bc.gov.nrs.scs.backend.repository.MarkSiteDesignationRepository;

@ExtendWith(MockitoExtension.class)
class MarkSiteDesignationServiceTest {

  @Mock private MarkSiteDesignationRepository repository;

  private MarkSiteDesignationService service;

  @BeforeEach
  void setUp() {
    service = new MarkSiteDesignationService(repository);
  }

  @Test
  void lookupTimberMarkHolder_normalizesTimberMarkBeforeLookup() {
    when(repository.findTimberMarkHolder("TM-123"))
        .thenReturn(new MarkSiteDesignationTimberMarkHolder("TM-123", "CLIENT", "LOC", "NAME", "ACTIVE"));

    assertEquals("TM-123", service.lookupTimberMarkHolder("  tm-123  ").getTimberMark().orElse(null));

    verify(repository).findTimberMarkHolder("TM-123");
  }

  @Test
  void searchByTimberMark_normalizesAndDelegates() {
    when(repository.searchByTimberMark("TM-123")).thenReturn(List.of(
        new ca.bc.gov.nrs.scs.backend.domain.marksitedesignation.MarkSiteDesignationSearchResult(
            5001L, "TM-123", null, null, null)));

    List<MarkSiteDesignationSearchResult> result =
        service.searchMarkSiteDesignationsByTimberMark("  tm-123  ");

    assertEquals(1, result.size());
    assertEquals(5001L, result.get(0).getHaulingMarkAuthorizationId());
    verify(repository).searchByTimberMark("TM-123");
  }

  @Test
  void searchByTimberMark_throwsWhenBlank() {
    assertThrows(BadRequestException.class,
        () -> service.searchMarkSiteDesignationsByTimberMark("  "));
    verify(repository, never()).searchByTimberMark(any());
  }

  @Test
  void createMarkSiteDesignation_delegatesToRepositoryAndReturnsId() {
    MarkSiteDesignationCreateCommand command = new MarkSiteDesignationCreateCommand(
        "TM-123",
        "SOUTH VALLEY",
        "AB12",
        LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 12, 31),
        100L,
        "N",
        42,
        7,
        "MIXED STAND",
        "JAN 2026",
        "SPECIAL HANDLING",
        List.of("520"),
        List.of(),
        List.of(),
        List.of("21"));

    when(repository.timberMarkHolderExists("TM-123")).thenReturn(true);
    when(repository.createMarkSiteDesignation(command)).thenReturn(987L);

    Long id = service.createMarkSiteDesignation(command);

    assertEquals(987L, id);
    verify(repository).createMarkSiteDesignation(command);
    // Exceptions (exempt mark method codes) are persisted alongside the other child associations.
    verify(repository).addMarkSiteExceptions(987L, List.of("21"));
  }

  @Test
  void createMarkSiteDesignation_translatesScaleSiteDuplicateToFriendlyErr014() {
    // A scale site that already carries a valid designation for this timber mark trips the
    // HAULING_MARK_SITE unique key; the repository surfaces it as a Spring DuplicateKeyException. The
    // service must translate that to the legacy S07/ERR-014 message (a ConflictException) rather than
    // let the raw ORA-00001 text reach the caller.
    MarkSiteDesignationCreateCommand command = new MarkSiteDesignationCreateCommand(
        "TM-123", "SOUTH VALLEY", "AB12",
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
        100L, "N", 42, 7, "MIXED STAND", "JAN 2026", "SPECIAL HANDLING",
        List.of("520"), List.of(), List.of(), List.of());

    when(repository.timberMarkHolderExists("TM-123")).thenReturn(true);
    when(repository.createMarkSiteDesignation(command)).thenReturn(987L);
    doThrow(new DuplicateKeyException("ORA-00001: unique constraint violated"))
        .when(repository).addMarkSiteScaleSites(987L, List.of("520"));

    ConflictException ex = assertThrows(ConflictException.class,
        () -> service.createMarkSiteDesignation(command));

    assertEquals(
        "A valid Mark Site Designation already exists for this Timber Mark and Scale Site.",
        ex.getMessage());
    // A duplicate scale site aborts the create — the later child inserts must not run.
    verify(repository, never()).addMarkSiteConditions(any(), any());
    verify(repository, never()).addMarkSiteExceptions(any(), any());
  }

  @Test
  void createMarkSiteDesignation_throwsWhenRequiredFieldsAreMissing() {
    MarkSiteDesignationCreateCommand command = new MarkSiteDesignationCreateCommand(
      null, null, null, null, null, null, null, null, null, null, null, null,
      null, null, null, null);

    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createMarkSiteDesignation(command));

    assertEquals("Timber Mark is required.", ex.getMessage());
  }

  @Test
  void createMarkSiteDesignation_rejectsMissingEffectiveDate() {
    var cmd = createCommandWith("TM-1", null, LocalDate.of(2026, 12, 31), 100L, "N");
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createMarkSiteDesignation(cmd));
    assertEquals("Effective date is required.", ex.getMessage());
    verify(repository, never()).createMarkSiteDesignation(any());
  }

  @Test
  void createMarkSiteDesignation_rejectsMissingExpiryDate() {
    var cmd = createCommandWith("TM-1", LocalDate.of(2026, 1, 1), null, 100L, "N");
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createMarkSiteDesignation(cmd));
    assertEquals("Expiry date is required.", ex.getMessage());
  }

  @Test
  void createMarkSiteDesignation_rejectsMissingOrgUnit() {
    var cmd = createCommandWith("TM-1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), null, "N");
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createMarkSiteDesignation(cmd));
    assertEquals("Reg / Dist is required.", ex.getMessage());
  }

  @Test
  void createMarkSiteDesignation_rejectsNonYesNoDistrictWide() {
    var cmd = createCommandWith("TM-1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "X");
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createMarkSiteDesignation(cmd));
    assertEquals("District wide must be Y or N.", ex.getMessage());
  }

  @Test
  void createMarkSiteDesignation_rejectsReversedDateOrder() {
    var cmd = createCommandWith("TM-1", LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1), 100L, "N");
    BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createMarkSiteDesignation(cmd));
    assertEquals("Effective date must be on or before the expiry date.", ex.getMessage());
  }

  @Test
  void createMarkSiteDesignation_throwsWhenHolderNotFound() {
    var cmd = createCommandWith("TM-1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N");
    when(repository.timberMarkHolderExists("TM-1")).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.createMarkSiteDesignation(cmd));

    assertEquals("No mark holder found for timber mark TM-1", ex.getMessage());
    verify(repository, never()).createMarkSiteDesignation(any());
  }

  @Test
  void createMarkSiteDesignation_throwsWhenRepositoryReturnsNullId() {
    var cmd = createCommandWith("TM-1", LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N");
    when(repository.timberMarkHolderExists("TM-1")).thenReturn(true);
    when(repository.createMarkSiteDesignation(cmd)).thenReturn(null);

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createMarkSiteDesignation(cmd));

    assertEquals("Mark site designation could not be created.", ex.getMessage());
  }

  /** District Wide = N carries one scale site so the ERR-011 guard is satisfied. */
  private static MarkSiteDesignationCreateCommand createCommandWith(
      String timberMark, LocalDate effectiveDate, LocalDate expiryDate, Long orgUnitNo, String districtWideInd) {
    return new MarkSiteDesignationCreateCommand(
        timberMark, null, null, effectiveDate, expiryDate, orgUnitNo, districtWideInd,
        null, null, null, null, null, List.of("520"), List.of(), List.of(), List.of());
  }

  @Test
  void getMarkSiteDesignation_throwsWhenNotFound() {
    when(repository.getMarkSiteAuthorizationDetail(9L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getMarkSiteDesignation(9L));

    assertEquals("No mark site designation found with id 9", ex.getMessage());
  }

  @Test
  void lookupTimberMarkHolder_throwsWhenTimberMarkBlank() {
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.lookupTimberMarkHolder("  "));

    assertEquals("Timber Mark is required.", ex.getMessage());
    verify(repository, never()).findTimberMarkHolder(any());
  }

  @Test
  void lookupTimberMarkHolder_throwsWhenHolderNotFound() {
    when(repository.findTimberMarkHolder("TM-1")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.lookupTimberMarkHolder("tm-1"));

    assertEquals("No mark holder found for timber mark TM-1", ex.getMessage());
  }

  @Test
  void removeMarkSiteDesignationFromWorkbench_throwsWhenNotFound() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(false);

    assertThrows(ResourceNotFoundException.class, () -> service.removeMarkSiteDesignationFromWorkbench(1L));
  }

  @Test
  void removeMarkSiteDesignationFromWorkbench_succeedsWhenFound() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(true);

    service.removeMarkSiteDesignationFromWorkbench(1L);

    verify(repository).setExpiryNotificationInd(1L, "Y");
  }

  @Test
  void updateMarkSiteDesignation_throwsWhenNotFound() {
    when(repository.getMarkSiteAuthorizationDetail(999L)).thenReturn(null);
    MarkSiteDesignationUpdateCommand command = minimalUpdateCommand(LocalDate.of(2026, 12, 31));

    assertThrows(ResourceNotFoundException.class,
        () -> service.updateMarkSiteDesignation(999L, command));
  }

  @Test
  void updateMarkSiteDesignation_letterIssued_callsExpiryOnlyAndSkipsFullUpdate() {
    HaulingMarkAuthorizationDetail existing = detailWithLetter(1L);
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(existing);
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(true);
    when(repository.updateMarkSiteDesignationExpiryOnly(1L, LocalDate.of(2026, 12, 31)))
        .thenReturn(existing);
    stubRefresh(1L);

    service.updateMarkSiteDesignation(1L, minimalUpdateCommand(LocalDate.of(2026, 12, 31)));

    verify(repository).updateMarkSiteDesignationExpiryOnly(1L, LocalDate.of(2026, 12, 31));
    verify(repository, never()).updateMarkSiteDesignationRecord(any(), any());
    verify(repository, never()).deleteMarkSiteDesignationAssociations(any());
  }

  @Test
  void updateMarkSiteDesignation_letterIssuedDateSetButNoStoredLetter_runsFullUpdate() {
    // Regression (MSD# 1882): legacy records can carry a letterIssuedDate without a stored letter
    // record, so the edit form is unlocked (letterExists=false). The full update must run and
    // persist every edited field — gating on letterIssuedDate wrongly ran the expiry-only path and
    // silently dropped them.
    HaulingMarkAuthorizationDetail existing = detailWithLetter(1L); // letterIssuedDate != null
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(existing);
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(false);
    when(repository.updateMarkSiteDesignationRecord(eq(1L), any())).thenReturn(existing);
    stubRefresh(1L);

    service.updateMarkSiteDesignation(1L, minimalUpdateCommand(LocalDate.of(2026, 12, 31)));

    verify(repository).updateMarkSiteDesignationRecord(eq(1L), any());
    verify(repository, never()).updateMarkSiteDesignationExpiryOnly(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_letterIssued_throwsWhenExpiryDateMissing() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithLetter(1L));
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(true);
    MarkSiteDesignationUpdateCommand nullExpiry = minimalUpdateCommand(null);

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, nullExpiry));

    assertEquals("Expiry date is required.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationExpiryOnly(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_letterIssued_rejectsExpiryBeforeStoredEffectiveDate() {
    // ERR-007 applies on the expiry-only path too: the effective date is locked once a letter is
    // issued, but it still bounds the expiry date, which stays editable. The check was missing here,
    // so an expiry earlier than the effective date saved silently.
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithLetter(1L)); // eff 2026-01-01
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(true);
    var cmd = minimalUpdateCommand(LocalDate.of(2025, 12, 31));

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("Effective date must be on or before the expiry date.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationExpiryOnly(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_letterIssued_boundsExpiryByStoredNotSubmittedEffectiveDate() {
    // The expiry-only path discards every submitted field but the expiry date, so the guard reads the
    // stored effective date. A crafted PUT carrying an earlier effective date must not slip past it.
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithLetter(1L)); // eff 2026-01-01
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(true);
    var crafted = updateCommandWith(
        LocalDate.of(2020, 1, 1), LocalDate.of(2025, 12, 31), 100L, "N");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, crafted));

    assertEquals("Effective date must be on or before the expiry date.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationExpiryOnly(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_letterIssued_allowsExpiryEqualToStoredEffectiveDate() {
    // The rule is "on or after", so same-day expiry is valid.
    HaulingMarkAuthorizationDetail existing = detailWithLetter(1L); // eff 2026-01-01
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(existing);
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(true);
    when(repository.updateMarkSiteDesignationExpiryOnly(1L, LocalDate.of(2026, 1, 1)))
        .thenReturn(existing);
    stubRefresh(1L);

    service.updateMarkSiteDesignation(1L, minimalUpdateCommand(LocalDate.of(2026, 1, 1)));

    verify(repository).updateMarkSiteDesignationExpiryOnly(1L, LocalDate.of(2026, 1, 1));
  }

  @Test
  void updateMarkSiteDesignation_noLetter_runsFullUpdateInOrder() {
    HaulingMarkAuthorizationDetail existing = detailWithoutLetter(1L);
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(existing);
    when(repository.updateMarkSiteDesignationRecord(eq(1L), any())).thenReturn(existing);
    stubRefresh(1L);

    service.updateMarkSiteDesignation(1L, minimalUpdateCommand(LocalDate.of(2026, 12, 31)));

    InOrder order = inOrder(repository);
    order.verify(repository).updateMarkSiteDesignationRecord(eq(1L), any());
    order.verify(repository).deleteMarkSiteDesignationAssociations(1L);
    order.verify(repository).addMarkSiteScaleSites(eq(1L), any());
    order.verify(repository).addMarkSiteSpeciesContent(eq(1L), any());
    order.verify(repository).addMarkSiteConditions(eq(1L), any());
    order.verify(repository).addMarkSiteExceptions(eq(1L), any());
  }

  @Test
  void getMarkSiteDesignation_mapsDistrictWideIndOntoDetail() {
    HaulingMarkAuthorizationDetail existing = detailWithoutLetter(1L);
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(existing);
    stubRefresh(1L);
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(false);

    var detail = service.getMarkSiteDesignation(1L);

    assertEquals("N", detail.getDistrictWideInd().orElse(null));
  }

  // --- validateUpdateCommand branch locks (no-letter update path) -------------------------------------

  @Test
  void updateMarkSiteDesignation_rejectsMissingEffectiveDate() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(null, LocalDate.of(2026, 12, 31), 100L, "N");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("Effective date is required.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationRecord(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_rejectsMissingExpiryDate() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(LocalDate.of(2026, 1, 1), null, 100L, "N");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("Expiry date is required.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationRecord(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_rejectsMissingOrgUnit() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), null, "N");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("Reg / Dist is required.", ex.getMessage());
  }

  @Test
  void updateMarkSiteDesignation_rejectsMissingDistrictWide() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, null);

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("District wide is required.", ex.getMessage());
  }

  @Test
  void updateMarkSiteDesignation_rejectsNonYesNoDistrictWide() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "X");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("District wide must be Y or N.", ex.getMessage());
  }

  @Test
  void updateMarkSiteDesignation_rejectsReversedDateOrder() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1), 100L, "N");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("Effective date must be on or before the expiry date.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationRecord(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_rejectsDistrictWideNoWithNoScaleSites() {
    // ERR-011 (MSD-002 Divergence #1) is now enforced server-side, so a crafted PUT cannot bypass the
    // edit screen's rule. Matches legacy MarkSiteBo.validateUpdateMarkSite → scaleSiteRequired().
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = updateCommandWith(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N");

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("At least one scale site is required when district wide is N.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationRecord(any(), any());
  }

  @Test
  void updateMarkSiteDesignation_allowsDistrictWideYesWithNoScaleSites() {
    HaulingMarkAuthorizationDetail existing = detailWithoutLetter(1L);
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(existing);
    when(repository.updateMarkSiteDesignationRecord(eq(1L), any())).thenReturn(existing);
    stubRefresh(1L);
    var cmd = updateCommandWith(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "Y");

    service.updateMarkSiteDesignation(1L, cmd);

    verify(repository).updateMarkSiteDesignationRecord(eq(1L), any());
  }

  @Test
  void createMarkSiteDesignation_rejectsDistrictWideNoWithNoScaleSites() {
    // The create screen already blocks this client-side (validateMarkSiteSave); the server-side guard
    // closes the crafted-POST path. NOTE: legacy validateCreateMarkSite did NOT check this, but only
    // because its create step cleared scale sites (MarkSiteAction.addConditions) — sites arrived on the
    // follow-up update. The new API creates sites in the same POST, so the rule belongs on both paths.
    var cmd = new MarkSiteDesignationCreateCommand(
        "TM-1", null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N",
        null, null, null, null, null, List.of(), List.of(), List.of(), List.of());

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createMarkSiteDesignation(cmd));

    assertEquals("At least one scale site is required when district wide is N.", ex.getMessage());
    verify(repository, never()).createMarkSiteDesignation(any());
  }

  // --- ERR-019..ERR-022 free-text column lengths -----------------------------------------------
  // Legacy HaulingMarkAuthorizationValidator.checkFieldLengths() enforced these and rendered them
  // through `errors.maxlength`, naming the field. The create/edit screens now do the same
  // client-side; these cover the crafted-request path, where the alternative is a raw ORA-12899.

  @Test
  void createMarkSiteDesignation_rejectsOverLengthTextFields() {
    assertEquals(
        "Geographic Location can not be greater than 40 characters.",
        createLengthFailure("X".repeat(41), null, null, null, null));
    assertEquals(
        "Population can not be greater than 4 characters.",
        createLengthFailure(null, "12345", null, null, null));
    assertEquals(
        "Timber Description can not be greater than 40 characters.",
        createLengthFailure(null, null, "X".repeat(41), null, null));
    assertEquals(
        "Transportation Date Desc can not be greater than 200 characters.",
        createLengthFailure(null, null, null, "X".repeat(201), null));
    assertEquals(
        "Other Requirements can not be greater than 4000 characters.",
        createLengthFailure(null, null, null, null, "X".repeat(4001)));
  }

  @Test
  void createMarkSiteDesignation_acceptsTextFieldsAtTheirLimit() {
    var cmd = createCommandWithText(
        "X".repeat(40), "1234", "X".repeat(40), "X".repeat(200), "X".repeat(4000));
    when(repository.timberMarkHolderExists("TM-1")).thenReturn(true);
    when(repository.createMarkSiteDesignation(cmd)).thenReturn(7001L);

    assertEquals(7001L, service.createMarkSiteDesignation(cmd));
  }

  @Test
  void updateMarkSiteDesignation_rejectsOverLengthTextFields() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithoutLetter(1L));
    var cmd = new MarkSiteDesignationUpdateCommand(
        null, null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N",
        null, null, null, null, "X".repeat(4001),
        List.of("520"), List.of(), List.of(), List.of());

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateMarkSiteDesignation(1L, cmd));

    assertEquals("Other Requirements can not be greater than 4000 characters.", ex.getMessage());
    verify(repository, never()).updateMarkSiteDesignationRecord(any(), any());
  }

  /**
   * The letter-issued path discards every field but the expiry date, so an over-length value on it
   * is not persisted and must not be rejected — the screen disables those fields entirely.
   */
  @Test
  void updateMarkSiteDesignation_ignoresOverLengthTextWhenLetterIssued() {
    when(repository.getMarkSiteAuthorizationDetail(1L)).thenReturn(detailWithLetter(1L));
    when(repository.getMarkSiteDesignationLetterExists(1L)).thenReturn(true);
    stubRefresh(1L);
    var cmd = new MarkSiteDesignationUpdateCommand(
        "X".repeat(41), null, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N",
        null, null, null, null, null,
        List.of("520"), List.of(), List.of(), List.of());

    service.updateMarkSiteDesignation(1L, cmd);

    verify(repository).updateMarkSiteDesignationExpiryOnly(1L, LocalDate.of(2026, 12, 31));
  }

  private String createLengthFailure(
      String geographicLocation, String population, String timberDescription,
      String transportationDateDesc, String otherRequirements) {
    var cmd = createCommandWithText(geographicLocation, population, timberDescription,
        transportationDateDesc, otherRequirements);
    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createMarkSiteDesignation(cmd));
    verify(repository, never()).createMarkSiteDesignation(cmd);
    return ex.getMessage();
  }

  private static MarkSiteDesignationCreateCommand createCommandWithText(
      String geographicLocation, String population, String timberDescription,
      String transportationDateDesc, String otherRequirements) {
    return new MarkSiteDesignationCreateCommand(
        "TM-1", geographicLocation, population,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), 100L, "N",
        null, null, timberDescription, transportationDateDesc, otherRequirements,
        List.of("520"), List.of(), List.of(), List.of());
  }

  private static MarkSiteDesignationUpdateCommand updateCommandWith(
      LocalDate effectiveDate, LocalDate expiryDate, Long orgUnitNo, String districtWideInd) {
    return new MarkSiteDesignationUpdateCommand(
        null, null, effectiveDate, expiryDate, orgUnitNo, districtWideInd,
        null, null, null, null, null, List.of(), List.of(), List.of(), List.of());
  }

  private static HaulingMarkAuthorizationDetail detailWithoutLetter(Long id) {
    return new HaulingMarkAuthorizationDetail(
        id, "TM-001", 100L,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
        "N", null, null, null,
        null, null, null, null, null, null, null, "USER1",
        null, null, null, null);
  }

  private static HaulingMarkAuthorizationDetail detailWithLetter(Long id) {
    return new HaulingMarkAuthorizationDetail(
        id, "TM-001", 100L,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
        "N", LocalDate.of(2026, 3, 1), "USER1", null,
        null, null, null, null, null, null, null, "USER1",
        null, null, null, null);
  }

  /** District Wide = N carries one scale site so the ERR-011 guard is satisfied. */
  private static MarkSiteDesignationUpdateCommand minimalUpdateCommand(LocalDate expiryDate) {
    return new MarkSiteDesignationUpdateCommand(
        null, null,
        LocalDate.of(2026, 1, 1), expiryDate,
        100L, "N",
        null, null, null, null, null,
        List.of("520"), List.of(), List.of(), List.of());
  }

  /** Stubs the repo calls made by the internal getMarkSiteDesignation refresh. */
  private void stubRefresh(Long id) {
    when(repository.findTimberMarkHolder("TM-001"))
        .thenReturn(new MarkSiteDesignationTimberMarkHolder("TM-001", "CLIENT", "LOC", "NAME", "ACTIVE"));
    when(repository.getMarkSiteDesignationScaleSites(id)).thenReturn(List.of());
    when(repository.getMarkSiteDesignationSpeciesContent(id)).thenReturn(List.of());
    when(repository.getMarkSiteDesignationConditions(id)).thenReturn(List.of());
    when(repository.getMarkSiteDesignationExceptions(id)).thenReturn(List.of());
  }
}