package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.SystemSetting;
import ca.bc.gov.nrs.scs.backend.model.SystemSettingUpdateRequest;
import ca.bc.gov.nrs.scs.backend.model.WelcomeSummary;
import ca.bc.gov.nrs.scs.backend.domain.shared.OrgUnitRecord;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.repository.OrgUnitRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository;
import ca.bc.gov.nrs.scs.backend.repository.SystemSettingRepository.SystemSettingRecord;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class WelcomeServiceTest {

  @Mock private SystemSettingRepository systemSettingRepository;
  @Mock private OrgUnitRepository orgUnitRepository;
  @Mock private ClientRepository clientRepository;

  private WelcomeService service;

  @BeforeEach
  void setUp() {
    service = new WelcomeService(systemSettingRepository, orgUnitRepository, clientRepository);
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void buildWelcomeSummary_setsDefinedAppFieldsAndNewsAndOrgWhenAllPresent() {
    ReflectionTestUtils.setField(service, "appVersion", "2.0.1");
    ReflectionTestUtils.setField(service, "appEnvironment", "prod");
    ReflectionTestUtils.setField(service, "serverName", "node-1");
    ReflectionTestUtils.setField(service, "welcomeSettingKey", "WMSG");

    when(orgUnitRepository.findByOrgUnitNo(10L))
      .thenReturn(Optional.of(new OrgUnitRecord(10L, "DSE", "Duncan")));
    when(systemSettingRepository.findSystemSettingValue("WMSG"))
      .thenReturn(Optional.of("System maintenance"));

    WelcomeSummary summary = service.buildWelcomeSummary(null, null, 10L);

    assertEquals("2.0.1", summary.getApplicationVersion().get());
    assertEquals("prod", summary.getApplicationEnvironment().get());
    assertEquals("node-1", summary.getServerName().get());
    assertEquals("DSE - Duncan", summary.getUserOrganization().get());
    assertEquals("System maintenance", summary.getCurrentNews().get());
    verify(systemSettingRepository).findSystemSettingValue("WMSG");
  }

  @Test
  void buildWelcomeSummary_usesNameWhenCodeBlank() {
    ReflectionTestUtils.setField(service, "welcomeSettingKey", "WMSG");
    when(orgUnitRepository.findByOrgUnitNo(11L))
      .thenReturn(Optional.of(new OrgUnitRecord(11L, " ", "Nanaimo")));
    when(systemSettingRepository.findSystemSettingValue("WMSG"))
      .thenReturn(Optional.empty());

    WelcomeSummary summary = service.buildWelcomeSummary(null, null, 11L);

    assertEquals("Nanaimo", summary.getUserOrganization().get());
    assertFalse(summary.getCurrentNews().isPresent());
  }

  @Test
  void buildWelcomeSummary_usesCodeWhenNameBlank() {
    ReflectionTestUtils.setField(service, "welcomeSettingKey", "WMSG");
    when(orgUnitRepository.findByOrgUnitNo(12L))
      .thenReturn(Optional.of(new OrgUnitRecord(12L, "DCC", "  ")));
    when(systemSettingRepository.findSystemSettingValue("WMSG"))
      .thenReturn(Optional.empty());

    WelcomeSummary summary = service.buildWelcomeSummary(null, null, 12L);

    assertEquals("DCC", summary.getUserOrganization().get());
  }

  @Test
  void buildWelcomeSummary_setsUndefinedOrgWhenCodeAndNameBlank() {
    ReflectionTestUtils.setField(service, "welcomeSettingKey", "WMSG");
    when(orgUnitRepository.findByOrgUnitNo(13L))
      .thenReturn(Optional.of(new OrgUnitRecord(13L, " ", " ")));
    when(systemSettingRepository.findSystemSettingValue("WMSG"))
      .thenReturn(Optional.empty());

    WelcomeSummary summary = service.buildWelcomeSummary(null, null, 13L);

    assertFalse(summary.getUserOrganization().isPresent());
  }

  @Test
  void buildWelcomeSummary_setsUndefinedForBlankConfiguredAppFieldsAndNullNews() {
    ReflectionTestUtils.setField(service, "appVersion", " ");
    ReflectionTestUtils.setField(service, "appEnvironment", "");
    ReflectionTestUtils.setField(service, "serverName", null);
    ReflectionTestUtils.setField(service, "welcomeSettingKey", "WMSG");

    when(orgUnitRepository.findByOrgUnitNo(null)).thenReturn(Optional.empty());
    when(systemSettingRepository.findSystemSettingValue("WMSG"))
      .thenReturn(Optional.empty());

    WelcomeSummary summary = service.buildWelcomeSummary(null, null, null);

    assertFalse(summary.getApplicationVersion().isPresent());
    assertFalse(summary.getApplicationEnvironment().isPresent());
    assertFalse(summary.getServerName().isPresent());
    assertFalse(summary.getUserOrganization().isPresent());
    assertFalse(summary.getCurrentNews().isPresent());
    verify(orgUnitRepository).findByOrgUnitNo(null);
  }

  @Test
  void buildWelcomeSummary_clientRestrictedUser_showsClientOrganization() {
    // External (client-restricted) user: Organization is "{companyName} - {clientNumber}", resolved
    // from the client view — not the org-unit lookup.
    ReflectionTestUtils.setField(service, "welcomeSettingKey", "WMSG");
    SecurityContextHolder.getContext().setAuthentication(
        new ScsAuthenticationToken("guid", List.of(), UserAccessScope.ofClients(Set.of("00001074"))));
    when(clientRepository.findCompanyName("00001074")).thenReturn("ACME LTD");
    when(systemSettingRepository.findSystemSettingValue("WMSG")).thenReturn(Optional.empty());

    WelcomeSummary summary = service.buildWelcomeSummary(null, null, null);

    assertEquals("ACME LTD - 00001074", summary.getUserOrganization().get());
  }
}

@ExtendWith(MockitoExtension.class)
class SystemSettingServiceCoverageTest {

  @Mock private SystemSettingRepository repository;

  private SystemSettingService service;

  @BeforeEach
  void setUp() {
    service = new SystemSettingService(repository);
  }

  @Test
  void getSystemSetting_throwsWhenKeyMissing() {
    assertThrows(BadRequestException.class, () -> service.getSystemSetting("  "));
  }

  @Test
  void getSystemSetting_throwsWhenNotFound() {
    when(repository.getSystemSetting("WMSG")).thenReturn(null);

    assertThrows(ResourceNotFoundException.class, () -> service.getSystemSetting(" wmsg "));
  }

  @Test
  void getSystemSetting_returnsMappedModel() {
    OffsetDateTime now = OffsetDateTime.parse("2026-05-05T10:15:30Z");
    when(repository.getSystemSetting("WMSG"))
        .thenReturn(new SystemSettingRecord("WMSG", "desc", "value", now, "entry", now, "update", 2L));

    SystemSetting result = service.getSystemSetting(" wmsg ");

    assertEquals("WMSG", result.getSettingKey());
    assertEquals("desc", result.getDescription());
    assertEquals("value", result.getSystemSettingValue());
  }

  @Test
  void updateSystemSetting_throwsWhenKeyMissing() {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("x");

    assertThrows(BadRequestException.class, () -> service.updateSystemSetting(" ", request));
  }

  @Test
  void updateSystemSetting_throwsWhenRequestMissing() {
    assertThrows(BadRequestException.class, () -> service.updateSystemSetting("WMSG", null));
  }

  @Test
  void updateSystemSetting_createsNewWithCurrentNewsDefaultDescription() {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("hello");
    SystemSettingRecord saved = new SystemSettingRecord("WMSG", "Current News - Welcome Message for SCS Home Page", "hello", null, "SYSTEM", null, "SYSTEM", 1L);
    when(repository.getSystemSetting("WMSG")).thenReturn(null);
    when(repository.createSystemSetting(anyString(), anyString(), anyString(), anyString(), anyString()))
        .thenReturn(saved);

    SystemSetting result = service.updateSystemSetting("wmsg", request);

    assertEquals("WMSG", result.getSettingKey());
    verify(repository).createSystemSetting("WMSG", "Current News - Welcome Message for SCS Home Page", "hello", "SYSTEM", "SYSTEM");
  }

  @Test
  void updateSystemSetting_updatesExistingWithExistingDescription() {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("new-value");
    SystemSettingRecord existing = new SystemSettingRecord("OTHER", "Existing Desc", "old", null, "entryUser", null, "updater", 1L);
    SystemSettingRecord updated = new SystemSettingRecord("OTHER", "Existing Desc", "new-value", null, "entryUser", null, "SYSTEM", 2L);
    when(repository.getSystemSetting("OTHER")).thenReturn(existing);
    when(repository.updateSystemSetting("OTHER", "Existing Desc", "new-value", "entryUser", "SYSTEM"))
        .thenReturn(updated);

    SystemSetting result = service.updateSystemSetting("other", request);

    assertEquals("new-value", result.getSystemSettingValue());
  }

  @Test
  void updateSystemSetting_throwsWhenSaveReturnsNull() {
    SystemSettingUpdateRequest request = new SystemSettingUpdateRequest();
    request.setSystemSettingValue("x");
    when(repository.getSystemSetting("ABC")).thenReturn(null);
    when(repository.createSystemSetting("ABC", "System setting ABC", "x", "SYSTEM", "SYSTEM"))
        .thenReturn(null);

    assertThrows(BadRequestException.class, () -> service.updateSystemSetting("abc", request));
  }
}

@ExtendWith(MockitoExtension.class)
class WarmUpServiceCoverageTest {

  @Mock private JdbcTemplate jdbcTemplate;
  @Mock private DataSource dataSource;

  @Test
  void warmUp_executesQuery() {
    WarmUpService service = new WarmUpService();
    ReflectionTestUtils.setField(service, "jdbcTemplate", jdbcTemplate);
    ReflectionTestUtils.setField(service, "dataSource", dataSource);
    when(jdbcTemplate.queryForObject("SELECT 1 FROM DUAL", Integer.class)).thenReturn(1);

    assertDoesNotThrow(service::warmUp);
    verify(jdbcTemplate).queryForObject("SELECT 1 FROM DUAL", Integer.class);
  }

  @Test
  void warmUp_swallowException() {
    WarmUpService service = new WarmUpService();
    ReflectionTestUtils.setField(service, "jdbcTemplate", jdbcTemplate);
    ReflectionTestUtils.setField(service, "dataSource", dataSource);
    doThrow(new RuntimeException("db down"))
        .when(jdbcTemplate)
        .queryForObject("SELECT 1 FROM DUAL", Integer.class);

    assertDoesNotThrow(service::warmUp);
  }

  @Test
  void describeCauses_reportsTheWholeChainDownToTheRootCause() {
    Exception root = new java.net.ConnectException("Connection refused");
    Exception oracle = new java.sql.SQLRecoverableException("IO Error: The Network Adapter could not establish the connection", root);
    Exception spring = new RuntimeException("Failed to obtain JDBC Connection", oracle);

    org.junit.jupiter.api.Assertions.assertEquals(
        "RuntimeException: Failed to obtain JDBC Connection"
            + " <- SQLRecoverableException: IO Error: The Network Adapter could not establish the connection"
            + " <- ConnectException: Connection refused",
        WarmUpService.describeCauses(spring));
  }
}
