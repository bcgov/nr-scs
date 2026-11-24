package ca.bc.gov.nrs.scs.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ValidLicenceAttributeRow {
  private String scalerAppointmentType;
  private String scaleGradingSystemCode;
  private LocalDate effectiveDate;
  private LocalDate expiryDate;
  private OffsetDateTime entryTimestamp;
  private String entryUserid;
  private OffsetDateTime updateTimestamp;
  private String updateUserid;
  private Long revisionCount;
}
