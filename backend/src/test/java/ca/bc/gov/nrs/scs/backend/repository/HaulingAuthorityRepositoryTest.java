package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class HaulingAuthorityRepositoryTest {

  @Mock
  JdbcTemplate jdbcTemplate;

  private HaulingAuthorityRepository repo;

  @BeforeEach
  void setUp() {
    repo = new HaulingAuthorityRepository(jdbcTemplate);
  }

  /** Wires the JdbcTemplate mock so the call runs against a statement whose cursor yields {@code rows}. */
  private CallableStatement stubCall(AtomicReference<String> sql, Boolean... rows) {
    CallableStatement cs = mock(CallableStatement.class);
    when(jdbcTemplate.execute(
            ArgumentMatchers.any(CallableStatementCreator.class),
            MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator csc = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);
          Connection conn = mock(Connection.class);
          when(conn.prepareCall(anyString())).thenAnswer(inv -> {
            sql.set(inv.getArgument(0));
            return cs;
          });
          ResultSet rs = mock(ResultSet.class);
          when(cs.getObject(1)).thenReturn(rs);
          when(rs.next()).thenReturn(rows.length > 0 && rows[0], rows.length > 1 && rows[1]);
          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });
    return cs;
  }

  @Test
  void timberMarkExists_callsLegacyHaulingAuthoritySearchWithOnlyTheMark() throws Exception {
    AtomicReference<String> sql = new AtomicReference<>();
    CallableStatement cs = stubCall(sql, true);

    assertTrue(repo.timberMarkExists("AB6633"));

    // The legacy package and its six IN parameters (timber mark, forest file, marking method, marking
    // instrument, update user, entry user) after the ref-cursor return.
    assertTrue(sql.get().contains("scs_hauling_authority_pkg.search_recs("), sql.get());
    assertEquals(7, sql.get().chars().filter(c -> c == '?').count(), "return cursor + 6 IN parameters: " + sql.get());
    verify(cs).setString(2, "AB6633");
    for (int i = 3; i <= 7; i++) {
      verify(cs).setNull(i, Types.VARCHAR);
    }
  }

  @Test
  void timberMarkExists_falseWhenNoRow() {
    stubCall(new AtomicReference<>(), false);

    assertFalse(repo.timberMarkExists("A12345"));
  }

  private static final class MockitoHelper {
    private MockitoHelper() {
    }

    private static <T> CallableStatementCallback<T> anyCallback() {
      return ArgumentMatchers.any();
    }
  }
}
