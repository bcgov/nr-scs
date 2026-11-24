package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.checkscale.LogTallyDetailSummary;
import ca.bc.gov.nrs.scs.backend.domain.checkscale.SummaryCheckScaleEntry;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import oracle.jdbc.OracleTypes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

// Sonar S5976 suggests collapsing the three null/empty/whitespace cases into a parameterized test,
// but junit-jupiter-params isn't on this project's test classpath — adding a dependency for a
// stylistic recommendation isn't worth the maintenance cost.
@SuppressWarnings("java:S5976")
@DisplayName("CheckScale Repository Unit Tests")
@ExtendWith(MockitoExtension.class)
class CheckScaleRepositoryTest {

  private static final String SPG_DELETE_SQL =
      "{ call scs_check_scale_spg_summry_pkg.delete_rec(?, ?, ?, ?) }";
  private static final String CHECK_SCALE_DELETE_SQL =
      "{ call scs_check_scale_pkg.delete_rec(?) }";
  // 24 IN params: 22 view criteria + 2 sort args (mirrors legacy ScsSummaryCheckScaleVwMapper).
  private static final String SUMMARY_SEARCH_SQL =
      "{ ? = call scs_summary_check_scal_vw_pkg.search_recs("
          + "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";

  @Mock JdbcTemplate jdbcTemplate;
  @Mock Connection connection;
  @Mock CallableStatement callableStatement;

  private CheckScaleRepository repository;

  @BeforeEach
  void setUp() {
    repository = new CheckScaleRepository(jdbcTemplate);
  }

  @Test
  void getLogTallyDetailSummary_returnsEmpty_forNullDocNo() {
    List<LogTallyDetailSummary> details = repository.getLogTallyDetailSummary(null, 1);
    assertNotNull(details);
    assertTrue(details.isEmpty());
  }

  @Test
  void getLogTallyDetailSummary_returnsEmpty_forEmptyDocNo() {
    List<LogTallyDetailSummary> details = repository.getLogTallyDetailSummary("", 1);
    assertNotNull(details);
    assertTrue(details.isEmpty());
  }

  @Test
  void getLogTallyDetailSummary_returnsEmpty_forWhitespaceDocNo() {
    List<LogTallyDetailSummary> details = repository.getLogTallyDetailSummary("   ", 1);
    assertNotNull(details);
    assertTrue(details.isEmpty());
  }

  @Test
  void deleteSpgSummaryRow_executesProcedureBindingCompositeKeyFromIndexOne() throws Exception {
    stubExecuteNoResult();

    repository.deleteSpgSummaryRow(200L, "FI", " ", "1");

    // delete_rec is a PROCEDURE (no return slot), so the composite-key params bind from index 1.
    verify(connection).prepareCall(SPG_DELETE_SQL);
    verify(callableStatement).setLong(1, 200L);
    verify(callableStatement).setString(2, "FI");
    verify(callableStatement).setString(3, " ");
    verify(callableStatement).setString(4, "1");
    verify(callableStatement).execute();
  }

  @Test
  void deleteCheckScale_executesProcedureBindingIdAtIndexOne() throws Exception {
    stubExecuteNoResult();

    repository.deleteCheckScale(200L);

    // delete_rec is a PROCEDURE (no return slot), so the id binds at index 1; SPG children cascade
    // in the stored procedure.
    verify(connection).prepareCall(CHECK_SCALE_DELETE_SQL);
    verify(callableStatement).setLong(1, 200L);
    verify(callableStatement).execute();
  }

  @Test
  void searchScalerSummaryCheckScales_bindsLicenceToAllFourCriteria_withLegacySort()
      throws Exception {
    stubExecuteNoResult(); // cursor (getObject(1)) defaults to null -> empty list

    List<SummaryCheckScaleEntry> rows = repository.searchScalerSummaryCheckScales("1234");

    assertNotNull(rows);
    assertTrue(rows.isEmpty());

    // search_recs is a FUNCTION ({ ? = call ... }): index 1 is the cursor, IN params start at 2.
    verify(connection).prepareCall(SUMMARY_SEARCH_SQL);
    verify(callableStatement).registerOutParameter(1, OracleTypes.CURSOR);

    // All four licence criteria (prim/sec check, prim/sec orig) bind the scaler licence so the
    // tab lists every summary check scale the scaler took part in (positions 6-9).
    verify(callableStatement).setString(6, "1234"); // prim_check_licence_no
    verify(callableStatement).setString(7, "1234"); // sec_check_licence_no
    verify(callableStatement).setString(8, "1234"); // prim_orig_licence_no
    verify(callableStatement).setString(9, "1234"); // sec_orig_licence_no

    // Non-filtering criteria bind typed NULLs in the legacy column order.
    verify(callableStatement).setNull(2, Types.VARCHAR); // cksc_type
    verify(callableStatement).setNull(4, Types.NUMERIC); // check_scale_id
    verify(callableStatement).setNull(10, Types.DATE); // orig_scale_date

    // Legacy default sort (mapObject(record, 10, 0)) binds as the final two params (24, 25).
    verify(callableStatement).setInt(24, 10);
    verify(callableStatement).setInt(25, 0);
  }

  @Test
  void searchScalerSummaryCheckScales_mapsCursorRowIntoSummaryCheckScaleEntry() throws Exception {
    ResultSet cursor = mock(ResultSet.class);
    when(cursor.next()).thenReturn(true, false);
    when(cursor.getObject("check_scale_id")).thenReturn(146943L);
    when(cursor.getLong("check_scale_id")).thenReturn(146943L);
    when(cursor.getString("cksc_type")).thenReturn("SFPSCS");
    when(cursor.getString("prim_check_licence_no")).thenReturn("1234");
    when(cursor.getString("prim_orig_licence_no")).thenReturn("5678");
    when(cursor.getDate("orig_scale_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 5, 1)));
    when(cursor.getDate("check_scale_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 5, 3)));
    when(cursor.getBigDecimal("piece_diff")).thenReturn(new BigDecimal("2"));
    when(cursor.getBigDecimal("volume_variance")).thenReturn(new BigDecimal("1.5"));
    when(cursor.getBigDecimal("value_variance")).thenReturn(new BigDecimal("0.8"));
    when(cursor.getString("replaced_ind")).thenReturn("N");
    when(cursor.getString("check_scale_type_code")).thenReturn("FIRST");
    when(cursor.getString("followed_good_practice_ind")).thenReturn("Y");
    when(cursor.getString("original_within_standard_ind")).thenReturn("Y");
    stubCursorCall(cursor);

    List<SummaryCheckScaleEntry> rows = repository.searchScalerSummaryCheckScales("1234");

    assertEquals(1, rows.size());
    SummaryCheckScaleEntry row = rows.get(0);
    assertEquals(146943L, row.checkScaleId());
    assertEquals("SFPSCS", row.ckscType()); // Summary Type — the column unique to this view
    assertEquals("1234", row.primCheckLicenceNo());
    assertEquals("5678", row.primOrigLicenceNo());
    assertEquals(LocalDate.of(2026, 5, 1), row.origScaleDate());
    assertEquals(LocalDate.of(2026, 5, 3), row.checkScaleDate());
    assertEquals(new BigDecimal("2"), row.pieceDiff());
    assertEquals(new BigDecimal("1.5"), row.volumeVariance());
    assertEquals(new BigDecimal("0.8"), row.valueVariance());
    assertEquals(YesNo.N, row.replacedInd());
    assertEquals("FIRST", row.checkScaleTypeCode());
    assertEquals(YesNo.Y, row.followedGoodPracticeInd());
    assertEquals(YesNo.Y, row.originalWithinStandardInd());
  }

  private void stubCursorCall(ResultSet cursor) throws Exception {
    when(connection.prepareCall(any(String.class))).thenReturn(callableStatement);
    when(callableStatement.getObject(1)).thenReturn(cursor);
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);
          creator.createCallableStatement(connection);
          return callback.doInCallableStatement(callableStatement);
        });
  }

  private void stubExecuteNoResult() throws Exception {
    when(connection.prepareCall(any(String.class))).thenReturn(callableStatement);
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);
          creator.createCallableStatement(connection);
          return callback.doInCallableStatement(callableStatement);
        });
  }

  private static final class MockitoHelper {
    private static <T> CallableStatementCallback<T> anyCallback() {
      return any();
    }
  }
}
