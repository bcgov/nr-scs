package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerAddressRecord;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class ScalerAddressRepositoryTest {

  @Test
  void getScalerAddress_bindsLicenceAndMapsRow() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);

    ResultSet rs = addressResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    ScalerAddressRecord record = repository.getScalerAddress("1234");

    assertNotNull(record);
    assertEquals("1234", record.scalerLicenceNo());
    assertEquals("Coastal Logging Ltd.", record.company());
    assertEquals("Smith", record.lastName());
    assertEquals("Jordan", record.firstName());
    assertEquals("2505551234", record.businessPhone());
    assertEquals("2505555678", record.homePhone());
    assertEquals("2505559012", record.cellPhone());
    assertEquals("2505553456", record.faxNumber());
    assertEquals("jordan.smith@example.com", record.emailAddress());
    assertEquals("123 Forest Road", record.address1());
    assertEquals("Suite 200", record.address2());
    assertNull(record.address3());
    assertEquals("Victoria", record.city());
    assertEquals("BC", record.province());
    assertEquals("Canada", record.country());
    assertEquals("V8V 1A1", record.postalCode());

    // search_recs is a function: cursor is index 1, licence binds at index 2.
    verify(captured.get()).setString(2, "1234");
  }

  @Test
  void getScalerAddress_returnsNullWhenNoRow() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerRepository repository = new ScalerRepository(jdbcTemplate);

    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(false);
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    assertNull(repository.getScalerAddress("9999"));
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

  private ResultSet addressResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getString("scaler_licence_no")).thenReturn("1234");
    when(rs.getString("company")).thenReturn("Coastal Logging Ltd.");
    when(rs.getString("last_name")).thenReturn("Smith");
    when(rs.getString("first_name")).thenReturn("Jordan");
    when(rs.getString("business_phone")).thenReturn("2505551234");
    when(rs.getString("home_phone")).thenReturn("2505555678");
    when(rs.getString("cell_phone")).thenReturn("2505559012");
    when(rs.getString("fax_number")).thenReturn("2505553456");
    when(rs.getString("email_address")).thenReturn("jordan.smith@example.com");
    when(rs.getString("address1")).thenReturn("123 Forest Road");
    when(rs.getString("address2")).thenReturn("Suite 200");
    when(rs.getString("address3")).thenReturn(null);
    when(rs.getString("city")).thenReturn("Victoria");
    when(rs.getString("province")).thenReturn("BC");
    when(rs.getString("country")).thenReturn("Canada");
    when(rs.getString("postal_code")).thenReturn("V8V 1A1");

    return rs;
  }
}
