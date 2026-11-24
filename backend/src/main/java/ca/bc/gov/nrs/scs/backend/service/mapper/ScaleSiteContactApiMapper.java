package ca.bc.gov.nrs.scs.backend.service.mapper;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.getNullable;

import java.util.List;

import org.openapitools.jackson.nullable.JsonNullable;

import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ClientContactSearchResult;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContact;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteContactUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteOwner;

public final class ScaleSiteContactApiMapper {

  private ScaleSiteContactApiMapper() {}

  public static ScaleSiteContact toModel(ScaleSiteContactRecord domain) {
    if (domain == null) return null;
    ScaleSiteContact model = new ScaleSiteContact();
    model.setClientContactId(domain.clientContactId());
    model.setScaleSiteIdNmbr(domain.scaleSiteIdNmbr());
    model.setPrimaryContactInd(domain.primaryContactInd() != null
        ? ScaleSiteContact.PrimaryContactIndEnum.fromValue(YesNo.toCode(domain.primaryContactInd()))
        : null);
    model.setContactName(domain.contactName());
    model.setContactRoleDescription(domain.contactRoleDescription());
    model.setBusinessPhone(domain.businessPhone());
    model.setCellPhone(JsonNullable.of(domain.cellPhone()));
    model.setFaxNumber(JsonNullable.of(domain.faxNumber()));
    model.setEmailAddress(JsonNullable.of(domain.emailAddress()));
    model.setSiteInformationAccessInd(domain.siteInformationAccessInd() != null
        ? ScaleSiteContact.SiteInformationAccessIndEnum.fromValue(YesNo.toCode(domain.siteInformationAccessInd()))
        : null);
    model.setEffectiveDate(domain.effectiveDate());
    model.setExpiryDate(JsonNullable.of(domain.expiryDate()));
    model.setEntryTimestamp(JsonNullable.of(domain.entryTimestamp()));
    model.setEntryUserid(JsonNullable.of(domain.entryUserid()));
    model.setUpdateTimestamp(JsonNullable.of(domain.updateTimestamp()));
    model.setUpdateUserid(JsonNullable.of(domain.updateUserid()));
    model.setRevisionCount(JsonNullable.of(domain.revisionCount()));
    return model;
  }

  public static List<ScaleSiteContact> toModelList(List<ScaleSiteContactRecord> domains) {
    if (domains == null) return List.of();
    return domains.stream().map(ScaleSiteContactApiMapper::toModel).toList();
  }

  public static ScaleSiteContactUpdateCommand toUpdateCommand(ScaleSiteContactUpdateRequest req) {
    return new ScaleSiteContactUpdateCommand(
        req.getContactRoleDescription(),
        YesNo.fromCode(req.getPrimaryContactInd().getValue()),
        YesNo.fromCode(req.getSiteInformationAccessInd().getValue()),
        req.getEffectiveDate(),
        getNullable(req.getExpiryDate()));
  }

  public static ScaleSiteContactCreateCommand toCreateCommand(ScaleSiteContactCreateRequest req) {
    return new ScaleSiteContactCreateCommand(
        req.getClientContactId(),
        req.getContactRoleDescription(),
        YesNo.fromCode(req.getPrimaryContactInd().getValue()),
        YesNo.fromCode(req.getSiteInformationAccessInd().getValue()),
        req.getEffectiveDate(),
        getNullable(req.getExpiryDate()));
  }

  public static ClientContactSearchResult toSearchResult(ClientContactSearchEntry entry) {
    if (entry == null) return null;
    ClientContactSearchResult result = new ClientContactSearchResult();
    result.setClientContactId(entry.clientContactId());
    result.setContactName(JsonNullable.of(entry.contactName()));
    result.setClientNumber(JsonNullable.of(entry.clientNumber()));
    result.setClientLocnCode(JsonNullable.of(entry.clientLocnCode()));
    result.setBusinessPhone(JsonNullable.of(entry.businessPhone()));
    result.setEmailAddress(JsonNullable.of(entry.emailAddress()));
    return result;
  }

  public static List<ClientContactSearchResult> toSearchResultList(
      List<ClientContactSearchEntry> entries) {
    if (entries == null) return List.of();
    return entries.stream().map(ScaleSiteContactApiMapper::toSearchResult).toList();
  }

  public static ScaleSiteOwner toOwnerModel(ScaleSiteOwnerRecord domain) {
    if (domain == null) return null;
    ScaleSiteOwner model = new ScaleSiteOwner();
    model.setScaleSiteIdNmbr(JsonNullable.of(domain.scaleSiteIdNmbr()));
    model.setClientNumber(JsonNullable.of(domain.clientNumber()));
    model.setClientLocnCode(JsonNullable.of(domain.clientLocnCode()));
    model.setCompanyName(JsonNullable.of(domain.companyName()));
    model.setLastName(JsonNullable.of(domain.lastName()));
    model.setFirstName(JsonNullable.of(domain.firstName()));
    model.setBusinessPhone(JsonNullable.of(domain.businessPhone()));
    model.setResidentPhone(JsonNullable.of(domain.residentPhone()));
    model.setCellPhone(JsonNullable.of(domain.cellPhone()));
    model.setFax(JsonNullable.of(domain.fax()));
    model.setEmail(JsonNullable.of(domain.email()));
    model.setAddress1(JsonNullable.of(domain.address1()));
    model.setAddress2(JsonNullable.of(domain.address2()));
    model.setAddress3(JsonNullable.of(domain.address3()));
    model.setCity(JsonNullable.of(domain.city()));
    model.setProvince(JsonNullable.of(domain.province()));
    model.setCountry(JsonNullable.of(domain.country()));
    model.setPostalCode(JsonNullable.of(domain.postalCode()));
    return model;
  }
}
