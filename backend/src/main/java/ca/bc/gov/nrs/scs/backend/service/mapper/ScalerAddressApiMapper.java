package ca.bc.gov.nrs.scs.backend.service.mapper;

import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerAddressRecord;
import ca.bc.gov.nrs.scs.backend.model.ScalerAddress;
import org.openapitools.jackson.nullable.JsonNullable;

/**
 * Projects the read-only scaler-address domain record onto the generated API model. Spec-first
 * artifacts ({@code JsonNullable}) are contained here. Phone numbers are passed through as stored;
 * display formatting is the client's responsibility.
 */
public final class ScalerAddressApiMapper {

  private ScalerAddressApiMapper() {}

  public static ScalerAddress toResponse(ScalerAddressRecord address) {
    ScalerAddress model = new ScalerAddress();
    model.setScalerLicenceNo(JsonNullable.of(address.scalerLicenceNo()));
    model.setCompany(JsonNullable.of(address.company()));
    model.setLastName(JsonNullable.of(address.lastName()));
    model.setFirstName(JsonNullable.of(address.firstName()));
    model.setBusinessPhone(JsonNullable.of(address.businessPhone()));
    model.setHomePhone(JsonNullable.of(address.homePhone()));
    model.setCellPhone(JsonNullable.of(address.cellPhone()));
    model.setFaxNumber(JsonNullable.of(address.faxNumber()));
    model.setEmailAddress(JsonNullable.of(address.emailAddress()));
    model.setAddress1(JsonNullable.of(address.address1()));
    model.setAddress2(JsonNullable.of(address.address2()));
    model.setAddress3(JsonNullable.of(address.address3()));
    model.setCity(JsonNullable.of(address.city()));
    model.setProvince(JsonNullable.of(address.province()));
    model.setCountry(JsonNullable.of(address.country()));
    model.setPostalCode(JsonNullable.of(address.postalCode()));
    return model;
  }
}
