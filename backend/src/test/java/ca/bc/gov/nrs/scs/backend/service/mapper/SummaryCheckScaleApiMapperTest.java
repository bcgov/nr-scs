package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleSpgRowCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummaryCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.CheckReplacesOriginalIndEnum;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.FollowedGoodPracticeIndEnum;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.OriginalWithinStandardIndEnum;
import ca.bc.gov.nrs.scs.backend.model.ReturnType;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleCreateRequest.PartialIndEnum;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleSpgRow;
import ca.bc.gov.nrs.scs.backend.model.SummaryCheckScaleView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class SummaryCheckScaleApiMapperTest {

  @Test
  void toScalerSummaryTabResult_mapsRowsIncludingCkscTypeAndYesNoCodes() {
    SummaryCheckScaleEntry entry =
        new SummaryCheckScaleEntry(
            146943L, "SFPSCS", "1234", "5678",
            LocalDate.of(2026, 5, 1), LocalDate.of(2026, 5, 3),
            new BigDecimal("2"), new BigDecimal("1.5"), new BigDecimal("0.8"),
            YesNo.N, "FIRST", YesNo.Y, YesNo.Y);

    ScalerSummaryCheckScaleTabResult result =
        SummaryCheckScaleApiMapper.toScalerSummaryTabResult(List.of(entry));

    assertEquals(1, result.getSummaryCheckScales().size());
    SummaryCheckScaleView view = result.getSummaryCheckScales().get(0);
    assertEquals(146943L, view.getCheckScaleId().get().longValue());
    assertEquals("SFPSCS", view.getCkscType().get()); // Summary Type — unique to this view
    assertEquals("1234", view.getPrimCheckLicenceNo().get());
    assertEquals("5678", view.getPrimOrigLicenceNo().get());
    assertEquals("N", view.getReplacedInd().get()); // YesNo -> code
    assertEquals("Y", view.getFollowedGoodPracticeInd().get());
    assertEquals("Y", view.getOriginalWithinStandardInd().get());
  }

  @Test
  void logTally_mapsToLtscsAndForcesPartialYesAndBlanksProduct() {
    SummaryCheckScaleCreateRequest req =
        baseRequest(ReturnType.LOG_TALLY).addSpgRowsItem(spgRow("SB", "1"));

    SummaryCheckScaleCreateCommand cmd = SummaryCheckScaleApiMapper.toCreateCommand(req);

    assertEquals("LTSCS", cmd.ckscType());
    assertEquals(YesNo.Y, cmd.partialInd());
    SummaryCheckScaleSpgRowCommand row = cmd.spgRows().get(0);
    assertEquals(" ", row.productCode());
    assertEquals("1", row.gradeCode());
  }

  @Test
  void sampleLogTally_mapsToSltscsAndForcesPartialYes() {
    SummaryCheckScaleCreateRequest req =
        baseRequest(ReturnType.SAMPLE_LOG_TALLY).addSpgRowsItem(spgRow("SB", "1"));

    SummaryCheckScaleCreateCommand cmd = SummaryCheckScaleApiMapper.toCreateCommand(req);

    assertEquals("SLTSCS", cmd.ckscType());
    assertEquals(YesNo.Y, cmd.partialInd());
  }

  @Test
  void sfpNonXmProduct_mapsToSfpscsKeepsUserPartialAndBlanksGrade() {
    SummaryCheckScaleCreateRequest req =
        baseRequest(ReturnType.SPECIAL_FOREST_PRODUCT)
            .partialInd(PartialIndEnum.N)
            .addSpgRowsItem(spgRow("SB", "1"));

    SummaryCheckScaleCreateCommand cmd = SummaryCheckScaleApiMapper.toCreateCommand(req);

    assertEquals("SFPSCS", cmd.ckscType());
    assertEquals(YesNo.N, cmd.partialInd());
    SummaryCheckScaleSpgRowCommand row = cmd.spgRows().get(0);
    assertEquals("SB", row.productCode());
    assertEquals(" ", row.gradeCode());
  }

  @Test
  void sfpXmProduct_keepsGrade() {
    SummaryCheckScaleCreateRequest req =
        baseRequest(ReturnType.SPECIAL_FOREST_PRODUCT)
            .partialInd(PartialIndEnum.Y)
            .addSpgRowsItem(spgRow("XM", "2"));

    SummaryCheckScaleCreateCommand cmd = SummaryCheckScaleApiMapper.toCreateCommand(req);

    SummaryCheckScaleSpgRowCommand row = cmd.spgRows().get(0);
    assertEquals("XM", row.productCode());
    assertEquals("2", row.gradeCode());
  }

  @Test
  void sfpWithoutPartialInd_mapsToNullPartial() {
    SummaryCheckScaleCreateRequest req =
        baseRequest(ReturnType.SPECIAL_FOREST_PRODUCT).addSpgRowsItem(spgRow("SB", "1"));

    SummaryCheckScaleCreateCommand cmd = SummaryCheckScaleApiMapper.toCreateCommand(req);

    assertNull(cmd.partialInd());
  }

  @Test
  void mapsScalarFieldsAndConvertsWeighSlip() {
    SummaryCheckScaleCreateRequest req =
        baseRequest(ReturnType.LOG_TALLY)
            .loadArrivalNumber(null)
            .weighSlipNumber(7L)
            .addSpgRowsItem(spgRow("SB", "1"));

    SummaryCheckScaleCreateCommand cmd = SummaryCheckScaleApiMapper.toCreateCommand(req);

    assertEquals(7, cmd.weighSlipNumber());
    assertEquals("AAAA", cmd.originalScalerLicenceNo());
    assertEquals("BBBB", cmd.checkScalerLicenceNo());
    assertEquals(YesNo.Y, cmd.followedGoodPractice());
    assertEquals(YesNo.N, cmd.checkReplacesOriginal());
  }

  @Test
  void toSpgRowCommand_isRawAndDoesNotBlankProductOrGrade() {
    // The single-row mapper does pure field copy; blanking is the caller's job (create flow or
    // the add-row service), so a non-XM product/grade must survive untouched here.
    SummaryCheckScaleSpgRowCommand cmd = SummaryCheckScaleApiMapper.toSpgRowCommand(spgRow("SB", "1"));

    assertEquals("FI", cmd.speciesCode());
    assertEquals("SB", cmd.productCode());
    assertEquals("1", cmd.gradeCode());
  }

  private static SummaryCheckScaleCreateRequest baseRequest(ReturnType returnType) {
    return new SummaryCheckScaleCreateRequest(
            returnType,
            "FRST",
            "AAAA",
            "BBBB",
            "ABC123",
            "0001",
            FollowedGoodPracticeIndEnum.Y,
            OriginalWithinStandardIndEnum.Y,
            CheckReplacesOriginalIndEnum.N,
            LocalDate.of(2024, 1, 1),
            100,
            LocalDate.of(2024, 1, 2),
            101,
            new java.util.ArrayList<>())
        .loadArrivalNumber("LD1");
  }

  private static SummaryCheckScaleSpgRow spgRow(String product, String grade) {
    return new SummaryCheckScaleSpgRow("FI", 10, 12.5, 100.0, 9, 11.0, 95.0)
        .scaleProductCode(product)
        .scaleGradeCode(grade);
  }
}
