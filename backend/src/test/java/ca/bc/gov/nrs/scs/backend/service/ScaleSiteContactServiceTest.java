package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ConflictException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ClientContactSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContact;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteOwner;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteContactRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteOwnerRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScaleSiteContactService tests")
class ScaleSiteContactServiceTest {

  @Mock
  private ScaleSiteContactRepository contactRepository;

  @Mock
  private ScaleSiteRepository scaleSiteRepository;

  @Mock
  private ScaleSiteOwnerRepository ownerRepository;

  @InjectMocks
  private ScaleSiteContactService service;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private void siteExists(String siteId) {
    when(scaleSiteRepository.getScaleSite(siteId))
        .thenReturn(new ScaleSiteCore(siteId, "MAIN YARD", "Nanaimo"));
  }

  private ScaleSiteContactRecord contactRecord(String siteId, Long contactId, String primaryInd) {
    return new ScaleSiteContactRecord(
        contactId,
        siteId,
        YesNo.fromCode(primaryInd),
        "John Smith",
        "Site Manager",
        "250-555-1234",
        "250-555-9012",
        null,
        "manager@example.com",
        YesNo.Y,
        LocalDate.of(2024, 1, 1),
        null,
        null, null, null, null, 0L);
  }

  private ScaleSiteContactCreateCommand createCommand() {
    return new ScaleSiteContactCreateCommand(
        12345L, "Site Manager", YesNo.N, YesNo.Y, LocalDate.of(2024, 1, 1), null);
  }

  private ScaleSiteContactCreateCommand createCommand(
      String role, YesNo primaryInd, LocalDate effectiveDate, LocalDate expiryDate) {
    return new ScaleSiteContactCreateCommand(
        12345L, role, primaryInd, YesNo.Y, effectiveDate, expiryDate);
  }

  private ScaleSiteContactUpdateCommand updateCommand() {
    return new ScaleSiteContactUpdateCommand(
        "Site Manager", YesNo.N, YesNo.Y, LocalDate.of(2024, 1, 1), null);
  }

  private ScaleSiteContactUpdateCommand updateCommand(
      YesNo primaryInd, LocalDate effectiveDate, LocalDate expiryDate) {
    return new ScaleSiteContactUpdateCommand(
        "Site Manager", primaryInd, YesNo.Y, effectiveDate, expiryDate);
  }

  // ---------------------------------------------------------------------------
  // getOwner
  // ---------------------------------------------------------------------------

  @Test
  void getOwner_trimsAndUppercasesSiteIdAndMapsOwner() {
    siteExists("SITE001");
    when(ownerRepository.getOwner("SITE001")).thenReturn(new ScaleSiteOwnerRecord(
        "SITE001", "12345678", "00", "ACME FOREST PRODUCTS LTD.",
        "Smith", "John", "250-555-1234", null, null, null, "owner@example.com",
        "123 Main St", null, null, "Nanaimo", "BC", "Canada", "V9R1A1"));

    ScaleSiteOwner result = service.getOwner(" site001 ");

    assertEquals("ACME FOREST PRODUCTS LTD.", result.getCompanyName().get());
    assertEquals("12345678", result.getClientNumber().get());
    assertEquals("Nanaimo", result.getCity().get());
    verify(scaleSiteRepository).getScaleSite("SITE001");
    verify(ownerRepository).getOwner("SITE001");
  }

  @Test
  void getOwner_notFoundWhenScaleSiteMissing() {
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getOwner("site001"));

    assertEquals("No scale site found with id SITE001.", ex.getMessage());
    verify(ownerRepository, never()).getOwner(any());
  }

  @Test
  void getOwner_notFoundWhenOwnerMissing() {
    siteExists("SITE001");
    when(ownerRepository.getOwner("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getOwner("SITE001"));

    assertEquals("No owner found for scale site SITE001.", ex.getMessage());
  }

  // ---------------------------------------------------------------------------
  // getContacts
  // ---------------------------------------------------------------------------

  @Test
  void getContacts_returnsMappedListForExistingSite() {
    siteExists("SITE001");
    when(contactRepository.getContactsForSite("SITE001"))
        .thenReturn(List.of(contactRecord("SITE001", 12345L, "Y")));

    List<ScaleSiteContact> result = service.getContacts("SITE001");

    assertEquals(1, result.size());
    assertEquals(12345L, result.getFirst().getClientContactId());
    assertEquals(ScaleSiteContact.PrimaryContactIndEnum.Y, result.getFirst().getPrimaryContactInd());
    assertEquals("John Smith", result.getFirst().getContactName());
  }

  @Test
  void getContacts_notFoundWhenScaleSiteMissing() {
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.getContacts("SITE001"));
    verify(contactRepository, never()).getContactsForSite(any());
  }

  // ---------------------------------------------------------------------------
  // getContact
  // ---------------------------------------------------------------------------

  @Test
  void getContact_returnsContactEnrichedWithClientContactPersonDetails() {
    siteExists("SITE001");
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "Y"));
    when(contactRepository.getClientContact(12345L))
        .thenReturn(new ClientContactRecord(12345L, "John Smith",
            "250-555-1234", "250-555-9012", "250-555-5678", "john.smith@example.com"));

    ScaleSiteContact result = service.getContact(" site001 ", 12345L);

    assertEquals(12345L, result.getClientContactId());
    assertEquals(LocalDate.of(2024, 1, 1), result.getEffectiveDate());
    assertEquals("John Smith", result.getContactName());
    assertEquals("250-555-9012", result.getCellPhone().get());
    verify(contactRepository).getContact("SITE001", 12345L);
    verify(contactRepository).getClientContact(12345L);
  }

  @Test
  void getContact_returnsContactWhenClientContactDetailsMissing() {
    siteExists("SITE001");
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "Y"));
    when(contactRepository.getClientContact(12345L)).thenReturn(null);

    ScaleSiteContact result = service.getContact("SITE001", 12345L);

    assertEquals(12345L, result.getClientContactId());
    assertEquals(LocalDate.of(2024, 1, 1), result.getEffectiveDate());
    verify(contactRepository).getClientContact(12345L);
  }

  @Test
  void getContact_notFound() {
    siteExists("SITE001");
    when(contactRepository.getContact("SITE001", 99999L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getContact("SITE001", 99999L));

    assertEquals("Contact 99999 not found on scale site SITE001.", ex.getMessage());
  }

  @Test
  void getContact_notFoundWhenScaleSiteMissing() {
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.getContact("SITE001", 12345L));

    assertEquals("No scale site found with id SITE001.", ex.getMessage());
    verify(contactRepository, never()).getContact(any(), any());
  }

  // ---------------------------------------------------------------------------
  // createContact
  // ---------------------------------------------------------------------------

  @Test
  void createContact_insertsAndReturnsReloadedContact() {
    siteExists("SITE001");
    when(contactRepository.clientContactExists(12345L)).thenReturn(true);
    when(contactRepository.contactExists("SITE001", 12345L)).thenReturn(false);
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"));

    ScaleSiteContact result = service.createContact("site001", createCommand());

    assertEquals(12345L, result.getClientContactId());
    verify(contactRepository).insertContact(eq("SITE001"), any(ScaleSiteContactCreateCommand.class));
    verify(contactRepository, never()).primaryContactExists(any());
  }

  @Test
  void createContact_primaryChecksForExistingPrimaryBeforeInsert() {
    siteExists("SITE001");
    ScaleSiteContactCreateCommand command =
        createCommand("Site Manager", YesNo.Y, LocalDate.of(2024, 1, 1), null);
    when(contactRepository.clientContactExists(12345L)).thenReturn(true);
    when(contactRepository.contactExists("SITE001", 12345L)).thenReturn(false);
    when(contactRepository.primaryContactExists("SITE001")).thenReturn(false);
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "Y"));

    ScaleSiteContact result = service.createContact("SITE001", command);

    assertEquals(12345L, result.getClientContactId());
    verify(contactRepository).primaryContactExists("SITE001");
  }

  @Test
  void createContact_conflictWhenContactAlreadyAssociated() {
    siteExists("SITE001");
    when(contactRepository.clientContactExists(12345L)).thenReturn(true);
    when(contactRepository.contactExists("SITE001", 12345L)).thenReturn(true);

    ConflictException ex = assertThrows(ConflictException.class,
        () -> service.createContact("SITE001", createCommand()));

    assertEquals("Contact 12345 is already associated with scale site SITE001.", ex.getMessage());
    verify(contactRepository, never()).insertContact(any(), any());
  }

  @Test
  void createContact_notFoundWhenClientContactDoesNotExist() {
    siteExists("SITE001");
    when(contactRepository.clientContactExists(12345L)).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.createContact("SITE001", createCommand()));

    assertEquals("A Client Contact could not be found for 12345.", ex.getMessage());
    verify(contactRepository, never()).insertContact(any(), any());
  }

  @Test
  void createContact_conflictWhenPrimaryAlreadyExists() {
    siteExists("SITE001");
    ScaleSiteContactCreateCommand command =
        createCommand("Site Manager", YesNo.Y, LocalDate.of(2024, 1, 1), null);
    when(contactRepository.clientContactExists(12345L)).thenReturn(true);
    when(contactRepository.primaryContactExists("SITE001")).thenReturn(true);

    ConflictException ex = assertThrows(ConflictException.class,
        () -> service.createContact("SITE001", command));

    assertEquals(
        "A primary contact already exists for scale site SITE001. "
            + "Remove or update it before adding a new primary contact.",
        ex.getMessage());
    verify(contactRepository, never()).insertContact(any(), any());
  }

  @Test
  void createContact_throwsWhenSavedRecordMissingAfterInsert() {
    siteExists("SITE001");
    when(contactRepository.clientContactExists(12345L)).thenReturn(true);
    when(contactRepository.contactExists("SITE001", 12345L)).thenReturn(false);
    when(contactRepository.getContact("SITE001", 12345L)).thenReturn(null);

    assertThrows(IllegalStateException.class,
        () -> service.createContact("SITE001", createCommand()));
  }

  @Test
  void createContact_notFoundWhenScaleSiteMissing() {
    when(scaleSiteRepository.getScaleSite("SITE001")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class,
        () -> service.createContact("SITE001", createCommand()));
    verify(contactRepository, never()).insertContact(any(), any());
  }

  // Note: the request's @NotNull/@Size/enum contract (clientContactId, the indicators,
  // effectiveDate, role length) is enforced by bean validation on the generated request before the
  // command is built, so those checks never reach the service — they are covered by the controller
  // @Valid boundary tests instead. Only the whitespace-only role and the expiry/effective ordering
  // remain reachable here.

  @Test
  void createContact_rejectsBlankRole() {
    siteExists("SITE001");
    ScaleSiteContactCreateCommand command =
        createCommand("   ", YesNo.N, LocalDate.of(2024, 1, 1), null);

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createContact("SITE001", command));

    assertEquals("contactRoleDescription is required.", ex.getMessage());
  }

  @Test
  void createContact_rejectsExpiryBeforeEffectiveDate() {
    siteExists("SITE001");
    ScaleSiteContactCreateCommand command = createCommand(
        "Site Manager", YesNo.N, LocalDate.of(2024, 1, 1), LocalDate.of(2023, 12, 31));

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.createContact("SITE001", command));

    assertEquals("expiryDate must be on or after effectiveDate.", ex.getMessage());
  }

  // ---------------------------------------------------------------------------
  // updateContact
  // ---------------------------------------------------------------------------

  // Note: as on the create path, the request's @NotNull/@Size/enum contract (the indicators,
  // effectiveDate, role length) is enforced by bean validation on the generated request before the
  // command is built, so those checks never reach the service — they are covered by the controller
  // @Valid boundary tests instead. Only the whitespace-only role and the expiry/effective ordering
  // remain reachable here.

  @Test
  void updateContact_updatesAndReturnsReloadedContact() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"));

    ScaleSiteContact result = service.updateContact("site001", 12345L, updateCommand());

    assertEquals(12345L, result.getClientContactId());
    verify(contactRepository)
        .updateContact(eq("SITE001"), eq(12345L), any(ScaleSiteContactUpdateCommand.class));
    verify(contactRepository, never()).primaryContactExists(any());
  }

  @Test
  void updateContact_promotingToPrimaryChecksForExistingPrimary() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"));
    when(contactRepository.primaryContactExists("SITE001")).thenReturn(false);

    service.updateContact("SITE001", 12345L, updateCommand(YesNo.Y, LocalDate.of(2024, 1, 1), null));

    verify(contactRepository).primaryContactExists("SITE001");
    verify(contactRepository)
        .updateContact(eq("SITE001"), eq(12345L), any(ScaleSiteContactUpdateCommand.class));
  }

  @Test
  void updateContact_conflictWhenPromotingToPrimaryAndPrimaryExists() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"));
    when(contactRepository.primaryContactExists("SITE001")).thenReturn(true);

    ConflictException ex = assertThrows(ConflictException.class,
        () -> service.updateContact("SITE001", 12345L,
            updateCommand(YesNo.Y, LocalDate.of(2024, 1, 1), null)));

    assertEquals("A primary contact already exists for scale site SITE001.", ex.getMessage());
    verify(contactRepository, never()).updateContact(any(), any(), any());
  }

  @Test
  void updateContact_alreadyPrimaryDoesNotRecheckExistingPrimary() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "Y"));

    service.updateContact("SITE001", 12345L, updateCommand(YesNo.Y, LocalDate.of(2024, 1, 1), null));

    verify(contactRepository, never()).primaryContactExists(any());
    verify(contactRepository)
        .updateContact(eq("SITE001"), eq(12345L), any(ScaleSiteContactUpdateCommand.class));
  }

  @Test
  void updateContact_notFoundWhenContactMissing() {
    when(contactRepository.getContact("SITE001", 99999L)).thenReturn(null);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.updateContact("SITE001", 99999L, updateCommand()));

    assertEquals("Contact 99999 not found on scale site SITE001.", ex.getMessage());
    verify(contactRepository, never()).updateContact(any(), any(), any());
  }

  @Test
  void updateContact_throwsWhenReloadedRecordMissingAfterUpdate() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"), (ScaleSiteContactRecord) null);

    assertThrows(IllegalStateException.class,
        () -> service.updateContact("SITE001", 12345L, updateCommand()));
  }

  @Test
  void updateContact_rejectsBlankRole() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"));

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateContact("SITE001", 12345L,
            new ScaleSiteContactUpdateCommand("   ", YesNo.N, YesNo.Y, LocalDate.of(2024, 1, 1), null)));

    assertEquals("contactRoleDescription is required.", ex.getMessage());
    verify(contactRepository, never()).updateContact(any(), any(), any());
  }

  @Test
  void updateContact_rejectsExpiryBeforeEffectiveDate() {
    when(contactRepository.getContact("SITE001", 12345L))
        .thenReturn(contactRecord("SITE001", 12345L, "N"));

    BadRequestException ex = assertThrows(BadRequestException.class,
        () -> service.updateContact("SITE001", 12345L,
            updateCommand(YesNo.N, LocalDate.of(2024, 1, 1), LocalDate.of(2023, 12, 31))));

    assertEquals("expiryDate must be on or after effectiveDate.", ex.getMessage());
    verify(contactRepository, never()).updateContact(any(), any(), any());
  }

  // ---------------------------------------------------------------------------
  // deleteContact
  // ---------------------------------------------------------------------------

  @Test
  void deleteContact_deletesWhenContactExists() {
    when(contactRepository.contactExists("SITE001", 12345L)).thenReturn(true);

    service.deleteContact("site001", 12345L);

    verify(contactRepository).deleteContact("SITE001", 12345L);
  }

  @Test
  void deleteContact_notFoundWhenContactMissing() {
    when(contactRepository.contactExists("SITE001", 99999L)).thenReturn(false);

    ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
        () -> service.deleteContact("SITE001", 99999L));

    assertEquals("Contact 99999 not found on scale site SITE001.", ex.getMessage());
    verify(contactRepository, never()).deleteContact(any(), any());
  }

  // ---------------------------------------------------------------------------
  // searchClientContacts
  // ---------------------------------------------------------------------------

  @Test
  void searchClientContacts_mapsRepositoryEntries() {
    when(contactRepository.searchClientContacts(null, "12345678", "00", "smith")).thenReturn(List.of(
        new ClientContactSearchEntry(12345L, "John Smith", "12345678", "00",
            "250-555-1234", "manager@example.com")));

    List<ClientContactSearchResult> result =
        service.searchClientContacts(null, "12345678", "00", "smith");

    assertEquals(1, result.size());
    assertEquals(12345L, result.getFirst().getClientContactId());
    assertEquals("John Smith", result.getFirst().getContactName().get());
    assertEquals("250-555-1234", result.getFirst().getBusinessPhone().get());
  }
}
