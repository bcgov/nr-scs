package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;

class ScalerExamRepositoryTest {

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void findByScalerLicenceNo_bindsLicenceAndReturnsList() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerExamRepository repository = new ScalerExamRepository(jdbcTemplate);

    ResultSet rs = examResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    List<ScalerExamRecord> out = repository.findByScalerLicenceNo("1234");

    assertEquals(1, out.size());
    assertEquals("1234", out.get(0).scalerLicenceNo());
    assertEquals("SC", out.get(0).scalerTrainingClassCode());
    assertEquals("SCEX", out.get(0).scalerTrainingTypeId());
    assertEquals(LocalDate.of(2025, 1, 10), out.get(0).completionDate());
    // search_recs binds the licence at index 2 (cursor is index 1)
    verify(captured.get()).setString(2, "1234");
  }

  @Test
  void findById_bindsCompositeKeyAndMapsRow() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerExamRepository repository = new ScalerExamRepository(jdbcTemplate);

    ResultSet rs = examResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    ScalerExamRecord record = repository.findById("1234", "SC", "SCEX");

    assertNotNull(record);
    assertEquals("1234", record.scalerLicenceNo());
    verify(captured.get()).setString(2, "1234");
    verify(captured.get()).setString(3, "SC");
    verify(captured.get()).setString(4, "SCEX");
  }

  @Test
  void insert_bindsParametersAndDefaultsUserId() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerExamRepository repository = new ScalerExamRepository(jdbcTemplate);

    ResultSet rs = examResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    ScalerExamRecord record = repository.insert("1234", "SC", "SCEX", LocalDate.of(2025, 1, 10));

    assertNotNull(record);
    verify(captured.get()).setString(2, "1234");
    verify(captured.get()).setString(3, "SC");
    verify(captured.get()).setString(4, "SCEX");
    verify(captured.get()).setDate(5, Date.valueOf(LocalDate.of(2025, 1, 10)));
    verify(captured.get()).setString(6, "SYSTEM");
    verify(captured.get()).setString(7, "SYSTEM");
  }

  @Test
  void update_bindsParameters() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerExamRepository repository = new ScalerExamRepository(jdbcTemplate);

    ResultSet rs = examResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    repository.update("1234", "SC", "SCEX", LocalDate.of(2025, 2, 20));

    verify(captured.get()).setString(2, "1234");
    verify(captured.get()).setString(3, "SC");
    verify(captured.get()).setString(4, "SCEX");
    verify(captured.get()).setDate(5, Date.valueOf(LocalDate.of(2025, 2, 20)));
  }

  @Test
  void delete_bindsCompositeKeyFromIndexOne() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerExamRepository repository = new ScalerExamRepository(jdbcTemplate);

    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, null, captured);

    repository.delete("1234", "SC", "SCEX");

    // delete_rec is a procedure (no cursor) — bindings start at index 1
    verify(captured.get()).setString(1, "1234");
    verify(captured.get()).setString(2, "SC");
    verify(captured.get()).setString(3, "SCEX");
  }

  private void stubJdbcExecute(
      JdbcTemplate jdbcTemplate,
      ResultSet rs,
      AtomicReference<CallableStatement> captured) {
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(con.prepareCall(anyString())).thenReturn(cs);
          captured.set(cs);

          creator.createCallableStatement(con);
          if (rs != null) {
            when(cs.getObject(1)).thenReturn(rs);
          }

          return callback.doInCallableStatement(cs);
        });
  }

  private ResultSet examResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getString("scaler_licence_no")).thenReturn("1234");
    when(rs.getString("scaler_training_class_code")).thenReturn("SC");
    when(rs.getString("scaler_training_type_id")).thenReturn("SCEX");
    when(rs.getDate("completion_date")).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 10)));
    when(rs.getTimestamp("entry_timestamp")).thenReturn(null);
    when(rs.getString("entry_userid")).thenReturn("SYSTEM");
    when(rs.getTimestamp("update_timestamp")).thenReturn(null);
    when(rs.getString("update_userid")).thenReturn("SYSTEM");
    when(rs.getObject("revision_count")).thenReturn(1L);
    when(rs.getLong("revision_count")).thenReturn(1L);

    return rs;
  }
}
