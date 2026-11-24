package ca.bc.gov.nrs.scs.backend.domain.authorizationclause;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record AuthorizationClause(
    Long scaleMethodAuthClauseId,
    String scaleMethodTypeCode,
    String scalerAuthorizationClause,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
