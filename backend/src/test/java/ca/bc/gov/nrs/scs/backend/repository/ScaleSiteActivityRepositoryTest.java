package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteActivityRecord;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class ScaleSiteActivityRepositoryTest {

  private static final String ACTIVITY_VW_SEARCH_SQL =
      "{ ? = call scs_scale_site_activity_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;
  @Mock
  private Connection connection;
  @Mock
  private CallableStatement callableStatement;

  private ScaleSiteActivityRepository repository;

  @BeforeEach
  void setUp() {
    repository = new ScaleSiteActivityRepository(jdbcTemplate);
  }

  @Test
  void getActivityForSite_executesViewSearchAndMapsRow() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString("scale_site_id_nmbr")).thenReturn("SITE001");
    when(resultSet.getDate("last_scale_date")).thenReturn(Date.valueOf(LocalDate.of(2024, 9, 15)));
    when(resultSet.getObject("number_of_samples")).thenReturn(42L);
    when(resultSet.getLong("number_of_samples")).thenReturn(42L);
    when(resultSet.getBigDecimal("sample_volume")).thenReturn(new BigDecimal("1234.56"));
    when(resultSet.getBigDecimal("tot_volume")).thenReturn(new BigDecimal("98765.43"));

    ScaleSiteActivityRecord result = repository.getActivityForSite("SITE001");

    assertEquals("SITE001", result.scaleSiteIdNmbr());
    assertEquals(LocalDate.of(2024, 9, 15), result.lastScaleDate());
    assertEquals(42L, result.numberOfSamples());
    assertEquals(new BigDecimal("1234.56"), result.sampleVolume());
    assertEquals(new BigDecimal("98765.43"), result.scaledVolume());

    verify(connection).prepareCall(ACTIVITY_VW_SEARCH_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setNull(3, Types.DATE);
    verify(callableStatement).setNull(4, Types.NUMERIC);
    verify(callableStatement).setNull(5, Types.NUMERIC);
    verify(callableStatement).setNull(6, Types.NUMERIC);
    verify(callableStatement).setInt(7, 1);
    verify(callableStatement).setInt(8, 2);
  }

  @Test
  void getActivityForSite_returnsNullWhenCursorEmpty() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(false);

    assertNull(repository.getActivityForSite("NONE"));
  }

  private void stubExecute(ResultSet resultSet) throws Exception {
    when(connection.prepareCall(any(String.class))).thenReturn(callableStatement);
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
