package ca.bc.gov.nrs.scs.backend.repository;

import ca.bc.gov.nrs.scs.backend.model.HaulMarkAuthorization;
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
import java.sql.Date;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HaulMarkAuthorizationRepositoryTest {

  @Mock
  JdbcTemplate jdbcTemplate;

  private HaulMarkAuthorizationRepository repo;

  @BeforeEach
  void setUp() {
    repo = new HaulMarkAuthorizationRepository(jdbcTemplate);
  }

  @Test
  void searchHaulMarkAuthorizations_mapsResultSetToModel() {
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
          when(rs.getObject("hauling_mark_authorization_id")).thenReturn(123L);
          when(rs.getLong("hauling_mark_authorization_id")).thenReturn(123L);
          when(rs.getDate("effective_date")).thenReturn(Date.valueOf(LocalDate.of(2020, 1, 2)));
          when(rs.getDate("expiry_date")).thenReturn(Date.valueOf(LocalDate.of(2021, 2, 3)));
          when(rs.getString("timber_mark")).thenReturn("TMK");
          when(rs.getString("org_unit_name")).thenReturn("Unit X");

          csc.createCallableStatement(conn);
          return callback.doInCallableStatement(cs);
        });

    List<HaulMarkAuthorization> results = repo.searchHaulMarkAuthorizations(
        123L, "TMK", LocalDate.of(2020,1,2), LocalDate.of(2021,2,3), "Unit X", 1, 2);

    assertNotNull(results);
    assertEquals(1, results.size());
    HaulMarkAuthorization r = results.iterator().next();
    assertTrue(r.getHaulingMarkAuthorizationId().isPresent());
    assertEquals(123L, r.getHaulingMarkAuthorizationId().get());
    assertTrue(r.getTimberMark().isPresent());
    assertEquals("TMK", r.getTimberMark().get());
    assertTrue(r.getEffectiveDate().isPresent());
    assertEquals(LocalDate.of(2020,1,2), r.getEffectiveDate().get());
    assertTrue(r.getExpiryDate().isPresent());
    assertEquals(LocalDate.of(2021,2,3), r.getExpiryDate().get());
    assertTrue(r.getOrgUnitName().isPresent());
    assertEquals("Unit X", r.getOrgUnitName().get());
  }

  @Test
  void searchHaulMarkAuthorizations_returnsEmptyListWhenNoRows() {
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

    List<HaulMarkAuthorization> results = repo.searchHaulMarkAuthorizations(null, null, null, null, null, null, null);
    assertNotNull(results);
    assertTrue(results.isEmpty());
  }

  private static final class MockitoHelper {
    private MockitoHelper() {
    }

    private static <T> CallableStatementCallback<T> anyCallback() {
      return ArgumentMatchers.any();
    }
  }
}
