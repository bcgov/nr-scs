package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSoftwareRecord;
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

class ScaleSiteSoftwareRepositoryTest {

  @Test
  void listByScaleSite_bindsScaleSiteSortsAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScaleSiteSoftwareRepository repository = new ScaleSiteSoftwareRepository(jdbcTemplate);

    ResultSet rs = viewResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    AtomicReference<String> capturedSql = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured, capturedSql);

    List<ScaleSiteSoftwareRecord> items = repository.listByScaleSite("A12345");

    // Call string targets the verified package + search_recs with 9 IN placeholders.
    assertTrue(capturedSql.get().contains("scs_site_software_vw_pkg.search_recs"));
    assertEquals(9, capturedSql.get().chars().filter(c -> c == '?').count() - 1);

    assertEquals(1, items.size());
    ScaleSiteSoftwareRecord item = items.get(0);
    assertEquals("HarvestPro", item.scalingProgram());
    assertEquals("12", item.version());
    assertEquals("3", item.revision());
    assertEquals("Weight", item.returnType());
    assertEquals(42L, item.returnCount());
    assertEquals(LocalDate.of(2026, 6, 30), item.lastUsedDate());

    // search_recs binds scale_site_id_nmbr at parameter position 2 (cursor is position 1), the
    // unused filters as typed NULLs at 3-8, then the sort indices at positions 9 (primary) and
    // 10 (secondary). Pinning the whole sequence guards the off-by-one / wrong-filter class of bug.
    assertNotNull(captured.get());
    verify(captured.get()).setString(2, "A12345");
    verify(captured.get()).setNull(3, Types.VARCHAR);   // p_software_product
    verify(captured.get()).setNull(4, Types.VARCHAR);   // p_software_version
    verify(captured.get()).setNull(5, Types.VARCHAR);   // p_software_revision
    verify(captured.get()).setNull(6, Types.VARCHAR);   // p_return_type
    verify(captured.get()).setNull(7, Types.NUMERIC);   // p_return_count
    verify(captured.get()).setNull(8, Types.DATE);      // p_last_used_date
    verify(captured.get()).setInt(9, 7);
    verify(captured.get()).setInt(10, 3);
  }

  private void stubJdbcExecute(
      JdbcTemplate jdbcTemplate,
      ResultSet rs,
      AtomicReference<CallableStatement> captured,
      AtomicReference<String> capturedSql) {
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenAnswer(call -> {
            capturedSql.set(call.getArgument(0));
            return cs;
          });
          captured.set(cs);

          creator.createCallableStatement(con);
          when(cs.getObject(1)).thenReturn(rs);

          return callback.doInCallableStatement(cs);
        });
  }

  private ResultSet viewResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);
    when(rs.getString("software_product")).thenReturn("HarvestPro");
    when(rs.getString("software_version")).thenReturn("12");
    when(rs.getString("software_revision")).thenReturn("3");
    when(rs.getString("return_type")).thenReturn("Weight");
    when(rs.getObject("return_count")).thenReturn(42L);
    when(rs.getLong("return_count")).thenReturn(42L);
    when(rs.getDate("last_used_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 6, 30)));
    return rs;
  }
}
