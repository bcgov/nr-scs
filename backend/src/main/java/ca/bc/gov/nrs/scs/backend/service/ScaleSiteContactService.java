package ca.bc.gov.nrs.scs.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactRecord;
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
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteContactApiMapper;

@Service
public class ScaleSiteContactService {

  private final ScaleSiteContactRepository contactRepository;
  private final ScaleSiteRepository scaleSiteRepository;
  private final ScaleSiteOwnerRepository ownerRepository;

  public ScaleSiteContactService(
      ScaleSiteContactRepository contactRepository,
      ScaleSiteRepository scaleSiteRepository,
      ScaleSiteOwnerRepository ownerRepository) {
    this.contactRepository = contactRepository;
    this.scaleSiteRepository = scaleSiteRepository;
    this.ownerRepository = ownerRepository;
  }

  public ScaleSiteOwner getOwner(String scaleSiteIdNmbr) {
    String siteId = scaleSiteIdNmbr.trim().toUpperCase();
    requireScaleSiteExists(siteId);
    ScaleSiteOwnerRecord domain = ownerRepository.getOwner(siteId);
    SCSUtils.requireFound(domain, "No owner found for scale site " + siteId + ".");
    return ScaleSiteContactApiMapper.toOwnerModel(domain);
  }

  public List<ScaleSiteContact> getContacts(String scaleSiteIdNmbr) {
    requireScaleSiteExists(scaleSiteIdNmbr);
    List<ScaleSiteContactRecord> contacts =
        contactRepository.getContactsForSite(scaleSiteIdNmbr.trim().toUpperCase());
    return ScaleSiteContactApiMapper.toModelList(contacts);
  }

  public ScaleSiteContact getContact(String scaleSiteIdNmbr, Long clientContactId) {
    String siteId = scaleSiteIdNmbr.trim().toUpperCase();
    requireScaleSiteExists(siteId);
    ScaleSiteContactRecord contact = contactRepository.getContact(siteId, clientContactId);
    SCSUtils.requireFound(contact, "Contact " + clientContactId + " not found on scale site " + siteId + ".");

    // The contact view shows the person's name and phones, which live on CLIENT_CONTACT rather
    // than SCALE_SITE_CONTACT. Enrich here (not in the repository) so existence checks and
    // write-reloads keep using the single-query getContact above.
    ClientContactRecord person = contactRepository.getClientContact(clientContactId);
    ScaleSiteContactRecord enriched = person == null
        ? contact
        : contact.withPersonDetails(
            person.contactName(),
            person.businessPhone(),
            person.cellPhone(),
            person.faxNumber(),
            person.emailAddress());
    return ScaleSiteContactApiMapper.toModel(enriched);
  }

  @Transactional
  public ScaleSiteContact createContact(String scaleSiteIdNmbr, ScaleSiteContactCreateCommand command) {
    String siteId = scaleSiteIdNmbr.trim().toUpperCase();
    requireScaleSiteExists(siteId);
    validateCreateCommand(command);

    if (!contactRepository.clientContactExists(command.clientContactId())) {
      throw new ResourceNotFoundException(
          "A Client Contact could not be found for " + command.clientContactId() + ".");
    }

    if (command.primaryContactInd() == YesNo.Y && contactRepository.primaryContactExists(siteId)) {
      throw new ConflictException(
          "A primary contact already exists for scale site " + siteId
              + ". Remove or update it before adding a new primary contact.");
    }

    if (contactRepository.contactExists(siteId, command.clientContactId())) {
      throw new ConflictException(
          "Contact " + command.clientContactId()
              + " is already associated with scale site " + siteId + ".");
    }

    contactRepository.insertContact(siteId, command);

    ScaleSiteContactRecord saved = contactRepository.getContact(siteId, command.clientContactId());
    if (saved == null) {
      throw new IllegalStateException("Contact was not found after insert.");
    }
    return ScaleSiteContactApiMapper.toModel(saved);
  }

  @Transactional
  public ScaleSiteContact updateContact(
      String scaleSiteIdNmbr, Long clientContactId, ScaleSiteContactUpdateCommand command) {
    String siteId = scaleSiteIdNmbr.trim().toUpperCase();
    ScaleSiteContactRecord existing = contactRepository.getContact(siteId, clientContactId);
    SCSUtils.requireFound(existing, "Contact " + clientContactId + " not found on scale site " + siteId + ".");

    validateUpdateCommand(command);

    boolean existingIsPrimary = existing.primaryContactInd() == YesNo.Y;
    if (command.primaryContactInd() == YesNo.Y && !existingIsPrimary
        && contactRepository.primaryContactExists(siteId)) {
      throw new ConflictException(
          "A primary contact already exists for scale site " + siteId + ".");
    }

    contactRepository.updateContact(siteId, clientContactId, command);

    ScaleSiteContactRecord reloaded = contactRepository.getContact(siteId, clientContactId);
    if (reloaded == null) {
      throw new IllegalStateException("Contact was not found after update.");
    }
    return ScaleSiteContactApiMapper.toModel(reloaded);
  }

  @Transactional
  public void deleteContact(String scaleSiteIdNmbr, Long clientContactId) {
    String siteId = scaleSiteIdNmbr.trim().toUpperCase();
    if (!contactRepository.contactExists(siteId, clientContactId)) {
      throw new ResourceNotFoundException(
          "Contact " + clientContactId + " not found on scale site " + siteId + ".");
    }
    contactRepository.deleteContact(siteId, clientContactId);
  }

  public List<ClientContactSearchResult> searchClientContacts(
      Long clientContactId, String clientNumber, String clientLocnCode, String contactName) {
    List<ClientContactSearchEntry> entries = contactRepository.searchClientContacts(
        clientContactId, clientNumber, clientLocnCode, contactName);
    return ScaleSiteContactApiMapper.toSearchResultList(entries);
  }

  private void requireScaleSiteExists(String siteId) {
    if (scaleSiteRepository.getScaleSite(siteId) == null) {
      throw new ResourceNotFoundException("No scale site found with id " + siteId + ".");
    }
  }

  private void validateCreateCommand(ScaleSiteContactCreateCommand command) {
    if (command.contactRoleDescription() == null || command.contactRoleDescription().isBlank()) {
      throw new BadRequestException("contactRoleDescription is required.");
    }
    if (command.expiryDate() != null && command.effectiveDate() != null
        && command.expiryDate().isBefore(command.effectiveDate())) {
      throw new BadRequestException("expiryDate must be on or after effectiveDate.");
    }
  }

  private void validateUpdateCommand(ScaleSiteContactUpdateCommand command) {
    if (command.contactRoleDescription() == null || command.contactRoleDescription().isBlank()) {
      throw new BadRequestException("contactRoleDescription is required.");
    }
    if (command.expiryDate() != null && command.effectiveDate() != null
        && command.expiryDate().isBefore(command.effectiveDate())) {
      throw new BadRequestException("expiryDate must be on or after effectiveDate.");
    }
  }
}
