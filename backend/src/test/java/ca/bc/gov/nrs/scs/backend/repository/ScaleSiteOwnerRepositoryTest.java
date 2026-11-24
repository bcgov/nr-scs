package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerRecord;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
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
class ScaleSiteOwnerRepositoryTest {

  private static final String OWNER_VW_SEARCH_SQL =
      "{ ? = call scs_scale_site_owner_vw_pkg.search_recs("
          + "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;
  @Mock
  private Connection connection;
  @Mock
  private CallableStatement callableStatement;

  private ScaleSiteOwnerRepository repository;

  @BeforeEach
  void setUp() {
    repository = new ScaleSiteOwnerRepository(jdbcTemplate);
  }

  @Test
  void getOwner_executesViewSearchAndMapsFirstRow() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("scale_site_id_nmbr")).thenReturn("SITE001");
    when(resultSet.getString("client_number")).thenReturn("12345678");
    when(resultSet.getString("client_locn_code")).thenReturn("00");
    when(resultSet.getString("company_name")).thenReturn("ACME FOREST PRODUCTS LTD.");
    when(resultSet.getString("city")).thenReturn("Nanaimo");
    when(resultSet.getString("postal_code")).thenReturn("V9R1A1");

    ScaleSiteOwnerRecord out = repository.getOwner("SITE001");

    assertEquals("SITE001", out.scaleSiteIdNmbr());
    assertEquals("12345678", out.clientNumber());
    assertEquals("00", out.clientLocnCode());
    assertEquals("ACME FOREST PRODUCTS LTD.", out.companyName());
    assertEquals("Nanaimo", out.city());
    assertEquals("V9R1A1", out.postalCode());
    verify(connection).prepareCall(OWNER_VW_SEARCH_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(20, Types.NUMERIC);
    verify(callableStatement).setNull(21, Types.NUMERIC);
  }

  @Test
  void getOwner_returnsNullWhenNoRows() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(false);

    assertNull(repository.getOwner("SITE001"));
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
