package ca.bc.gov.nrs.scs.backend.controller;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.security.annotations.RequiresPermission;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import ca.bc.gov.nrs.scs.backend.api.ScaleSiteContactApi;
import ca.bc.gov.nrs.scs.backend.model.ClientContactSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContact;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteOwner;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimitCategory;
import ca.bc.gov.nrs.scs.backend.ratelimit.RateLimited;
import ca.bc.gov.nrs.scs.backend.service.ScaleSiteContactService;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScaleSiteContactApiMapper;

@RestController
public class ScaleSiteContactController implements ScaleSiteContactApi {

  private final ScaleSiteContactService service;

  public ScaleSiteContactController(ScaleSiteContactService service) {
    this.service = service;
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_QUERY)
  public ResponseEntity<List<ScaleSiteContact>> getScaleSiteContacts(String scaleSiteIdNmbr) {
    return ResponseEntity.ok(service.getContacts(scaleSiteIdNmbr));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_READ)
  public ResponseEntity<ScaleSiteContact> getScaleSiteContact(
      String scaleSiteIdNmbr, Long clientContactId) {
    return ResponseEntity.ok(service.getContact(scaleSiteIdNmbr, clientContactId));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_UPDATE)
  public ResponseEntity<ScaleSiteContact> updateScaleSiteContact(
      String scaleSiteIdNmbr, Long clientContactId, ScaleSiteContactUpdateRequest req) {
    return ResponseEntity.ok(service.updateContact(
        scaleSiteIdNmbr, clientContactId, ScaleSiteContactApiMapper.toUpdateCommand(req)));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_DELETE)
  public ResponseEntity<Void> deleteScaleSiteContact(
      String scaleSiteIdNmbr, Long clientContactId) {
    service.deleteContact(scaleSiteIdNmbr, clientContactId);
    return ResponseEntity.noContent().build();
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_CREATE)
  public ResponseEntity<ScaleSiteContact> createScaleSiteContact(
      String scaleSiteIdNmbr, ScaleSiteContactCreateRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(service.createContact(scaleSiteIdNmbr, ScaleSiteContactApiMapper.toCreateCommand(req)));
  }

  @RateLimited(RateLimitCategory.SEARCH)
  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_CREATE)
  public ResponseEntity<List<ClientContactSearchResult>> searchClientContacts(
      Long clientContactId, String clientNumber, String clientLocnCode, String contactName) {
    return ResponseEntity.ok(
        service.searchClientContacts(clientContactId, clientNumber, clientLocnCode, contactName));
  }

  @Override
  @RequiresPermission(Permissions.SCALE_SITE_CONTACT_QUERY)
  public ResponseEntity<ScaleSiteOwner> getScaleSiteOwner(String scaleSiteIdNmbr) {
    return ResponseEntity.ok(service.getOwner(scaleSiteIdNmbr));
  }
}
