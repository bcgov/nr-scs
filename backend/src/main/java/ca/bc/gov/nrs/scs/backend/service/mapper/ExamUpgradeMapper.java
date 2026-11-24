package ca.bc.gov.nrs.scs.backend.service.mapper;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ExamUpgradeRecord;
import ca.bc.gov.nrs.scs.backend.dto.ExamUpgradeRow;
import ca.bc.gov.nrs.scs.backend.model.ExamUpgrade;
import org.openapitools.jackson.nullable.JsonNullable;

public final class ExamUpgradeMapper {

  private ExamUpgradeMapper() {}

  public static ExamUpgradeRecord toDomain(ExamUpgradeRow row) {
    return new ExamUpgradeRecord(
        row.getScalerTrainingClassCode(),
        row.getScalerTrainingTypeId(),
        row.getLicenceAccreditInd(),
        row.getDescription(),
        row.getEffectiveDate(),
        row.getExpiryDate(),
        row.getEntryTimestamp(),
        row.getEntryUserid(),
        row.getUpdateTimestamp(),
        row.getUpdateUserid(),
        row.getRevisionCount());
  }

  public static ExamUpgrade toModel(ExamUpgradeRecord domain) {
    ExamUpgrade model = new ExamUpgrade();
    model.setScalerTrainingClassCode(domain.scalerTrainingClassCode());
    model.setScalerTrainingTypeId(domain.scalerTrainingTypeId());
    model.setLicenceAccreditInd(domain.licenceAccreditInd());
    model.setDescription(domain.description());
    model.setEffectiveDate(domain.effectiveDate());
    model.setExpiryDate(domain.expiryDate());
    model.setEntryTimestamp(JsonNullable.of(domain.entryTimestamp()));
    model.setEntryUserid(JsonNullable.of(domain.entryUserid()));
    model.setUpdateTimestamp(JsonNullable.of(domain.updateTimestamp()));
    model.setUpdateUserid(JsonNullable.of(domain.updateUserid()));
    model.setRevisionCount(JsonNullable.of(domain.revisionCount()));
    return model;
  }
}
