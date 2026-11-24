package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionBase;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionCreateParams;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionResponse;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSearchRef;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionSummary;
import ca.bc.gov.nrs.scs.backend.domain.inspection.InspectionUpdateParams;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactOption;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.Types;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class ScaleSiteInspectionRepositoryTest {

  private static final String SEARCH_SCALE_SITE_INSPECTIONS_SQL =
      "{ ? = call SCS_SCALE_SITE_INSPCTNS_VW_PKG.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String INSPECTION_REPORT_SQL =
      "{ ? = call scs_site_inspection_pkg.get_inspection_report(?) }";
  private static final String UPDATE_INSPECTION_REPORT_SQL =
      "{ call scs_site_inspection_pkg.update_inspection_report(?, ?, ?, ?, ?) }";
  private static final String CREATE_INSPECTION_REPORT_SQL =
      "{ call scs_site_inspection_pkg.create_inspection_report(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String DELETE_INSPECTION_REPORT_SQL =
      "{ call scs_site_inspection_pkg.delete_inspection_report(?) }";
  private static final String INSPECTED_SCALING_METHOD_SEARCH_SQL =
      "{ ? = call SCS_INSPECTED_SCALING_MTHD_PKG.search_recs(?, ?, ?, ?) }";
  private static final String INSPECTED_SCALING_METHOD_INSERT_SQL =
      "{ ? = call SCS_INSPECTED_SCALING_MTHD_PKG.insert_rec(?, ?, ?, ?) }";
  private static final String INSPECTION_RESPONSE_SEARCH_SQL =
      "{ ? = call scs_inspection_response_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String INSPECTION_RESPONSE_INSERT_SQL =
      "{ ? = call scs_inspection_response_pkg.insert_rec(?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String INSPECTION_RESPONSE_DELETE_SQL =
      "{ call scs_inspection_response_pkg.delete_rec(?, ?, ?) }";
  private static final String INSPECTION_QUESTION_SELECT_SQL =
      "{ ? = call scs_inspection_question_pkg.select_rec(?) }";
  private static final String SCALE_SITE_CONTACT_SEARCH_SQL =
      "{ ? = call scs_scale_site_contact_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;
  @Mock
  private Connection connection;
  @Mock
  private CallableStatement callableStatement;

  private ScaleSiteInspectionRepository repository;

  @BeforeEach
  void setUp() {
    repository = new ScaleSiteInspectionRepository(jdbcTemplate);
  }

  @Test
  void searchScaleSiteInspectionByInspectionId_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString(1)).thenReturn("SITE001");
    when(resultSet.getObject(2)).thenReturn(12345L);

    List<InspectionSearchRef> out = repository.searchScaleSiteInspectionByInspectionId(12345L);

    assertEquals(1, out.size());
    InspectionSearchRef firstResult = out.getFirst();
    assertEquals("SITE001", firstResult.scaleSiteIdNmbr());
    assertEquals(12345L, firstResult.inspectionId());
    verify(connection).prepareCall(SEARCH_SCALE_SITE_INSPECTIONS_SQL);
    verify(callableStatement).setNull(2, Types.VARCHAR);
    verify(callableStatement).setLong(3, 12345L);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.DATE);
    verify(callableStatement).setNull(7, Types.VARCHAR);
    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setNull(9, Types.VARCHAR);
    verify(callableStatement).setNull(10, Types.VARCHAR);
    verify(callableStatement).setNull(11, Types.VARCHAR);
    verify(callableStatement).setNull(12, Types.VARCHAR);
    verify(callableStatement).setNull(13, Types.VARCHAR);
    verify(callableStatement).setNull(14, Types.DATE);
    verify(callableStatement).setNull(15, Types.VARCHAR);
    verify(callableStatement).setNull(16, Types.VARCHAR);
    verify(callableStatement).setInt(17, 0);
    verify(callableStatement).setInt(18, 0);
  }

  @Test
  void getScaleSiteInspectionSummaries_executesLegacyTabSearchAndMapsRows() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString(1)).thenReturn("SITE001");
    when(resultSet.getObject(2)).thenReturn(12345L);
    when(resultSet.getString(4)).thenReturn("Compliance");
    when(resultSet.getString(9)).thenReturn("Weight Scale");
    when(resultSet.getDate(13)).thenReturn(Date.valueOf(LocalDate.of(2026, 3, 10)));
    when(resultSet.getString(15)).thenReturn("guid-123");
    when(resultSet.getString(7)).thenReturn("Y");

    List<InspectionSummary> out =
        repository.getScaleSiteInspectionSummaries("SITE001");

    assertEquals(1, out.size());
    assertEquals(12345L, out.getFirst().inspectionId());
    assertEquals("Compliance", out.getFirst().inspectionTypeDescription());
    assertEquals("Weight Scale", out.getFirst().siteTypeDisplay());
    assertEquals(LocalDate.of(2026, 3, 10), out.getFirst().inspectionDate());
    assertEquals("guid-123", out.getFirst().inspector());
    assertEquals("Y", out.getFirst().followUpInspectionIndicator());
    verify(connection).prepareCall(SEARCH_SCALE_SITE_INSPECTIONS_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setNull(3, Types.NUMERIC);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.DATE);
    verify(callableStatement).setNull(7, Types.VARCHAR);
    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setNull(9, Types.VARCHAR);
    verify(callableStatement).setNull(10, Types.VARCHAR);
    verify(callableStatement).setNull(11, Types.VARCHAR);
    verify(callableStatement).setNull(12, Types.VARCHAR);
    verify(callableStatement).setNull(13, Types.VARCHAR);
    verify(callableStatement).setNull(14, Types.DATE);
    verify(callableStatement).setNull(15, Types.VARCHAR);
    verify(callableStatement).setNull(16, Types.VARCHAR);
    verify(callableStatement).setInt(17, 13);
    verify(callableStatement).setInt(18, 2);
  }

  @Test
  void isInspectionViewableInCims_returnsTrueWhenCursorHasRows() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);

    assertTrue(repository.isInspectionViewableInCims(12345L));

    verify(connection).prepareCall(INSPECTION_REPORT_SQL);
    verify(callableStatement).setLong(2, 12345L);
  }

  @Test
  void isInspectionViewableInCims_returnsFalseWhenCursorIsEmpty() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(false);

    assertFalse(repository.isInspectionViewableInCims(12345L));
  }

  @Test
  void getScaleSiteInspectionDetailBase_executesPackageCallAndMapsRecord() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString(1)).thenReturn("MAIN YARD");
    when(resultSet.getDate("inspection_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 3, 10)));
    when(resultSet.getString(3)).thenReturn("COM");
    when(resultSet.getString(4)).thenReturn("Compliance");
    when(resultSet.getString(5)).thenReturn("SITE001");
    when(resultSet.getString(6)).thenReturn("Nanaimo");
    when(resultSet.getObject("follow_up_to_inspection_id")).thenReturn(12001L);
    when(resultSet.getLong("follow_up_to_inspection_id")).thenReturn(12001L);
    when(resultSet.getString(8)).thenReturn("Jordan Smith");
    when(resultSet.getString(9)).thenReturn("Y");
    when(resultSet.getString(10)).thenReturn("guid-123");
    when(resultSet.getString(13)).thenReturn("General comments");

    InspectionBase out =
        repository.getScaleSiteInspectionDetailBase(12345L);

    assertEquals("SITE001", out.scaleSiteIdNmbr());
    assertEquals("MAIN YARD", out.siteName());
    assertEquals(LocalDate.of(2026, 3, 10), out.inspectionDate());
    assertEquals("Compliance", out.inspectionTypeDescription());
    assertEquals(12001L, out.previousInspectionId());
    verify(connection).prepareCall(INSPECTION_REPORT_SQL);
    verify(callableStatement).setLong(2, 12345L);
  }

  @Test
  void getInspectedScalingMethodCodes_executesSearchRecsAndMapsCodes() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, true, false);
    when(resultSet.getString(2)).thenReturn("W", "P");

    List<String> out = repository.getInspectedScalingMethodCodes(12345L);

    assertEquals(List.of("W", "P"), out);
    verify(connection).prepareCall(INSPECTED_SCALING_METHOD_SEARCH_SQL);
    verify(callableStatement).setLong(2, 12345L);
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
  }

  @Test
  void getInspectionResponses_executesSearchRecsAndMapsRows() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject("inspection_question_id")).thenReturn(777L);
    when(resultSet.getLong("inspection_question_id")).thenReturn(777L);
    when(resultSet.getString(3)).thenReturn("Y");
    when(resultSet.getString(4)).thenReturn("Seal intact.");
    when(resultSet.getString(5)).thenReturn("Follow up action");
    when(resultSet.getDate("follow_up_due_date")).thenReturn(Date.valueOf(LocalDate.of(2026, 4, 1)));
    when(resultSet.getString(7)).thenReturn("N");

    List<InspectionResponse> out =
        repository.getInspectionResponses(12345L);

    assertEquals(1, out.size());
    InspectionResponse firstResult = out.getFirst();
    assertEquals(777L, firstResult.inspectionQuestionId());
    assertEquals("Y", firstResult.inspectionAnswerCode());
    assertEquals(LocalDate.of(2026, 4, 1), firstResult.followUpDueDate());
    verify(connection).prepareCall(INSPECTION_RESPONSE_SEARCH_SQL);
    verify(callableStatement).setLong(2, 12345L);
    verify(callableStatement).setNull(3, Types.NUMERIC);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.VARCHAR);
    verify(callableStatement).setNull(7, Types.DATE);
    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setNull(9, Types.VARCHAR);
    verify(callableStatement).setNull(10, Types.VARCHAR);
  }

  @Test
  void getInspectionQuestionText_executesSelectRecAndMapsText() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString(2)).thenReturn("Was the scale head sealed?");

    String out = repository.getInspectionQuestionText(777L);

    assertEquals("Was the scale head sealed?", out);
    verify(connection).prepareCall(INSPECTION_QUESTION_SELECT_SQL);
    verify(callableStatement).setLong(2, 777L);
  }

  @Test
  void getScaleSiteContactOptions_executesSearchRecsAndMapsRecipientChoices() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject("client_contact_id")).thenReturn(77L);
    when(resultSet.getLong("client_contact_id")).thenReturn(77L);
    when(resultSet.getString("contact_name")).thenReturn("Jordan Smith");

    List<ScaleSiteContactOption> out =
        repository.getScaleSiteContactOptions("SITE001");

    assertEquals(1, out.size());
    assertEquals(77L, out.getFirst().clientContactId());
    assertEquals("Jordan Smith", out.getFirst().contactName());
    verify(connection).prepareCall(SCALE_SITE_CONTACT_SEARCH_SQL);
    verify(callableStatement).setNull(2, Types.NUMERIC);
    verify(callableStatement).setString(3, "SITE001");
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.VARCHAR);
    verify(callableStatement).setNull(7, Types.VARCHAR);
    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setNull(9, Types.VARCHAR);
    verify(callableStatement).setNull(10, Types.VARCHAR);
    verify(callableStatement).setInt(11, 2);
    verify(callableStatement).setInt(12, 3);
  }

  @Test
  void createScaleSiteInspectionBase_executesVerifiedLegacyCreateCall() throws Exception {
    stubExecuteNoResult();
    when(callableStatement.getLong(12)).thenReturn(12345L);

    Long inspectionId = repository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            "guid-123",
            "Y",
            "Created from staged workflow.",
            "COM",
            12001L,
            "Jordan Smith"));

    assertEquals(12345L, inspectionId);
    verify(connection).prepareCall(CREATE_INSPECTION_REPORT_SQL);
    verify(callableStatement).setDate(1, Date.valueOf(LocalDate.of(2026, 3, 11)));
    verify(callableStatement).setString(2, "guid-123");
    verify(callableStatement).setString(3, "SITE001");
    verify(callableStatement).setString(4, "Y");
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.VARCHAR);
    verify(callableStatement).setString(7, "Created from staged workflow.");
    verify(callableStatement).setString(8, "COM");
    verify(callableStatement).setNull(9, Types.NUMERIC);
    verify(callableStatement).setLong(10, 12001L);
    verify(callableStatement).setString(11, "Jordan Smith");
    verify(callableStatement).registerOutParameter(12, oracle.jdbc.OracleTypes.NUMBER);
  }

  @Test
  void createScaleSiteInspectionBase_bindsNullFollowUpInspectionIdAsNumericNull() throws Exception {
    stubExecuteNoResult();
    when(callableStatement.getLong(12)).thenReturn(12346L);

    Long inspectionId = repository.createScaleSiteInspectionBase(
        new InspectionCreateParams(
            "SITE001",
            LocalDate.of(2026, 3, 11),
            "guid-123",
            "N",
            null,
            "COM",
            null,
            null));

    assertEquals(12346L, inspectionId);
    verify(connection).prepareCall(CREATE_INSPECTION_REPORT_SQL);
    verify(callableStatement).setNull(9, Types.NUMERIC);
    verify(callableStatement).setNull(10, Types.NUMERIC);
    verify(callableStatement).setNull(11, Types.VARCHAR);
    verify(callableStatement).registerOutParameter(12, oracle.jdbc.OracleTypes.NUMBER);
  }

  @Test
  void insertInspectedScalingMethod_executesVerifiedLegacyInsertCall() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    repository.insertInspectedScalingMethod(12345L, "W");

    verify(connection).prepareCall(INSPECTED_SCALING_METHOD_INSERT_SQL);
    verify(callableStatement).registerOutParameter(1, oracle.jdbc.OracleTypes.CURSOR);
    verify(callableStatement).setLong(2, 12345L);
    verify(callableStatement).setString(3, "W");
    verify(callableStatement).setString(4, "SYSTEM");
    verify(callableStatement).setString(5, "SYSTEM");
  }

  @Test
  void updateScaleSiteInspectionBase_executesVerifiedLegacyUpdateCall() throws Exception {
    stubExecuteNoResult();
    InspectionUpdateParams params = new InspectionUpdateParams(
        12345L,
        LocalDate.of(2026, 3, 11),
        "guid-123",
        "Y",
        "Updated after revisit.");

    repository.updateScaleSiteInspectionBase(params);

    verify(connection).prepareCall(UPDATE_INSPECTION_REPORT_SQL);
    verify(callableStatement).setDate(1, Date.valueOf(LocalDate.of(2026, 3, 11)));
    verify(callableStatement).setString(2, "guid-123");
    verify(callableStatement).setString(3, "Y");
    verify(callableStatement).setString(4, "Updated after revisit.");
    verify(callableStatement).setLong(5, 12345L);
  }

  @Test
  void deleteInspectionResponse_executesVerifiedLegacyDeleteCall() throws Exception {
    stubExecuteNoResult();

    repository.deleteInspectionResponse(12345L, 777L, "Y");

    verify(connection).prepareCall(INSPECTION_RESPONSE_DELETE_SQL);
    verify(callableStatement).setLong(1, 12345L);
    verify(callableStatement).setLong(2, 777L);
    verify(callableStatement).setString(3, "Y");
  }

  @Test
  void deleteScaleSiteInspection_executesDeleteWithExpectedParameters() throws Exception {
    stubExecuteNoResult();

    repository.deleteScaleSiteInspection(12345L);

    verify(connection).prepareCall(DELETE_INSPECTION_REPORT_SQL);
    verify(callableStatement).setLong(1, 12345L);
    verify(callableStatement).execute();
  }

  @Test
  void insertInspectionResponse_executesVerifiedLegacyInsertCall() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    repository.insertInspectionResponse(
        12345L,
        new InspectionResponse(
            777L,
            "N",
            "Needs correction",
            "Issue corrective action request",
            LocalDate.of(2026, 3, 20),
            "N"));

    verify(connection).prepareCall(INSPECTION_RESPONSE_INSERT_SQL);
    verify(callableStatement).registerOutParameter(1, oracle.jdbc.OracleTypes.CURSOR);
    verify(callableStatement).setLong(2, 12345L);
    verify(callableStatement).setLong(3, 777L);
    verify(callableStatement).setString(4, "N");
    verify(callableStatement).setString(5, "Needs correction");
    verify(callableStatement).setString(6, "Issue corrective action request");
    verify(callableStatement).setDate(7, Date.valueOf(LocalDate.of(2026, 3, 20)));
    verify(callableStatement).setString(8, "N");
    verify(callableStatement).setString(9, "SYSTEM");
    verify(callableStatement).setString(10, "SYSTEM");
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

  private void stubExecuteNoResult() throws Exception {
    when(connection.prepareCall(any(String.class))).thenReturn(callableStatement);
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
