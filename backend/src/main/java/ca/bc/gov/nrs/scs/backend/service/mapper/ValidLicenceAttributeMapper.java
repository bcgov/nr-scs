package ca.bc.gov.nrs.scs.backend.service.mapper;

import ca.bc.gov.nrs.scs.backend.domain.validlicenceattribute.ValidLicenceAttribute;
import ca.bc.gov.nrs.scs.backend.dto.ValidLicenceAttributeRow;
import ca.bc.gov.nrs.scs.backend.model.ValidLicenceAttributeDetail;
import org.openapitools.jackson.nullable.JsonNullable;

public final class ValidLicenceAttributeMapper {

  private ValidLicenceAttributeMapper() {}

  public static ValidLicenceAttribute toDomain(ValidLicenceAttributeRow row) {
    return toDomain(row, null);
  }

  public static ValidLicenceAttribute toDomain(ValidLicenceAttributeRow row, Boolean dependentChildExists) {
    return new ValidLicenceAttribute(
        row.getScalerAppointmentType(),
        row.getScaleGradingSystemCode(),
        row.getEffectiveDate(),
        row.getExpiryDate(),
        dependentChildExists,
        row.getEntryTimestamp(),
        row.getEntryUserid(),
        row.getUpdateTimestamp(),
        row.getUpdateUserid(),
        row.getRevisionCount());
  }

  public static ValidLicenceAttributeDetail toDetail(ValidLicenceAttribute domain) {
    ValidLicenceAttributeDetail detail = new ValidLicenceAttributeDetail();
    detail.setScalerAppointmentType(JsonNullable.of(domain.scalerAppointmentType()));
    detail.setScaleGradingSystemCode(JsonNullable.of(domain.scaleGradingSystemCode()));
    detail.setEffectiveDate(JsonNullable.of(domain.effectiveDate()));
    detail.setExpiryDate(JsonNullable.of(domain.expiryDate()));
    detail.setDependentChildExists(JsonNullable.of(domain.dependentChildExists()));
    detail.setEntryTimestamp(JsonNullable.of(domain.entryTimestamp()));
    detail.setEntryUserid(JsonNullable.of(domain.entryUserid()));
    detail.setUpdateTimestamp(JsonNullable.of(domain.updateTimestamp()));
    detail.setUpdateUserid(JsonNullable.of(domain.updateUserid()));
    detail.setRevisionCount(JsonNullable.of(domain.revisionCount()));
    return detail;
  }
}
