package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;

import ca.bc.gov.nrs.scs.backend.model.ScaleSiteRiskAssessmentSearchResult;
import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class ScaleSiteRiskAssessmentRepositoryTest {

  private static final String SEARCH_SQL =
      "{ ? = call scs_risk_scale_site_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;
  @Mock
  private Connection connection;
  @Mock
  private CallableStatement callableStatement;

  private ScaleSiteRiskAssessmentRepository repository;

  @BeforeEach
  void setUp() {
    repository = new ScaleSiteRiskAssessmentRepository(jdbcTemplate);
  }

  @Test
  @DisplayName("maps all named result columns from the cursor into the result object")
  void search_mapsAllResultColumns() throws Exception {
    ResultSet rs = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(rs);

    when(rs.next()).thenReturn(true, false);
    when(rs.getObject("risk_questionnaire_id")).thenReturn(101L);
    when(rs.getLong("risk_questionnaire_id")).thenReturn(101L);
    when(rs.getBigDecimal("risk_rating")).thenReturn(BigDecimal.valueOf(3.5));
    when(rs.getString("scale_site_id_nmbr")).thenReturn("SITE001");
    when(rs.getObject("version_no")).thenReturn(2L);
    when(rs.getLong("version_no")).thenReturn(2L);
    when(rs.getBigDecimal("max_risk_rating")).thenReturn(BigDecimal.valueOf(5.0));
    when(rs.getString("rating_description")).thenReturn("Medium");
    when(rs.getString("risk_type_code")).thenReturn("MEDIUM");
    when(rs.getString("code_description")).thenReturn("Medium Risk");
    when(rs.getObject("range_low_value")).thenReturn(2);
    when(rs.getInt("range_low_value")).thenReturn(2);
    when(rs.getObject("range_high_value")).thenReturn(4);
    when(rs.getInt("range_high_value")).thenReturn(4);
    when(rs.getBigDecimal("num_resp")).thenReturn(BigDecimal.valueOf(10));
    when(rs.getBigDecimal("quest_count")).thenReturn(BigDecimal.valueOf(15));
    when(rs.getString("complete_ind")).thenReturn("Y");
    when(rs.getObject("org_unit_no")).thenReturn(7L);
    when(rs.getLong("org_unit_no")).thenReturn(7L);
    when(rs.getString("method_type_code_name")).thenReturn("Weight Scale");
    when(rs.getString("owner_client_number")).thenReturn("00012345");
    when(rs.getString("owner_client_locn_code")).thenReturn("00");
    when(rs.getString("site_name")).thenReturn("Coastal Mill Site");
    when(rs.getString("district")).thenReturn("DCC");

    List<ScaleSiteRiskAssessmentSearchResult> results = repository.searchScaleSiteRiskAssessments(
        101L, "MEDIUM", "Y", "SITE001", null, 7L,
        true, false, false, "00012345", "00", "Coastal%", 1, 0);

    assertEquals(1, results.size());
    ScaleSiteRiskAssessmentSearchResult r = results.get(0);
    assertEquals(101L, r.getRiskQuestionnaireId().get());
    assertEquals("SITE001", r.getScaleSiteIdNmbr().get());
    assertEquals(0, BigDecimal.valueOf(3.5).compareTo(r.getRiskRating().get()));
    assertEquals(2L, r.getVersionNo().get());
    assertEquals("MEDIUM", r.getRiskTypeCode().get());
    assertEquals("Y", r.getCompleteInd().get());
    assertEquals(7L, r.getOrgUnitNo().get());
    assertEquals("Weight Scale", r.getMethodTypeCodeName().get());
    assertEquals("00012345", r.getOwnerClientNumber().get());
    assertEquals("00", r.getOwnerClientLocnCode().get());
    assertEquals("Coastal Mill Site", r.getSiteName().get());
    assertEquals("DCC", r.getDistrict().get());
    verify(connection).prepareCall(SEARCH_SQL);
  }

  @Test
  @DisplayName("returns an empty list when the cursor has no rows")
  void search_emptyResultSet_returnsEmptyList() throws Exception {
    ResultSet rs = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(rs);
    when(rs.next()).thenReturn(false);

    List<ScaleSiteRiskAssessmentSearchResult> results = repository.searchScaleSiteRiskAssessments(
        null, null, null, null, null, null,
        false, false, false, null, null, null, 1, 0);

    assertEquals(0, results.size());
  }

  @Test
  @DisplayName("passes null to the SP for optional params that are not provided")
  void search_nullOptionalParams_setsNullsOnStatement() throws Exception {
    ResultSet rs = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(rs);
    when(rs.next()).thenReturn(false);

    repository.searchScaleSiteRiskAssessments(
        null, null, null, null, null, null,
        false, false, false, null, null, null, 1, 0);

    verify(callableStatement).setNull(2, Types.NUMERIC);  // riskQuestionnaireId
    verify(callableStatement).setNull(3, Types.NUMERIC);  // risk_rating (always null)
    verify(callableStatement).setNull(15, Types.NUMERIC); // org_unit_no
  }

  @Test
  @DisplayName("returns the first matching record when found by ID")
  void getScaleSiteRiskAssessment_found_returnsRecord() throws Exception {
    ResultSet rs = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(rs);
    when(rs.next()).thenReturn(true, false);
    when(rs.getObject("risk_questionnaire_id")).thenReturn(42L);
    when(rs.getLong("risk_questionnaire_id")).thenReturn(42L);
    when(rs.getString("scale_site_id_nmbr")).thenReturn("SITE001");

    ScaleSiteRiskAssessmentSearchResult result = repository.getScaleSiteRiskAssessment(42L);

    assertNotNull(result);
    assertEquals(42L, result.getRiskQuestionnaireId().get());
    assertEquals("SITE001", result.getScaleSiteIdNmbr().get());
  }

  @Test
  @DisplayName("returns null when no record matches the given ID")
  void getScaleSiteRiskAssessment_notFound_returnsNull() throws Exception {
    ResultSet rs = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(rs);
    when(rs.next()).thenReturn(false);

    ScaleSiteRiskAssessmentSearchResult result = repository.getScaleSiteRiskAssessment(99999L);

    assertNull(result);
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
