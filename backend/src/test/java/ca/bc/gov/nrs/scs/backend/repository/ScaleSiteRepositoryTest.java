package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCoordinate;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSite;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteOwnerInfo;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSitePriorityCode;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchCriteria;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteScalingMethod;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
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
class ScaleSiteRepositoryTest {

  private static final String SEARCH_SCALE_SITES_SQL =
      "{ ? = call scs_scale_site_search_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String SCALE_SITE_SELECT_SQL =
      "{ ? = call scs_scale_site_pkg.select_rec(?) }";
  private static final String SCALE_SITE_OWNER_SEARCH_SQL =
      "{ ? = call scs_scale_site_owner_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String SCALE_SITE_TOMBSTONE_SEARCH_SQL =
      "{ ? = call SCS_SCALE_SITE_TOMBSTON_VW_PKG.search_recs(?, ?, ?, ?, ?, ?) }";
  private static final String SCALE_SITE_SCALING_METHOD_SEARCH_SQL =
      "{ ? = call scs_site_scaling_method_pkg.search_recs(?, ?, ?, ?, ?) }";
  private static final String SCALE_SITE_INSERT_SQL =
      "{ ? = call scs_scale_site_pkg.insert_rec(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String SCALE_SITE_UPDATE_SQL =
      "{ ? = call scs_scale_site_pkg.update_rec(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String SITE_SCALING_METHOD_INSERT_SQL =
      "{ ? = call scs_site_scaling_method_pkg.insert_rec(?, ?, ?, ?, ?) }";
  private static final String SITE_SCALING_METHOD_DELETE_SQL =
      "{ call scs_site_scaling_method_pkg.delete_rec(?, ?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;

  @Mock
  private Connection connection;

  @Mock
  private CallableStatement callableStatement;

  private ScaleSiteRepository repository;

  @BeforeEach
  void setUp() {
    repository = new ScaleSiteRepository(jdbcTemplate);
  }

  @Test
  void searchScaleSites_executesPackageCallAndMapsResults() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString(1)).thenReturn("SITE001");
    when(resultSet.getString(3)).thenReturn("Weight Scale");
    when(resultSet.getString(8)).thenReturn("123456");
    when(resultSet.getString(9)).thenReturn("MAIN YARD");
    when(resultSet.getString(10)).thenReturn("00");
    when(resultSet.getString(11)).thenReturn("South Island District");
    when(resultSet.getString(12)).thenReturn("South Coast Natural Resource Region");

    ScaleSiteSearchCriteria criteria = new ScaleSiteSearchCriteria(
        "SITE001", 100L, "%MAIN%", "123456", "00", List.of("W", "S"), 1, 0);
    List<ScaleSiteSearchEntry> out = repository.searchScaleSites(criteria);

    assertEquals(1, out.size());
    ScaleSiteSearchEntry firstResult = out.getFirst();
    assertEquals("SITE001", firstResult.scaleSiteIdNmbr());
    assertEquals("Weight Scale", firstResult.methodTypeCodeName());
    assertEquals("00123456", firstResult.ownerClientNumber());
    assertEquals("00", firstResult.ownerClientLocnCode());

    verify(connection).prepareCall(SEARCH_SCALE_SITES_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setLong(3, 100L);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setString(5, "Y");
    verify(callableStatement).setNull(6, Types.VARCHAR);
    verify(callableStatement).setString(7, "Y");
    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setString(9, "123456");
    verify(callableStatement).setString(10, "%MAIN%");
    verify(callableStatement).setString(11, "00");
    verify(callableStatement).setNull(12, Types.VARCHAR);
    verify(callableStatement).setNull(13, Types.VARCHAR);
    verify(callableStatement).setInt(14, 1);
    verify(callableStatement).setInt(15, 0);
  }

  @Test
  void getScaleSite_executesSelectRecAndMapsCoreFields() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString(1)).thenReturn("SITE001");
    when(resultSet.getString(3)).thenReturn(null);
    when(resultSet.getString(4)).thenReturn(null);
    when(resultSet.getString(5)).thenReturn("MAIN YARD");
    when(resultSet.getString(6)).thenReturn("Nanaimo");
    when(resultSet.getString(7)).thenReturn(null);

    ScaleSiteCore out = repository.getScaleSite("SITE001");

    assertEquals("SITE001", out.scaleSiteIdNmbr());
    assertEquals("MAIN YARD", out.siteName());
    assertEquals("Nanaimo", out.siteLocation());
    verify(connection).prepareCall(SCALE_SITE_SELECT_SQL);
    verify(callableStatement).setString(2, "SITE001");
  }

  @Test
  void getScaleSiteOwner_executesSearchRecsAndMapsOwnerFields() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString(4)).thenReturn("ACME FOREST PRODUCTS LTD.");
    when(resultSet.getString(5)).thenReturn("Smith");
    when(resultSet.getString(6)).thenReturn("Jordan");

    ScaleSiteOwnerInfo out = repository.getScaleSiteOwner("SITE001");

    assertEquals("ACME FOREST PRODUCTS LTD.", out.companyName());
    assertEquals("Smith", out.lastName());
    assertEquals("Jordan", out.firstName());
    verify(connection).prepareCall(SCALE_SITE_OWNER_SEARCH_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(19, Types.VARCHAR);
    verify(callableStatement).setInt(20, 2);
    verify(callableStatement).setInt(21, 3);
  }

  @Test
  void getScaleSiteSummaryCore_executesSelectRecAndMapsSummaryFields() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString(1)).thenReturn("SITE001");
    when(resultSet.getObject(2)).thenReturn(100L);
    when(resultSet.getString(3)).thenReturn("12345678");
    when(resultSet.getString(4)).thenReturn("00");
    when(resultSet.getString(5)).thenReturn("MAIN YARD");
    when(resultSet.getString(6)).thenReturn("Nanaimo");
    when(resultSet.getString(7)).thenReturn("TB-123");
    when(resultSet.getObject(8)).thenReturn(49);
    when(resultSet.getObject(9)).thenReturn(10);
    when(resultSet.getObject(10)).thenReturn(22);
    when(resultSet.getObject(11)).thenReturn(123);
    when(resultSet.getObject(12)).thenReturn(56);
    when(resultSet.getObject(13)).thenReturn(31);

    ScaleSiteSummaryCore out = repository.getScaleSiteSummaryCore("SITE001");

    assertEquals("SITE001", out.scaleSiteIdNmbr());
    assertEquals(100L, out.orgUnitNo());
    assertEquals("12345678", out.ownerClientNumber());
    assertEquals("00", out.ownerClientLocnCode());
    assertEquals("TB-123", out.timberBrand());
    assertEquals(49, out.latitudeDegrees());
    assertEquals(31, out.longitudeSeconds());
    verify(connection).prepareCall(SCALE_SITE_SELECT_SQL);
    verify(callableStatement).setString(2, "SITE001");
  }

  @Test
  void getScaleSiteTombstone_executesSearchRecsAndMapsFields() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString(1)).thenReturn("South Island District");
    when(resultSet.getString(2)).thenReturn("South Coast Natural Resource Region");
    when(resultSet.getString(3)).thenReturn("SITE001");
    when(resultSet.getString(4)).thenReturn("MAIN YARD");

    ScaleSiteTombstoneRecord out = repository.getScaleSiteTombstone("SITE001");

    assertEquals("SITE001", out.scaleSiteIdNmbr());
    assertEquals("MAIN YARD", out.siteName());
    assertEquals("South Coast Natural Resource Region", out.regionName());
    assertEquals("South Island District", out.districtName());
    verify(connection).prepareCall(SCALE_SITE_TOMBSTONE_SEARCH_SQL);
    verify(callableStatement).setNull(2, Types.VARCHAR);
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setString(4, "SITE001");
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setInt(6, 1);
    verify(callableStatement).setInt(7, 1);
  }

  @Test
  void getScaleSiteSummarySiteTypes_executesSearchRecsAndMapsRows() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true, true, false);
    when(resultSet.getString(2)).thenReturn("W", "P");
    when(resultSet.getString(3)).thenReturn(ScaleSitePriorityCode.PRIMARY, ScaleSitePriorityCode.SECONDARY);

    List<SiteScalingMethod> out = repository.getScaleSiteSummarySiteTypes("SITE001");

    assertEquals(2, out.size());
    assertEquals("W", out.get(0).scaleMethodTypeCode());
    assertEquals(ScaleSitePriorityCode.PRIMARY, out.get(0).scaleSitePriorityCode());
    assertEquals("P", out.get(1).scaleMethodTypeCode());
    assertEquals(ScaleSitePriorityCode.SECONDARY, out.get(1).scaleSitePriorityCode());
    verify(connection).prepareCall(SCALE_SITE_SCALING_METHOD_SEARCH_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setNull(3, Types.VARCHAR);
    verify(callableStatement).setNull(4, Types.VARCHAR);
    verify(callableStatement).setNull(5, Types.VARCHAR);
    verify(callableStatement).setNull(6, Types.VARCHAR);
  }


  @Test
  void createScaleSite_executesInsertRecAndReadsGeneratedId() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString("scale_site_id_nmbr")).thenReturn("SITE001");

    ScaleSite domain = new ScaleSite(
        null,
        "MAIN YARD",
        "12345678",
        "00",
        100L,
        "Nanaimo, BC",
        "TB-123",
        new ScaleSiteCoordinate(49, 10, 22),
        new ScaleSiteCoordinate(-123, 56, 31),
        List.of(),
        null, 
        null, 
        null, 
        null, 
        null);

    String generatedId = repository.createScaleSite(domain);

    assertEquals("SITE001", generatedId);
    verify(connection).prepareCall(SCALE_SITE_INSERT_SQL);
    verify(callableStatement).setNull(2, Types.VARCHAR);
    verify(callableStatement).setLong(3, 100L);
    verify(callableStatement).setString(4, "12345678");
    verify(callableStatement).setString(5, "00");
    verify(callableStatement).setString(6, "MAIN YARD");
    verify(callableStatement).setString(7, "Nanaimo, BC");
    verify(callableStatement).setString(8, "TB-123");
    verify(callableStatement).setInt(9, 49);
    verify(callableStatement).setInt(10, 10);
    verify(callableStatement).setInt(11, 22);
    verify(callableStatement).setInt(12, -123);
    verify(callableStatement).setInt(13, 56);
    verify(callableStatement).setInt(14, 31);
    verify(callableStatement).setString(15, "SYSTEM");
    verify(callableStatement).setString(16, "SYSTEM");
  }

  @Test
  void createScaleSite_bindsNullsForOptionalCoordinates() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);
    when(resultSet.next()).thenReturn(true);
    when(resultSet.getString("scale_site_id_nmbr")).thenReturn("SITE002");

    ScaleSite domain = new ScaleSite(
        null,
        "BACKUP YARD",
        "87654321",
        "00",
        100L,
        "Prince George",
        null,
        null,
        null,
        List.of(),
        null, 
        null, 
        null, 
        null, 
        null);

    repository.createScaleSite(domain);

    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setNull(9, Types.NUMERIC);
    verify(callableStatement).setNull(10, Types.NUMERIC);
    verify(callableStatement).setNull(11, Types.NUMERIC);
    verify(callableStatement).setNull(12, Types.NUMERIC);
    verify(callableStatement).setNull(13, Types.NUMERIC);
    verify(callableStatement).setNull(14, Types.NUMERIC);
  }

  @Test
  void createSiteScalingMethod_executesInsertRecWithExpectedParameters() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    SiteScalingMethod method = new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY);
    repository.createSiteScalingMethod("SITE001", method);

    verify(connection).prepareCall(SITE_SCALING_METHOD_INSERT_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setString(3, "W");
    verify(callableStatement).setString(4, ScaleSitePriorityCode.PRIMARY);
    verify(callableStatement).setString(5, "SYSTEM");
    verify(callableStatement).setString(6, "SYSTEM");
    verify(callableStatement).execute();
  }

  @Test
  void updateScaleSite_executesUpdateRecWithExpectedParameters() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    ScaleSite domain = new ScaleSite(
        "SITE001",
        "MAIN YARD",
        "12345678",
        "00",
        100L,
        "Nanaimo, BC",
        "TB-123",
        new ScaleSiteCoordinate(49, 10, 22),
        new ScaleSiteCoordinate(-123, 56, 31),
        List.of(),
        null, 
        null, 
        null, 
        null, 
        null);

    repository.updateScaleSite(domain);

    verify(connection).prepareCall(SCALE_SITE_UPDATE_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setLong(3, 100L);
    verify(callableStatement).setString(4, "12345678");
    verify(callableStatement).setString(5, "00");
    verify(callableStatement).setString(6, "MAIN YARD");
    verify(callableStatement).setString(7, "Nanaimo, BC");
    verify(callableStatement).setString(8, "TB-123");
    verify(callableStatement).setInt(9, 49);
    verify(callableStatement).setInt(10, 10);
    verify(callableStatement).setInt(11, 22);
    verify(callableStatement).setInt(12, -123);
    verify(callableStatement).setInt(13, 56);
    verify(callableStatement).setInt(14, 31);
    verify(callableStatement).setNull(15, Types.VARCHAR);
    verify(callableStatement).setString(16, "SYSTEM");
    verify(callableStatement).execute();
  }

  @Test
  void updateScaleSite_bindsNullsForOptionalCoordinates() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    ScaleSite domain = new ScaleSite(
        "SITE002",
        "BACKUP YARD",
        "87654321",
        "00",
        100L,
        "Prince George",
        null,
        null,
        null,
        List.of(),
        null, 
        null, 
        null, 
        null, 
        null);

    repository.updateScaleSite(domain);

    verify(callableStatement).setString(2, "SITE002");
    verify(callableStatement).setNull(8, Types.VARCHAR);
    verify(callableStatement).setNull(9, Types.NUMERIC);
    verify(callableStatement).setNull(10, Types.NUMERIC);
    verify(callableStatement).setNull(11, Types.NUMERIC);
    verify(callableStatement).setNull(12, Types.NUMERIC);
    verify(callableStatement).setNull(13, Types.NUMERIC);
    verify(callableStatement).setNull(14, Types.NUMERIC);
    verify(callableStatement).setNull(15, Types.VARCHAR);
    verify(callableStatement).setString(16, "SYSTEM");
  }

  @Test
  void deleteSiteScalingMethodsForSite_callsDeleteRecForEachExistingMethod() throws Exception {
    ResultSet resultSet = mock(ResultSet.class);
    stubExecute(resultSet);

    List<SiteScalingMethod> existing = List.of(
        new SiteScalingMethod("W", ScaleSitePriorityCode.PRIMARY),
        new SiteScalingMethod("P", ScaleSitePriorityCode.SECONDARY));

    repository.deleteSiteScalingMethodsForSite("SITE001", existing);

    verify(connection, org.mockito.Mockito.times(2)).prepareCall(SITE_SCALING_METHOD_DELETE_SQL);
    verify(callableStatement, org.mockito.Mockito.times(2)).setString(1, "SITE001");
    verify(callableStatement).setString(2, "W");
    verify(callableStatement).setString(2, "P");
    verify(callableStatement, org.mockito.Mockito.times(2)).execute();
  }

  @Test
  void deleteSiteScalingMethodsForSite_doesNothingWhenListIsEmptyOrNull() {
    repository.deleteSiteScalingMethodsForSite("SITE001", List.of());
    repository.deleteSiteScalingMethodsForSite("SITE001", null);

    org.mockito.Mockito.verifyNoInteractions(jdbcTemplate);
  }

  private void stubExecute(ResultSet resultSet) throws Exception {
    when(connection.prepareCall(any(String.class))).thenReturn(callableStatement);
    lenient().when(callableStatement.getObject(1)).thenReturn(resultSet);
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



