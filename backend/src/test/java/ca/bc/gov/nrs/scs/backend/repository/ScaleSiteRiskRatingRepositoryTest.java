package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskRatingSummary;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class ScaleSiteRiskRatingRepositoryTest {

  @Test
  void getScaleSiteRiskRatings_bindsScaleSiteAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScaleSiteRiskRatingRepository repository = new ScaleSiteRiskRatingRepository(jdbcTemplate);

    ResultSet rs = summaryResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    AtomicReference<String> capturedSql = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured, capturedSql);

    List<ScaleSiteRiskRatingSummary> out = repository.getScaleSiteRiskRatings("A12345");

    // Call string targets the generic summary package with 22 IN placeholders.
    assertTrue(capturedSql.get().contains("scs_risk_summary_vw_pkg.search_recs"));
    assertEquals(22, capturedSql.get().chars().filter(c -> c == '?').count() - 1);

    // p_scale_site_id_nmbr (index 4) is the filter; the scale-site-assessment indicator (index 19)
    // pins the view to scale-site rows; sorts land last (assessment id primary, no secondary).
    verify(captured.get()).setString(4, "A12345");
    verify(captured.get()).setString(19, "Y");
    verify(captured.get()).setInt(22, 2);
    verify(captured.get()).setInt(23, 0);

    assertEquals(1, out.size());
    ScaleSiteRiskRatingSummary row = out.get(0);
    assertEquals(12345L, row.getRiskQuestionnaireId().get());
    assertEquals(
        OffsetDateTime.of(2025, 1, 10, 10, 30, 0, 0, ZoneOffset.UTC), row.getEntryTimestamp().get());
    assertEquals(new BigDecimal("24"), row.getRiskRating().get());
    assertEquals("H", row.getRiskTypeCode().get());
    assertEquals("High", row.getCodeDescription().get());
    assertEquals(20, row.getRangeLowValue().get());
    assertEquals(30, row.getRangeHighValue().get());
    assertEquals("2 checks every 12 months", row.getRatingDescription().get());
    assertEquals(3L, row.getVersionNo().get());
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
          if (rs != null) {
            when(cs.getObject(1)).thenReturn(rs);
          }

          return callback.doInCallableStatement(cs);
        });
  }

  private ResultSet summaryResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getObject("risk_questionnaire_id")).thenReturn(12345L);
    when(rs.getLong("risk_questionnaire_id")).thenReturn(12345L);
    // Built from local wall-clock fields (as JDBC returns a timezone-naive Oracle DATE), so the
    // assertion is deterministic regardless of the JVM's default timezone.
    when(rs.getTimestamp("entry_timestamp"))
        .thenReturn(Timestamp.valueOf("2025-01-10 10:30:00"));
    when(rs.getBigDecimal("risk_rating")).thenReturn(new BigDecimal("24"));
    when(rs.getString("risk_type_code")).thenReturn("H");
    when(rs.getString("code_description")).thenReturn("High");
    when(rs.getObject("range_low_value")).thenReturn(20);
    when(rs.getInt("range_low_value")).thenReturn(20);
    when(rs.getObject("range_high_value")).thenReturn(30);
    when(rs.getInt("range_high_value")).thenReturn(30);
    when(rs.getString("rating_description")).thenReturn("2 checks every 12 months");
    when(rs.getObject("version_no")).thenReturn(3L);
    when(rs.getLong("version_no")).thenReturn(3L);

    return rs;
  }
}
