package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.ScaleAuthConditionRef;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import oracle.jdbc.OracleTypes;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

class ScaleAuthTemplateRepositoryTest {

  @Test
  void addConditions_bindsTemplateAndConditionFields() throws Exception {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    ScalerAuthorizationRepository conditionRepository = mock(ScalerAuthorizationRepository.class);
    ScaleAuthTemplateRepository repository = new ScaleAuthTemplateRepository(jdbcTemplate, conditionRepository);

    AtomicReference<CallableStatement> captured = new AtomicReference<>();
    stubJdbcExecute(jdbcTemplate, captured);

    List<ScaleAuthConditionRef> conditions = List.of(
        new ScaleAuthConditionRef()
            .scaleConditionClassCode("GENERAL")
            .scaleAuthConditionId(101L),
        new ScaleAuthConditionRef()
            .scaleConditionClassCode("GENERAL")
            .scaleAuthConditionId(null));

    assertDoesNotThrow(() -> repository.addConditions(22L, conditions));

    verify(captured.get()).registerOutParameter(1, OracleTypes.CURSOR);
    verify(captured.get()).setLong(2, 22L);
    verify(captured.get()).setString(3, "GENERAL");
    verify(captured.get()).setLong(4, 101L);
    verify(captured.get()).setString(5, "SYSTEM");
    verify(captured.get()).setString(6, "SYSTEM");
  }

  private void stubJdbcExecute(
      JdbcTemplate jdbcTemplate,
      AtomicReference<CallableStatement> captured) throws Exception {
    when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
        .thenAnswer(invocation -> {
          CallableStatementCreator creator = invocation.getArgument(0);
          CallableStatementCallback<?> callback = invocation.getArgument(1);

          Connection con = mock(Connection.class);
          CallableStatement cs = mock(CallableStatement.class);
          ResultSet rs = mock(ResultSet.class);

          when(con.prepareCall(anyString())).thenReturn(cs);
          when(cs.execute()).thenReturn(true);
          when(cs.getObject(1)).thenReturn(rs);
          captured.set(cs);

          creator.createCallableStatement(con);
          return callback.doInCallableStatement(cs);
        });
  }
}