package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.model.AppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.GradingCodeAppointmentTypeLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictLov;
import ca.bc.gov.nrs.scs.backend.model.RegionDistrictRollupLov;
import ca.bc.gov.nrs.scs.backend.model.ScaleMethodTypeLov;
import ca.bc.gov.nrs.scs.backend.model.ScalerTrainingTypeLov;
import ca.bc.gov.nrs.scs.backend.model.SpeciesProductGradeXref;
import ca.bc.gov.nrs.scs.backend.model.StaticLov;
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
class LovRepositoryTest {

  private static final String REGION_DISTRICT_SQL =
      "{ ? = call scs_reg_dist_lov_vw_pkg.search_recs(?, ?) }";
  private static final String REGION_DISTRICT_ROLLUP_SQL =
      "{ ? = call SCS_REG_DIST_ALL_LOV_VW_PKG.search_recs(?, ?, ?) }";
  private static final String APPOINTMENT_TYPE_SQL =
      "{ ? = call scs_sclr_appt_lov_vw_pkg.search_recs(?, ?) }";
  private static final String SCALE_METHOD_TYPE_SQL =
      "{ ? = call SCS_SCALE_METHOD_TYP_CD_VW_PKG.search_recs(?, ?, ?, ?, ?, ?) }";
  private static final String GRADING_CODE_APPOINTMENT_TYPE_SQL =
      "{ ? = call scs_sgcd_sapt_lov_vw_pkg.search_recs(?, ?, ?, ?, ?, ?) }";
  private static final String SCALER_TRAINING_TYPE_SQL =
      "{ ? = call scs_scty_lov_vw_pkg.search_recs(?, ?, ?, ?) }";
  private static final String STATIC_LOV_SQL =
      "{ ? = call scs_static_lov_pkg.static_lov_recs(?) }";
  private static final String SPECIES_PRODUCT_GRADE_XREF_SQL =
      "{ ? = call scs_species_prdct_grd_xrf_pkg.search_active_recs(?, ?, ?, ?, ?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;

  @Mock
  private Connection connection;

  @Mock
  private CallableStatement callableStatement;

  private LovRepository repository;

  @BeforeEach
  void setUp() {
    repository = new LovRepository(jdbcTemplate);
  }

  @Test
  void getRegionDistrictLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("code")).thenReturn("DCC");
    when(resultSet.getString("description")).thenReturn("Coast Area - Campbell River");

    List<RegionDistrictLov> out = repository.getRegionDistrictLov("DCC", "%Coast%");

    assertEquals(1, out.size());
    RegionDistrictLov firstResult = out.iterator().next();
    assertTrue(firstResult.getCode().isPresent());
    assertEquals("DCC", firstResult.getCode().get());
    assertTrue(firstResult.getDescription().isPresent());
    assertEquals("Coast Area - Campbell River", firstResult.getDescription().get());

    verify(connection).prepareCall(REGION_DISTRICT_SQL);
    verify(callableStatement).setString(2, "DCC");
    verify(callableStatement).setString(3, "%Coast%");
  }

  @Test
  void getRegionDistrictRollupLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject("code")).thenReturn(171L);
    when(resultSet.getString("description")).thenReturn("South Island District");
    when(resultSet.getObject("rollup_region_no")).thenReturn(1L);
    when(resultSet.getString("org_unit_code")).thenReturn("DSI");

    List<RegionDistrictRollupLov> out = repository.getRegionDistrictRollupLov(171L, "%Island%", 1L);

    assertEquals(1, out.size());
    RegionDistrictRollupLov firstResult = out.iterator().next();
    assertEquals(171L, firstResult.getCode().get());
    assertEquals("South Island District", firstResult.getDescription().get());
    assertEquals(1L, firstResult.getRollupRegionNo().get());
    assertEquals("DSI", firstResult.getOrgUnitCode().get());

    verify(connection).prepareCall(REGION_DISTRICT_ROLLUP_SQL);
    verify(callableStatement).setObject(2, 171L, Types.NUMERIC);
    verify(callableStatement).setString(3, "%Island%");
    verify(callableStatement).setObject(4, 1L, Types.NUMERIC);
  }

  @Test
  void getAppointmentTypeLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("code")).thenReturn("CS");
    when(resultSet.getString("description")).thenReturn("Check Scaler");

    List<AppointmentTypeLov> out = repository.getAppointmentTypeLov("CS", "%Check%");

    assertEquals(1, out.size());
    AppointmentTypeLov firstResult = out.iterator().next();
    assertEquals("CS", firstResult.getCode().get());
    assertEquals("Check Scaler", firstResult.getDescription().get());

    verify(connection).prepareCall(APPOINTMENT_TYPE_SQL);
    verify(callableStatement).setString(2, "CS");
    verify(callableStatement).setString(3, "%Check%");
  }

  @Test
  void getScaleMethodTypeLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString(1)).thenReturn("W");
    when(resultSet.getString(2)).thenReturn("Weight Scale");
    when(resultSet.getDate(3)).thenReturn(Date.valueOf(LocalDate.of(2025, 1, 1)));
    when(resultSet.getDate(4)).thenReturn(Date.valueOf(LocalDate.of(2025, 12, 31)));

    List<ScaleMethodTypeLov> out = repository.getScaleMethodTypeLov("W", "%Weight%");

    assertEquals(1, out.size());
    ScaleMethodTypeLov firstResult = out.iterator().next();
    assertEquals("W", firstResult.getCode().get());
    assertEquals("Weight Scale", firstResult.getDescription().get());
    assertEquals(LocalDate.of(2025, 1, 1), firstResult.getEffectiveDate().get());
    assertEquals(LocalDate.of(2025, 12, 31), firstResult.getExpiryDate().get());

    verify(connection).prepareCall(SCALE_METHOD_TYPE_SQL);
    verify(callableStatement).setString(2, "W");
    verify(callableStatement).setString(3, "%Weight%");
    verify(callableStatement).setNull(4, Types.DATE);
    verify(callableStatement).setNull(5, Types.DATE);
    verify(callableStatement).setInt(6, 2);
    verify(callableStatement).setInt(7, 0);
  }

  @Test
  void getGradingCodeAppointmentTypeLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("code")).thenReturn("FORS");
    when(resultSet.getString("description")).thenReturn("Forest Service");
    when(resultSet.getString("scale_grading_system_code")).thenReturn("BC");
    when(resultSet.getString("scaler_appointment_type")).thenReturn("F");

    List<GradingCodeAppointmentTypeLov> out = repository.getGradingCodeAppointmentTypeLov();

    assertEquals(1, out.size());
    GradingCodeAppointmentTypeLov firstResult = out.iterator().next();
    assertEquals("FORS", firstResult.getCode().get());
    assertEquals("BC", firstResult.getScaleGradingSystemCode().get());
    assertEquals("F", firstResult.getScalerAppointmentType().get());

    verify(connection).prepareCall(GRADING_CODE_APPOINTMENT_TYPE_SQL);
    verify(callableStatement).setNull(2, Types.VARCHAR);
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.DATE);
    verify(callableStatement).setNull(7, Types.DATE);
  }

  @Test
  void getScalerTrainingTypeLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("code")).thenReturn("SCEX");
    when(resultSet.getString("description")).thenReturn("Acting Scaler Exam");
    when(resultSet.getString("scaler_training_class_code")).thenReturn("SC");
    when(resultSet.getString("licence_accredit_ind")).thenReturn("N");

    List<ScalerTrainingTypeLov> out = repository.getScalerTrainingTypeLov();

    assertEquals(1, out.size());
    ScalerTrainingTypeLov firstResult = out.iterator().next();
    assertEquals("SCEX", firstResult.getCode().get());
    assertEquals("SC", firstResult.getScalerTrainingClassCode().get());
    assertEquals("N", firstResult.getLicenceAccreditInd().get());

    verify(connection).prepareCall(SCALER_TRAINING_TYPE_SQL);
    verify(callableStatement).setNull(2, Types.VARCHAR);
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
  }

  @Test
  void getStaticLov_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("table_key")).thenReturn("SCALER_TRAINING_TYPE");
    when(resultSet.getString("code")).thenReturn("SCEX");
    when(resultSet.getString("description")).thenReturn("Acting Scaler Exam");

    List<StaticLov> out = repository.getStaticLov("SCALER_TRAINING_TYPE");

    assertEquals(1, out.size());
    StaticLov firstResult = out.iterator().next();
    assertEquals("SCALER_TRAINING_TYPE", firstResult.getTableKey().get());
    assertEquals("SCEX", firstResult.getCode().get());
    assertEquals("Acting Scaler Exam", firstResult.getDescription().get());

    verify(connection).prepareCall(STATIC_LOV_SQL);
    verify(callableStatement).setString(2, "SCALER_TRAINING_TYPE");
  }

  @Test
  void getSpeciesProductGradeXref_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("scale_species_code")).thenReturn("FI");
    when(resultSet.getString("scale_product_code")).thenReturn("XM");
    when(resultSet.getString("scale_grade_code")).thenReturn("xmFI");

    List<SpeciesProductGradeXref> out = repository.getSpeciesProductGradeXref();

    assertEquals(1, out.size());
    SpeciesProductGradeXref firstResult = out.iterator().next();
    assertEquals("FI", firstResult.getScaleSpeciesCode().get());
    assertEquals("XM", firstResult.getScaleProductCode().get());
    assertEquals("xmFI", firstResult.getScaleGradeCode().get());

    verify(connection).prepareCall(SPECIES_PRODUCT_GRADE_XREF_SQL);
    verify(callableStatement).setNull(2, Types.VARCHAR);
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.DATE);
    verify(callableStatement).setNull(6, Types.DATE);
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



