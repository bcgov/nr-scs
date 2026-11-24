package ca.bc.gov.nrs.scs.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExamUpgradeRow {
  private String scalerTrainingClassCode;
  private String scalerTrainingTypeId;
  private String licenceAccreditInd;
  private String description;
  private LocalDate effectiveDate;
  private LocalDate expiryDate;
  private OffsetDateTime entryTimestamp;
  private String entryUserid;
  private OffsetDateTime updateTimestamp;
  private String updateUserid;
  private Long revisionCount;
}
