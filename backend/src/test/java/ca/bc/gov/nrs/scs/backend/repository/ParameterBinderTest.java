package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import java.sql.CallableStatement;
import java.sql.Date;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

@DisplayName("ParameterBinder")
class ParameterBinderTest {

  @Test
  void afterReturnStartsAtIndexTwo() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    ParameterBinder binder = ParameterBinder.afterReturn(cs).string("a").string("b");

    InOrder inOrder = inOrder(cs);
    inOrder.verify(cs).setString(2, "a");
    inOrder.verify(cs).setString(3, "b");
    assertEquals(4, binder.nextIndex());
  }

  @Test
  void fromStartStartsAtIndexOne() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    ParameterBinder.fromStart(cs).string("a").string("b");

    InOrder inOrder = inOrder(cs);
    inOrder.verify(cs).setString(1, "a");
    inOrder.verify(cs).setString(2, "b");
  }

  @Test
  void bindsNonNullValuesWithTheirNativeSetters() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);
    LocalDate day = LocalDate.of(2026, 6, 25);

    ParameterBinder.afterReturn(cs)
        .string("x")
        .longValue(7L)
        .intValue(3)
        .doubleValue(1.5)
        .date(day);

    verify(cs).setString(2, "x");
    verify(cs).setLong(3, 7L);
    verify(cs).setInt(4, 3);
    verify(cs).setDouble(5, 1.5);
    verify(cs).setDate(6, Date.valueOf(day));
    verifyNoMoreInteractions(cs);
  }

  @Test
  void bindsNullValuesAsTypedNulls() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    ParameterBinder.afterReturn(cs)
        .string(null)
        .longValue(null)
        .intValue(null)
        .doubleValue(null)
        .date(null);

    // Numeric types all bind NUMERIC (matching the AbstractRepository set*OrNull helpers).
    verify(cs).setNull(2, Types.VARCHAR);
    verify(cs).setNull(3, Types.NUMERIC);
    verify(cs).setNull(4, Types.NUMERIC);
    verify(cs).setNull(5, Types.NUMERIC);
    verify(cs).setNull(6, Types.DATE);
    verifyNoMoreInteractions(cs);
  }

  @Test
  void explicitNullsBindExpectedTypes() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    ParameterBinder.afterReturn(cs)
        .nullString()
        .nullNumeric()
        .nullDate()
        .nullTimestamp()
        .nullUntyped();

    InOrder inOrder = inOrder(cs);
    inOrder.verify(cs).setNull(2, Types.VARCHAR);
    inOrder.verify(cs).setNull(3, Types.NUMERIC);
    inOrder.verify(cs).setNull(4, Types.DATE);
    inOrder.verify(cs).setNull(5, Types.TIMESTAMP);
    inOrder.verify(cs).setNull(6, Types.NULL);
  }

  @Test
  void bindsBytesWithNativeSetter() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);
    byte[] blob = {1, 2, 3};

    ParameterBinder binder = ParameterBinder.afterReturn(cs)
        .longValue(7L)
        .bytes(blob);

    verify(cs).setLong(2, 7L);
    verify(cs).setBytes(3, blob);
    assertEquals(4, binder.nextIndex());
  }

  @Test
  void indexAdvancesAcrossMixedBinds() throws SQLException {
    CallableStatement cs = mock(CallableStatement.class);

    ParameterBinder binder = ParameterBinder.afterReturn(cs)
        .nullString()          // 2
        .string("c")           // 3
        .longValue(null)       // 4
        .date(LocalDate.of(2026, 1, 1)); // 5

    assertEquals(6, binder.nextIndex());
    verify(cs).setNull(2, Types.VARCHAR);
    verify(cs).setString(3, "c");
    verify(cs).setNull(4, Types.NUMERIC);
    verify(cs).setDate(5, Date.valueOf(LocalDate.of(2026, 1, 1)));
  }
}
