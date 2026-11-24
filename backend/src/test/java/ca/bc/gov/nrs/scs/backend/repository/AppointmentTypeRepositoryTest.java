package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.AppointmentType;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeCreateRequest;
import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeUpdateRequest;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.List;
import oracle.jdbc.OracleTypes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class AppointmentTypeRepositoryTest {

  @Mock
  private JdbcTemplate jdbcTemplate;
  @Mock
  private Connection connection;
  @Mock
  private CallableStatement callableStatement;

  private AppointmentTypeRepository repository;

  @BeforeEach
  void setUp() {
    repository = new AppointmentTypeRepository(jdbcTemplate);
  }

  @Test
  void search_bindsParamsAndMapsRows() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);

    when(rs.next()).thenReturn(true, false);
    when(rs.getString(1)).thenReturn("ABCD");
    when(rs.getString(2)).thenReturn("Acting");
    when(rs.getString(3)).thenReturn("Y");
    when(rs.getDate(4)).thenReturn(Date.valueOf(LocalDate.of(2026, 1, 1)));
    when(rs.getDate(5)).thenReturn(Date.valueOf(LocalDate.of(2026, 12, 31)));

    List<AppointmentType> out = repository.search(
        "ABCD",
        "Acting",
        "Y",
        LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 12, 31));

    assertEquals(1, out.size());
    assertEquals("ABCD", out.getFirst().getCode());
    assertEquals(AppointmentType.ActingIndEnum.Y, out.getFirst().getActingInd());

    verify(callableStatement).registerOutParameter(1, OracleTypes.CURSOR);
    verify(callableStatement).setString(2, "ABCD");
    verify(callableStatement).setString(3, "Acting");
    verify(callableStatement).setString(4, "Y");
    verify(callableStatement).setDate(5, Date.valueOf(LocalDate.of(2026, 1, 1)));
    verify(callableStatement).setDate(6, Date.valueOf(LocalDate.of(2026, 12, 31)));
  }

  @Test
  void create_bindsAuditUserAndReturnsMappedRow() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);

    when(rs.next()).thenReturn(true);
    when(rs.getString(1)).thenReturn("ABCD");
    when(rs.getString(2)).thenReturn("Acting");
    when(rs.getString(3)).thenReturn("N");
    when(rs.getDate(4)).thenReturn(Date.valueOf(LocalDate.of(2026, 1, 1)));
    when(rs.getDate(5)).thenReturn(Date.valueOf(LocalDate.of(2026, 12, 31)));

    AppointmentTypeCreateRequest request = new AppointmentTypeCreateRequest(
        "ABCD",
        "Acting",
        AppointmentTypeCreateRequest.ActingIndEnum.N,
        LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 12, 31));

    AppointmentType out = repository.create(request);

    assertEquals("ABCD", out.getCode());
    assertEquals(AppointmentType.ActingIndEnum.N, out.getActingInd());

    verify(callableStatement).setString(2, "ABCD");
    verify(callableStatement).setString(3, "Acting");
    verify(callableStatement).setString(4, "N");
    verify(callableStatement).setDate(5, Date.valueOf(LocalDate.of(2026, 1, 1)));
    verify(callableStatement).setDate(6, Date.valueOf(LocalDate.of(2026, 12, 31)));
    verify(callableStatement).setString(7, "SYSTEM");
    verify(callableStatement).setString(8, "SYSTEM");
  }

  @Test
  void update_bindsPrimaryKeyAndAllFields() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);

    when(rs.next()).thenReturn(true);
    when(rs.getString(1)).thenReturn("ABCD");
    when(rs.getString(2)).thenReturn("Updated");
    when(rs.getString(3)).thenReturn("Y");

    AppointmentTypeUpdateRequest request = new AppointmentTypeUpdateRequest(
        "Updated",
        AppointmentTypeUpdateRequest.ActingIndEnum.Y,
        LocalDate.of(2026, 1, 1),
        LocalDate.of(2026, 12, 31));

    repository.update("ABCD", request);

    verify(callableStatement).setString(2, "ABCD");
    verify(callableStatement).setString(3, "Updated");
    verify(callableStatement).setString(4, "Y");
    verify(callableStatement).setString(7, "SYSTEM");
    verify(callableStatement).setString(8, "SYSTEM");
  }

  @Test
  void hasDependentScalerAppointments_returnsTrueWhenRowsExist() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true);

    boolean hasDependents = repository.hasDependentScalerAppointments("ABCD");

    assertTrue(hasDependents);
    verify(callableStatement).setString(4, "ABCD");
  }

  private void stubExecute(ResultSet resultSet) throws Exception {
    when(connection.prepareCall(anyString())).thenReturn(callableStatement);
    when(callableStatement.execute()).thenReturn(true);
    when(callableStatement.getObject(1)).thenReturn(resultSet);

    when(jdbcTemplate.execute(any(CallableStatementCreator.class), MockitoHelper.anyCallback()))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<Object> callback = invocation.getArgument(1);
          creator.createCallableStatement(connection);
          return callback.doInCallableStatement(callableStatement);
        });
  }

  private static final class MockitoHelper {
    private static <T> CallableStatementCallback<T> anyCallback() {
      return any();
    }
  }
}
