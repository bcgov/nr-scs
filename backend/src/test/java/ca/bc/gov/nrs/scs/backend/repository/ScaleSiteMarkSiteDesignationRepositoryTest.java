package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.MarkSiteDesignationSummary;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class ScaleSiteMarkSiteDesignationRepositoryTest {

  @Test
  void listByScaleSite_bindsScaleSiteAndMapsRows() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScaleSiteMarkSiteDesignationRepository repository = new ScaleSiteMarkSiteDesignationRepository(jdbcTemplate);

    ResultSet rs = viewResultSet();
    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, rs, captured);

    List<MarkSiteDesignationSummary> items = repository.listByScaleSite("A12345");

    assertEquals(1, items.size());
    MarkSiteDesignationSummary item = items.get(0);
    assertEquals("AB1234", item.timberMark());
    assertEquals("A12345", item.scaleSiteIdNmbr());
    assertEquals("00012345", item.ownerCliNumber());

    // search_recs binds scale_site_id_nmbr at parameter position 3 (cursor is position 1).
    assertNotNull(captured.get());
    verify(captured.get()).setString(3, "A12345");
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
    when(rs.getString("timber_mark")).thenReturn("AB1234");
    when(rs.getString("scale_site_id_nmbr")).thenReturn("A12345");
    when(rs.getString("owner_cli_number")).thenReturn("00012345");
    return rs;
  }
}
