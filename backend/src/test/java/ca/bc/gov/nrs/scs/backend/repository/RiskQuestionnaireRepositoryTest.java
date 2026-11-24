package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.dto.ActiveTemplateRow;
import ca.bc.gov.nrs.scs.backend.dto.QuestionnaireRow;
import ca.bc.gov.nrs.scs.backend.dto.ResponseRow;
import ca.bc.gov.nrs.scs.backend.dto.TemplateQaRow;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.List;
import oracle.jdbc.OracleTypes;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RiskQuestionnaireRepositoryTest {

  @Mock private JdbcTemplate jdbcTemplate;
  @Mock private Connection connection;
  @Mock private CallableStatement callableStatement;

  private RiskQuestionnaireRepository repository;

  @BeforeEach
  void setUp() {
    repository = new RiskQuestionnaireRepository(jdbcTemplate);
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void findQuestionnaire_bindsIdAndMapsTemplateLink() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true);
    when(rs.getObject("risk_questionnaire_id")).thenReturn(42L);
    when(rs.getLong("risk_questionnaire_id")).thenReturn(42L);
    when(rs.getString("comments_text")).thenReturn("notes");
    when(rs.getObject("risk_questionnaire_template_id")).thenReturn(7L);
    when(rs.getLong("risk_questionnaire_template_id")).thenReturn(7L);

    QuestionnaireRow row = repository.findQuestionnaire(42L);

    assertNotNull(row);
    assertEquals(7L, row.templateId());
    assertEquals("notes", row.comments());
    verify(callableStatement).registerOutParameter(1, OracleTypes.CURSOR);
    verify(callableStatement).setLong(2, 42L);
  }

  @Test
  void getTemplateQa_bindsTemplateIdAndMapsRows() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject("risk_template_section_id")).thenReturn(1L);
    when(rs.getLong("risk_template_section_id")).thenReturn(1L);
    when(rs.getString("section_description")).thenReturn("Consequences (C)");
    when(rs.getObject("risk_question_id")).thenReturn(11L);
    when(rs.getLong("risk_question_id")).thenReturn(11L);
    when(rs.getString("question_text")).thenReturn("Activity Level");
    when(rs.getObject("risk_valid_answer_id")).thenReturn(101L);
    when(rs.getLong("risk_valid_answer_id")).thenReturn(101L);
    when(rs.getString("answer_text")).thenReturn("Low");
    when(rs.getObject("answer_weighting")).thenReturn(3);
    when(rs.getInt("answer_weighting")).thenReturn(3);

    List<TemplateQaRow> rows = repository.getTemplateQa(7L);

    assertEquals(1, rows.size());
    assertEquals("Consequences (C)", rows.get(0).sectionDescription());
    assertEquals(3, rows.get(0).weight());
    // p_risk_questionnair_tmplt_d is the first filter param (statement index 2).
    verify(callableStatement).setLong(2, 7L);
  }

  @Test
  void getTemplateQa_skipsObsoleteAnswers() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true, true, false);
    when(rs.getObject("risk_template_section_id")).thenReturn(1L);
    when(rs.getLong("risk_template_section_id")).thenReturn(1L);
    when(rs.getString("section_description")).thenReturn("Consequences (C)");
    when(rs.getObject("risk_question_id")).thenReturn(11L);
    when(rs.getLong("risk_question_id")).thenReturn(11L);
    when(rs.getString("question_text")).thenReturn("Activity Level");
    when(rs.getObject("risk_valid_answer_id")).thenReturn(101L);
    when(rs.getLong("risk_valid_answer_id")).thenReturn(101L);
    // First answer is current; second carries the legacy obsolete marker and must be dropped.
    when(rs.getString("answer_text")).thenReturn("Low", "Old value [OBSOLETE - DO NOT USE]");
    when(rs.getObject("answer_weighting")).thenReturn(3);
    when(rs.getInt("answer_weighting")).thenReturn(3);

    List<TemplateQaRow> rows = repository.getTemplateQa(7L);

    assertEquals(1, rows.size());
    assertEquals("Low", rows.get(0).answerText());
  }

  @Test
  void getTemplateQa_skipsAnswerTextAlreadySeenOnEarlierQuestion() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true, true, false);
    when(rs.getObject("risk_template_section_id")).thenReturn(1L);
    when(rs.getLong("risk_template_section_id")).thenReturn(1L);
    when(rs.getString("section_description")).thenReturn("Consequences (C)");
    when(rs.getObject("risk_question_id")).thenReturn(11L);
    when(rs.getLong("risk_question_id")).thenReturn(11L);
    when(rs.getString("question_text")).thenReturn("Activity Level");
    when(rs.getObject("risk_valid_answer_id")).thenReturn(101L);
    when(rs.getLong("risk_valid_answer_id")).thenReturn(101L);
    // Both rows share the same answer text; legacy de-dups template-wide so only the first survives.
    when(rs.getString("answer_text")).thenReturn("Yes", "Yes");
    when(rs.getObject("answer_weighting")).thenReturn(3);
    when(rs.getInt("answer_weighting")).thenReturn(3);

    List<TemplateQaRow> rows = repository.getTemplateQa(7L);

    assertEquals(1, rows.size());
  }

  @Test
  void getResponses_bindsQuestionnaireIdAtParamFive() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject("risk_question_response_id")).thenReturn(900L);
    when(rs.getLong("risk_question_response_id")).thenReturn(900L);
    when(rs.getObject("risk_question_id")).thenReturn(11L);
    when(rs.getLong("risk_question_id")).thenReturn(11L);
    when(rs.getObject("risk_valid_answer_id")).thenReturn(101L);
    when(rs.getLong("risk_valid_answer_id")).thenReturn(101L);

    List<ResponseRow> rows = repository.getResponses(42L);

    assertEquals(1, rows.size());
    assertEquals(900L, rows.get(0).responseId());
    // p_risk_questionnaire_id is the 4th filter param (statement index 5).
    verify(callableStatement).setLong(5, 42L);
  }

  @Test
  void getRiskRatings_bindsTemplateIdAtParamEight() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(false);

    repository.getRiskRatings(7L);

    // p_risk_questionnair_tmplt_d is the 7th filter param (statement index 8).
    verify(callableStatement).setLong(8, 7L);
  }

  @Test
  void insertResponse_withoutSecurityContext_defaultsAuditUserToSystem() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true);

    repository.insertResponse(42L, 11L, 101L);

    verify(callableStatement).setNull(2, Types.NUMERIC); // PK generated by trigger
    verify(callableStatement).setString(3, "SYSTEM");
    verify(callableStatement).setString(4, "SYSTEM");
    verify(callableStatement).setLong(5, 42L);
    verify(callableStatement).setLong(6, 11L);
    verify(callableStatement).setLong(7, 101L);
  }

  @Test
  void insertResponse_withAuthenticatedUser_bindsThatUserToAuditColumns() throws Exception {
    // Populate a real SecurityContext so the audit binding resolves the authenticated user's
    // idp_username (held in auth.details) rather than the no-context "SYSTEM" fallback. Without
    // this, the SYSTEM assertion above is tautological and would pass even if the resolver was broken.
    var auth = new TestingAuthenticationToken("principal", "creds");
    auth.setDetails("IDIR\\JDOE");
    SecurityContextHolder.getContext().setAuthentication(auth);

    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true);

    repository.insertResponse(42L, 11L, 101L);

    verify(callableStatement).setString(3, "IDIR\\JDOE"); // entry_userid
    verify(callableStatement).setString(4, "IDIR\\JDOE"); // update_userid
  }

  @Test
  void findActiveTemplates_bindsTypeAndMapsRows() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject("risk_questionnaire_template_id")).thenReturn(7L);
    when(rs.getLong("risk_questionnaire_template_id")).thenReturn(7L);
    when(rs.getObject("version_no")).thenReturn(3L);
    when(rs.getLong("version_no")).thenReturn(3L);
    when(rs.getString("risk_template_type")).thenReturn("SCLE");

    List<ActiveTemplateRow> rows = repository.findActiveTemplates("SCLE");

    assertEquals(1, rows.size());
    assertEquals(7L, rows.get(0).templateId());
    assertEquals(3L, rows.get(0).versionNo());
    assertEquals("SCLE", rows.get(0).riskTemplateType());
    verify(callableStatement).registerOutParameter(1, OracleTypes.CURSOR);
    // p_risk_template_type is the 6th filter param (statement index 7).
    verify(callableStatement).setString(7, "SCLE");
  }

  @Test
  void insertQuestionnaire_bindsScalerColumnsAndReturnsGeneratedId() throws Exception {
    ResultSet rs = mock(ResultSet.class);
    stubExecute(rs);
    when(rs.next()).thenReturn(true);
    when(rs.getObject("risk_questionnaire_id")).thenReturn(555L);
    when(rs.getLong("risk_questionnaire_id")).thenReturn(555L);

    Long id = repository.insertQuestionnaire("1234", null, "SCLE", 7L, "note");

    assertEquals(555L, id);
    verify(callableStatement).setNull(2, Types.NUMERIC); // PK generated by trigger
    verify(callableStatement).setString(5, "note");      // comments_text
    verify(callableStatement).setString(6, "1234");      // scaler_licence_no
    verify(callableStatement).setString(10, "SCLE");     // risk_template_type
    verify(callableStatement).setLong(11, 7L);           // risk_questionnaire_template_id
    verify(callableStatement).setString(15, "SYSTEM");   // entry_userid (no security context)
    verify(callableStatement).setString(16, "SYSTEM");   // update_userid
  }

  @Test
  void deleteResponse_bindsResponseId() throws Exception {
    stubExecute(mock(ResultSet.class));

    repository.deleteResponse(900L);

    verify(callableStatement).setLong(1, 900L);
  }

  private void stubExecute(ResultSet resultSet) throws Exception {
    when(connection.prepareCall(anyString())).thenReturn(callableStatement);
    when(callableStatement.getObject(1)).thenReturn(resultSet);

    when(jdbcTemplate.execute(any(CallableStatementCreator.class), MockitoHelper.anyCallback()))
        .thenAnswer(
            invocation -> {
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
