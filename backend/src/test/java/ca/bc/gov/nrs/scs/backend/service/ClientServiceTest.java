package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.Client;
import ca.bc.gov.nrs.scs.backend.model.HaulMarkAuthorization;
import ca.bc.gov.nrs.scs.backend.model.Health;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;
import ca.bc.gov.nrs.scs.backend.repository.HaulMarkAuthorizationRepository;
import ca.bc.gov.nrs.scs.backend.repository.MarkSiteDesignationRepository;

@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

  @Mock private ClientRepository repository;

  private ClientService service;

  @BeforeEach
  void setUp() {
    service = new ClientService(repository);
  }

  @Test
  void searchClients_uppercasesFreeTextThenDelegatesToRepository() {
    // Free-text fields are uppercased so the (immutable) search package's UPPER()-based
    // comparison is case-insensitive; phone numbers and the client number are left as-is
    // (the client number is zero-padded downstream, not case-normalized).
    List<Client> expected = List.of(new Client().client("A"));
    when(repository.searchClients("A", "CO", "LAST", "FIRST", "CITY", "111", "222", "X@Y.COM", "1", "01", 1, 2))
        .thenReturn(expected);

    List<Client> result =
        service.searchClients("a", "Co", "Last", "First", "City", "111", "222", "x@y.com", "1", "01", 1, 2);

    assertEquals(expected, result);
    verify(repository).searchClients("A", "CO", "LAST", "FIRST", "CITY", "111", "222", "X@Y.COM", "1", "01", 1, 2);
  }

  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  private static void authenticateClientRestricted(String clientNumber) {
    SecurityContextHolder.getContext().setAuthentication(
        new ScsAuthenticationToken("guid", List.of(), UserAccessScope.ofClients(Set.of(clientNumber))));
  }

  @Test
  void searchClients_clientRestrictedUser_overridesTheRequestedClientNumber() {
    // The matrix limits "Queries – Clients – Results" for external roles, so their own client is
    // substituted for whatever the request asked for — they cannot search another client's rows.
    authenticateClientRestricted("00001074");
    when(repository.searchClients(null, null, null, null, null, null, null, null, "00001074", null, 1, 0))
        .thenReturn(List.of(new Client().clientNumber("00001074")));

    service.searchClients(null, null, null, null, null, null, null, null, "00009999", null, 1, 0);

    verify(repository)
        .searchClients(null, null, null, null, null, null, null, null, "00001074", null, 1, 0);
  }

  @Test
  void searchClients_clientRestrictedUser_wildcardCannotWidenTheScope() {
    // "%" reaches the package's LIKE unpadded, so an unforced value would match every client.
    authenticateClientRestricted("00001074");
    when(repository.searchClients(null, null, null, null, null, null, null, null, "00001074", null, 1, 0))
        .thenReturn(List.of());

    service.searchClients(null, null, null, null, null, null, null, null, "%", null, 1, 0);

    verify(repository)
        .searchClients(null, null, null, null, null, null, null, null, "00001074", null, 1, 0);
  }

  @Test
  void searchClients_internalUser_passesTheRequestedClientNumberThrough() {
    // No authentication in the context => not client-restricted => whole register, as legacy did.
    when(repository.searchClients(null, null, null, null, null, null, null, null, "00009999", null, 1, 0))
        .thenReturn(List.of());

    service.searchClients(null, null, null, null, null, null, null, null, "00009999", null, 1, 0);

    verify(repository)
        .searchClients(null, null, null, null, null, null, null, null, "00009999", null, 1, 0);
  }
}

@ExtendWith(MockitoExtension.class)
class HaulMarkAuthorizationServiceCoverageTest {

  @Mock private HaulMarkAuthorizationRepository repository;

  private HaulMarkAuthorizationService service;

  @BeforeEach
  void setUp() {
    service = new HaulMarkAuthorizationService(repository);
  }

  @Test
  void searchHaulMarkAuthorizations_delegatesToRepository() {
    LocalDate effective = LocalDate.of(2026, 1, 1);
    LocalDate expiry = LocalDate.of(2026, 12, 31);
    List<HaulMarkAuthorization> expected = List.of(new HaulMarkAuthorization().timberMark("TM1"));
    when(repository.searchHaulMarkAuthorizations(10L, "TM1", effective, expiry, "Org", 1, 2))
        .thenReturn(expected);

    List<HaulMarkAuthorization> result =
        service.searchHaulMarkAuthorizations(10L, "TM1", effective, expiry, "Org", 1, 2);

    assertEquals(expected, result);
    verify(repository).searchHaulMarkAuthorizations(10L, "TM1", effective, expiry, "Org", 1, 2);
  }
}

class HealthServiceCoverageTest {

  @Test
  void checkHealth_returnsOkStatus() {
    HealthService service = new HealthService();

    Health health = service.checkHealth();

    assertEquals("ok", health.getStatus());
  }
}

@ExtendWith(MockitoExtension.class)
class MarkSiteDesignationServiceCoverageTest {

  @Mock private MarkSiteDesignationRepository repository;

  private MarkSiteDesignationService service;

  @BeforeEach
  void setUp() {
    service = new MarkSiteDesignationService(repository);
  }

  @Test
  void removeMarkSiteDesignationFromWorkbench_throwsWhenNotFound() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(false);

    assertThrows(ResourceNotFoundException.class, () -> service.removeMarkSiteDesignationFromWorkbench(1L));
  }

  @Test
  void removeMarkSiteDesignationFromWorkbench_succeedsWhenFound() {
    when(repository.setExpiryNotificationInd(1L, "Y")).thenReturn(true);

    service.removeMarkSiteDesignationFromWorkbench(1L);

    verify(repository).setExpiryNotificationInd(1L, "Y");
  }
}
