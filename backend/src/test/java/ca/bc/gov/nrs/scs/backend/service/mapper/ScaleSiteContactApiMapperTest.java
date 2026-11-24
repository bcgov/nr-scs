package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContact;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactUpdateRequest;

class ScaleSiteContactApiMapperTest {

  @Test
  void toModel_returnsNullForNullInput() {
    assertNull(ScaleSiteContactApiMapper.toModel(null));
  }

  @Test
  void toModelList_returnsEmptyListForNullInput() {
    assertTrue(ScaleSiteContactApiMapper.toModelList(null).isEmpty());
  }

  @Test
  void toModel_mapsNullIndicatorsAndRevisionCountToNullEnumsAndValues() {
    ScaleSiteContactRecord domain = new ScaleSiteContactRecord(
        12345L, "SITE001", null, "John Smith", "Site Manager",
        "250-555-1234", "250-555-9012", null, null, null,
        LocalDate.of(2024, 1, 1), null, null, null, null, null, null);

    ScaleSiteContact model = ScaleSiteContactApiMapper.toModel(domain);

    assertNull(model.getPrimaryContactInd());
    assertNull(model.getSiteInformationAccessInd());
    assertNull(model.getRevisionCount().get());
    assertEquals(12345L, model.getClientContactId());
    assertEquals("250-555-9012", model.getCellPhone().get());
  }

  @Test
  void toModel_mapsRevisionCountToIntegerWhenPresent() {
    ScaleSiteContactRecord domain = new ScaleSiteContactRecord(
        12345L, "SITE001", YesNo.Y, "John Smith", "Site Manager",
        null, null, null, null, YesNo.N,
        LocalDate.of(2024, 1, 1), null, null, null, null, null, 3L);

    ScaleSiteContact model = ScaleSiteContactApiMapper.toModel(domain);

    assertEquals(ScaleSiteContact.PrimaryContactIndEnum.Y, model.getPrimaryContactInd());
    assertEquals(ScaleSiteContact.SiteInformationAccessIndEnum.N, model.getSiteInformationAccessInd());
    assertEquals(3, model.getRevisionCount().get());
  }

  @Test
  void toUpdateCommand_mapsRequestFieldsToDomainTypes() {
    ScaleSiteContactUpdateRequest req = new ScaleSiteContactUpdateRequest();
    req.setContactRoleDescription("Lead Manager");
    req.setPrimaryContactInd(ScaleSiteContactUpdateRequest.PrimaryContactIndEnum.Y);
    req.setSiteInformationAccessInd(ScaleSiteContactUpdateRequest.SiteInformationAccessIndEnum.N);
    req.setEffectiveDate(LocalDate.of(2024, 1, 1));
    req.setExpiryDate(org.openapitools.jackson.nullable.JsonNullable.of(LocalDate.of(2030, 1, 1)));

    ScaleSiteContactUpdateCommand command = ScaleSiteContactApiMapper.toUpdateCommand(req);

    assertEquals("Lead Manager", command.contactRoleDescription());
    assertEquals(YesNo.Y, command.primaryContactInd());
    assertEquals(YesNo.N, command.siteInformationAccessInd());
    assertEquals(LocalDate.of(2024, 1, 1), command.effectiveDate());
    assertEquals(LocalDate.of(2030, 1, 1), command.expiryDate());
  }

  @Test
  void toUpdateCommand_mapsAbsentExpiryDateToNull() {
    ScaleSiteContactUpdateRequest req = new ScaleSiteContactUpdateRequest();
    req.setContactRoleDescription("Site Manager");
    req.setPrimaryContactInd(ScaleSiteContactUpdateRequest.PrimaryContactIndEnum.N);
    req.setSiteInformationAccessInd(ScaleSiteContactUpdateRequest.SiteInformationAccessIndEnum.Y);
    req.setEffectiveDate(LocalDate.of(2024, 1, 1));

    ScaleSiteContactUpdateCommand command = ScaleSiteContactApiMapper.toUpdateCommand(req);

    assertNull(command.expiryDate());
  }

  @Test
  void toCreateCommand_mapsRequestFieldsToDomainTypes() {
    ScaleSiteContactCreateRequest req = new ScaleSiteContactCreateRequest();
    req.setClientContactId(12345L);
    req.setContactRoleDescription("Site Manager");
    req.setPrimaryContactInd(ScaleSiteContactCreateRequest.PrimaryContactIndEnum.Y);
    req.setSiteInformationAccessInd(ScaleSiteContactCreateRequest.SiteInformationAccessIndEnum.N);
    req.setEffectiveDate(LocalDate.of(2024, 1, 1));
    req.setExpiryDate(org.openapitools.jackson.nullable.JsonNullable.of(LocalDate.of(2030, 1, 1)));

    ScaleSiteContactCreateCommand command = ScaleSiteContactApiMapper.toCreateCommand(req);

    assertEquals(12345L, command.clientContactId());
    assertEquals("Site Manager", command.contactRoleDescription());
    assertEquals(YesNo.Y, command.primaryContactInd());
    assertEquals(YesNo.N, command.siteInformationAccessInd());
    assertEquals(LocalDate.of(2024, 1, 1), command.effectiveDate());
    assertEquals(LocalDate.of(2030, 1, 1), command.expiryDate());
  }

  @Test
  void toCreateCommand_mapsAbsentExpiryDateToNull() {
    ScaleSiteContactCreateRequest req = new ScaleSiteContactCreateRequest();
    req.setClientContactId(12345L);
    req.setContactRoleDescription("Site Manager");
    req.setPrimaryContactInd(ScaleSiteContactCreateRequest.PrimaryContactIndEnum.N);
    req.setSiteInformationAccessInd(ScaleSiteContactCreateRequest.SiteInformationAccessIndEnum.Y);
    req.setEffectiveDate(LocalDate.of(2024, 1, 1));

    ScaleSiteContactCreateCommand command = ScaleSiteContactApiMapper.toCreateCommand(req);

    assertNull(command.expiryDate());
  }

  @Test
  void toSearchResult_returnsNullForNullInput() {
    assertNull(ScaleSiteContactApiMapper.toSearchResult(null));
  }

  @Test
  void toSearchResultList_returnsEmptyListForNullInput() {
    assertTrue(ScaleSiteContactApiMapper.toSearchResultList(null).isEmpty());
  }

  @Test
  void toSearchResult_mapsEntryFields() {
    var model = ScaleSiteContactApiMapper.toSearchResult(new ClientContactSearchEntry(
        12345L, "John Smith", "12345678", "00", "250-555-1234", "manager@example.com"));

    assertEquals(12345L, model.getClientContactId());
    assertEquals("John Smith", model.getContactName().get());
    assertEquals("12345678", model.getClientNumber().get());
  }

  @Test
  void toOwnerModel_returnsNullForNullInput() {
    assertNull(ScaleSiteContactApiMapper.toOwnerModel(null));
  }

  @Test
  void toOwnerModel_mapsAllOwnerFields() {
    ScaleSiteOwnerRecord domain = new ScaleSiteOwnerRecord(
        "SITE001", "12345678", "00", "ACME FOREST PRODUCTS LTD.",
        "Smith", "John", "250-555-1234", "250-555-9999", "250-555-0000",
        "250-555-1111", "owner@example.com", "123 Main St", "Suite 4", null,
        "Nanaimo", "BC", "Canada", "V9R1A1");

    var model = ScaleSiteContactApiMapper.toOwnerModel(domain);

    assertEquals("ACME FOREST PRODUCTS LTD.", model.getCompanyName().get());
    assertEquals("12345678", model.getClientNumber().get());
    assertEquals("V9R1A1", model.getPostalCode().get());
  }
}
