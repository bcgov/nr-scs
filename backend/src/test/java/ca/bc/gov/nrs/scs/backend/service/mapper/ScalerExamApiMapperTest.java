package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamDetail;
import ca.bc.gov.nrs.scs.backend.model.ScalerExamRequest;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class ScalerExamApiMapperTest {

  @Test
  void toDetail_mapsEveryField() {
    OffsetDateTime entry = OffsetDateTime.of(2025, 1, 10, 10, 30, 0, 0, ZoneOffset.UTC);
    OffsetDateTime update = OffsetDateTime.of(2026, 3, 17, 10, 30, 0, 0, ZoneOffset.UTC);
    ScalerExamRecord record = new ScalerExamRecord(
        "1234", "SC", "SCEX", LocalDate.of(2025, 1, 10),
        entry, "JSMITH", update, "BJONES", 2L);

    ScalerExamDetail detail = ScalerExamApiMapper.toDetail(record);

    assertEquals("1234", detail.getScalerLicenceNo().get());
    assertEquals("SCEX", detail.getScalerTrainingTypeId().get());
    assertEquals("SC", detail.getScalerTrainingClassCode().get());
    assertEquals(LocalDate.of(2025, 1, 10), detail.getCompletionDate().get());
    assertEquals(entry, detail.getEntryTimestamp().get());
    assertEquals("JSMITH", detail.getEntryUserid().get());
    assertEquals(update, detail.getUpdateTimestamp().get());
    assertEquals("BJONES", detail.getUpdateUserid().get());
    assertEquals(2L, detail.getRevisionCount().get());
  }

  @Test
  void toCommand_readsTypeAndCompletionDate() {
    ScalerExamRequest request =
        new ScalerExamRequest("SCEX").completionDate(LocalDate.of(2025, 1, 10));

    ScalerExamCommand command = ScalerExamApiMapper.toCommand(request);

    assertEquals("SCEX", command.scalerTrainingTypeId());
    assertEquals(LocalDate.of(2025, 1, 10), command.completionDate());
  }
}
