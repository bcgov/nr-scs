package ca.bc.gov.nrs.scs.backend.service.mapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleStats;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationResult;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleTab;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDoc;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationField;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationFieldError;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleDetail;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleStatsView;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleSummaryView;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationRequest;
import ca.bc.gov.nrs.scs.backend.model.CheckScaleValidationResponse;
import ca.bc.gov.nrs.scs.backend.model.FieldError;
import ca.bc.gov.nrs.scs.backend.model.ScaleSiteCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerCheckScaleTabResult;
import ca.bc.gov.nrs.scs.backend.model.SpeciesSummaryView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.openapitools.jackson.nullable.JsonNullable;

@DisplayName("CheckScaleApiMapper")
class CheckScaleApiMapperTest {

  @Nested
  @DisplayName("request -> command")
  class RequestToCommand {

    @Test
    void toValidationCommand_isSampleFlavour_whenSampleCheckDocPresent() {
      CheckScaleValidationRequest req = new CheckScaleValidationRequest();
      req.setChkSampleLogTallyDocNo(JsonNullable.of("SCHK"));
      req.setChkSampleLogTallyVer(JsonNullable.of(2));
      req.setOrgSampleLogTallyDocNo(JsonNullable.of("SORG"));
      req.setOrgSampleLogTallyVer(JsonNullable.of(3));

      CheckScaleValidationCommand cmd = CheckScaleApiMapper.toValidationCommand(req);

      assertInstanceOf(SampleLogTallyValidationCommand.class, cmd);
      assertEquals("SCHK", cmd.checkDocNo());
      assertEquals(2, cmd.checkVersion());
      assertEquals("SORG", cmd.originalDocNo());
      assertEquals(3, cmd.originalVersion());
    }

    @Test
    void toValidationCommand_isLogTallyFlavour_whenSampleCheckDocBlank() {
      CheckScaleValidationRequest req = new CheckScaleValidationRequest();
      req.setChkSampleLogTallyDocNo(JsonNullable.of("   "));
      req.setChkLogTallyDocNo(JsonNullable.of("CHK"));
      req.setChkLogTallyVer(JsonNullable.of(1));
      req.setOrgLogTallyDocNo(JsonNullable.of("ORG"));
      req.setOrgLogTallyVer(JsonNullable.of(4));

      CheckScaleValidationCommand cmd = CheckScaleApiMapper.toValidationCommand(req);

      assertInstanceOf(LogTallyValidationCommand.class, cmd);
      assertEquals("CHK", cmd.checkDocNo());
      assertEquals(1, cmd.checkVersion());
      assertEquals("ORG", cmd.originalDocNo());
      assertEquals(4, cmd.originalVersion());
    }

    @Test
    void toValidationCommand_unwrapsUndefinedNullablesToNull() {
      CheckScaleValidationCommand cmd =
          CheckScaleApiMapper.toValidationCommand(new CheckScaleValidationRequest());

      assertInstanceOf(LogTallyValidationCommand.class, cmd);
      assertNull(cmd.checkDocNo());
      assertNull(cmd.checkVersion());
      assertNull(cmd.originalDocNo());
      assertNull(cmd.originalVersion());
    }

    @Test
    void toCreateCommand_sampleFlavour_carriesHbcsTypeAndHeaderFields() {
      CheckScaleCreateRequest req = new CheckScaleCreateRequest();
      req.setChkSampleLogTallyDocNo(JsonNullable.of("SCHK"));
      req.setChkSampleLogTallyVer(JsonNullable.of(1));
      req.setOrgSampleLogTallyDocNo(JsonNullable.of("SORG"));
      req.setOrgSampleLogTallyVer(JsonNullable.of(2));
      req.setCheckScaleTypeCode("RAN");
      req.setFollowedGoodPracticeInd(CheckScaleCreateRequest.FollowedGoodPracticeIndEnum.Y);
      req.setOriginalWithinStandardInd(CheckScaleCreateRequest.OriginalWithinStandardIndEnum.N);
      req.setChkScalerCommentTxt(JsonNullable.of("looks fine"));
      req.setOriginalScaleNetValue(10.5);
      req.setCheckScaleNetValue(11.0);

      CheckScaleCreateCommand cmd = CheckScaleApiMapper.toCreateCommand(req);

      assertInstanceOf(SampleLogTallyCreateCommand.class, cmd);
      assertEquals("HBCS", cmd.ckscType());
      assertEquals("SCHK", cmd.checkDocNo());
      assertEquals(1, cmd.checkVersion());
      assertEquals("SORG", cmd.originalDocNo());
      assertEquals(2, cmd.originalVersion());
      assertEquals("RAN", cmd.checkScaleTypeCode());
      assertEquals(YesNo.Y, cmd.followedGoodPractice());
      assertEquals(YesNo.N, cmd.originalWithinStandard());
      assertEquals("looks fine", cmd.commentTxt());
      assertEquals(10.5, cmd.originalScaleNetValue());
      assertEquals(11.0, cmd.checkScaleNetValue());
    }

    @Test
    void toCreateCommand_logTallyFlavour_whenNoSampleDoc() {
      CheckScaleCreateRequest req = new CheckScaleCreateRequest();
      req.setChkLogTallyDocNo(JsonNullable.of("CHK"));
      req.setChkLogTallyVer(JsonNullable.of(5));
      req.setOrgLogTallyDocNo(JsonNullable.of("ORG"));
      req.setOrgLogTallyVer(JsonNullable.of(6));
      req.setCheckScaleTypeCode("SEL");
      req.setFollowedGoodPracticeInd(CheckScaleCreateRequest.FollowedGoodPracticeIndEnum.N);
      req.setOriginalWithinStandardInd(CheckScaleCreateRequest.OriginalWithinStandardIndEnum.Y);
      req.setOriginalScaleNetValue(1.0);
      req.setCheckScaleNetValue(2.0);

      CheckScaleCreateCommand cmd = CheckScaleApiMapper.toCreateCommand(req);

      assertInstanceOf(LogTallyCreateCommand.class, cmd);
      assertEquals("HBCS", cmd.ckscType());
      assertEquals("CHK", cmd.checkDocNo());
      assertEquals(5, cmd.checkVersion());
      assertEquals("ORG", cmd.originalDocNo());
      assertEquals(6, cmd.originalVersion());
      assertEquals("SEL", cmd.checkScaleTypeCode());
      assertEquals(YesNo.N, cmd.followedGoodPractice());
      assertEquals(YesNo.Y, cmd.originalWithinStandard());
      assertNull(cmd.commentTxt(), "an absent comment unwraps to null");
      assertEquals(1.0, cmd.originalScaleNetValue());
      assertEquals(2.0, cmd.checkScaleNetValue());
    }

    @Test
    void toUpdateCommand_mapsIdAndEditableFields() {
      CheckScaleUpdateRequest req = new CheckScaleUpdateRequest();
      req.setCheckScaleTypeCode("RAN");
      req.setFollowedGoodPracticeInd(CheckScaleUpdateRequest.FollowedGoodPracticeIndEnum.Y);
      req.setOriginalWithinStandardInd(CheckScaleUpdateRequest.OriginalWithinStandardIndEnum.Y);
      req.setChkScalerCommentTxt(JsonNullable.of("updated"));
      req.setOriginalScaleNetValue(3.0);
      req.setCheckScaleNetValue(4.0);

      CheckScaleUpdateCommand cmd = CheckScaleApiMapper.toUpdateCommand(42L, req);

      assertEquals(42L, cmd.checkScaleId());
      assertEquals("RAN", cmd.checkScaleTypeCode());
      assertEquals(YesNo.Y, cmd.followedGoodPractice());
      assertEquals(YesNo.Y, cmd.originalWithinStandard());
      assertEquals("updated", cmd.commentTxt());
      assertEquals(3.0, cmd.originalScaleNetValue());
      assertEquals(4.0, cmd.checkScaleNetValue());
    }
  }

  @Nested
  @DisplayName("domain -> response")
  class DomainToResponse {

    @Test
    void toValidationResponse_mapsEveryFieldErrorAndTheEnrichedDraft() {
      List<ValidationFieldError> errors = List.of(
          new ValidationFieldError(ValidationField.RETURN_TYPE, "rt"),
          new ValidationFieldError(ValidationField.CHECK_SCALE_DDN, "cddn"),
          new ValidationFieldError(ValidationField.CHECK_SCALE_DDV, "cddv"),
          new ValidationFieldError(ValidationField.ORIGINAL_SCALE_DDN, "oddn"),
          new ValidationFieldError(ValidationField.ORIGINAL_SCALE_DDV, "oddv"));

      CheckScaleValidationResponse resp = CheckScaleApiMapper.toValidationResponse(
          new CheckScaleValidationResult(false, errors, fullCheckScale()));

      assertFalse(resp.getOk());
      assertEquals(
          List.of(
              FieldError.FieldEnum.RETURN_TYPE,
              FieldError.FieldEnum.CHECK_SCALE_DDN,
              FieldError.FieldEnum.CHECK_SCALE_DDV,
              FieldError.FieldEnum.ORIGINAL_SCALE_DDN,
              FieldError.FieldEnum.ORIGINAL_SCALE_DDV),
          resp.getErrors().stream().map(FieldError::getField).toList());
      assertEquals(
          List.of("rt", "cddn", "cddv", "oddn", "oddv"),
          resp.getErrors().stream().map(FieldError::getMessage).toList());
      assertNotNull(resp.getCheckScale());
      assertEquals(77L, resp.getCheckScale().getCheckScaleId().get());
    }

    @Test
    void toValidationResponse_ok_leavesErrorsAndDraftUnset() {
      CheckScaleValidationResponse resp = CheckScaleApiMapper.toValidationResponse(
          new CheckScaleValidationResult(true, List.of(), null));

      assertTrue(resp.getOk());
      assertNull(resp.getCheckScale());
      assertTrue(resp.getErrors() == null || resp.getErrors().isEmpty());
    }

    @Test
    void toCreateResponse_carriesTheNewId() {
      assertEquals(9L, CheckScaleApiMapper.toCreateResponse(9L).getCheckScaleId());
    }

    @Test
    void toCheckScaleDetail_mapsHeaderTallyDocsScaleSidesAuditAndSpecies() {
      CheckScaleDetail d = CheckScaleApiMapper.toCheckScaleDetail(fullCheckScale());

      assertEquals(77L, d.getCheckScaleId().get());
      assertEquals("RAN", d.getCheckScaleTypeCode().get());
      assertEquals("HBCS", d.getCkscType().get());
      assertEquals("N", d.getPartialInd().get());
      assertEquals("Y", d.getFollowedGoodPracticeInd().get());
      assertEquals("N", d.getOriginalWithinStandardInd().get());
      assertEquals("Y", d.getCheckReplacesOriginalInd().get());
      assertEquals("comment", d.getChkScalerCommentTxt().get());
      assertEquals(1.5, d.getOriginalScaleNetValue().get());
      assertEquals(2.5, d.getCheckScaleNetValue().get());

      assertEquals("CL", d.getChkLogTallyDocNo().get());
      assertEquals(1, d.getChkLogTallyVer().get());
      assertEquals("CS", d.getChkSampleLogTallyDocNo().get());
      assertEquals(2, d.getChkSampleLogTallyVer().get());
      assertEquals("OL", d.getOrgLogTallyDocNo().get());
      assertEquals(3, d.getOrgLogTallyVer().get());
      assertEquals("OS", d.getOrgSampleLogTallyDocNo().get());
      assertEquals(4, d.getOrgSampleLogTallyVer().get());

      assertEquals("OSC", d.getOriginalScalerLicenceNo().get());
      assertEquals("CSC", d.getCheckScalerLicenceNo().get());
      assertEquals("SSC", d.getSecondScalerLicenceNo().get());
      assertEquals("SITE1", d.getScaleSiteIdNmbr().get());
      assertEquals("TM1", d.getTimberMark().get());
      assertEquals("LA1", d.getLoadArrivalNumber().get());
      assertEquals(55, d.getWeighSlipNumber().get());
      assertEquals("POP", d.getPopulation().get());
      assertEquals("STR", d.getStratum().get());
      assertEquals(2024, d.getSamplingYear().get());

      assertEquals(LocalDate.of(2024, 1, 2), d.getOriginalScaleDate().get());
      assertEquals(7, d.getOriginalScaleReturnNo().get());
      assertEquals(10, d.getOriginalScaleTotalTops().get());
      assertEquals(11, d.getOriginalScaleTotalButts().get());
      assertEquals(12.5, d.getOriginalScaleTotalLength().get());
      assertEquals(100.25, d.getOriginalScaleTotalVolume().get());
      assertEquals(40, d.getOriginalScaleTotalPieces().get());

      assertEquals(LocalDate.of(2024, 1, 3), d.getChkScaleDate().get());
      assertEquals(8, d.getChkScaleReturnNo().get());
      assertEquals(20, d.getChkScaleTotalTops().get());
      assertEquals(21, d.getChkScaleTotalButts().get());
      assertEquals(22.5, d.getChkScaleTotalLength().get());
      assertEquals(200.5, d.getChkScaleTotalVolume().get());
      assertEquals(41, d.getChkScaleTotalPieces().get());

      assertEquals("ENTRY", d.getEntryUserid().get());
      assertEquals("UPDATE", d.getUpdateUserid().get());
      assertNotNull(d.getEntryTimestamp().get());
      assertNotNull(d.getUpdateTimestamp().get());
      assertEquals(3L, d.getRevisionCount().get());

      List<SpeciesSummaryView> species = d.getSpeciesSummary().get();
      assertEquals(1, species.size());
      SpeciesSummaryView s = species.get(0);
      assertEquals("FI", s.getSpeciesCode().get());
      assertEquals("1", s.getSpeciesGrade().get());
      assertEquals("01", s.getProductCode().get());
      assertEquals(5, s.getOrgPieces().get());
      assertEquals(1.5, s.getOrgNetVolume().get());
      assertNull(s.getOrgNetValue().get());
      assertEquals(6, s.getChkPieces().get());
      assertEquals(2.5, s.getChkNetVolume().get());
      assertNull(s.getChkNetValue().get());
    }

    @Test
    void toSearchResults_mapsEachRow_andLeavesOptionalPartsUnsetOnSparseRows() {
      List<CheckScaleDetail> out =
          CheckScaleApiMapper.toSearchResults(List.of(fullCheckScale(), sparseCheckScale(5L)));

      assertEquals(2, out.size());
      assertEquals(77L, out.get(0).getCheckScaleId().get());
      CheckScaleDetail sparse = out.get(1);
      assertEquals(5L, sparse.getCheckScaleId().get());
      assertNull(sparse.getRevisionCount().get(), "a null revision count stays null");
      assertNull(sparse.getChkLogTallyDocNo().get(), "no tally doc -> null doc number");
      assertFalse(sparse.getSpeciesSummary().isPresent(), "no species summary -> not set");
    }

    @Test
    void toScalerTabResult_mapsStatsAndRows() {
      CheckScaleStats stats = new CheckScaleStats(
          new BigDecimal("1"), new BigDecimal("2"), new BigDecimal("3"),
          new BigDecimal("4"), new BigDecimal("5"), new BigDecimal("6"));

      ScalerCheckScaleTabResult result = CheckScaleApiMapper.toScalerTabResult(
          new ScalerCheckScaleTab(stats, List.of(summaryRow())));

      CheckScaleStatsView v = result.getStats();
      assertEquals(new BigDecimal("1"), v.getLast10Volume().get());
      assertEquals(new BigDecimal("2"), v.getLast10Value().get());
      assertEquals(new BigDecimal("3"), v.getPast12Volume().get());
      assertEquals(new BigDecimal("4"), v.getPast12Value().get());
      assertEquals(new BigDecimal("5"), v.getAllVolume().get());
      assertEquals(new BigDecimal("6"), v.getAllValue().get());
      assertEquals(1, result.getCheckScales().size());
      assertSummaryView(result.getCheckScales().get(0));
    }

    @Test
    void toScaleSiteTabResult_mapsRows() {
      ScaleSiteCheckScaleTabResult result =
          CheckScaleApiMapper.toScaleSiteTabResult(List.of(summaryRow(), summaryRow()));

      assertEquals(2, result.getCheckScales().size());
      assertSummaryView(result.getCheckScales().get(1));
    }

    private void assertSummaryView(CheckScaleSummaryView m) {
      assertEquals(1L, m.getCheckScaleId().get());
      assertEquals("SITE1", m.getScaleSiteIdNmbr().get());
      assertEquals("PC", m.getPrimCheckLicenceNo().get());
      assertEquals("SC", m.getSecCheckLicenceNo().get());
      assertEquals("PO", m.getPrimOrigLicenceNo().get());
      assertEquals("SO", m.getSecOrigLicenceNo().get());
      assertEquals(LocalDate.of(2024, 1, 1), m.getOrigScaleDate().get());
      assertEquals(LocalDate.of(2024, 1, 5), m.getCheckScaleDate().get());
      assertEquals(new BigDecimal("1.0"), m.getPieceDiff().get());
      assertEquals(new BigDecimal("2.0"), m.getVolumeVariance().get());
      assertEquals(new BigDecimal("3.0"), m.getValueVariance().get());
      assertEquals("Y", m.getReplacedInd().get());
      assertEquals("RAN", m.getCheckScaleTypeCode().get());
      assertEquals("N", m.getFollowedGoodPracticeInd().get());
      assertEquals("Y", m.getOriginalWithinStandardInd().get());
    }
  }

  // ---- fixtures ---------------------------------------------------------------------------------

  private static CheckScale fullCheckScale() {
    return new CheckScale(
        77L, "RAN", "HBCS", "N", YesNo.Y, YesNo.N, YesNo.Y, "comment", 1.5, 2.5,
        new TallyDoc("CL", 1), new TallyDoc("CS", 2), new TallyDoc("OL", 3), new TallyDoc("OS", 4),
        "OSC", "CSC", "SSC", "SITE1", "TM1", "LA1", 55, "POP", "STR", 2024,
        new ScaleSide(LocalDate.of(2024, 1, 2), 7, 10, 11, 12.5, 100.25, 40),
        new ScaleSide(LocalDate.of(2024, 1, 3), 8, 20, 21, 22.5, 200.5, 41),
        OffsetDateTime.parse("2024-02-01T10:15:30Z"), "ENTRY",
        OffsetDateTime.parse("2024-02-02T10:15:30Z"), "UPDATE", 3,
        List.of(new SpeciesSummary("FI", "1", "01", 5, 1.5, null, 6, 2.5, null)));
  }

  private static CheckScale sparseCheckScale(Long id) {
    return new CheckScale(
        id, null, null, null, null, null, null, null, null, null,
        null, null, null, null,
        null, null, null, null, null, null, null,
        null, null, null,
        ScaleSide.EMPTY, ScaleSide.EMPTY,
        null, null, null, null, null,
        null);
  }

  private static CheckScaleSummary summaryRow() {
    return new CheckScaleSummary(
        1L, "SITE1", "PC", "SC", "PO", "SO",
        LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 5),
        new BigDecimal("1.0"), new BigDecimal("2.0"), new BigDecimal("3.0"),
        YesNo.Y, "RAN", "HBCS", YesNo.N, YesNo.Y);
  }
}
