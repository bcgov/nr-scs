package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.workbench.ScalerAuthorizationWorkbenchSearchCriteria;
import ca.bc.gov.nrs.scs.backend.model.ScalerAuthorizationWorkbenchResult;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class WorkbenchRepositoryTest {

  /**
   * Regression for the workbench renew bug: renew must call the renew package
   * {@code scs_scale_workbench_pkg} — where {@code renew_scaler_auth} actually lives — and not the
   * workbench-grid view package {@code scs_scaler_auth_wb_vw_pkg} it was wrongly pointed at. Also
   * pins the call shape: the function's single IN parameter (the source authorization id) binds at
   * position 2, since position 1 is the registered return value.
   */
  @Test
  void renewScalerAuthorization_callsScaleWorkbenchPackage() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    WorkbenchRepository repository = new WorkbenchRepository(jdbcTemplate);

    AtomicReference<String> preparedSql = new AtomicReference<>();
    AtomicReference<CallableStatement> renewStatement = new AtomicReference<>();
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            preparedSql.set(call.getArgument(0));
            return cs;
          });
          when(cs.getObject(1)).thenReturn(7002L);

          creator.createCallableStatement(con);
          renewStatement.set(cs);
          return callback.doInCallableStatement(cs);
        });

    Long newId = repository.renewScalerAuthorization(7001L);

    assertEquals(7002L, newId);
    assertNotNull(preparedSql.get());
    String sql = preparedSql.get().toLowerCase();
    assertTrue(
        sql.contains("scs_scale_workbench_pkg.renew_scaler_auth"),
        "renew must call scs_scale_workbench_pkg.renew_scaler_auth, but was: " + preparedSql.get());
    assertFalse(
        sql.contains("scs_scaler_auth_wb_vw_pkg"),
        "renew must not call the workbench-grid view package: " + preparedSql.get());
    // Source authorization id binds at position 2 (position 1 is the function return).
    verify(renewStatement.get()).setLong(2, 7001L);
  }

  /** Each renew kind targets its own {@code renew_*} function in the same workbench package. */
  @Test
  void renewFunctions_targetTheirNamedWorkbenchFunction() throws Exception {
    assertRenewCallsFunction("renew_scale_site_auth", WorkbenchRepository::renewScaleSiteAuthorization);
    assertRenewCallsFunction("renew_hauling_mark_auth", WorkbenchRepository::renewMarkSiteDesignation);
  }

  /**
   * The scaler workbench grid reads from the view package (not the renew package) and maps its
   * cursor positionally, so both the call string and the column order are worth pinning: a
   * re-ordered SELECT in the view would silently swap licence number and scaler name.
   */
  @Test
  void searchScalerAuthorizations_bindsEveryCriterionAndMapsTheRowPositionally() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    WorkbenchRepository repository = new WorkbenchRepository(jdbcTemplate);

    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject(1)).thenReturn(7001L);
    when(rs.getDate(2)).thenReturn(Date.valueOf(LocalDate.of(2026, 1, 1)));
    when(rs.getDate(3)).thenReturn(Date.valueOf(LocalDate.of(2026, 12, 31)));
    when(rs.getString(4)).thenReturn("8437");
    when(rs.getObject(5)).thenReturn(2L);
    when(rs.getObject(6)).thenReturn(1234L);
    when(rs.getString(7)).thenReturn("Tremblay, Alex");

    AtomicReference<String> preparedSql = new AtomicReference<>();
    AtomicReference<CallableStatement> statement = new AtomicReference<>();
    stubCursorExecute(jdbcTemplate, preparedSql, statement, rs);

    List<ScalerAuthorizationWorkbenchResult> results = repository.searchScalerAuthorizations(
        new ScalerAuthorizationWorkbenchSearchCriteria(
            7001L,
            LocalDate.of(2026, 1, 1),
            LocalDate.of(2026, 12, 31),
            "8437",
            2L,
            1234L,
            "Tremblay",
            1,
            2));

    assertEquals("{ ? = call scs_scaler_auth_wb_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?) }",
        preparedSql.get());

    // Criteria bind in declaration order behind the cursor at position 1.
    CallableStatement cs = statement.get();
    verify(cs).setLong(2, 7001L);
    verify(cs).setDate(3, Date.valueOf(LocalDate.of(2026, 1, 1)));
    verify(cs).setDate(4, Date.valueOf(LocalDate.of(2026, 12, 31)));
    verify(cs).setString(5, "8437");
    verify(cs).setLong(6, 2L);
    verify(cs).setLong(7, 1234L);
    verify(cs).setString(8, "Tremblay");
    verify(cs).setInt(9, 1);
    verify(cs).setInt(10, 2);

    assertEquals(1, results.size());
    ScalerAuthorizationWorkbenchResult row = results.get(0);
    assertEquals(7001L, row.getScalerAuthorizationId().get());
    assertEquals(LocalDate.of(2026, 1, 1), row.getEffectiveDate().get());
    assertEquals(LocalDate.of(2026, 12, 31), row.getExpiryDate().get());
    assertEquals("8437", row.getScalerLicenceNumber().get());
    assertEquals(2L, row.getRegionId().get());
    assertEquals(1234L, row.getDistrictId().get());
    assertEquals("Tremblay, Alex", row.getScalerName().get());
  }

  /** An unfiltered grid load must bind typed NULLs rather than skipping the parameters. */
  @Test
  void searchScalerAuthorizations_bindsTypedNullsForAbsentCriteria() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    WorkbenchRepository repository = new WorkbenchRepository(jdbcTemplate);

    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(false);

    AtomicReference<String> preparedSql = new AtomicReference<>();
    AtomicReference<CallableStatement> statement = new AtomicReference<>();
    stubCursorExecute(jdbcTemplate, preparedSql, statement, rs);

    List<ScalerAuthorizationWorkbenchResult> results = repository.searchScalerAuthorizations(
        new ScalerAuthorizationWorkbenchSearchCriteria(null, null, null, null, null, null, null, null, null));

    assertTrue(results.isEmpty());

    CallableStatement cs = statement.get();
    verify(cs).setNull(2, Types.NUMERIC);
    verify(cs).setNull(3, Types.DATE);
    verify(cs).setNull(4, Types.DATE);
    verify(cs).setNull(5, Types.VARCHAR);
    verify(cs).setNull(6, Types.NUMERIC);
    verify(cs).setNull(7, Types.NUMERIC);
    verify(cs).setNull(8, Types.VARCHAR);
    verify(cs).setNull(9, Types.NUMERIC);
    verify(cs).setNull(10, Types.NUMERIC);
  }

  /** Stubs the cursor-call execute overload, serving {@code rs} as the out cursor at position 1. */
  private void stubCursorExecute(
      JdbcTemplate jdbcTemplate,
      AtomicReference<String> preparedSql,
      AtomicReference<CallableStatement> statement,
      ResultSet rs) {
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            preparedSql.set(call.getArgument(0));
            return cs;
          });
          when(cs.getObject(1)).thenReturn(rs);

          creator.createCallableStatement(con);
          statement.set(cs);
          return callback.doInCallableStatement(cs);
        });
  }

  private interface RenewCall {
    Long renew(WorkbenchRepository repository, Long authorizationId);
  }

  private void assertRenewCallsFunction(String expectedFunction, RenewCall renewCall) throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    WorkbenchRepository repository = new WorkbenchRepository(jdbcTemplate);

    AtomicReference<String> preparedSql = new AtomicReference<>();
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);
          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            preparedSql.set(call.getArgument(0));
            return cs;
          });
          when(cs.getObject(1)).thenReturn(2L);
          creator.createCallableStatement(con);
          return callback.doInCallableStatement(cs);
        });

    renewCall.renew(repository, 1L);

    assertNotNull(preparedSql.get());
    String sql = preparedSql.get().toLowerCase();
    assertTrue(
        sql.contains("scs_scale_workbench_pkg." + expectedFunction),
        "renew must call scs_scale_workbench_pkg." + expectedFunction + ", but was: " + preparedSql.get());
  }
}
