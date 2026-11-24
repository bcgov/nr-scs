package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSpgSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleStats;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyDetail;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyHeader;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyDetail;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyHeader;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleFilter;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScalerCheckScaleTab;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.TallyDoc;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleValidationResult;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SampleLogTallyValidationCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ScaleSide;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.ValidationField;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.repository.CheckScaleRepository;
import ca.bc.gov.nrs.scs.backend.repository.ExistenceResult;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class CheckScaleServiceTest {

  private CheckScaleRepository repository;
  private CheckScaleService service;

  @BeforeEach
  void setUp() {
    repository = Mockito.mock(CheckScaleRepository.class);
    service = new CheckScaleService(repository);
  }

  @Nested
  @DisplayName("validate")
  class Validate {

    @Test
    void returnsOk_logTally_happyPath() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());
      when(repository.getLogTallyHeader(anyString(), any())).thenReturn(null);
      when(repository.getLogTallyDetail(anyString(), any())).thenReturn(Collections.emptyList());
      when(repository.getLogTallyDetailSummary(anyString(), any())).thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertTrue(result.ok());
      assertTrue(result.errors().isEmpty());
      assertNotNull(result.checkScale());
      assertEquals("CHK-1", result.checkScale().chkLogTally().docNo());
      assertEquals("ORG-1", result.checkScale().orgLogTally().docNo());
    }

    @Test
    void returnsOk_sampleLogTally_happyPath() {
      when(repository.existsHbsRecord("SCHK", 1, true)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("SORG", 1, true)).thenReturn(new ExistenceResult(true, null));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());
      when(repository.getSampleLogTallyHeader(anyString(), any())).thenReturn(null);
      when(repository.getSampleLogTallyDetail(anyString(), any())).thenReturn(Collections.emptyList());
      when(repository.getSampleLogTallyDetailSummary(anyString(), any())).thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(sampleCmd("SCHK", 1, "SORG", 1));

      assertTrue(result.ok());
      assertEquals("SCHK", result.checkScale().chkSampleLogTally().docNo());
      assertEquals("SORG", result.checkScale().orgSampleLogTally().docNo());
    }

    @Test
    void errorOnCheckDdn_whenCheckHbsLookupFails() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(false, "ORA-12345"));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.CHECK_SCALE_DDN, "HBS lookup failed: ORA-12345");
    }

    @Test
    void errorOnCheckDdn_whenCheckHbsMissing() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(false, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.CHECK_SCALE_DDN, "Check Scale DDN 'CHK-1' does not exist in HBS.");
    }

    @Test
    void errorOnOriginalDdn_whenOriginalHbsMissing() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(false, null));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.ORIGINAL_SCALE_DDN, "Original Scale DDN 'ORG-1' does not exist in HBS.");
    }

    @Test
    void errorOnBothDdns_whenChkEqualsOrg() {
      when(repository.existsHbsRecord(anyString(), any(), anyBoolean())).thenReturn(new ExistenceResult(true, null));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(logCmd("SAME", 1, "SAME", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.CHECK_SCALE_DDN, "cannot be the same");
      assertHasErrorOnField(result, ValidationField.ORIGINAL_SCALE_DDN, "cannot be the same");
    }

    @Test
    void errorOnCheckDdn_whenCheckScaleAlreadyExistsForCheckDdn() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      // First search-call is the check-ddn lookup → return one existing CS to trigger error.
      // Other lookups must return empty.
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(List.of(stubCheckScale(99L)))
          .thenReturn(Collections.emptyList())
          .thenReturn(Collections.emptyList());

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.CHECK_SCALE_DDN, "A check scale already exists for Check Scale DDN");
    }

    @Test
    void errorOnOriginalDdn_whenMaxChecksAlreadyExist() {
      when(repository.existsHbsRecord(anyString(), any(), anyBoolean())).thenReturn(new ExistenceResult(true, null));
      // Sequence: check-ddn lookup (empty), original-as-check lookup (empty), original-ddn count → 2 rows.
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(Collections.emptyList())
          .thenReturn(Collections.emptyList())
          .thenReturn(List.of(stubCheckScale(1L), stubCheckScale(2L)));

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.ORIGINAL_SCALE_DDN, "Maximum check scales already exist");
    }
  }

  @Nested
  @DisplayName("createCheckScale")
  class Create {

    @Test
    void rejectsMissingCheckScaleTypeCode() {
      CheckScaleCreateCommand cmd = createCmd(null, YesNo.Y, YesNo.Y, 1.0, 1.0, true);
      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createCheckScale(cmd));
      assertTrue(ex.getMessage().contains("Check Scale Type"));
    }

    @Test
    void rejectsMissingFollowedGoodPractice() {
      CheckScaleCreateCommand cmd = createCmd("FIRST", null, YesNo.Y, 1.0, 1.0, true);
      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createCheckScale(cmd));
      assertTrue(ex.getMessage().contains("Followed"));
    }

    @Test
    void rejectsMissingOriginalDocRef() {
      CheckScaleCreateCommand cmd = new LogTallyCreateCommand(
          "HBCS", "CHK-L", 1, null, null,
          "FIRST", YesNo.Y, YesNo.Y, null, 1.0, 1.0);
      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createCheckScale(cmd));
      assertTrue(ex.getMessage().contains("document refs"));
    }

    @Test
    void returnsIdOnHappyPath() {
      when(repository.getLogTallyHeader(anyString(), any())).thenReturn(null);
      when(repository.getLogTallyDetail(anyString(), any())).thenReturn(Collections.emptyList());
      when(repository.createCheckScale(any())).thenReturn(42L);

      Long id = service.createCheckScale(createCmd("FIRST", YesNo.Y, YesNo.Y, 1.0, 1.0, false));

      assertEquals(42L, id);
      verify(repository).createCheckScale(any());
    }

    @Test
    void throwsWhenRepoReturnsNullId() {
      when(repository.getLogTallyHeader(anyString(), any())).thenReturn(null);
      when(repository.getLogTallyDetail(anyString(), any())).thenReturn(Collections.emptyList());
      when(repository.createCheckScale(any())).thenReturn(null);

      CheckScaleCreateCommand cmd = createCmd("FIRST", YesNo.Y, YesNo.Y, 1.0, 1.0, false);
      assertThrows(BadRequestException.class, () -> service.createCheckScale(cmd));
    }
  }

  @Nested
  @DisplayName("updateCheckScale")
  class Update {

    @Test
    void rejectsMissingCheckScaleTypeCode() {
      CheckScaleUpdateCommand cmd = updateCmd(5L, null, YesNo.Y, YesNo.Y, 1.0, 1.0);
      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.updateCheckScale(cmd));
      assertTrue(ex.getMessage().contains("Check Scale Type"));
    }

    @Test
    void rejectsMissingId() {
      CheckScaleUpdateCommand cmd = updateCmd(null, "FIRST", YesNo.Y, YesNo.Y, 1.0, 1.0);
      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.updateCheckScale(cmd));
      assertTrue(ex.getMessage().contains("id"));
    }

    @Test
    void throwsNotFound_whenRecordMissing() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(Collections.emptyList());

      CheckScaleUpdateCommand cmd = updateCmd(5L, "FIRST", YesNo.Y, YesNo.Y, 1.0, 1.0);
      assertThrows(ResourceNotFoundException.class, () -> service.updateCheckScale(cmd));
      verify(repository, never()).updateCheckScale(any(), any());
    }

    @Test
    void persistsAndReturnsUpdatedRecord_onHappyPath() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(List.of(stubCheckScale(5L)));

      CheckScale result =
          service.updateCheckScale(updateCmd(5L, "FIRST", YesNo.Y, YesNo.Y, 1.0, 1.0));

      assertNotNull(result);
      assertEquals(5L, result.checkScaleId());
      // Response overlays the edited fields onto the single loaded record (no second round-trip).
      assertEquals("FIRST", result.checkScaleTypeCode());
      verify(repository).searchCheckScales(any(CheckScaleSearchCriteria.class));
      verify(repository).updateCheckScale(eq(5L), any());
    }

    @Test
    void throwsNotFound_forSummaryCheckScaleId() {
      // The detail update endpoint must not touch a summary record either (shared loadById guard).
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(List.of(stubCheckScale(5L).withCkscType("LTSCS")));

      assertThrows(
          ResourceNotFoundException.class,
          () -> service.updateCheckScale(updateCmd(5L, "FIRST", YesNo.Y, YesNo.Y, 1.0, 1.0)));
      verify(repository, never()).updateCheckScale(any(), any());
    }
  }

  @Nested
  @DisplayName("deleteCheckScale")
  class Delete {

    @Test
    void rejectsMissingId() {
      BadRequestException ex =
          assertThrows(BadRequestException.class, () -> service.deleteCheckScale(null));
      assertTrue(ex.getMessage().contains("id"));
      verify(repository, never()).deleteCheckScale(any());
    }

    @Test
    void throwsNotFound_whenRecordMissing() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(Collections.emptyList());

      assertThrows(ResourceNotFoundException.class, () -> service.deleteCheckScale(5L));
      verify(repository, never()).deleteCheckScale(any());
    }

    @Test
    void deletesWhenFound() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(List.of(stubCheckScale(5L)));

      service.deleteCheckScale(5L);

      verify(repository).deleteCheckScale(5L);
    }

    @Test
    void throwsNotFound_forSummaryCheckScaleId() {
      // A summary check scale id is not deletable through the detail endpoint (mirrors the summary
      // service rejecting a detail id) — CHECK_SCALE_DELETE must not reach a summary record.
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class)))
          .thenReturn(List.of(stubCheckScale(5L).withCkscType("LTSCS")));

      assertThrows(ResourceNotFoundException.class, () -> service.deleteCheckScale(5L));
      verify(repository, never()).deleteCheckScale(any());
    }
  }

  @Nested
  @DisplayName("search")
  class Search {

    @Test
    void returnsEmptyListWhenRepoReturnsEmpty() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());

      List<CheckScale> result = service.search(blankCriteria());

      assertNotNull(result);
      assertTrue(result.isEmpty());
    }

    @Test
    void skipsHbsLookupsWhenSearchReturnsEmpty() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(Collections.emptyList());

      service.search(blankCriteria());

      verify(repository, never()).existsHbsRecord(anyString(), any(), anyBoolean());
      verify(repository, never()).getLogTallyHeader(anyString(), any());
    }
  }

  @Nested
  @DisplayName("getScalerCheckScaleTab")
  class ScalerTab {

    @Test
    void rejectsBlankLicence() {
      assertThrows(BadRequestException.class, () -> service.getScalerCheckScaleTab("  ", null));
    }

    @Test
    void skipsTheStatsQueryWhenThereAreNoRows() {
      when(repository.searchScalerCheckScaleSummaries(ScalerCheckScaleFilter.ALL, "L1"))
          .thenReturn(List.of());

      ScalerCheckScaleTab tab = service.getScalerCheckScaleTab(" L1 ", null);

      assertSame(CheckScaleStats.EMPTY, tab.stats());
      assertTrue(tab.checkScales().isEmpty());
      verify(repository, never()).calculateCheckScaleStats(any(), anyString());
    }

    @Test
    void resolvesTheFilterLabelAndLoadsStatsWhenRowsExist() {
      CheckScaleSummary row = summaryRow(5L);
      CheckScaleStats stats = new CheckScaleStats(BigDecimal.ONE, null, null, null, null, null);
      when(repository.searchScalerCheckScaleSummaries(ScalerCheckScaleFilter.CHECK, "L1"))
          .thenReturn(List.of(row));
      when(repository.calculateCheckScaleStats(ScalerCheckScaleFilter.CHECK, "L1")).thenReturn(stats);

      ScalerCheckScaleTab tab = service.getScalerCheckScaleTab("L1", "check");

      assertSame(stats, tab.stats());
      assertEquals(List.of(row), tab.checkScales());
    }
  }

  @Nested
  @DisplayName("getScaleSiteCheckScales")
  class ScaleSiteTab {

    @Test
    void rejectsBlankSiteNumber() {
      assertThrows(BadRequestException.class, () -> service.getScaleSiteCheckScales(" ", "RAN"));
    }

    @Test
    void passesNullTypeCodeWhenBlank() {
      CheckScaleSummary row = summaryRow(1L);
      when(repository.searchScaleSiteCheckScaleSummaries("S1", null)).thenReturn(List.of(row));

      assertEquals(List.of(row), service.getScaleSiteCheckScales(" S1 ", "  "));
    }

    @Test
    void trimsTheTypeCode() {
      when(repository.searchScaleSiteCheckScaleSummaries("S1", "RAN")).thenReturn(List.of());

      assertTrue(service.getScaleSiteCheckScales("S1", " RAN ").isEmpty());
      verify(repository).searchScaleSiteCheckScaleSummaries("S1", "RAN");
    }
  }

  @Nested
  @DisplayName("existsById")
  class ExistsById {

    @Test
    void isFalseForNullWithoutQuerying() {
      assertFalse(service.existsById(null));
      verify(repository, never()).searchCheckScales(any());
    }

    @Test
    void isFalseWhenNothingMatches() {
      when(repository.searchCheckScales(CheckScaleSearchCriteria.forId(4L))).thenReturn(List.of());
      assertFalse(service.existsById(4L));
    }

    @Test
    void isFalseWhenTheRepositoryReturnsNull() {
      when(repository.searchCheckScales(CheckScaleSearchCriteria.forId(4L))).thenReturn(null);
      assertFalse(service.existsById(4L));
    }

    @Test
    void isTrueWhenARowMatches() {
      when(repository.searchCheckScales(CheckScaleSearchCriteria.forId(4L)))
          .thenReturn(List.of(stubCheckScale(4L)));
      assertTrue(service.existsById(4L));
    }
  }

  @Nested
  @DisplayName("validate — edge cases")
  class ValidateEdgeCases {

    @Test
    void reportsUnknownErrorWhenTheHbsLookupReturnsNull() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(null);
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.CHECK_SCALE_DDN, "HBS lookup failed: unknown error");
    }

    @Test
    void skipsEveryReferenceCheckWhenBothDdnsAreBlank() {
      CheckScaleValidationResult result = service.validate(logCmd("  ", null, null, null));

      assertTrue(result.ok());
      assertNotNull(result.checkScale());
      verify(repository, never()).existsHbsRecord(any(), any(), anyBoolean());
      verify(repository, never()).searchCheckScales(any());
    }

    @Test
    void errorOnOriginalDdn_whenTheOriginalWasAlreadyUsedAsACheckScale() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.searchCheckScales(CheckScaleSearchCriteria.forCheckLookup(false, "ORG-1", 1)))
          .thenReturn(List.of(stubCheckScale(9L)));

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertHasErrorOnField(result, ValidationField.ORIGINAL_SCALE_DDN, "has already been used as a check scale");
    }

    @Test
    void wrapsAnEnrichmentFailureAsACheckDdnError() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.getLogTallyHeader("CHK-1", 1)).thenThrow(new IllegalStateException("HBS down"));

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertFalse(result.ok());
      assertNull(result.checkScale());
      assertHasErrorOnField(result, ValidationField.CHECK_SCALE_DDN,
          "Could not retrieve CheckScale payload: HBS down");
    }
  }

  @Nested
  @DisplayName("validate — enriched draft")
  class EnrichedDraft {

    @Test
    void logTallyDraft_aggregatesDetailTotalsAndSpeciesFromBothSides() {
      when(repository.existsHbsRecord("CHK-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("ORG-1", 1, false)).thenReturn(new ExistenceResult(true, null));
      when(repository.getLogTallyHeader("CHK-1", 1)).thenReturn(checkHeader());
      when(repository.getLogTallyHeader("ORG-1", 1)).thenReturn(originalHeader());
      when(repository.getLogTallyDetail("CHK-1", 1)).thenReturn(Arrays.asList(
          new LogTallyDetail("FI", "01", "1", 3, 4, 5.0, new BigDecimal("1.5")),
          new LogTallyDetail("FI", "01", "1", 0, null, null, null), // top 0 -> one piece, nothing else
          null));
      when(repository.getLogTallyDetail("ORG-1", 1)).thenReturn(List.of(
          new LogTallyDetail("FI", "01", "1", null, 2, 1.0, new BigDecimal("2.0")))); // null top -> one piece
      when(repository.getLogTallyDetailSummary("ORG-1", 1)).thenReturn(List.of(
          new LogTallyDetailSummary("ORG-1", 1, 2.0, 3, "FI", "1", "01", 1, 1, 1.0),
          new LogTallyDetailSummary("ORG-1", 1, null, null, null, null, null, null, null, null)));
      when(repository.getLogTallyDetailSummary("CHK-1", 1)).thenReturn(Arrays.asList(
          new LogTallyDetailSummary("CHK-1", 1, 4.0, 5, "FI", "1", "01", 1, 1, 1.0),
          null));

      CheckScaleValidationResult result = service.validate(logCmd("CHK-1", 1, "ORG-1", 1));

      assertTrue(result.ok());
      CheckScale draft = result.checkScale();
      assertEquals(YesNo.Y, draft.checkReplacesOriginal());
      assertEquals("ORGLIC", draft.originalScalerLicenceNo());
      assertEquals("CHKLIC", draft.checkScalerLicenceNo());
      assertEquals("ORGSEC", draft.secondScalerLicenceNo());
      assertEquals("SITE1", draft.scaleSiteIdNmbr());
      assertEquals("TM", draft.timberMark());
      assertEquals("LA9", draft.loadArrivalNumber());
      assertNull(draft.weighSlipNumber());
      assertNull(draft.population());

      ScaleSide chk = draft.checkScale();
      assertEquals(LocalDate.of(2024, 3, 1), chk.scaleDate());
      assertEquals(7, chk.returnNo());
      assertEquals(3, chk.totalTops());
      assertEquals(4, chk.totalButts());
      assertEquals(5.0, chk.totalLength());
      assertEquals(1.5, chk.totalVolume());
      assertEquals(4, chk.totalPieces(), "3 pieces from top=3 plus 1 for top=0");

      ScaleSide org = draft.originalScale();
      assertEquals(LocalDate.of(2024, 2, 1), org.scaleDate());
      assertEquals(6, org.returnNo());
      assertEquals(0, org.totalTops());
      assertEquals(2, org.totalButts());
      assertEquals(1.0, org.totalLength());
      assertEquals(2.0, org.totalVolume());
      assertEquals(1, org.totalPieces(), "a null top counts as one piece");

      List<SpeciesSummary> species = draft.speciesSummary();
      assertEquals(2, species.size());
      SpeciesSummary fir = species.get(0);
      assertEquals("FI", fir.speciesCode());
      assertEquals("1", fir.speciesGrade());
      assertEquals("01", fir.productCode());
      assertEquals(3, fir.orgPieces());
      assertEquals(2.0, fir.orgNetVolume());
      assertEquals(5, fir.chkPieces());
      assertEquals(4.0, fir.chkNetVolume());
      assertNull(fir.orgNetValue());
      SpeciesSummary blank = species.get(1);
      assertEquals("", blank.speciesCode());
      assertEquals(0, blank.orgPieces());
      assertEquals(0.0, blank.orgNetVolume());
      assertEquals(0, blank.chkPieces());
    }

    @Test
    void sampleDraft_readsTheSampleOnlyHeaderFields() {
      when(repository.existsHbsRecord("SCHK", 1, true)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("SORG", 1, true)).thenReturn(new ExistenceResult(true, null));
      when(repository.getSampleLogTallyHeader("SCHK", 1)).thenReturn(sampleCheckHeader(" 4321 "));
      when(repository.getSampleLogTallyDetail("SCHK", 1)).thenReturn(List.of(
          new SampleLogTallyDetail("FI", "01", "1", 2, 1, 2.0, new BigDecimal("3"))));

      CheckScaleValidationResult result = service.validate(sampleCmd("SCHK", 1, "SORG", 1));

      assertTrue(result.ok());
      CheckScale draft = result.checkScale();
      assertEquals("SCHK", draft.chkSampleLogTally().docNo());
      assertNull(draft.chkLogTally());
      assertEquals(4321, draft.weighSlipNumber());
      assertEquals("POP1", draft.population());
      assertEquals("STR1", draft.stratum());
      assertEquals(2024, draft.samplingYear());
      assertEquals(YesNo.N, draft.checkReplacesOriginal());
      assertEquals("CL", draft.checkScalerLicenceNo());
      assertNull(draft.originalScalerLicenceNo(), "no original header -> null licence");
      assertEquals(2, draft.checkScale().totalPieces());
      assertEquals(2, draft.checkScale().totalTops());
      assertEquals(3.0, draft.checkScale().totalVolume());
      assertEquals(0, draft.originalScale().totalPieces());
    }

    @Test
    void sampleDraft_ignoresAnUnparseableWeighSlip() {
      assertNull(sampleDraftWeighSlip("12ab"));
    }

    @Test
    void sampleDraft_ignoresABlankWeighSlip() {
      assertNull(sampleDraftWeighSlip("   "));
    }

    private Integer sampleDraftWeighSlip(String rawWeighSlip) {
      when(repository.existsHbsRecord("SCHK", 1, true)).thenReturn(new ExistenceResult(true, null));
      when(repository.existsHbsRecord("SORG", 1, true)).thenReturn(new ExistenceResult(true, null));
      when(repository.getSampleLogTallyHeader("SCHK", 1)).thenReturn(sampleCheckHeader(rawWeighSlip));

      CheckScaleValidationResult result = service.validate(sampleCmd("SCHK", 1, "SORG", 1));
      assertTrue(result.ok());
      return result.checkScale().weighSlipNumber();
    }
  }

  @Nested
  @DisplayName("search — read enrichment")
  class SearchEnrichment {

    @Test
    void returnsAnEmptyListWhenTheRepositoryReturnsNull() {
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(null);

      assertTrue(service.search(blankCriteria()).isEmpty());
    }

    @Test
    void enrichesLogTallyRowsFromHbsHeadersAndSummaries() {
      CheckScale row = stubCheckScale(1L)
          .withChkLogTally(new TallyDoc("CHK-1", 1))
          .withOrgLogTally(new TallyDoc("ORG-1", 1));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(row));
      when(repository.getLogTallyHeader("CHK-1", 1)).thenReturn(checkHeader());
      when(repository.getLogTallyHeader("ORG-1", 1)).thenReturn(originalHeader());
      when(repository.getLogTallyDetailSummary("ORG-1", 1)).thenReturn(List.of(
          new LogTallyDetailSummary("ORG-1", 1, 2.0, 3, "FI", "1", "01", 1, 1, 1.0)));
      when(repository.getLogTallyDetailSummary("CHK-1", 1)).thenReturn(List.of(
          new LogTallyDetailSummary("CHK-1", 1, 4.0, 5, "FI", "1", "01", 2, 2, 2.0)));

      CheckScale enriched = service.search(blankCriteria()).get(0);

      assertEquals("CHKLIC", enriched.checkScalerLicenceNo());
      assertEquals("ORGLIC", enriched.originalScalerLicenceNo());
      assertEquals("ORGSEC", enriched.secondScalerLicenceNo());
      assertEquals("SITE1", enriched.scaleSiteIdNmbr());
      assertEquals(YesNo.Y, enriched.checkReplacesOriginal());
      assertNull(enriched.weighSlipNumber());
      assertNull(enriched.population());
      assertEquals(new ScaleSide(LocalDate.of(2024, 2, 1), 6, 1, 1, 1.0, 2.0, 3), enriched.originalScale());
      assertEquals(new ScaleSide(LocalDate.of(2024, 3, 1), 7, 2, 2, 2.0, 4.0, 5), enriched.checkScale());
      assertEquals(1, enriched.speciesSummary().size());
      assertEquals(3, enriched.speciesSummary().get(0).orgPieces());
      assertEquals(4.0, enriched.speciesSummary().get(0).chkNetVolume());
      verify(repository, never()).getSpgSummary(any());
    }

    @Test
    void enrichesSampleRowsIncludingTheSampleOnlyFields() {
      CheckScale row = stubCheckScale(2L)
          .withChkSampleLogTally(new TallyDoc("SCHK", 1))
          .withOrgSampleLogTally(new TallyDoc("SORG", 1));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(row));
      when(repository.getSampleLogTallyHeader("SCHK", 1)).thenReturn(sampleCheckHeader("77"));
      when(repository.getSampleLogTallyHeader("SORG", 1)).thenReturn(new SampleLogTallyHeader(
          "SORG", 1, LocalDate.of(2024, 4, 4), 3, "SITE2", "TM2", "LA1", "OL", "OS",
          null, null, null, null, "N"));
      when(repository.getSampleLogTallyDetailSummary("SORG", 1)).thenReturn(List.of(
          new SampleLogTallyDetailSummary("SORG", 1, 1.0, 1, "CE", "2", "02", 1, 0, 0.5)));
      when(repository.getSampleLogTallyDetailSummary("SCHK", 1)).thenReturn(List.of(
          new SampleLogTallyDetailSummary("SCHK", 1, 2.0, 2, "CE", "2", "02", 2, 0, 1.0)));

      CheckScale enriched = service.search(blankCriteria()).get(0);

      assertEquals(77, enriched.weighSlipNumber());
      assertEquals("POP1", enriched.population());
      assertEquals("STR1", enriched.stratum());
      assertEquals(2024, enriched.samplingYear());
      assertEquals("OL", enriched.originalScalerLicenceNo());
      assertEquals("OS", enriched.secondScalerLicenceNo());
      assertEquals("CL", enriched.checkScalerLicenceNo());
      assertEquals(LocalDate.of(2024, 4, 4), enriched.originalScale().scaleDate());
      assertEquals(1.0, enriched.originalScale().totalVolume());
      assertEquals(2, enriched.checkScale().totalPieces());
      assertEquals("CE", enriched.speciesSummary().get(0).speciesCode());
    }

    @Test
    void overlaysTheLegacySpgSummaryWhenARowHasNoTallyDocs() {
      CheckScale row = stubCheckScale(3L);
      List<SpeciesSummary> species = List.of(new SpeciesSummary("HE", "1", "01", 1, 1.0, 1.0, 2, 2.0, 2.0));
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(row));
      when(repository.getSpgSummary(3L)).thenReturn(new CheckScaleSpgSummary(10.0, 12.0, 4, 5, species));

      CheckScale enriched = service.search(blankCriteria()).get(0);

      assertEquals(10.0, enriched.originalScale().totalVolume());
      assertEquals(4, enriched.originalScale().totalPieces());
      assertEquals(12.0, enriched.checkScale().totalVolume());
      assertEquals(5, enriched.checkScale().totalPieces());
      assertEquals(species, enriched.speciesSummary());
    }

    @Test
    void keepsTheRowUnchangedWhenTheSpgLookupFails() {
      CheckScale row = stubCheckScale(3L);
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(row));
      when(repository.getSpgSummary(3L)).thenThrow(new IllegalStateException("SPG_SUMMRY unavailable"));

      assertSame(row, service.search(blankCriteria()).get(0));
    }

    @Test
    void keepsTheRowUnchangedWhenTheSpgSummaryIsMissing() {
      CheckScale row = stubCheckScale(3L);
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(row));
      when(repository.getSpgSummary(3L)).thenReturn(null);

      assertSame(row, service.search(blankCriteria()).get(0));
    }

    @Test
    void leavesARowWithoutAnIdUntouched() {
      CheckScale row = stubCheckScale(null);
      when(repository.searchCheckScales(any(CheckScaleSearchCriteria.class))).thenReturn(List.of(row));

      assertSame(row, service.search(blankCriteria()).get(0));
      verify(repository, never()).getSpgSummary(any());
    }
  }

  // ---- HBS fixtures ------------------------------------------------------------------------------

  private static LogTallyHeader checkHeader() {
    return new LogTallyHeader("CHK-1", 1, LocalDate.of(2024, 3, 1), 7, "SITE1", "TM", "LA9",
        "CHKLIC", "CHKSEC", "Y");
  }

  private static LogTallyHeader originalHeader() {
    return new LogTallyHeader("ORG-1", 1, LocalDate.of(2024, 2, 1), 6, "SITE1", "TM", "LA1",
        "ORGLIC", "ORGSEC", "N");
  }

  private static SampleLogTallyHeader sampleCheckHeader(String rawWeighSlip) {
    return new SampleLogTallyHeader("SCHK", 1, LocalDate.of(2024, 5, 5), 9, "SITE2", "TM2", "LA2",
        "CL", "CS", rawWeighSlip, "POP1", "STR1", 2024, "N");
  }

  private static CheckScaleSummary summaryRow(Long id) {
    return new CheckScaleSummary(id, "S1", "PC", null, "PO", null,
        LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 2),
        BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, YesNo.N, "RAN", "HBCS", YesNo.Y, YesNo.Y);
  }

  // ---- helpers ----------------------------------------------------------------------------------

  private static CheckScaleValidationCommand logCmd(String chk, Integer chkVer, String org, Integer orgVer) {
    return new LogTallyValidationCommand(chk, chkVer, org, orgVer);
  }

  private static CheckScaleValidationCommand sampleCmd(String chk, Integer chkVer, String org, Integer orgVer) {
    return new SampleLogTallyValidationCommand(chk, chkVer, org, orgVer);
  }

  private static CheckScaleCreateCommand createCmd(
      String typeCode, YesNo followed, YesNo within, Double orgNet, Double chkNet, boolean isSample) {
    if (isSample) {
      return new SampleLogTallyCreateCommand(
          "HBCS", "CHK-S", 1, "ORG-S", 1,
          typeCode, followed, within, null, orgNet, chkNet);
    }
    return new LogTallyCreateCommand(
        "HBCS", "CHK-L", 1, "ORG-L", 1,
        typeCode, followed, within, null, orgNet, chkNet);
  }

  private static CheckScaleUpdateCommand updateCmd(
      Long id, String typeCode, YesNo followed, YesNo within, Double orgNet, Double chkNet) {
    return new CheckScaleUpdateCommand(id, typeCode, followed, within, null, orgNet, chkNet);
  }

  private static CheckScale stubCheckScale(Long id) {
    return new CheckScale(
        id, null, null, null, null, null, null, null, null, null,
        null, null, null, null,
        null, null, null, null, null, null, null,
        null, null, null,
        ScaleSide.EMPTY, ScaleSide.EMPTY,
        null, null, null, null, null,
        null);
  }

  private static CheckScaleSearchCriteria blankCriteria() {
    return new CheckScaleSearchCriteria(
        null, null, null, null, null, null, null, null, null,
        null, null, null, null,
        null, null, null, null, null, null, null, null, null, null,
        ScaleSide.EMPTY, ScaleSide.EMPTY,
        null, null);
  }

  private static void assertHasErrorOnField(
      CheckScaleValidationResult result, ValidationField field, String messageContains) {
    assertNotNull(result.errors());
    boolean found = result.errors().stream()
        .anyMatch(e -> e.field() == field && e.message() != null && e.message().contains(messageContains));
    assertTrue(found,
        "expected error on " + field + " containing '" + messageContains + "', got: " + result.errors());
  }
}
