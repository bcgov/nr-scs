package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.Client;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClientRepositoryTest {

  @Mock
  JdbcTemplate jdbcTemplate;

  private ClientRepository repo;

  @BeforeEach
  void setUp() {
    repo = new ClientRepository(jdbcTemplate);
  }

  @Test
  void searchClients_mapsResultSetToClientList() {
    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);

          when(rs.next()).thenReturn(true, false);
          when(rs.getString("client")).thenReturn("client1");
          when(rs.getString("company_name")).thenReturn("comp1");
          when(rs.getString("last_name")).thenReturn("ln");
          when(rs.getString("first_name")).thenReturn("fn");
          when(rs.getString("city")).thenReturn("city");
          when(rs.getString("business_phone")).thenReturn("111");
          when(rs.getString("cell_phone")).thenReturn("222");
          when(rs.getString("email_address")).thenReturn("e@e");
          when(rs.getString("client_number")).thenReturn("num");
          when(rs.getString("client_locn_code")).thenReturn("loc");

          // Let the CallableStatementCreator populate the cs via the mock connection
          csc.createCallableStatement(conn);

          // Execute the repository's CallableStatementCallback with our mocked cs
          return callback.doInCallableStatement(cs);
        });

    List<Client> results = repo.searchClients(
        "c",
        "co",
        "ln",
        "fn",
        "city",
        "b",
        "cell",
        "e",
        "num",
        "loc",
        1,
        2);

    assertNotNull(results);
    assertEquals(1, results.size());
    Client c = results.iterator().next();
    assertTrue(c.getClient().isPresent());
    assertEquals("client1", c.getClient().get());
    assertTrue(c.getCompanyName().isPresent());
    assertEquals("comp1", c.getCompanyName().get());
  }

  @Test
  void searchClients_returnsEmptyListWhenNoRows() {
    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);

          when(rs.next()).thenReturn(false);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    List<Client> results = repo.searchClients(null, null, null, null, null, null, null, null, null, null, null, null);
    assertNotNull(results);
    assertTrue(results.isEmpty());
  }

  @Test
  void checkClientExists_returnsTrueWhenSearchReturnsRow() throws java.sql.SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(true);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    boolean exists = repo.checkClientExists("12345678", "00");

    assertTrue(exists);
    verify(cs).setNull(2, Types.VARCHAR);
    verify(cs).setNull(9, Types.VARCHAR);
    verify(cs).setString(10, "12345678");
    verify(cs).setString(11, "00");
    verify(cs).setInt(12, 1);
    verify(cs).setInt(13, 1);
  }

  /**
   * The combined client field stays raw (legacy ClientVwDto:79 never padded it; the package does
   * LIKE on it). The clientNumber criterion is zero-padded unless it carries a % wildcard, so
   * "7" finds "00000007" while explicit wildcards keep the documented partial-match contract.
   */
  @Test
  void searchClients_padsClientNumberCriteria() throws java.sql.SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(false);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    repo.searchClients("05", null, null, null, null, null, null, null, "7", "00", 1, 1);

    verify(cs).setString(2, "05");         // combined client field — never padded
    verify(cs).setString(10, "00000007");  // client-number criterion padded
    verify(cs).setString(11, "00");
  }

  @Test
  void searchClients_leavesWildcardClientNumberRaw() throws java.sql.SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(false);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    repo.searchClients(null, null, null, null, null, null, null, null, "00021%", "00", 1, 1);

    verify(cs).setString(10, "00021%");
  }

  @Test
  void checkClientExists_padsUnpaddedClientNumber() throws java.sql.SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(true);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    assertTrue(repo.checkClientExists("05", "00"));

    verify(cs).setString(10, "00000005");
  }

  @Test
  void checkClientExists_returnsFalseWhenSearchReturnsNoRows() {
    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(false);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    assertFalse(repo.checkClientExists("99999999", "01"));
  }

  @Test
  void findCompanyName_bindsPaddedClientNumberAndReturnsCompanyName() throws java.sql.SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(true);
          when(rs.getString("company_name")).thenReturn("ACME LTD");

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    String name = repo.findCompanyName("1074");

    assertEquals("ACME LTD", name);
    verify(cs).setString(10, "00001074"); // p_client_number padded, exact (no wildcard)
    verify(cs).setNull(2, Types.VARCHAR);
    verify(cs).setNull(11, Types.VARCHAR); // p_client_locn_code not filtered
  }

  @Test
  void findCompanyName_returnsNullWhenClientNotFound() {
    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);

          Connection conn = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          when(conn.prepareCall(anyString())).thenReturn(cs);

          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(cs.execute()).thenReturn(true);
          when(rs.next()).thenReturn(false);

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    assertNull(repo.findCompanyName("00009999"));
  }

  private static final class MockitoHelper {
    private static <T> CallableStatementCallback<T> anyCallback() {
      return ArgumentMatchers.any();
    }
  }
}
