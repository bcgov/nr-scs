package ca.bc.gov.nrs.scs.backend.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;

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
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ClientContactSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.contacts.ScaleSiteContactUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.ScaleSiteContactRecord;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;

@ExtendWith(MockitoExtension.class)
class ScaleSiteContactRepositoryTest {

  private static final String CONTACT_VW_SEARCH_SQL =
      "{ ? = call scs_scale_site_contact_vw_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String CONTACT_SELECT_SQL =
      "{ ? = call scs_scale_site_contact_pkg.select_rec(?, ?) }";
  private static final String CONTACT_INSERT_SQL =
      "{ ? = call scs_scale_site_contact_pkg.insert_rec(?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String CONTACT_UPDATE_SQL =
      "{ ? = call scs_scale_site_contact_pkg.update_rec(?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String CONTACT_DELETE_SQL =
      "{ call scs_scale_site_contact_pkg.delete_rec(?, ?) }";
  private static final String CLIENT_CONTACT_SEARCH_SQL =
      "{ ? = call scs_client_contact_pkg.search_recs(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) }";
  private static final String CLIENT_CONTACT_SELECT_SQL =
      "{ ? = call scs_client_contact_pkg.select_rec(?) }";

  @Mock
  private JdbcTemplate jdbcTemplate;
  @Mock
  private Connection connection;
  @Mock
  private CallableStatement callableStatement;

  private ScaleSiteContactRepository repository;

  @BeforeEach
  void setUp() {
    repository = new ScaleSiteContactRepository(jdbcTemplate);
  }

  @Test
  void getContactsForSite_executesViewSearchAndMapsRows() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);
    when(resultSet.getString("scale_site_id_nmbr")).thenReturn("SITE001");
    when(resultSet.getString("primary_contact_ind")).thenReturn("Y");
    when(resultSet.getString("contact_name")).thenReturn("John Smith");
    when(resultSet.getString("contact_role_desc")).thenReturn("Site Manager");
    when(resultSet.getString("business_phone")).thenReturn("250-555-1234");
    when(resultSet.getString("site_information_access_ind")).thenReturn("Y");

    List<ScaleSiteContactRecord> out = repository.getContactsForSite("SITE001");

    assertEquals(1, out.size());
    ScaleSiteContactRecord first = out.getFirst();
    assertEquals(12345L, first.clientContactId());
    assertEquals("SITE001", first.scaleSiteIdNmbr());
    assertEquals(YesNo.Y, first.primaryContactInd());
    assertEquals("John Smith", first.contactName());
    assertEquals("Site Manager", first.contactRoleDescription());
    assertEquals(YesNo.Y, first.siteInformationAccessInd());
    verify(connection).prepareCall(CONTACT_VW_SEARCH_SQL);
    verify(callableStatement).setNull(2, Types.NUMERIC);
    verify(callableStatement).setString(3, "SITE001");
    verify(callableStatement).setInt(11, 1);
    verify(callableStatement).setNull(12, Types.NUMERIC);
  }

  @Test
  void getContact_executesSelectRecAndMapsRecord() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);
    when(resultSet.getString("scale_site_id_nmbr")).thenReturn("SITE001");
    when(resultSet.getString("primary_contact_ind")).thenReturn("N");
    when(resultSet.getString("contact_role_description")).thenReturn("Site Manager");
    when(resultSet.getString("site_information_access_ind")).thenReturn("Y");
    when(resultSet.getDate("effective_date")).thenReturn(Date.valueOf(LocalDate.of(2024, 1, 1)));
    when(resultSet.getString("entry_userid")).thenReturn("USER1");

    ScaleSiteContactRecord out = repository.getContact("SITE001", 12345L);

    assertEquals(12345L, out.clientContactId());
    assertEquals("SITE001", out.scaleSiteIdNmbr());
    assertEquals(YesNo.N, out.primaryContactInd());
    assertEquals("Site Manager", out.contactRoleDescription());
    assertEquals(LocalDate.of(2024, 1, 1), out.effectiveDate());
    assertEquals("USER1", out.entryUserid());
    verify(connection).prepareCall(CONTACT_SELECT_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setLong(3, 12345L);
  }

  @Test
  void getContact_doesNotFetchClientContactPersonDetails() throws Exception {
    // getContact reads only SCALE_SITE_CONTACT; person fields stay null (the service enriches).
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);
    when(resultSet.getString("primary_contact_ind")).thenReturn("Y");
    when(resultSet.getString("contact_role_description")).thenReturn("Site Manager");

    ScaleSiteContactRecord out = repository.getContact("SITE001", 12345L);

    assertNull(out.contactName());
    assertNull(out.businessPhone());
    assertNull(out.cellPhone());
    assertNull(out.faxNumber());
    assertNull(out.emailAddress());
    verify(connection).prepareCall(CONTACT_SELECT_SQL);
    // No second round-trip to CLIENT_CONTACT.
    verify(connection, never()).prepareCall(CLIENT_CONTACT_SELECT_SQL);
  }

  @Test
  void getClientContact_executesSelectRecAndMapsPersonRecord() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);
    when(resultSet.getString("contact_name")).thenReturn("John Smith");
    when(resultSet.getString("business_phone")).thenReturn("250-555-1234");
    when(resultSet.getString("cell_phone")).thenReturn("250-555-9012");
    when(resultSet.getString("fax_number")).thenReturn("250-555-5678");
    when(resultSet.getString("email_address")).thenReturn("john.smith@example.com");

    ClientContactRecord out = repository.getClientContact(12345L);

    assertEquals(12345L, out.clientContactId());
    assertEquals("John Smith", out.contactName());
    assertEquals("250-555-1234", out.businessPhone());
    assertEquals("250-555-9012", out.cellPhone());
    assertEquals("250-555-5678", out.faxNumber());
    assertEquals("john.smith@example.com", out.emailAddress());
    verify(connection).prepareCall(CLIENT_CONTACT_SELECT_SQL);
    verify(callableStatement).setLong(2, 12345L);
  }

  @Test
  void getClientContact_returnsNullForNullId() {
    assertNull(repository.getClientContact(null));
  }

  @Test
  void getContact_returnsNullWhenCursorEmpty() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(false);

    assertNull(repository.getContact("SITE001", 12345L));
  }

  @Test
  void insertContact_bindsExpectedParametersAndSystemUser() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    repository.insertContact("SITE001", new ScaleSiteContactCreateCommand(
        12345L, "Site Manager", YesNo.Y, YesNo.Y,
        LocalDate.of(2024, 1, 1), LocalDate.of(2030, 1, 1)));

    verify(connection).prepareCall(CONTACT_INSERT_SQL);
    verify(callableStatement).registerOutParameter(1, oracle.jdbc.OracleTypes.CURSOR);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setLong(3, 12345L);
    verify(callableStatement).setString(4, "Site Manager");
    verify(callableStatement).setString(5, "Y");
    verify(callableStatement).setString(6, "Y");
    verify(callableStatement).setDate(7, Date.valueOf(LocalDate.of(2024, 1, 1)));
    verify(callableStatement).setDate(8, Date.valueOf(LocalDate.of(2030, 1, 1)));
    verify(callableStatement).setString(9, "SYSTEM");
    verify(callableStatement).setString(10, "SYSTEM");
  }

  @Test
  void updateContact_bindsExpectedParametersAndNullExpiry() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    repository.updateContact("SITE001", 12345L, new ScaleSiteContactUpdateCommand(
        "Site Manager", YesNo.N, YesNo.Y, LocalDate.of(2024, 1, 1), null));

    verify(connection).prepareCall(CONTACT_UPDATE_SQL);
    verify(callableStatement).setString(2, "SITE001");
    verify(callableStatement).setLong(3, 12345L);
    verify(callableStatement).setString(4, "Site Manager");
    verify(callableStatement).setString(5, "N");
    verify(callableStatement).setString(6, "Y");
    verify(callableStatement).setDate(7, Date.valueOf(LocalDate.of(2024, 1, 1)));
    verify(callableStatement).setNull(8, Types.DATE);
    verify(callableStatement).setString(9, "SYSTEM");
    verify(callableStatement).setString(10, "SYSTEM");
  }

  @Test
  void deleteContact_executesDeleteProcedureWithExpectedParameters() throws Exception {
    stubExecuteNoResult();

    repository.deleteContact("SITE001", 12345L);

    verify(connection).prepareCall(CONTACT_DELETE_SQL);
    verify(callableStatement).setString(1, "SITE001");
    verify(callableStatement).setLong(2, 12345L);
    verify(callableStatement).execute();
  }

  @Test
  void searchClientContacts_alwaysFiltersToSiBusinessContactCode() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);
    when(resultSet.getString("contact_name")).thenReturn("John Smith");
    when(resultSet.getString("client_number")).thenReturn("12345678");
    when(resultSet.getString("business_phone")).thenReturn("250-555-1234");

    List<ClientContactSearchEntry> out = repository.searchClientContacts(null, "12345678", "00", "smith");

    assertEquals(1, out.size());
    assertEquals(12345L, out.getFirst().clientContactId());
    assertEquals("John Smith", out.getFirst().contactName());
    assertEquals("12345678", out.getFirst().clientNumber());
    verify(connection).prepareCall(CLIENT_CONTACT_SEARCH_SQL);
    verify(callableStatement).setNull(2, Types.NUMERIC);
    verify(callableStatement).setString(3, "12345678");
    verify(callableStatement).setString(4, "00");
    verify(callableStatement).setString(5, "SI");
    verify(callableStatement).setString(6, "smith");
  }

  @Test
  void primaryContactExists_trueWhenAnyContactIsPrimary() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("primary_contact_ind")).thenReturn("Y");

    assertTrue(repository.primaryContactExists("SITE001"));
  }

  @Test
  void primaryContactExists_falseWhenNoPrimaryContact() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getString("primary_contact_ind")).thenReturn("N");

    assertFalse(repository.primaryContactExists("SITE001"));
  }

  @Test
  void contactExists_trueWhenContactFound() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);

    assertTrue(repository.contactExists("SITE001", 12345L));
  }

  @Test
  void contactExists_falseWhenContactMissing() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(false);

    assertFalse(repository.contactExists("SITE001", 99999L));
  }

  @Test
  void clientContactExists_trueWhenSiClientContactFound() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(true, false);
    when(resultSet.getObject("client_contact_id")).thenReturn(12345L);
    when(resultSet.getLong("client_contact_id")).thenReturn(12345L);

    assertTrue(repository.clientContactExists(12345L));
    verify(callableStatement).setLong(2, 12345L);
    verify(callableStatement).setString(5, "SI");
  }

  @Test
  void clientContactExists_falseWhenNoSiClientContact() throws Exception {
    ResultSet resultSet = mock(ResultSet.class, withSettings().strictness(Strictness.LENIENT));
    stubExecute(resultSet);

    when(resultSet.next()).thenReturn(false);

    assertFalse(repository.clientContactExists(99999L));
  }

  @Test
  void clientContactExists_falseWhenIdIsNull() {
    assertFalse(repository.clientContactExists(null));
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
