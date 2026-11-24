package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.CheckScale;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SpeciesSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleSpgRowCommand;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.repository.CheckScaleRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class SummaryCheckScaleServiceTest {

  private static final LocalDate ORG_DATE = LocalDate.of(2024, 1, 1);
  private static final LocalDate CHK_DATE = LocalDate.of(2024, 1, 2);
  private static final long CHECK_SCALE_ID = 123L;

  private CheckScaleRepository repository;
  private CheckScaleService checkScaleService;
  private CheckScaleReferenceValidator referenceValidator;
  private SummaryCheckScaleService service;

  @BeforeEach
  void setUp() {
    repository = Mockito.mock(CheckScaleRepository.class);
    checkScaleService = Mockito.mock(CheckScaleService.class);
    referenceValidator = Mockito.mock(CheckScaleReferenceValidator.class);
    // Default: all references exist (no field errors). Tests that exercise a missing reference
    // override this with a non-empty list.
    Mockito.when(referenceValidator.validate(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()))
        .thenReturn(List.of());
    service = new SummaryCheckScaleService(repository, checkScaleService, referenceValidator);
  }

  @Test
  void getScalerSummaryCheckScales_trimsLicence_andDelegatesToRepository() {
    SummaryCheckScaleEntry entry =
        new SummaryCheckScaleEntry(
            146943L, "SFPSCS", "1234", "5678",
            ORG_DATE, CHK_DATE, null, null, null, YesNo.N, "FIRST", YesNo.Y, YesNo.Y);
    when(repository.searchScalerSummaryCheckScales("1234")).thenReturn(List.of(entry));

    List<SummaryCheckScaleEntry> rows = service.getScalerSummaryCheckScales("  1234  ");

    assertEquals(1, rows.size());
    assertEquals("SFPSCS", rows.get(0).ckscType());
    verify(repository).searchScalerSummaryCheckScales("1234");
  }

  @Test
  void getScalerSummaryCheckScales_rejectsBlankLicence() {
    assertThrows(BadRequestException.class, () -> service.getScalerSummaryCheckScales("  "));
    verify(repository, never()).searchScalerSummaryCheckScales(any());
  }

  @Test
  void createSummaryCheckScale_persistsHeaderThenEachSpgRow() {
    when(repository.createCheckScale(any())).thenReturn(200L);

    Long id =
        service.createSummaryCheckScale(validCommand().withSpgRows(List.of(spgRow(), spgRow())));

    assertEquals(200L, id);
    verify(repository, times(2)).insertSpgSummaryRow(eq(200L), any());
  }

  @Test
  void createSummaryCheckScale_throwsFieldValidation_whenAReferenceIsMissing() {
    when(referenceValidator.validate(any(), any(), any(), any()))
        .thenReturn(List.of(new FieldErrorDetail("checkScalerLicenceNo", "A Scaler # could not be found for BBBB.")));

    FieldValidationException ex =
        assertThrows(FieldValidationException.class, () -> service.createSummaryCheckScale(validCommand()));
    assertEquals(1, ex.getFieldErrors().size());
    assertEquals("checkScalerLicenceNo", ex.getFieldErrors().get(0).field());
    verify(repository, never()).createCheckScale(any());
  }

  @Test
  void updateSummaryCheckScale_throwsFieldValidation_whenAReferenceIsMissing() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS")));
    when(referenceValidator.validate(any(), any(), any(), any()))
        .thenReturn(List.of(new FieldErrorDetail("timberMark", "A Timber Mark could not be found for ABC123.")));

    assertThrows(
        FieldValidationException.class,
        () -> service.updateSummaryCheckScale(CHECK_SCALE_ID, validUpdateCommand()));
    verify(repository, never()).updateCheckScale(any(), any());
  }

  @Test
  void createSummaryCheckScale_throws_whenHeaderInsertReturnsNull() {
    when(repository.createCheckScale(any())).thenReturn(null);

    assertThrows(BadRequestException.class, () -> service.createSummaryCheckScale(validCommand()));
    verify(repository, never()).insertSpgSummaryRow(any(), any());
  }

  @Test
  void validate_rejectsSameOriginalAndCheckScaler() {
    assertThrows(
        BadRequestException.class,
        () -> service.createSummaryCheckScale(validCommand().withCheckScalerLicenceNo("AAAA")));
    verify(repository, never()).createCheckScale(any());
  }

  @Test
  void validate_rejectsBothLoadArrivalAndWeighSlip() {
    assertThrows(
        BadRequestException.class,
        () -> service.createSummaryCheckScale(validCommand().withWeighSlipNumber(5)));
  }

  @Test
  void validate_rejectsNeitherLoadArrivalNorWeighSlip() {
    assertThrows(
        BadRequestException.class,
        () -> service.createSummaryCheckScale(validCommand().withLoadArrivalNumber(null)));
  }

  @Test
  void validate_rejectsOriginalDateAfterCheckDate() {
    assertThrows(
        BadRequestException.class,
        () ->
            service.createSummaryCheckScale(
                validCommand().withOriginalScaleDate(CHK_DATE).withChkScaleDate(ORG_DATE)));
  }

  @Test
  void validate_rejectsFutureScaleDate() {
    assertThrows(
        BadRequestException.class,
        () ->
            service.createSummaryCheckScale(
                validCommand()
                    .withOriginalScaleDate(LocalDate.now())
                    .withChkScaleDate(LocalDate.now().plusDays(1))));
  }

  @Test
  void validate_rejectsMissingPartialInd() {
    assertThrows(
        BadRequestException.class,
        () -> service.createSummaryCheckScale(validCommand().withPartialInd(null)));
  }

  @Test
  void updateSummaryCheckScale_persistsHeaderAndReturnsReloadedRecord() {
    CheckScale existing = loadedSummary("LTSCS");
    when(checkScaleService.search(any())).thenReturn(List.of(existing));

    CheckScale result = service.updateSummaryCheckScale(CHECK_SCALE_ID, validUpdateCommand());

    assertEquals(existing, result);
    verify(repository).updateCheckScale(eq(CHECK_SCALE_ID), any());
  }

  @Test
  void updateSummaryCheckScale_rejectsChangedReturnType_whenSpgRowsExist() {
    // Stored record is SFP WITH an SPG row but the request maps to LTSCS — the type is locked.
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("SFPSCS", 1)));

    assertThrows(
        BadRequestException.class,
        () -> service.updateSummaryCheckScale(CHECK_SCALE_ID, validUpdateCommand()));
    verify(repository, never()).updateCheckScale(any(), any());
  }

  @Test
  void updateSummaryCheckScale_allowsChangedReturnType_onZeroRowRecord() {
    // Legacy parity: a zero-row record (partial save) keeps the return type editable. Stored SFP,
    // request maps to LTSCS, no SPG rows -> the change is accepted and persisted.
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("SFPSCS", 0)));

    service.updateSummaryCheckScale(CHECK_SCALE_ID, validUpdateCommand());

    verify(repository).updateCheckScale(eq(CHECK_SCALE_ID), any());
  }

  @Test
  void updateSummaryCheckScale_throwsNotFound_whenIdMissing() {
    when(checkScaleService.search(any())).thenReturn(List.of());

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateSummaryCheckScale(CHECK_SCALE_ID, validUpdateCommand()));
    verify(repository, never()).updateCheckScale(any(), any());
  }

  @Test
  void updateSummaryCheckScale_reusesHeaderValidation_rejectsSameScalerLicences() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS")));

    assertThrows(
        BadRequestException.class,
        () ->
            service.updateSummaryCheckScale(
                CHECK_SCALE_ID, validUpdateCommand().withCheckScalerLicenceNo("AAAA")));
    verify(repository, never()).updateCheckScale(any(), any());
  }

  @Test
  void addSpgRow_blanksProductForNonSfpThenInsertsAndReloads() {
    // Stored record is LTSCS (non-SFP) → the add-row product is blanked to " ".
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS", 1)));
    SummaryCheckScaleSpgRowCommand rawRow =
        new SummaryCheckScaleSpgRowCommand("FI", "XX", "1", 10, 12.5, 100.0, 9, 11.0, 95.0);

    service.addSpgRow(CHECK_SCALE_ID, rawRow);

    ArgumentCaptor<SummaryCheckScaleSpgRowCommand> captor =
        ArgumentCaptor.forClass(SummaryCheckScaleSpgRowCommand.class);
    verify(repository).insertSpgSummaryRow(eq(CHECK_SCALE_ID), captor.capture());
    assertEquals(" ", captor.getValue().productCode());
  }

  @Test
  void addSpgRow_rejectsMissingProduct_forSfp() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("SFPSCS", 1)));
    SummaryCheckScaleSpgRowCommand row =
        new SummaryCheckScaleSpgRowCommand("FI", "", "", 10, 12.5, 100.0, 9, 11.0, 95.0);

    assertThrows(BadRequestException.class, () -> service.addSpgRow(CHECK_SCALE_ID, row));
    verify(repository, never()).insertSpgSummaryRow(any(), any());
  }

  @Test
  void addSpgRow_rejectsMissingGrade_forSfpXm() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("SFPSCS", 1)));
    SummaryCheckScaleSpgRowCommand row =
        new SummaryCheckScaleSpgRowCommand("FI", "XM", "", 10, 12.5, 100.0, 9, 11.0, 95.0);

    assertThrows(BadRequestException.class, () -> service.addSpgRow(CHECK_SCALE_ID, row));
    verify(repository, never()).insertSpgSummaryRow(any(), any());
  }

  @Test
  void addSpgRow_rejectsMissingGrade_forLogTally() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS", 1)));
    SummaryCheckScaleSpgRowCommand row =
        new SummaryCheckScaleSpgRowCommand("FI", " ", "", 10, 12.5, 100.0, 9, 11.0, 95.0);

    assertThrows(BadRequestException.class, () -> service.addSpgRow(CHECK_SCALE_ID, row));
    verify(repository, never()).insertSpgSummaryRow(any(), any());
  }

  @Test
  void addSpgRow_allowsBlankGrade_forSfpNonXmProduct() {
    // SFP + non-XM product: grade is not required (legacy blanks it).
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("SFPSCS", 1)));
    SummaryCheckScaleSpgRowCommand row =
        new SummaryCheckScaleSpgRowCommand("FI", "BG", "", 10, 12.5, 100.0, 9, 11.0, 95.0);

    service.addSpgRow(CHECK_SCALE_ID, row);

    verify(repository).insertSpgSummaryRow(eq(CHECK_SCALE_ID), any());
  }

  @Test
  void createSummaryCheckScale_rejectsRowMissingGrade() {
    // validCommand() is LTSCS, so a row without a grade fails the SPG gating before any insert.
    SummaryCheckScaleSpgRowCommand bad =
        new SummaryCheckScaleSpgRowCommand("FI", " ", "", 10, 12.5, 100.0, 9, 11.0, 95.0);

    assertThrows(
        BadRequestException.class,
        () -> service.createSummaryCheckScale(validCommand().withSpgRows(List.of(bad))));
    verify(repository, never()).createCheckScale(any());
  }

  @Test
  void addSpgRow_throwsNotFound_forNonSummaryRecord() {
    // A valid detail/log-tally id loads but is not a summary check scale — must 404, never insert
    // (otherwise ReturnType.fromCkscType would throw a 500).
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("HBCS", 1)));

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.addSpgRow(CHECK_SCALE_ID, spgRow()));
    verify(repository, never()).insertSpgSummaryRow(any(), any());
  }

  @Test
  void updateSummaryCheckScale_throwsNotFound_forNonSummaryRecord() {
    // Non-summary record with zero SPG rows: the type guard must 404 before update_rec rewrites
    // cksc_type and corrupts the detail record.
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("HBCS", 0)));

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.updateSummaryCheckScale(CHECK_SCALE_ID, validUpdateCommand()));
    verify(repository, never()).updateCheckScale(any(), any());
  }

  @Test
  void addSpgRow_throwsNotFound_whenIdMissing() {
    when(checkScaleService.search(any())).thenReturn(List.of());

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.addSpgRow(CHECK_SCALE_ID, spgRow()));
    verify(repository, never()).insertSpgSummaryRow(any(), any());
  }

  @Test
  void deleteSpgRow_deletesAndReloads_whenMoreThanOneRowRemains() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS", 2)));

    service.deleteSpgRow(CHECK_SCALE_ID, "FI", " ", "1");

    verify(repository).deleteSpgSummaryRow(CHECK_SCALE_ID, "FI", " ", "1");
  }

  @Test
  void deleteSpgRow_throwsNotFound_whenKeyDoesNotMatchAnyRow() {
    // Two rows graded "1"/"2"; deleting grade "9" matches nothing -> 404, never calls the SP no-op.
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS", 2)));

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteSpgRow(CHECK_SCALE_ID, "FI", " ", "9"));
    verify(repository, never()).deleteSpgSummaryRow(any(), any(), any(), any());
  }

  @Test
  void deleteSpgRow_rejectsDeletingTheLastRemainingRow() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS", 1)));

    assertThrows(
        BadRequestException.class,
        () -> service.deleteSpgRow(CHECK_SCALE_ID, "FI", " ", "1"));
    verify(repository, never()).deleteSpgSummaryRow(any(), any(), any(), any());
  }

  @Test
  void deleteSpgRow_throwsNotFound_whenIdMissing() {
    when(checkScaleService.search(any())).thenReturn(List.of());

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteSpgRow(CHECK_SCALE_ID, "FI", " ", "1"));
    verify(repository, never()).deleteSpgSummaryRow(any(), any(), any(), any());
  }

  @Test
  void deleteSummaryCheckScale_deletesWhenFound() {
    when(checkScaleService.search(any())).thenReturn(List.of(loadedSummary("LTSCS")));

    service.deleteSummaryCheckScale(CHECK_SCALE_ID);

    verify(repository).deleteCheckScale(CHECK_SCALE_ID);
  }

  @Test
  void deleteSummaryCheckScale_throwsNotFound_whenIdMissing() {
    when(checkScaleService.search(any())).thenReturn(List.of());

    assertThrows(
        ResourceNotFoundException.class,
        () -> service.deleteSummaryCheckScale(CHECK_SCALE_ID));
    verify(repository, never()).deleteCheckScale(any());
  }

  /** A fully valid command (single SPG row); tests use {@code withX(...)} to vary one field. */
  private static SummaryCheckScaleCreateCommand validCommand() {
    return new SummaryCheckScaleCreateCommand(
        "LTSCS",
        "FRST",
        YesNo.Y,
        YesNo.Y,
        YesNo.Y,
        YesNo.N,
        null,
        "AAAA",
        "BBBB",
        "0001",
        "ABC123",
        "LD1",
        null,
        ORG_DATE,
        100,
        CHK_DATE,
        101,
        List.of(spgRow()));
  }

  private static SummaryCheckScaleSpgRowCommand spgRow() {
    return new SummaryCheckScaleSpgRowCommand("FI", " ", "1", 10, 12.5, 100.0, 9, 11.0, 95.0);
  }

  /** A fully valid header update command; tests use {@code withX(...)} to vary one field. */
  private static SummaryCheckScaleUpdateCommand validUpdateCommand() {
    return new SummaryCheckScaleUpdateCommand(
        "LTSCS",
        "FRST",
        YesNo.Y,
        YesNo.Y,
        YesNo.Y,
        YesNo.N,
        null,
        "AAAA",
        "BBBB",
        "0001",
        "ABC123",
        "LD1",
        null,
        ORG_DATE,
        100,
        CHK_DATE,
        101);
  }

  /** A minimal loaded summary record with the given {@code cksc_type} and no SPG rows. */
  private static CheckScale loadedSummary(String ckscType) {
    return loadedSummary(ckscType, 0);
  }

  /**
   * A minimal loaded summary record with the given {@code cksc_type} and {@code spgRowCount}
   * species-summary rows (the SPG-delete last-row guard counts {@code speciesSummary()}). Only those
   * two facets are read by the service under test, so the remaining fields are left null.
   */
  private static CheckScale loadedSummary(String ckscType, int spgRowCount) {
    List<SpeciesSummary> rows = new ArrayList<>();
    for (int i = 0; i < spgRowCount; i++) {
      rows.add(new SpeciesSummary("FI", String.valueOf(i + 1), " ", 10, 12.5, 100.0, 9, 11.0, 95.0));
    }
    return new CheckScale(
        CHECK_SCALE_ID,
        "FRST",
        ckscType,
        "Y",
        YesNo.Y,
        YesNo.Y,
        YesNo.N,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        "AAAA",
        "BBBB",
        null,
        "0001",
        "ABC123",
        "LD1",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        rows);
  }
}
