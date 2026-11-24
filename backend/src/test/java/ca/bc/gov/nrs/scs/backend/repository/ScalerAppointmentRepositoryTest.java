package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
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

class ScalerAppointmentRepositoryTest {

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void findById_mapsRowFields() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAppointmentRepository repository = new ScalerAppointmentRepository(jdbcTemplate);

    ResultSet rs = appointmentResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    ScalerAppointmentRecord record = repository.findById(5001L);

    assertNotNull(record);
    assertEquals(5001L, record.scalerLicenceAttributeId());
    assertEquals("1234", record.scalerLicenceNo());
    assertEquals("O", record.scalerAppointmentType());
    assertEquals("BC", record.scaleGradingSystemCode());
    assertEquals(10L, record.orgUnitNo());
    assertEquals(YesNo.Y, record.provinceWideInd());
    assertEquals(LocalDate.of(2025, 1, 15), record.issuedDate());
    assertEquals(LocalDate.of(2026, 1, 15), record.expiryDate());

    verify(captured.get()).setLong(2, 5001L);
  }

  @Test
  void findByScalerLicenceNo_returnsList() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAppointmentRepository repository = new ScalerAppointmentRepository(jdbcTemplate);

    ResultSet rs = appointmentResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    List<ScalerAppointmentRecord> out = repository.findByScalerLicenceNo("1234");

    assertEquals(1, out.size());
    assertEquals("1234", out.get(0).scalerLicenceNo());
    verify(captured.get()).setString(3, "1234");
  }

  @Test
  void insert_defaultsUserIdWhenNoAuthentication() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAppointmentRepository repository = new ScalerAppointmentRepository(jdbcTemplate);

    ResultSet rs = appointmentResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    ScalerAppointmentCommand command = new ScalerAppointmentCommand(
        "O", "BC", 10L, YesNo.Y, LocalDate.of(2025, 1, 15), LocalDate.of(2026, 1, 15), null, null);

    ScalerAppointmentRecord record = repository.insert("1234", command);

    assertNotNull(record);
    verify(captured.get()).setString(3, "1234");
    verify(captured.get()).setString(4, "O");
    verify(captured.get()).setString(5, "BC");
    verify(captured.get()).setString(7, "Y");
    verify(captured.get()).setString(12, "SYSTEM");
    verify(captured.get()).setString(13, "SYSTEM");
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

  private ResultSet appointmentResultSet() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.next()).thenReturn(true, false);

    when(rs.getObject("scaler_licence_attribute_id")).thenReturn(5001L);
    when(rs.getLong("scaler_licence_attribute_id")).thenReturn(5001L);
    when(rs.getString("scaler_licence_no")).thenReturn("1234");
    when(rs.getString("scaler_appointment_type")).thenReturn("O");
    when(rs.getString("scale_grading_system_code")).thenReturn("BC");
    when(rs.getObject("org_unit_no")).thenReturn(10L);
    when(rs.getLong("org_unit_no")).thenReturn(10L);
    when(rs.getString("province_wide_ind")).thenReturn("Y");
    when(rs.getDate("issued_date")).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 15)));
    when(rs.getDate("expiry_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 1, 15)));
    when(rs.getDate("cancellation_date")).thenReturn(null);
    when(rs.getString("cancellation_reason_txt")).thenReturn(null);
    when(rs.getTimestamp("entry_timestamp")).thenReturn(null);
    when(rs.getString("entry_userid")).thenReturn("SYSTEM");
    when(rs.getTimestamp("update_timestamp")).thenReturn(null);
    when(rs.getString("update_userid")).thenReturn("SYSTEM");
    when(rs.getObject("revision_count")).thenReturn(1L);
    when(rs.getLong("revision_count")).thenReturn(1L);

    return rs;
  }
}
