package ca.bc.gov.nrs.scs.backend.service.mapper;

import ca.bc.gov.nrs.scs.backend.domain.authorizationclause.AuthorizationClause;
import ca.bc.gov.nrs.scs.backend.dto.ScaleMethodAuthClauseRow;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodAuthClause;
import org.openapitools.jackson.nullable.JsonNullable;

public final class AuthorizationClauseMapper {

  private AuthorizationClauseMapper() {}

  public static AuthorizationClause toDomain(ScaleMethodAuthClauseRow row) {
    return new AuthorizationClause(
        row.getScaleMethodAuthClauseId(),
        row.getScaleMethodTypeCode(),
        row.getScalerAuthorizationClause(),
        row.getEffectiveDate(),
        row.getExpiryDate(),
        row.getEntryTimestamp(),
        row.getEntryUserid(),
        row.getUpdateTimestamp(),
        row.getUpdateUserid(),
        row.getRevisionCount());
  }

  public static ScaleMethodAuthClause toModel(AuthorizationClause domain) {
    ScaleMethodAuthClause model = new ScaleMethodAuthClause();
    model.setScaleMethodAuthClauseId(domain.scaleMethodAuthClauseId());
    model.setScaleMethodTypeCode(domain.scaleMethodTypeCode());
    model.setScalerAuthorizationClause(domain.scalerAuthorizationClause());
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
