package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.authorization.ScaleSiteAuthorizationListEntry;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class ScaleSiteAuthorizationRepositoryTest {

  @Test
  void listScaleSiteAuthorizationsByScaleSite_bindsScaleSiteAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScaleSiteAuthorizationRepository repository = new ScaleSiteAuthorizationRepository(jdbcTemplate);

    AtomicReference<CallableStatement> searchStatement = new AtomicReference<>();
    stubRoutedExecute(jdbcTemplate, searchStatement);

    List<ScaleSiteAuthorizationListEntry> items = repository.listScaleSiteAuthorizationsByScaleSite("A12345");

    assertEquals(1, items.size());
    ScaleSiteAuthorizationListEntry item = items.get(0);
    assertEquals(7001L, item.scaleSiteAuthorizationId());
    assertEquals("A12345", item.scaleSiteIdNmbr());
    assertEquals(LocalDate.of(2025, 1, 15), item.authorizationEffectiveDate());
    assertEquals(LocalDate.of(2027, 1, 15), item.authorizationExpiryDate());
    assertEquals("Active", item.status());
    // letter-exists is re-derived from the letter table (a stored letter row is present).
    assertTrue(item.letterExists());

    // The view search binds scale_site_id_nmbr at parameter position 3 (cursor is position 1).
    assertNotNull(searchStatement.get());
    verify(searchStatement.get()).setString(3, "A12345");
  }

  /**
   * Routes each execute to a result set by the package in the call string: the view package (one
   * authorization row) and the letter package (a present letter row → letter-exists true).
   */
  private void stubRoutedExecute(
      JdbcTemplate jdbcTemplate,
      AtomicReference<CallableStatement> searchStatement) throws Exception {
    ResultSet viewRs = viewResultSet();
    ResultSet letterRs = letterResultSet();

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
          if (preparedSql.contains("scs_scale_site_auth_vw_pkg")) {
            searchStatement.set(cs);
            when(cs.getObject(1)).thenReturn(viewRs);
          } else {
            when(cs.getObject(1)).thenReturn(letterRs);
          }

          return callback.doInCallableStatement(cs);
        });
  }

  private ResultSet letterResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true);
    // A present row alone is not enough: letter-exists requires a stored blob (column 2), matching
    // the download. A non-null blob here represents a genuinely downloadable letter.
    when(rs.getBytes(2)).thenReturn(new byte[] {1, 2, 3});
    return rs;
  }

  private ResultSet viewResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getObject("scale_site_authorization_id")).thenReturn(7001L);
    when(rs.getLong("scale_site_authorization_id")).thenReturn(7001L);
    when(rs.getString("scale_site_id_nmbr")).thenReturn("A12345");
    when(rs.getDate("authorization_effective_date")).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 15)));
    when(rs.getDate("authorization_expiry_date")).thenReturn(Date.valueOf(LocalDate.of(2027, 1, 15)));
    when(rs.getString("expiry_notification_ind")).thenReturn("N");
    when(rs.getDate("cancellation_date")).thenReturn(null);
    when(rs.getString("cancellation_reason_txt")).thenReturn(null);
    when(rs.getString("entry_userid")).thenReturn("SYSTEM");
    when(rs.getString("update_userid")).thenReturn("SYSTEM");
    when(rs.getString("status")).thenReturn("Active");
    when(rs.getString("letter_exists")).thenReturn("true");
    return rs;
  }
}
