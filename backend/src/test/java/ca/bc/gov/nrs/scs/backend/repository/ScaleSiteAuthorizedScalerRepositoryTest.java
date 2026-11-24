package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.AuthorizedScalerSummary;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteAuthorizationCoverage;
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

class ScaleSiteAuthorizedScalerRepositoryTest {

  @Test
  void listByScaleSite_bindsScaleSiteAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScaleSiteAuthorizedScalerRepository repository = new ScaleSiteAuthorizedScalerRepository(jdbcTemplate);

    ResultSet rs = viewResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    List<AuthorizedScalerSummary> items = repository.listByScaleSite("A12345");

    assertEquals(1, items.size());
    AuthorizedScalerSummary item = items.get(0);
    assertEquals(4001L, item.scalerAuthorizationId());
    assertEquals("1234", item.scalerLicenceNo());
    assertEquals("DOE, JANE", item.clientName());
    assertEquals("Active", item.status());
    assertEquals("Owner, Acting", item.scalerAppointmentTypes());
    assertEquals(LocalDate.of(2025, 1, 15), item.authorizationEffectiveDate());
    assertEquals(LocalDate.of(2027, 1, 15), item.authorizationExpiryDate());
    assertEquals("N", item.districtWideInd());

    // The view search binds scale_site_id_nmbr at parameter position 3 (cursor is position 1).
    assertNotNull(captured.get());
    verify(captured.get()).setString(3, "A12345");
  }

  /**
   * The access-decision query. Binds the site at position 9 (cursor 1, then the seven criteria the
   * package declares before {@code p_scale_site_id_nmbr}) — getting that wrong would filter on the
   * wrong column and silently deny every site, so the position is asserted rather than assumed.
   */
  @Test
  void listAuthorizationCoverageForSite_bindsScaleSiteAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScaleSiteAuthorizedScalerRepository repository = new ScaleSiteAuthorizedScalerRepository(jdbcTemplate);

    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, coverageResultSet(), captured);

    List<SiteAuthorizationCoverage> items = repository.listAuthorizationCoverageForSite("A12345");

    assertEquals(1, items.size());
    SiteAuthorizationCoverage item = items.get(0);
    assertEquals(149514L, item.scalerAuthorizationId());
    assertEquals("001A", item.scalerLicenceNo());
    assertEquals("A12345", item.scaleSiteIdNmbr());
    assertEquals("Y", item.districtWideInd());
    assertEquals(LocalDate.of(2025, 1, 15), item.authorizationEffectiveDate());
    assertEquals(LocalDate.of(2027, 1, 15), item.authorizationExpiryDate());
    assertEquals(LocalDate.of(2026, 6, 1), item.cancellationDate());

    assertNotNull(captured.get());
    verify(captured.get()).setString(9, "A12345");
  }

  private ResultSet coverageResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getObject("scaler_authorization_id")).thenReturn(149514L);
    when(rs.getLong("scaler_authorization_id")).thenReturn(149514L);
    when(rs.getString("scaler_licence_no")).thenReturn("001A");
    when(rs.getString("scale_site_id_nmbr")).thenReturn("A12345");
    when(rs.getString("district_wide_ind")).thenReturn("Y");
    when(rs.getDate("authorization_effective_date")).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 15)));
    when(rs.getDate("authorization_expiry_date")).thenReturn(Date.valueOf(LocalDate.of(2027, 1, 15)));
    when(rs.getDate("cancellation_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 6, 1)));
    return rs;
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
          when(cs.getObject(1)).thenReturn(rs);

          return callback.doInCallableStatement(cs);
        });
  }

  private ResultSet viewResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getObject("scaler_authorization_id")).thenReturn(4001L);
    when(rs.getLong("scaler_authorization_id")).thenReturn(4001L);
    when(rs.getString("scaler_licence_no")).thenReturn("1234");
    when(rs.getString("client_name")).thenReturn("DOE, JANE");
    when(rs.getString("status")).thenReturn("Active");
    when(rs.getString("scaler_appointment_types")).thenReturn("Owner, Acting");
    when(rs.getDate("authorization_effective_date")).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 15)));
    when(rs.getDate("authorization_expiry_date")).thenReturn(Date.valueOf(LocalDate.of(2027, 1, 15)));
    when(rs.getString("district_wide_ind")).thenReturn("N");
    return rs;
  }
}
