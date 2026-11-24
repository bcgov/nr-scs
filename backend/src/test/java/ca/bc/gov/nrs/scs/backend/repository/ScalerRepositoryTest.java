package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class ScalerRepositoryTest {

  private static final java.time.LocalDate ISSUED = LocalDate.of(2025, 1, 15);

  private ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand updateCommand() {
    return new ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand(
        "1234", "12345678", 1234L, ISSUED, LocalDate.of(2027, 12, 31),
        ca.bc.gov.nrs.scs.backend.domain.shared.YesNo.Y,
        false, null,
        java.util.List.of(ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType.SCS),
        null, null);
  }

  /** Captures every callable by fragment of its call string; unmatched calls get an empty cursor. */
  private java.util.Map<String, CallableStatement> stubAndCaptureBySql(JdbcTemplate jdbcTemplate,
      java.util.Map<String, ResultSet> cursorsBySqlFragment) {
    java.util.Map<String, CallableStatement> captured = new java.util.concurrent.ConcurrentHashMap<>();
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          AtomicReference<String> sqlRef = new AtomicReference<>();
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            sqlRef.set(call.getArgument(0));
            return cs;
          });

          creator.createCallableStatement(con);
          String sql = sqlRef.get();

          ResultSet cursor = null;
          for (var entry : cursorsBySqlFragment.entrySet()) {
            if (sql.contains(entry.getKey())) {
              cursor = entry.getValue();
              break;
            }
          }
          if (cursor == null) {
            cursor = emptyResultSet(); // create fully before stubbing cs — avoids UnfinishedStubbing
          }
          when(cs.getObject(1)).thenReturn(cursor);

          // Last capture per fragment wins; keyed by the full call string for precise lookups too.
          captured.put(sql, cs);
          return callback.doInCallableStatement(cs);
        });
    return captured;
  }

  private static CallableStatement byFragment(java.util.Map<String, CallableStatement> captured, String fragment) {
    return captured.entrySet().stream()
        .filter(e -> e.getKey().contains(fragment))
        .map(java.util.Map.Entry::getValue)
        .findFirst()
        .orElse(null);
  }

  /**
   * AC 11/12 pin: the general update binds the command fields but carries the PERSISTED licence
   * cancelled date forward (index 8) — never a request value — and reconciles licence types.
   */
  @Test
  void updateScaler_bindsCommandAndCarriesPersistedCancelledDateForward() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);
    var captured = stubAndCaptureBySql(jdbcTemplate, java.util.Map.of());

    repository.updateScaler(updateCommand(), LocalDate.of(2026, 6, 30));

    CallableStatement update = byFragment(captured, "scs_scaler_pkg.update_rec");
    assertNotNull(update, "update_rec was never executed");
    verify(update).setString(2, "1234");                                  // in_scaler_licence_no
    verify(update).setString(3, "12345678");                              // in_client_number
    verify(update).setLong(4, 1234L);                                     // in_org_unit_no
    verify(update).setDate(5, Date.valueOf(ISSUED));                      // in_issued_date
    verify(update).setDate(6, Date.valueOf(LocalDate.of(2027, 12, 31)));  // in_expiry_date
    verify(update).setString(7, "Y");                                     // in_oath_taken_ind
    verify(update).setDate(8, Date.valueOf(LocalDate.of(2026, 6, 30)));   // persisted cancel date
    verify(update).setString(9, "SYSTEM");                                // in_entry_userid
    verify(update).setString(10, "SYSTEM");                               // in_update_userid

    // Licence-type reconciliation ran: SCS absent (empty cursor) -> inserted.
    CallableStatement licInsert = byFragment(captured, "scs_scaler_assignd_lic_typ_pkg.insert_rec");
    assertNotNull(licInsert, "assigned-licence-type reconciliation did not insert SCS");
    verify(licInsert).setString(3, "SCS");
  }

  /** clientNumber criterion: padded without a wildcard, raw with one (scs_queries_scalars_vw_pkg does LIKE). */
  @Test
  void searchScalers_padsClientNumberUnlessWildcard() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);
    var captured = stubAndCaptureBySql(jdbcTemplate, java.util.Map.of());

    repository.searchScalers(null, "21855", null, null, null, null, null, null, 1, 0);
    CallableStatement search = byFragment(captured, "scs_queries_scalars_vw_pkg.search_recs");
    assertNotNull(search);
    verify(search).setString(3, "00021855");

    captured.clear();
    repository.searchScalers(null, "00021%", null, null, null, null, null, null, 1, 0);
    CallableStatement wildcardSearch = byFragment(captured, "scs_queries_scalars_vw_pkg.search_recs");
    assertNotNull(wildcardSearch);
    verify(wildcardSearch).setString(3, "00021%");
  }

  /**
   * {@code p_scalar_training_type} (index 7) is a VARCHAR2, not a number — legacy
   * {@code QueriesScalarsVwMapper} binds it with {@code java.lang.String.class}, and the sibling
   * {@code ScalerRiskAssessmentRepository} nulls it as a string. Binding it as a NUMBER made every
   * Exam / Upgrade selection on the scalers query page fail with a 500. Training type ids look
   * numeric ("1", "2"), which is exactly why the wrong binding is easy to reach for — hence the
   * explicit never()-setLong assertion on a numeric-looking value.
   */
  @Test
  void searchScalers_bindsTrainingTypeAsString() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);
    var captured = stubAndCaptureBySql(jdbcTemplate, java.util.Map.of());

    repository.searchScalers(null, null, null, null, null, "2", null, null, 1, 0);

    CallableStatement search = byFragment(captured, "scs_queries_scalars_vw_pkg.search_recs");
    assertNotNull(search);
    verify(search).setString(7, "2");
    verify(search, never()).setLong(eq(7), anyLong());
  }

  /** delete_rec is a procedure — the single IN param binds at index 1 (verified scs_scaler_pkg.pks:67). */
  @Test
  void deleteScaler_bindsLicenceNoToDeleteRec() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);
    var captured = stubAndCaptureBySql(jdbcTemplate, java.util.Map.of());

    repository.deleteScaler("1234");

    CallableStatement delete = byFragment(captured, "scs_scaler_pkg.delete_rec");
    assertNotNull(delete, "scaler delete_rec was never executed");
    verify(delete).setString(1, "1234"); // in_scaler_licence_no
  }

  /** The domain read: core row + licence types + appointment compose the aggregate (appointment wins over exam). */
  @Test
  void getScaler_mapsDomainAggregate() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);

    ResultSet coreRs = readBackResultSet(); // reuses the populated core row (client 00149081 etc.)
    when(coreRs.getString("scaler_licence_no")).thenReturn("1234");
    when(coreRs.getDate("licence_cancelled_date")).thenReturn(null);

    ResultSet licTypeRs = mock(ResultSet.class);
    when(licTypeRs.next()).thenReturn(true, true, false);
    when(licTypeRs.getString("scaler_licence_type_code")).thenReturn("SCS", "WA");

    ResultSet apptRs = mock(ResultSet.class);
    when(apptRs.next()).thenReturn(true, false);
    when(apptRs.getObject("scaler_licence_attribute_id")).thenReturn(5001L);
    when(apptRs.getLong("scaler_licence_attribute_id")).thenReturn(5001L);
    when(apptRs.getString("scaler_licence_no")).thenReturn("1234");
    when(apptRs.getString("scaler_appointment_type")).thenReturn("FORS");
    when(apptRs.getString("scale_grading_system_code")).thenReturn("BC");
    when(apptRs.getString("province_wide_ind")).thenReturn("Y");

    stubAndCaptureBySql(jdbcTemplate, java.util.Map.of(
        "scs_scaler_pkg.select_rec", coreRs,
        "scs_scaler_assignd_lic_typ_pkg.search_recs", licTypeRs,
        "scs_scaler_licence_attribt_pkg.search_recs", apptRs));

    var scaler = repository.getScaler("1234");

    assertNotNull(scaler);
    org.junit.jupiter.api.Assertions.assertEquals("1234", scaler.scalerLicenceNo());
    org.junit.jupiter.api.Assertions.assertEquals("00149081", scaler.clientNumber()); // padded passthrough
    org.junit.jupiter.api.Assertions.assertEquals(
        ca.bc.gov.nrs.scs.backend.domain.shared.YesNo.Y, scaler.oathTakenInd());
    org.junit.jupiter.api.Assertions.assertEquals(
        java.util.List.of(
            ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType.SCS,
            ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType.WA),
        scaler.licenceTypes());
    assertNotNull(scaler.appointment());
    org.junit.jupiter.api.Assertions.assertEquals("FORS", scaler.appointment().scalerAppointmentType());
    org.junit.jupiter.api.Assertions.assertNull(scaler.exam(), "appointment wins — exam must not load");
    assertTrue(scaler.hasAppointmentOrExam());
  }

  /**
   * Freezes the {@code update_rec} bind order for the cancel-scaler write. The binder auto-increments
   * its index, so removing or reordering one line silently shifts every bind after it — this test
   * pins the verified call string and the index 2&ndash;10 binds (licence / client / org / issued /
   * expiry / oath / cancelled / user / user) read back verbatim from {@code select_rec}.
   */
  @Test
  void updateLicenceCancelledDate_readsBackRowAndBindsUpdateRecInOrder() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);

    AtomicReference<CallableStatement> capturedUpdate = new AtomicReference<>();
    AtomicReference<String> capturedUpdateSql = new AtomicReference<>();
    ResultSet readBackRs = readBackResultSet();
    ResultSet emptyRs = emptyResultSet();
    stubJdbcExecute(jdbcTemplate, readBackRs, emptyRs, capturedUpdate, capturedUpdateSql);

    repository.updateLicenceCancelledDate("1234", LocalDate.of(2026, 6, 30));

    // The read-back pulls exactly the columns that get rewritten, so no other value can drift.
    verify(readBackRs).getString("client_number");
    verify(readBackRs).getObject("org_unit_no");
    verify(readBackRs).getDate("issued_date");
    verify(readBackRs).getDate("expiry_date");
    verify(readBackRs).getString("oath_taken_ind");

    // Call string targets the verified package + update_rec with 9 IN placeholders (+1 return slot).
    assertNotNull(capturedUpdateSql.get(), "update_rec was never executed");
    assertTrue(capturedUpdateSql.get().contains("scs_scaler_pkg.update_rec"));
    assertTrue(9 == capturedUpdateSql.get().chars().filter(c -> c == '?').count() - 1);

    // Index 1 is the OUT cursor; IN params start at 2 and must bind in this exact order.
    CallableStatement update = capturedUpdate.get();
    verify(update).setString(2, "1234");           // in_scaler_licence_no
    verify(update).setString(3, "00149081");        // in_client_number (raw, unpadded)
    verify(update).setLong(4, 15L);                 // in_org_unit_no
    verify(update).setDate(5, Date.valueOf(LocalDate.of(2020, 1, 1)));   // in_issued_date
    verify(update).setDate(6, Date.valueOf(LocalDate.of(2027, 12, 31))); // in_expiry_date
    verify(update).setString(7, "Y");               // in_oath_taken_ind
    verify(update).setDate(8, Date.valueOf(LocalDate.of(2026, 6, 30)));  // in_licence_cancelled_date
    verify(update).setString(9, "SYSTEM");          // in_entry_userid
    verify(update).setString(10, "SYSTEM");         // in_update_userid
  }

  // Dispatches each callable execute by call string: the first select_rec returns the populated
  // read-back row; the update_rec statement is captured for bind verification; every other call
  // (the reload's select_rec + search_recs) returns an empty cursor so getScaler short-circuits.
  private void stubJdbcExecute(
      JdbcTemplate jdbcTemplate,
      ResultSet readBackRs,
      ResultSet emptyRs,
      AtomicReference<CallableStatement> capturedUpdate,
      AtomicReference<String> capturedUpdateSql) {
    AtomicInteger selectRecCount = new AtomicInteger();
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          AtomicReference<String> sqlRef = new AtomicReference<>();
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            sqlRef.set(call.getArgument(0));
            return cs;
          });

          creator.createCallableStatement(con);
          String sql = sqlRef.get();

          if (sql.contains("select_rec")) {
            when(cs.getObject(1))
                .thenReturn(selectRecCount.getAndIncrement() == 0 ? readBackRs : emptyRs);
          } else if (sql.contains("update_rec")) {
            capturedUpdate.set(cs);
            capturedUpdateSql.set(sql);
            // update_rec's cursor is unused (mapper returns null); leave getObject(1) null.
          } else {
            when(cs.getObject(1)).thenReturn(emptyRs);
          }

          return callback.doInCallableStatement(cs);
        });
  }

  private ResultSet readBackResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getString("client_number")).thenReturn("00149081");
    when(rs.getObject("org_unit_no")).thenReturn(15L);
    when(rs.getLong("org_unit_no")).thenReturn(15L);
    when(rs.getDate("issued_date")).thenReturn(Date.valueOf(LocalDate.of(2020, 1, 1)));
    when(rs.getDate("expiry_date")).thenReturn(Date.valueOf(LocalDate.of(2027, 12, 31)));
    when(rs.getString("oath_taken_ind")).thenReturn("Y");
    return rs;
  }

  private ResultSet emptyResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(false);
    return rs;
  }
}
