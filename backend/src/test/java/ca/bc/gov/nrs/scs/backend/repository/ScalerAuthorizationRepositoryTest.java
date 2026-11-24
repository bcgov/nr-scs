package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationListEntry;
import ca.bc.gov.nrs.scs.backend.domain.authorization.ScalerAuthorizationRecord;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationCreate;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationDetail;
import java.sql.Blob;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.UncategorizedSQLException;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Repository-level tests for the scaler authorization stored-procedure calls.
 *
 * <p>There is no ORM here: every read and write is a hand-bound {@code CallableStatement} against an
 * Oracle package, so the contract worth pinning is the prepared call string and the exact parameter
 * positions. {@link #stubExecute} records both for each {@code jdbcTemplate.execute}, and
 * {@link Router} feeds a per-package cursor/BLOB back so multi-call flows (detail assembly, cascade
 * deletes) can be driven end to end.
 */
class ScalerAuthorizationRepositoryTest {

  private static final String AUTH_PKG = "scs_scaler_authorization_pkg";
  private static final String JOB_FUNCTION_PKG = "scs_scale_job_function_pkg";
  private static final String FOREST_PRODUCT_PKG = "scs_authorized_forst_prdct_pkg";
  private static final String AUTHORIZED_SITE_PKG = "scs_scaler_authorized_site_pkg";
  private static final String AUTHORIZED_STATUS_PKG = "scs_scaler_authorzd_sts_vw_pkg";
  private static final String CONDITION_VW_PKG = "scs_scaler_condition_vw_pkg";
  private static final String AUTHORZTN_CNDTN_PKG = "scs_scaler_authorztn_cndtn_pkg";
  private static final String GET_LETTER = "prc_get_letter";
  private static final String SAVE_LETTER = "prc_save_letter";
  /** {@code ReportDefinition.SCALER_AUTHORIZATION_LETTER} — the letter store is keyed by report name. */
  private static final String LETTER_REPORT = "SCS_REP003.rpt";

  // ---------------------------------------------------------------------------
  // listScalerAuthorizationsByLicence
  // ---------------------------------------------------------------------------

  @Test
  void listScalerAuthorizationsByLicence_callsSearchRecsAndEnrichesRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    AtomicReference<CallableStatement> searchStatement = new AtomicReference<>();
    stubRoutedExecute(jdbcTemplate, searchStatement, false);

    List<ScalerAuthorizationListEntry> items = repository.listScalerAuthorizationsByLicence("1234");

    assertEquals(1, items.size());
    ScalerAuthorizationListEntry item = items.get(0);
    assertEquals(4001L, item.scalerAuthorizationId());
    assertEquals(LocalDate.of(2020, 1, 15), item.authorizationEffectiveDate());
    assertEquals(LocalDate.of(2099, 1, 15), item.authorizationExpiryDate());
    assertEquals("N", item.districtWideInd());
    assertEquals(1234L, item.orgUnitNo());
    assertEquals(List.of("A12345"), item.authorizedSites());
    assertEquals("Active", item.status());
    assertTrue(item.letterExists());

    // search_recs binds the scaler licence number at parameter position 3 (cursor is position 1).
    assertNotNull(searchStatement.get());
    verify(searchStatement.get()).setString(3, "1234");
  }

  /**
   * Regression for the Authorizations tab 500 (scaler IB60): PRC_GET_LETTER raises NO_DATA_FOUND
   * (ORA-01403) when an authorization has no stored letter. The list load must treat that as
   * "no letter" rather than letting it bubble up and fail the whole tab.
   */
  @Test
  void listScalerAuthorizationsByLicence_treatsNoDataFoundLetterAsMissing() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    AtomicReference<CallableStatement> searchStatement = new AtomicReference<>();
    stubRoutedExecute(jdbcTemplate, searchStatement, true);

    List<ScalerAuthorizationListEntry> items = repository.listScalerAuthorizationsByLicence("1234");

    assertEquals(1, items.size());
    assertFalse(items.get(0).letterExists());
  }

  // ---------------------------------------------------------------------------
  // Status derivation (computeScalerAuthorizationStatus, exercised through the list)
  // ---------------------------------------------------------------------------

  @Test
  void status_isActiveWhenTodayIsInsideTheAuthorizationWindow() throws Exception {
    LocalDate today = LocalDate.now();
    assertEquals("Active", statusFor(today.minusDays(1), today.plusDays(1), null));
  }

  @Test
  void status_isActiveOnTheEffectiveAndExpiryBoundaries() throws Exception {
    LocalDate today = LocalDate.now();
    // Both bounds are inclusive: a window that opens and closes today is still Active.
    assertEquals("Active", statusFor(today, today.plusDays(30), null));
    assertEquals("Active", statusFor(today.minusDays(30), today, null));
    assertEquals("Active", statusFor(today, today, null));
  }

  @Test
  void status_isExpiredOnceTheExpiryDateHasPassed() throws Exception {
    LocalDate today = LocalDate.now();
    assertEquals("Expired", statusFor(today.minusDays(30), today.minusDays(1), null));
  }

  @Test
  void status_isInactiveBeforeTheEffectiveDate() throws Exception {
    LocalDate today = LocalDate.now();
    assertEquals("Inactive", statusFor(today.plusDays(1), today.plusDays(30), null));
  }

  @Test
  void status_isInactiveWhenTheWindowIsIncomplete() throws Exception {
    LocalDate today = LocalDate.now();
    // No expiry → the Active branch cannot be reached and the row is not Expired either.
    assertEquals("Inactive", statusFor(today.minusDays(1), null, null));
    assertEquals("Inactive", statusFor(null, null, null));
  }

  @Test
  void status_isCancelledOnceTheCancellationDateHasArrived() throws Exception {
    LocalDate today = LocalDate.now();
    assertEquals("Cancelled", statusFor(today.minusDays(30), today.plusDays(30), today.minusDays(1)));
    // The cancellation date itself counts as cancelled (the check is "not before").
    assertEquals("Cancelled", statusFor(today.minusDays(30), today.plusDays(30), today));
  }

  @Test
  void status_cancellationOutranksExpiry() throws Exception {
    LocalDate today = LocalDate.now();
    assertEquals("Cancelled", statusFor(today.minusDays(30), today.minusDays(2), today.minusDays(1)));
  }

  @Test
  void status_ignoresAFutureCancellationDate() throws Exception {
    LocalDate today = LocalDate.now();
    // A scheduled future cancellation must not retire a currently-valid authorization.
    assertEquals("Active", statusFor(today.minusDays(1), today.plusDays(30), today.plusDays(5)));
  }

  /** Runs the list flow with a single base row carrying the given dates and returns its status. */
  private String statusFor(LocalDate effective, LocalDate expiry, LocalDate cancellation) throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);
    stubExecute(jdbcTemplate, new Router().on(AUTH_PKG, baseResultSet(effective, expiry, cancellation)));

    return repository.listScalerAuthorizationsByLicence("1234").get(0).status();
  }

  // ---------------------------------------------------------------------------
  // getScalerAuthorization — detail assembly
  // ---------------------------------------------------------------------------

  @Test
  void getScalerAuthorization_assemblesTheDetailFromEveryAssociationCall() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    LocalDate today = LocalDate.now();
    Blob letterBlob = mock(Blob.class);
    when(letterBlob.length()).thenReturn(42L);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router()
        .on(AUTH_PKG, baseResultSet(today.minusDays(1), today.plusDays(1), null))
        .on(JOB_FUNCTION_PKG, codeResultSet("P"))
        .on(FOREST_PRODUCT_PKG, codeResultSet("SHAKE"))
        .on(AUTHORIZED_STATUS_PKG, sitesResultSet())
        .on(CONDITION_VW_PKG, conditionsResultSet())
        .on(GET_LETTER, letterBlob));

    ScalerAuthorizationDetail detail = repository.getScalerAuthorization(4001L);

    assertNotNull(detail);
    assertEquals(4001L, detail.getScalerAuthorizationId());
    assertEquals("1234", detail.getScalerLicenceNo());
    assertEquals(List.of("P"), detail.getJobFunctions());
    assertEquals(List.of("SHAKE"), detail.getAuthForestProducts());
    assertEquals(1, detail.getScaleSites().size());
    assertEquals("A12345", detail.getScaleSites().get(0).getScaleSiteIdNmbr().get());
    assertEquals(1, detail.getConditions().size());
    assertEquals(77L, detail.getConditions().get(0).getScaleAuthConditionId());
    assertTrue(detail.getLetterExists());
    assertEquals("Active", detail.getStatus());

    // The base read is select_rec bound by id at position 2 (position 1 is the cursor).
    RecordedCall base = callContaining(calls, AUTH_PKG + ".select_rec");
    verify(base.cs()).setLong(2, 4001L);
  }

  @Test
  void getScalerAuthorization_returnsNullAndSkipsEnrichmentWhenTheBaseRowIsMissing() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    // Every call yields an empty cursor, so select_rec finds nothing.
    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    assertNull(repository.getScalerAuthorization(4001L));
    // No association queries are issued for a record that does not exist.
    assertEquals(1, calls.size());
    assertTrue(calls.get(0).sql().toLowerCase().contains(AUTH_PKG + ".select_rec"));
  }

  // ---------------------------------------------------------------------------
  // create / update / delete
  // ---------------------------------------------------------------------------

  @Test
  void createScalerAuthorization_bindsEveryColumnInOrderAndStampsTheAuditUser() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    LocalDate today = LocalDate.now();
    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router()
        .on(AUTH_PKG, baseResultSet(today.minusDays(1), today.plusDays(1), null)));

    ScalerAuthorizationCreate request = new ScalerAuthorizationCreate();
    request.setScalerLicenceNo("8437");
    request.setOrgUnitNo(1234L);
    request.setDistrictWideInd("Y");
    request.setAuthorizationEffectiveDate(LocalDate.of(2026, 1, 1));
    request.setAuthorizationExpiryDate(LocalDate.of(2026, 12, 31));
    request.setExpiryNotificationInd("N");

    ScalerAuthorizationDetail created = repository.createScalerAuthorization(request);

    assertNotNull(created);
    RecordedCall insert = callContaining(calls, AUTH_PKG + ".insert_rec");
    // 12 IN parameters behind the function's return slot.
    assertEquals("{ ? = call scs_scaler_authorization_pkg.insert_rec(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }",
        insert.sql());

    CallableStatement cs = insert.cs();
    verify(cs).setNull(2, Types.NUMERIC);                              // id is DB-generated
    verify(cs).setString(3, "8437");
    verify(cs).setLong(4, 1234L);
    verify(cs).setString(5, "Y");
    verify(cs).setNull(6, Types.VARCHAR);                              // letterArcsFileNumber
    verify(cs).setDate(7, Date.valueOf(LocalDate.of(2026, 1, 1)));
    verify(cs).setDate(8, Date.valueOf(LocalDate.of(2026, 12, 31)));
    verify(cs).setString(9, "N");
    verify(cs).setNull(10, Types.DATE);                                // cancellationDate
    verify(cs).setNull(11, Types.VARCHAR);                             // cancellationReasonTxt
    // No security context in a plain unit test → the audit columns fall back to SYSTEM.
    verify(cs).setString(12, "SYSTEM");
    verify(cs).setString(13, "SYSTEM");
  }

  @Test
  void updateScalerAuthorization_preservesTheOriginalEntryUser() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    LocalDate today = LocalDate.now();
    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router()
        .on(AUTH_PKG, baseResultSet(today.minusDays(1), today.plusDays(1), null)));

    repository.updateScalerAuthorization(new ScalerAuthorizationRecord(
        4001L, "8437", 1234L, "N", "ARCS-1",
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "Y",
        LocalDate.of(2026, 6, 1), "Reassigned", "ORIGINAL_USER"));

    RecordedCall update = callContaining(calls, AUTH_PKG + ".update_rec");
    CallableStatement cs = update.cs();
    verify(cs).setLong(2, 4001L);
    verify(cs).setString(3, "8437");
    verify(cs).setLong(4, 1234L);
    verify(cs).setString(5, "N");
    verify(cs).setString(6, "ARCS-1");
    verify(cs).setDate(7, Date.valueOf(LocalDate.of(2026, 1, 1)));
    verify(cs).setDate(8, Date.valueOf(LocalDate.of(2026, 12, 31)));
    verify(cs).setString(9, "Y");
    verify(cs).setDate(10, Date.valueOf(LocalDate.of(2026, 6, 1)));
    verify(cs).setString(11, "Reassigned");
    // entry_userid keeps the creator; only update_userid moves to the current user.
    verify(cs).setString(12, "ORIGINAL_USER");
    verify(cs).setString(13, "SYSTEM");
  }

  @Test
  void updateScalerAuthorization_defaultsTheEntryUserWhenTheRecordCarriesNone() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    LocalDate today = LocalDate.now();
    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router()
        .on(AUTH_PKG, baseResultSet(today.minusDays(1), today.plusDays(1), null)));

    repository.updateScalerAuthorization(new ScalerAuthorizationRecord(
        4001L, "8437", 1234L, "N", null,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31), "N",
        null, null, null));

    CallableStatement cs = callContaining(calls, AUTH_PKG + ".update_rec").cs();
    verify(cs).setString(12, "SYSTEM");
    verify(cs).setString(13, "SYSTEM");
  }

  @Test
  void deleteScalerAuthorization_callsDeleteRecBoundFromTheFirstPosition() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.deleteScalerAuthorization(4001L);

    RecordedCall delete = callContaining(calls, AUTH_PKG + ".delete_rec");
    // A procedure call has no return slot, so the id sits at position 1.
    assertEquals("{ call scs_scaler_authorization_pkg.delete_rec(?) }", delete.sql());
    verify(delete.cs()).setLong(1, 4001L);
  }

  // ---------------------------------------------------------------------------
  // Association writes
  // ---------------------------------------------------------------------------

  @Test
  void addJobFunctions_insertsOneRowPerCodeAgainstTheJobFunctionPackage() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.addJobFunctions(4001L, List.of("P", "W"));

    List<RecordedCall> inserts = callsContaining(calls, JOB_FUNCTION_PKG + ".insert_rec");
    assertEquals(2, inserts.size());
    verify(inserts.get(0).cs()).setLong(2, 4001L);
    verify(inserts.get(0).cs()).setString(3, "P");
    verify(inserts.get(0).cs()).setString(4, "SYSTEM");
    verify(inserts.get(0).cs()).setString(5, "SYSTEM");
    verify(inserts.get(1).cs()).setString(3, "W");
  }

  @Test
  void addJobFunctions_skipsBlankCodesAndIssuesNoCallForAnEmptyList() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.addJobFunctions(4001L, java.util.Arrays.asList("P", null, "  ", "W"));
    assertEquals(2, callsContaining(calls, JOB_FUNCTION_PKG + ".insert_rec").size());

    calls.clear();
    repository.addJobFunctions(4001L, List.of());
    repository.addJobFunctions(4001L, null);
    assertTrue(calls.isEmpty());
  }

  @Test
  void addAuthorizedForestProducts_targetsTheForestProductPackage() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.addAuthorizedForestProducts(4001L, List.of("SHAKE"));

    RecordedCall insert = callContaining(calls, FOREST_PRODUCT_PKG + ".insert_rec");
    verify(insert.cs()).setLong(2, 4001L);
    verify(insert.cs()).setString(3, "SHAKE");
  }

  @Test
  void addScaleSites_targetsTheAuthorizedSitePackage() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.addScaleSites(4001L, List.of("A12345"));

    RecordedCall insert = callContaining(calls, AUTHORIZED_SITE_PKG + ".insert_rec");
    verify(insert.cs()).setLong(2, 4001L);
    verify(insert.cs()).setString(3, "A12345");
  }

  // ---------------------------------------------------------------------------
  // Cascade delete of associations
  // ---------------------------------------------------------------------------

  @Test
  void deleteScalerAuthorizationAssociations_removesEveryAssociationItRead() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router()
        .on(CONDITION_VW_PKG, conditionsResultSet())
        .on(FOREST_PRODUCT_PKG + ".search_recs", codeResultSet("SHAKE"))
        .on(JOB_FUNCTION_PKG + ".search_recs", codeResultSet("P"))
        .on(AUTHORIZED_STATUS_PKG, sitesResultSet()));

    repository.deleteScalerAuthorizationAssociations(4001L);

    // Conditions delete binds from position 1: id, class code, condition id.
    RecordedCall conditionDelete = callContaining(calls, AUTHORZTN_CNDTN_PKG + ".delete_rec");
    verify(conditionDelete.cs()).setLong(1, 4001L);
    verify(conditionDelete.cs()).setString(2, "SCA");
    verify(conditionDelete.cs()).setLong(3, 77L);

    RecordedCall productDelete = callContaining(calls, FOREST_PRODUCT_PKG + ".delete_rec");
    verify(productDelete.cs()).setLong(1, 4001L);
    verify(productDelete.cs()).setString(2, "SHAKE");

    RecordedCall jobFunctionDelete = callContaining(calls, JOB_FUNCTION_PKG + ".delete_rec");
    verify(jobFunctionDelete.cs()).setLong(1, 4001L);
    verify(jobFunctionDelete.cs()).setString(2, "P");

    // Sites are read from the status view but deleted from the authorized-site table.
    RecordedCall siteDelete = callContaining(calls, AUTHORIZED_SITE_PKG + ".delete_rec");
    verify(siteDelete.cs()).setLong(1, 4001L);
    verify(siteDelete.cs()).setString(2, "A12345");
  }

  @Test
  void deleteScalerAuthorizationAssociations_isANoOpForANullId() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.deleteScalerAuthorizationAssociations(null);

    assertTrue(calls.isEmpty());
  }

  // ---------------------------------------------------------------------------
  // Letter blob storage
  // ---------------------------------------------------------------------------

  @Test
  void upsertScalerAuthorizationLetter_bindsTheIdReportNameAndBytes() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    byte[] pdf = new byte[] {1, 2, 3};
    repository.upsertScalerAuthorizationLetter(4001L, pdf);

    RecordedCall save = callContaining(calls, SAVE_LETTER);
    verify(save.cs()).setLong(1, 4001L);
    verify(save.cs()).setString(2, LETTER_REPORT);
    verify(save.cs()).setBytes(3, pdf);
  }

  @Test
  void upsertScalerAuthorizationLetter_isANoOpWithoutAnIdOrBlob() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    repository.upsertScalerAuthorizationLetter(null, new byte[] {1});
    repository.upsertScalerAuthorizationLetter(4001L, null);

    assertTrue(calls.isEmpty());
  }

  @Test
  void getScalerAuthorizationLetter_returnsTheStoredBytes() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    byte[] pdf = new byte[] {9, 8, 7};
    Blob blob = mock(Blob.class);
    when(blob.length()).thenReturn((long) pdf.length);
    when(blob.getBytes(1, pdf.length)).thenReturn(pdf);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router().on(GET_LETTER, blob));

    assertEquals(pdf, repository.getScalerAuthorizationLetter(4001L));

    RecordedCall get = callContaining(calls, GET_LETTER);
    verify(get.cs()).registerOutParameter(1, Types.BLOB);
    verify(get.cs()).setLong(2, 4001L);
    verify(get.cs()).setString(3, LETTER_REPORT);
  }

  /**
   * PRC_GET_LETTER raises NO_DATA_FOUND rather than returning a null blob when nothing is stored;
   * the download endpoint depends on that becoming a null (→ 404) instead of a 500.
   */
  @Test
  void getScalerAuthorizationLetter_translatesNoDataFoundToNull() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    stubExecute(jdbcTemplate, new Router().on(GET_LETTER, noDataFound()));

    assertNull(repository.getScalerAuthorizationLetter(4001L));
  }

  @Test
  void getScalerAuthorizationLetter_returnsNullWhenTheBlobIsAbsent() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    // Router leaves getBlob(1) unstubbed → null blob.
    stubExecute(jdbcTemplate, new Router());

    assertNull(repository.getScalerAuthorizationLetter(4001L));
  }

  @Test
  void getScalerAuthorizationLetter_isANoOpForANullId() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    List<RecordedCall> calls = stubExecute(jdbcTemplate, new Router());

    assertNull(repository.getScalerAuthorizationLetter(null));
    assertTrue(calls.isEmpty());
  }

  /** Only ORA-01403 means "absent" — any other database failure must still surface. */
  @Test
  void getScalerAuthorizationLetter_rethrowsErrorsThatAreNotNoDataFound() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    stubExecute(jdbcTemplate, new Router().on(GET_LETTER, new UncategorizedSQLException(
        "PRC_GET_LETTER", "sql", new SQLException("ORA-00942: table or view does not exist", "42000", 942))));

    assertThrows(UncategorizedSQLException.class, () -> repository.getScalerAuthorizationLetter(4001L));
  }

  @Test
  void listScalerAuthorizationsByLicence_propagatesLetterErrorsThatAreNotNoDataFound() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository repository = new ScalerAuthorizationRepository(jdbcTemplate);

    LocalDate today = LocalDate.now();
    stubExecute(jdbcTemplate, new Router()
        .on(AUTH_PKG, baseResultSet(today.minusDays(1), today.plusDays(1), null))
        .on(GET_LETTER, new UncategorizedSQLException(
            "PRC_GET_LETTER", "sql", new SQLException("ORA-00942", "42000", 942))));

    assertThrows(UncategorizedSQLException.class,
        () -> repository.listScalerAuthorizationsByLicence("1234"));
  }

  // ===========================================================================
  // Harness
  // ===========================================================================

  /** One recorded {@code jdbcTemplate.execute}: the prepared call string and its mock statement. */
  private record RecordedCall(String sql, CallableStatement cs) {}

  /**
   * Routes each execute to a canned result chosen by the first matching fragment of the prepared
   * call string. A {@link ResultSet} is served as the cursor at out-parameter 1, a {@link Blob} as
   * the BLOB at out-parameter 1, and a {@link RuntimeException} is thrown to simulate a DB error.
   * Unmatched calls get an empty cursor, which is what an unstubbed read should look like.
   */
  private static final class Router {
    private final Map<String, Object> byFragment = new LinkedHashMap<>();

    Router on(String fragment, Object result) {
      byFragment.put(fragment.toLowerCase(), result);
      return this;
    }

    void configure(String lowerSql, CallableStatement cs) throws SQLException {
      for (Map.Entry<String, Object> entry : byFragment.entrySet()) {
        if (!lowerSql.contains(entry.getKey())) {
          continue;
        }
        Object result = entry.getValue();
        if (result instanceof RuntimeException ex) {
          throw ex;
        }
        if (result instanceof Blob blob) {
          when(cs.getBlob(1)).thenReturn(blob);
        } else if (result instanceof ResultSet rs) {
          when(cs.getObject(1)).thenReturn(rs);
        }
        return;
      }
      when(cs.getObject(1)).thenReturn(mock(ResultSet.class));
    }
  }

  /**
   * Stubs the {@code (CallableStatementCreator, CallableStatementCallback)} execute overload — the
   * one every {@code AbstractRepository} helper funnels through — capturing the prepared SQL and
   * statement of each call so tests can assert on call strings and parameter positions.
   */
  private List<RecordedCall> stubExecute(JdbcTemplate jdbcTemplate, Router router) {
    List<RecordedCall> calls = new ArrayList<>();

    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          AtomicReference<String> sql = new AtomicReference<>();
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            sql.set(call.getArgument(0));
            return cs;
          });

          creator.createCallableStatement(con);

          String prepared = sql.get() == null ? "" : sql.get();
          calls.add(new RecordedCall(prepared, cs));
          router.configure(prepared.toLowerCase(), cs);
          return callback.doInCallableStatement(cs);
        });

    return calls;
  }

  private static RecordedCall callContaining(List<RecordedCall> calls, String fragment) {
    return callsContaining(calls, fragment).stream()
        .findFirst()
        .orElseThrow(() -> new AssertionError(
            "No call matching '" + fragment + "'. Recorded: " + calls.stream().map(RecordedCall::sql).toList()));
  }

  private static List<RecordedCall> callsContaining(List<RecordedCall> calls, String fragment) {
    String needle = fragment.toLowerCase();
    return calls.stream().filter(call -> call.sql().toLowerCase().contains(needle)).toList();
  }

  private static UncategorizedSQLException noDataFound() {
    return new UncategorizedSQLException(
        "PRC_GET_LETTER", "sql", new SQLException("ORA-01403: no data found", "02000", 1403));
  }

  // ---------------------------------------------------------------------------
  // Result-set fixtures
  // ---------------------------------------------------------------------------

  /** The 12-column authorization row, with the date columns driving status derivation. */
  private ResultSet baseResultSet(LocalDate effective, LocalDate expiry, LocalDate cancellation)
      throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject("scaler_authorization_id")).thenReturn(4001L);
    when(rs.getLong("scaler_authorization_id")).thenReturn(4001L);
    when(rs.getString("scaler_licence_no")).thenReturn("1234");
    when(rs.getObject("org_unit_no")).thenReturn(1234L);
    when(rs.getLong("org_unit_no")).thenReturn(1234L);
    when(rs.getString("district_wide_ind")).thenReturn("N");
    when(rs.getString("letter_arcs_file_number")).thenReturn(null);
    when(rs.getDate("authorization_effective_date")).thenReturn(effective == null ? null : Date.valueOf(effective));
    when(rs.getDate("authorization_expiry_date")).thenReturn(expiry == null ? null : Date.valueOf(expiry));
    when(rs.getString("expiry_notification_ind")).thenReturn("N");
    when(rs.getDate("cancellation_date")).thenReturn(cancellation == null ? null : Date.valueOf(cancellation));
    when(rs.getString("cancellation_reason_txt")).thenReturn(null);
    when(rs.getTimestamp("entry_timestamp")).thenReturn(null);
    when(rs.getString("entry_userid")).thenReturn("SYSTEM");
    when(rs.getTimestamp("update_timestamp")).thenReturn(null);
    when(rs.getString("update_userid")).thenReturn("SYSTEM");
    when(rs.getObject("revision_count")).thenReturn(1L);
    when(rs.getLong("revision_count")).thenReturn(1L);
    return rs;
  }

  /** Job-function / forest-product association rows: the code sits at column 2. */
  private ResultSet codeResultSet(String code) throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getString(2)).thenReturn(code);
    return rs;
  }

  private ResultSet sitesResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getString(2)).thenReturn("A12345");
    when(rs.getString(6)).thenReturn("Site A");
    return rs;
  }

  private ResultSet conditionsResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getLong(2)).thenReturn(77L);
    when(rs.wasNull()).thenReturn(false);
    when(rs.getString(3)).thenReturn("Standard condition");
    when(rs.getString(4)).thenReturn("Y");
    when(rs.getString(5)).thenReturn("Applies to all scaling");
    when(rs.getString(6)).thenReturn("SCA");
    return rs;
  }

  /**
   * Routes each {@code jdbcTemplate.execute} to a different result based on the package named in the
   * prepared call string: the authorization package (base rows, cursor), the authorized-status
   * package (sites, cursor), and CRYSTAL_REPORTS PRC_GET_LETTER (letter-exists, an out BLOB). The
   * results are built up front so no stubbing happens inside the answer lambda.
   *
   * <p>When {@code letterRaisesNoData} is true, the PRC_GET_LETTER call is made to fail the way the
   * proc does for a letterless authorization: a NO_DATA_FOUND (ORA-01403) surfaced as Spring's
   * {@link UncategorizedSQLException}, exercising the existence-probe's error translation.
   */
  private void stubRoutedExecute(
      JdbcTemplate jdbcTemplate,
      AtomicReference<CallableStatement> searchStatement,
      boolean letterRaisesNoData) throws Exception {
    ResultSet baseRs = baseResultSet(LocalDate.of(2020, 1, 15), LocalDate.of(2099, 1, 15), null);
    ResultSet sitesRs = sitesResultSet();
    Blob letterBlob = mock(Blob.class);
    when(letterBlob.length()).thenReturn(42L);

    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          AtomicReference<String> sql = new AtomicReference<>();
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            sql.set(call.getArgument(0));
            return cs;
          });

          creator.createCallableStatement(con);

          String preparedSql = sql.get() == null ? "" : sql.get().toLowerCase();
          if (preparedSql.contains("scs_scaler_authorization_pkg")) {
            searchStatement.set(cs);
            when(cs.getObject(1)).thenReturn(baseRs);
          } else if (preparedSql.contains("scs_scaler_authorzd_sts_vw_pkg")) {
            when(cs.getObject(1)).thenReturn(sitesRs);
          } else {
            // CRYSTAL_REPORTS PRC_GET_LETTER: out BLOB at position 1 (letter-exists check).
            if (letterRaisesNoData) {
              throw new UncategorizedSQLException(
                  "PRC_GET_LETTER", sql.get(),
                  new SQLException("ORA-01403: no data found", "02000", 1403));
            }
            when(cs.getBlob(1)).thenReturn(letterBlob);
          }

          return callback.doInCallableStatement(cs);
        });
  }
}
