package ca.bc.gov.nrs.scs.backend.domain.validlicenceattribute;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ValidLicenceAttribute(
    String scalerAppointmentType,
    String scaleGradingSystemCode,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    Boolean dependentChildExists,
    OffsetDateTime entryTimestamp,
    String entryUserid,
    OffsetDateTime updateTimestamp,
    String updateUserid,
    Long revisionCount) {}
