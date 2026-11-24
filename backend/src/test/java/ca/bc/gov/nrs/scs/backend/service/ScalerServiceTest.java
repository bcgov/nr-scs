package ca.bc.gov.nrs.scs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.Scaler;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerAddressRecord;
import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceStatus;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceTypeEntry;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.shared.YesNo;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.exception.ResourceNotFoundException;
import ca.bc.gov.nrs.scs.backend.model.ScalerResult;
import ca.bc.gov.nrs.scs.backend.model.Client;
import ca.bc.gov.nrs.scs.backend.model.ScalerAddress;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummary;
import ca.bc.gov.nrs.scs.backend.model.ScalerTombstone;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.security.ScsAuthenticationToken;
import ca.bc.gov.nrs.scs.backend.security.UserAccessScope;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScalerService tests")
class ScalerServiceTest {

  @Mock
  private ScalerRepository scalerRepository;

  @Mock
  private ClientRepository clientRepository;

  @Mock
  private ScalerExamService scalerExamService;

  @Mock
  private ScalerAppointmentService scalerAppointmentService;

  @Mock
  private ClientScopeGuard clientScopeGuard;

  @InjectMocks
  private ScalerService service;

  @Nested
  @DisplayName("scalerExists")
  class ScalerExists {
    @Test
    @DisplayName("true when found, false when missing, skips lookup when blank")
    void reflectsExistence() {
      when(scalerRepository.getScalerSummaryCore("AAAA")).thenReturn(stubSummary("AAAA"));
      when(scalerRepository.getScalerSummaryCore("ZZZZ")).thenReturn(null);

      assertTrue(service.scalerExists("AAAA"));
      assertFalse(service.scalerExists("ZZZZ"));
      assertFalse(service.scalerExists("   "));

      verify(scalerRepository, never()).getScalerSummaryCore("   ");
    }

    @Test
    @DisplayName("folds case so a lower-case licence resolves the stored upper-case record")
    void foldsCaseBeforeLookup() {
      // Licence numbers are stored upper-case and the repository binds the value straight into the
      // SP, so without folding here `001b` reported the scaler as non-existent and the check-scale
      // save was rejected against a licence that really does exist.
      when(scalerRepository.getScalerSummaryCore("001B")).thenReturn(stubSummary("001B"));

      assertTrue(service.scalerExists("001b"));
      assertTrue(service.scalerExists("  001b  "));

      verify(scalerRepository, never()).getScalerSummaryCore("001b");
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers — domain fixtures
  // ---------------------------------------------------------------------------

  private static final LocalDate ISSUED = LocalDate.of(2025, 1, 15);

  private ScalerAppointmentCommand appointment(String type, YesNo provinceWide, LocalDate expiry) {
    return new ScalerAppointmentCommand(type, "BC", 1234L, provinceWide, ISSUED, expiry, null, null);
  }

  private ScalerExamCommand exam() {
    return new ScalerExamCommand("1", LocalDate.of(2025, 2, 1));
  }

  private ScalerCreateCommand createCommand(
      Long orgUnitNo,
      LocalDate expiryDate,
      List<ScalerLicenceType> licenceTypes,
      ScalerAppointmentCommand appointment,
      ScalerExamCommand exam) {
    return new ScalerCreateCommand(
        "12345678", orgUnitNo, ISSUED, expiryDate, YesNo.Y, null, licenceTypes, appointment, exam);
  }

  private ScalerCreateCommand minimalCreateCommand() {
    return createCommand(
        1234L, null, List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), null);
  }

  private ScalerUpdateCommand updateCommand(
      String licNo,
      String clientNumber,
      boolean cancelledDateProvided,
      LocalDate cancelledDate,
      List<ScalerLicenceType> licenceTypes,
      ScalerAppointmentCommand appointment,
      ScalerExamCommand exam) {
    return new ScalerUpdateCommand(
        licNo, clientNumber, 1234L, ISSUED, null, YesNo.Y,
        cancelledDateProvided, cancelledDate, licenceTypes, appointment, exam);
  }

  private ScalerUpdateCommand minimalUpdateCommand(String licNo) {
    return updateCommand(
        licNo, "12345678", false, null,
        List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), null);
  }

  private Scaler stubScaler(String licNo) {
    return stubScaler(licNo, null, null, null);
  }

  private Scaler stubScaler(
      String licNo,
      LocalDate licenceCancelledDate,
      ScalerAppointmentRecord appointment,
      ScalerExamRecord exam) {
    return new Scaler(
        licNo, "12345678", 1234L, ISSUED, null, YesNo.Y, licenceCancelledDate,
        List.of(ScalerLicenceType.SCS), appointment, exam,
        null, null, null, null, null);
  }

  private ScalerAppointmentRecord existingAppointmentRow() {
    return new ScalerAppointmentRecord(
        5001L, "1234", "FORS", "BC", null, YesNo.Y, ISSUED, null, null, null,
        null, null, null, null, null);
  }

  private ScalerExamRecord existingExamRow() {
    return new ScalerExamRecord(
        "1234", "A", "1", LocalDate.of(2025, 2, 1), null, null, null, null, null);
  }

  private ScalerSummaryCore stubSummary(String licNo) {
    return new ScalerSummaryCore(licNo, "12345678", null, ISSUED, null, null, null);
  }

  // ---------------------------------------------------------------------------
  // createScaler
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("createScaler")
  class CreateScaler {

    @Test
    @DisplayName("orchestrates insert steps and returns the reloaded aggregate")
    void createScaler_orchestratesInsertFlow() {
      ScalerCreateCommand cmd = minimalCreateCommand();
      mockClientExists("12345678");

      when(scalerRepository.insertScaler(cmd)).thenReturn("9999");
      when(scalerRepository.getScaler("9999")).thenReturn(stubScaler("9999"));

      Scaler result = service.createScaler(cmd);

      assertNotNull(result);
      assertEquals("9999", result.scalerLicenceNo());
      verify(scalerRepository).insertScaler(cmd);
      verify(scalerRepository).insertAssignedLicType("9999", "SCS");
      verify(scalerAppointmentService).createScalerAppointment("9999", cmd.appointment());
      verify(scalerRepository).getScaler("9999");
    }

    @Test
    @DisplayName("delegates to ScalerExamService when appointment is not provided")
    void createScaler_usesExamWhenNoAppointment() {
      ScalerCreateCommand cmd = createCommand(
          1234L, null, List.of(ScalerLicenceType.SCS), null, exam());
      mockClientExists("12345678");

      when(scalerRepository.insertScaler(cmd)).thenReturn("1234");
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      Scaler result = service.createScaler(cmd);

      assertNotNull(result);
      verify(scalerRepository).insertScaler(cmd);
      verify(scalerRepository).insertAssignedLicType("1234", "SCS");
      verify(scalerExamService).createScalerExam("1234", cmd.exam());
      verify(scalerAppointmentService, never()).createScalerAppointment(any(), any());
      verify(scalerRepository).getScaler("1234");
    }

    @Test
    @DisplayName("rejects when Scaling has both appointment and exam")
    void createScaler_rejectsWhenScalingHasBothAppointmentAndExam() {
      ScalerCreateCommand cmd = createCommand(
          1234L, null, List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), exam());

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaler(cmd));

      assertEquals("When Scaling is selected, exactly one of appointment or exam is required.", ex.getMessage());
      verify(scalerRepository, never()).insertScaler(any());
    }

    @Test
    @DisplayName("rejects when Scaling has neither appointment nor exam")
    void createScaler_rejectsWhenScalingHasNeitherAppointmentNorExam() {
      ScalerCreateCommand cmd = createCommand(
          1234L, null, List.of(ScalerLicenceType.SCS), null, null);

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaler(cmd));

      assertEquals("When Scaling is selected, exactly one of appointment or exam is required.", ex.getMessage());
      verify(scalerRepository, never()).insertScaler(any());
    }

    @Test
    @DisplayName("rejects when Waste is selected without licence expiry")
    void createScaler_rejectsWasteWithoutLicenceExpiry() {
      ScalerCreateCommand cmd = createCommand(
          1234L, null, List.of(ScalerLicenceType.SCS, ScalerLicenceType.WA),
          appointment("FORS", YesNo.Y, null), null);

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaler(cmd));

      assertEquals("Licence expiry date is required when Waste is selected.", ex.getMessage());
      verify(scalerRepository, never()).insertScaler(any());
    }

    @Test
    @DisplayName("rejects appointment details when Scaling is not selected")
    void createScaler_rejectsAppointmentWithoutScaling() {
      ScalerCreateCommand cmd = createCommand(
          1234L, LocalDate.of(2026, 1, 15), List.of(ScalerLicenceType.WA),
          appointment("FORS", YesNo.Y, null), null);

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaler(cmd));

      assertEquals("Appointment or exam details can only be provided when Scaling is selected.", ex.getMessage());
      verify(scalerRepository, never()).insertScaler(any());
    }

    @Test
    @DisplayName("rejects when scaler effective date is after licence expiry")
    void createScaler_rejectsInvalidCoreDateOrder() {
      ScalerCreateCommand cmd = createCommand(
          1234L, LocalDate.of(2024, 12, 31), List.of(ScalerLicenceType.SCS),
          appointment("FORS", YesNo.Y, null), null);

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaler(cmd));

      assertEquals("Scaler effective date must be on or before the licence expiry date.", ex.getMessage());
      verify(scalerRepository, never()).insertScaler(any());
    }

    @Test
    @DisplayName("rejects when client number does not exist at location 00")
    void createScaler_rejectsUnknownClient() {
      ScalerCreateCommand cmd = minimalCreateCommand();
      when(clientRepository.searchClients(
          any(), any(), any(), any(), any(), any(), any(), any(),
          eq("12345678"), eq("00"), eq(1), eq(1)))
          .thenReturn(List.of());

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.createScaler(cmd));

      assertEquals("No client found for client number 12345678 at location 00.", ex.getMessage());
      verify(scalerRepository, never()).insertScaler(any());
    }

    @Test
    @DisplayName("rejects with a clientNumber field error when the client already has a scaler")
    void createScaler_rejectsWhenClientAlreadyHasScaler() {
      ScalerCreateCommand cmd = minimalCreateCommand();
      mockClientExists("12345678");
      when(scalerRepository.searchScalers(
          null, "12345678", null, null, null, null, null, null, 1, 0))
          .thenReturn(List.of(new ScalerSearchEntry("1234", null, null, null, null, null, null)));

      FieldValidationException ex =
          assertThrows(FieldValidationException.class, () -> service.createScaler(cmd));

      assertEquals(1, ex.getFieldErrors().size());
      assertEquals("clientNumber", ex.getFieldErrors().get(0).field());
      assertEquals("A scaler already exists for this client.", ex.getFieldErrors().get(0).message());
      verify(scalerRepository, never()).insertScaler(any());
    }

  }

  // ---------------------------------------------------------------------------
  // getScaler
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("getScaler")
  class GetScaler {

    @Test
    @DisplayName("returns the aggregate when repository finds the record")
    void getScaler_found_returnsAggregate() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      Scaler result = service.getScaler("1234");

      assertNotNull(result);
      assertEquals("1234", result.scalerLicenceNo());
      verify(scalerRepository).getScaler("1234");
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when repository returns null")
    void getScaler_notFound_throwsResourceNotFoundException() {
      when(scalerRepository.getScaler("XXXX")).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.getScaler("XXXX"));

      assertEquals("No scaler found with licence number XXXX", ex.getMessage());
    }

    @Test
    @DisplayName("exception message contains the requested licence number")
    void getScaler_notFound_messageContainsLicenceNo() {
      when(scalerRepository.getScaler("9876")).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.getScaler("9876"));

      assertEquals("No scaler found with licence number 9876", ex.getMessage());
    }
  }

  // ---------------------------------------------------------------------------
  // getScalerSummary
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("getScalerSummary")
  class GetScalerSummary {

    @Test
    @DisplayName("returns composed summary when core exists")
    void getScalerSummary_composesFields() {
      ScalerSummaryCore core = stubSummary("1234");
      List<ScalerLicenceTypeEntry> types = List.of(
          new ScalerLicenceTypeEntry("SCS", "Scale Administration and Control System"));

      when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(core);
      when(scalerRepository.getScalerSummaryLicenceTypes("1234")).thenReturn(types);
      when(scalerRepository.getScalerSummaryStatus("1234")).thenReturn(ScalerLicenceStatus.VALID);

      ScalerSummary result = service.getScalerSummary("1234");

      assertNotNull(result);
      assertEquals("1234", result.getScalerLicenceNo().get());
      assertEquals("VALID", result.getLicenceStatus().get());
      assertEquals(1, result.getLicenceTypes().get().size());
      verify(scalerRepository).getScalerSummaryCore("1234");
      verify(scalerRepository).getScalerSummaryLicenceTypes("1234");
      verify(scalerRepository).getScalerSummaryStatus("1234");
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when core is null")
    void getScalerSummary_notFound() {
      when(scalerRepository.getScalerSummaryCore("XXXX")).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.getScalerSummary("XXXX"));

      assertEquals("No scaler found with licence number XXXX", ex.getMessage());
      verify(scalerRepository, never()).getScalerSummaryLicenceTypes(any());
      verify(scalerRepository, never()).getScalerSummaryStatus(any());
    }
  }

  // ---------------------------------------------------------------------------
  // searchScalers — projection
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("searchScalers")
  class SearchScalers {

    @AfterEach
    void clearSecurityContext() {
      SecurityContextHolder.clearContext();
    }

    private static void authenticateClientRestricted(String... clientNumbers) {
      SecurityContextHolder.getContext().setAuthentication(
          new ScsAuthenticationToken("guid", List.of(), UserAccessScope.ofClients(Set.of(clientNumbers))));
    }

    private static void authenticateOwner(String clientNumber) {
      SecurityContextHolder.getContext().setAuthentication(new ScsAuthenticationToken(
          "guid",
          List.of(new SimpleGrantedAuthority(Roles.SCS_OWNER)),
          UserAccessScope.ofClients(Set.of(clientNumber))));
    }

    @Test
    @DisplayName("projects each domain search entry to a ScalerResult")
    void searchScalers_projectsEntries() {
      when(scalerRepository.searchScalers(
          "1234", null, null, null, null, null, null, null, 1, 0))
          .thenReturn(List.of(
              new ScalerSearchEntry("1234", "Cariboo", "ACME Ltd", "Jane", "Q", "SCS", "loc")));

      List<ScalerResult> results =
          service.searchScalers("1234", null, null, null, null, null, null, null, 1, 0);

      assertEquals(1, results.size());
      ScalerResult r = results.get(0);
      assertEquals("1234", r.getScalerLicenceNo().get());
      assertEquals("Cariboo", r.getOrgUnitName().get());
      assertEquals("ACME Ltd", r.getClientName().get());
      assertEquals("SCS", r.getLicenceType().get());
    }

    @Test
    @DisplayName("internal user: passes the request's client number straight through")
    void searchScalers_internalUser_passthrough() {
      // No authentication in the context => not client-restricted.
      when(scalerRepository.searchScalers(
          null, "12345678", null, null, null, null, null, null, 1, 0))
          .thenReturn(List.of(
              new ScalerSearchEntry("1234", "Cariboo", "ACME Ltd", "Jane", "Q", "SCS", "loc")));

      List<ScalerResult> results =
          service.searchScalers(null, "12345678", null, null, null, null, null, null, 1, 0);

      assertEquals(1, results.size());
      assertEquals("1234", results.get(0).getScalerLicenceNo().get());
    }

    @Test
    @DisplayName("client-restricted single-client user: overrides the request client with the user's own")
    void searchScalers_clientRestricted_singleClientOverride() {
      authenticateClientRestricted("00001074");
      when(scalerRepository.searchScalers(
          null, "00001074", null, null, null, null, null, null, 1, 0))
          .thenReturn(List.of(
              new ScalerSearchEntry("1111", "Cariboo", "ACME", "A", null, "SCS", "00")));

      // The request tries to pass another client; it must be ignored in favour of the user's own.
      List<ScalerResult> results =
          service.searchScalers(null, "99999999", null, null, null, null, null, null, 1, 0);

      assertEquals(1, results.size());
      assertEquals("1111", results.get(0).getScalerLicenceNo().get());
      verify(scalerRepository, never()).searchScalers(
          any(), eq("99999999"), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("client-restricted user with multiple clients: refused (single client per login only)")
    void searchScalers_clientRestricted_multipleClientsRefused() {
      authenticateClientRestricted("00001074", "00005821");

      assertThrows(ForbiddenException.class, () ->
          service.searchScalers(null, "99999999", null, null, null, null, null, null, 1, 0));
      verify(scalerRepository, never()).searchScalers(
          any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    /**
     * The owner is overridden to their own client exactly like the industry scaler, and the screen renders
     * the field read-only to match — legacy did both (`QueriesScalersSearchAction:103`,
     * `scalerSearch.jsp:37`, each keyed on `isRestrictUserToClient()`).
     *
     * <p>This search is therefore WIDER than what the owner can open: a listed scaler filed under their
     * client but authorized at none of its sites answers 403 on the record read. Those dead links are
     * accepted — the client number is the criterion the screen states, and this is the correct answer to
     * it. Intersecting the result with the scaler scope was implemented and rejected on 2026-08-20,
     * because it makes the stated criterion and the applied one differ. (Decision: Jonah, 2026-08-20.)
     */
    @Test
    @DisplayName("owner: overridden to their own client, same as the Industry Scaler")
    void searchScalers_owner_isOverriddenLikeTheIndustryScaler() {
      authenticateOwner("00001074");
      when(scalerRepository.searchScalers(
          null, "00001074", null, null, null, null, null, null, 1, 0))
          .thenReturn(List.of(
              new ScalerSearchEntry("1111", "Cariboo", "ACME", "A", null, "SCS", "00")));

      List<ScalerResult> results =
          service.searchScalers(null, "99999999", null, null, null, null, null, null, 1, 0);

      assertEquals(1, results.size());
      assertEquals("1111", results.get(0).getScalerLicenceNo().get());
      verify(scalerRepository, never()).searchScalers(
          any(), eq("99999999"), any(), any(), any(), any(), any(), any(), any(), any());
    }

    /**
     * The search must NOT be narrowed to what the record guard admits — pinned because that narrowing was
     * built once and reverted, and is the obvious "fix" for the dead links a reader will reach for.
     */
    @Test
    @DisplayName("owner: the search does not consult the scaler scope, dead links and all")
    void searchScalers_owner_doesNotFilterOnScalerScope() {
      authenticateOwner("00001074");
      when(scalerRepository.searchScalers(
          null, "00001074", null, null, null, null, null, null, 1, 0))
          .thenReturn(List.of(
              new ScalerSearchEntry("1111", "Cariboo", "ACME", "A", null, "SCS", "00")));

      assertEquals(1,
          service.searchScalers(null, null, null, null, null, null, null, null, 1, 0).size(),
          "a row the owner cannot open must still be listed — the client criterion is what was asked");
      verifyNoInteractions(clientScopeGuard);
    }
  }

  // ---------------------------------------------------------------------------
  // client-restriction detail/summary access guard (AC 4)
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("client-restriction access guard")
  class ClientAccessGuard {

    @AfterEach
    void clearSecurityContext() {
      SecurityContextHolder.clearContext();
    }

    private void authenticateClientRestricted(String clientNumber) {
      SecurityContextHolder.getContext().setAuthentication(
          new ScsAuthenticationToken("guid", List.of(), UserAccessScope.ofClients(Set.of(clientNumber))));
    }

    @Test
    @DisplayName("getScaler: own client allowed")
    void getScaler_ownClient_allowed() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234")); // client 12345678
      authenticateClientRestricted("12345678");

      assertEquals("1234", service.getScaler("1234").scalerLicenceNo());
    }

    /**
     * The scope decision is the guard's, and the service's job is to ask it with the record in hand.
     * Asserted as delegation rather than as a 403 because the rule itself — employer, or a site the
     * owner's client owns — is pinned where it lives ({@code ClientScopeInterceptorTest.RoleScoping}).
     */
    @Test
    @DisplayName("getScaler: asks the owner-aware guard, passing the licence and the record's client")
    void getScaler_delegatesToTheOwnerAwareGuard() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234")); // client 12345678
      authenticateClientRestricted("00009999");

      service.getScaler("1234");

      verify(clientScopeGuard).assertScalerRecordInScope("1234", "12345678");
    }

    @Test
    @DisplayName("getScaler: another client's scaler refused (403) when the guard refuses")
    void getScaler_otherClient_forbidden() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234")); // client 12345678
      authenticateClientRestricted("00009999");
      doThrow(new ForbiddenException("You do not have access to this record."))
          .when(clientScopeGuard).assertScalerRecordInScope("1234", "12345678");

      assertThrows(ForbiddenException.class, () -> service.getScaler("1234"));
    }

    /**
     * The regression this file exists to hold. These two reads used to call
     * {@code SecurityContextUtils.assertClientAccess}, which compares employers and knows nothing about
     * roles — so a Scale Site Owner reading a scaler authorized at a site their client owns was admitted
     * by {@code ClientScopeInterceptor} and then refused here, and the §4 grant was dead in practice. A
     * differing client with a permitting guard must now succeed: whether it *should* is the guard's call,
     * not this method's.
     */
    @Test
    @DisplayName("getScaler: a differing client is NOT refused on employer equality alone")
    void getScaler_doesNotRefuseOnEmployerEqualityAlone() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234")); // client 12345678
      authenticateClientRestricted("00009999");
      // The guard permits — as it does for an owner whose client owns a site this scaler is authorized at.

      assertEquals("1234", service.getScaler("1234").scalerLicenceNo(),
          "the service must not second-guess the guard with a stricter employer-only check");
    }

    @Test
    @DisplayName("getScalerSummary: asks the guard before loading child rows")
    void getScalerSummary_otherClient_forbidden() {
      when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(stubSummary("1234")); // client 12345678
      authenticateClientRestricted("00009999");
      doThrow(new ForbiddenException("You do not have access to this record."))
          .when(clientScopeGuard).assertScalerRecordInScope("1234", "12345678");

      assertThrows(ForbiddenException.class, () -> service.getScalerSummary("1234"));
      verify(scalerRepository, never()).getScalerSummaryLicenceTypes(any());
    }

    @Test
    @DisplayName("getScalerSummary: a differing client is NOT refused on employer equality alone")
    void getScalerSummary_doesNotRefuseOnEmployerEqualityAlone() {
      when(scalerRepository.getScalerSummaryCore("1234")).thenReturn(stubSummary("1234"));
      authenticateClientRestricted("00009999");

      assertNotNull(service.getScalerSummary("1234"));
      verify(clientScopeGuard).assertScalerRecordInScope("1234", "12345678");
    }
  }

  // ---------------------------------------------------------------------------
  // getScalerTombstone — projection
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("getScalerTombstone")
  class GetScalerTombstone {

    @Test
    @DisplayName("projects the domain tombstone record to a ScalerTombstone")
    void getScalerTombstone_projects() {
      when(scalerRepository.getScalerTombstone("1234"))
          .thenReturn(new ScalerTombstoneRecord("1234", "ACME Ltd", "Jane", "Cariboo", "Quesnel"));

      ScalerTombstone result = service.getScalerTombstone("1234");

      assertEquals("1234", result.getScalerLicenceNo());
      assertEquals("ACME Ltd", result.getClientName());
      assertEquals("Cariboo", result.getRegionName());
      assertEquals("Quesnel", result.getDistrictName());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException when the tombstone is absent")
    void getScalerTombstone_notFound() {
      when(scalerRepository.getScalerTombstone("XXXX")).thenReturn(null);

      assertThrows(
          ResourceNotFoundException.class,
          () -> service.getScalerTombstone("XXXX"));
    }
  }

  // ---------------------------------------------------------------------------
  // getScalerAddress
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("getScalerAddress")
  class GetScalerAddress {

    @Test
    @DisplayName("projects the domain record onto the API model")
    void getScalerAddress_found_projectsRecord() {
      ScalerAddressRecord record = new ScalerAddressRecord(
          "1234", "Coastal Logging Ltd.", "Smith", "Jordan",
          "2505551234", "2505555678", "2505559012", "2505553456",
          "jordan.smith@example.com", "123 Forest Road", "Suite 200", null,
          "Victoria", "BC", "Canada", "V8V 1A1");
      when(scalerRepository.getScalerAddress("1234")).thenReturn(record);

      ScalerAddress result = service.getScalerAddress("1234");

      assertNotNull(result);
      assertEquals("1234", result.getScalerLicenceNo().get());
      assertEquals("Coastal Logging Ltd.", result.getCompany().get());
      assertEquals("2505551234", result.getBusinessPhone().get());
      assertEquals("V8V 1A1", result.getPostalCode().get());
      verify(scalerRepository).getScalerAddress("1234");
    }

    @Test
    @DisplayName("returns null when repository returns null (neutral empty state, legacy parity)")
    void getScalerAddress_notFound_returnsNull() {
      when(scalerRepository.getScalerAddress("XXXX")).thenReturn(null);

      assertNull(service.getScalerAddress("XXXX"));

      verify(scalerRepository).getScalerAddress("XXXX");
    }
  }

  // ---------------------------------------------------------------------------
  // updateScaler
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("updateScaler")
  class UpdateScaler {

    @Test
    @DisplayName("validates, updates the core, persists the appointment, and returns the reloaded aggregate")
    void updateScaler_found_updatesAndReturnsAggregate() {
      ScalerUpdateCommand cmd = minimalUpdateCommand("1234");
      when(scalerRepository.getScaler("1234"))
          .thenReturn(stubScaler("1234"))              // pre-update load (no prior appt/exam)
          .thenReturn(stubScaler("1234", null, existingAppointmentRow(), null)); // reload

      Scaler result = service.updateScaler(cmd);

      assertNotNull(result);
      assertEquals("1234", result.scalerLicenceNo());
      verify(scalerRepository).updateScaler(cmd, null);
      verify(scalerAppointmentService).createScalerAppointment("1234", cmd.appointment());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException without calling updateScaler when record not found")
    void updateScaler_notFound_throwsWithoutCallingUpdate() {
      when(scalerRepository.getScaler("XXXX")).thenReturn(null);

      assertThrows(
          ResourceNotFoundException.class,
          () -> service.updateScaler(minimalUpdateCommand("XXXX")));

      verify(scalerRepository, never()).updateScaler(any(), any());
    }

    @Test
    @DisplayName("exception message contains the requested licence number")
    void updateScaler_notFound_messageContainsLicenceNo() {
      when(scalerRepository.getScaler("5678")).thenReturn(null);

      ResourceNotFoundException ex = assertThrows(
          ResourceNotFoundException.class,
          () -> service.updateScaler(minimalUpdateCommand("5678")));

      assertEquals("No scaler found with licence number 5678", ex.getMessage());
    }

    @Test
    @DisplayName("enforces the appointment/exam XOR when the scaler has no prior appointment or exam")
    void updateScaler_enforcesXorWhenNoPriorAppointmentOrExam() {
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", false, null, List.of(ScalerLicenceType.SCS), null, null);
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateScaler(cmd));

      assertEquals("When Scaling is selected, exactly one of appointment or exam is required.", ex.getMessage());
      verify(scalerRepository, never()).updateScaler(any(), any());
    }

    @Test
    @DisplayName("relaxes the XOR when a prior appointment exists — empty sections are valid")
    void updateScaler_relaxesXorWhenPriorAppointmentExists() {
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", false, null, List.of(ScalerLicenceType.SCS), null, null);
      Scaler existing = stubScaler("1234", null, existingAppointmentRow(), null);
      when(scalerRepository.getScaler("1234")).thenReturn(existing);

      Scaler result = service.updateScaler(cmd);

      assertNotNull(result);
      verify(scalerRepository).updateScaler(cmd, null);
      verify(scalerAppointmentService, never()).createScalerAppointment(any(), any());
      verify(scalerExamService, never()).createScalerExam(any(), any());
    }

    @Test
    @DisplayName("adds a new exam via ScalerExamService when a prior exam exists and the section is filled")
    void updateScaler_addsExamWhenPriorExamExists() {
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", false, null, List.of(ScalerLicenceType.SCS), null, exam());
      Scaler existing = stubScaler("1234", null, null, existingExamRow());
      when(scalerRepository.getScaler("1234")).thenReturn(existing);

      service.updateScaler(cmd);

      verify(scalerExamService).createScalerExam("1234", cmd.exam());
      verify(scalerAppointmentService, never()).createScalerAppointment(any(), any());
    }

    @Test
    @DisplayName("rejects a changed client number (identity is fixed once created)")
    void updateScaler_rejectsChangedClientNumber() {
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "99999999", false, null,
          List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), null);
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateScaler(cmd));

      assertEquals("Client number cannot be changed on update.", ex.getMessage());
      verify(scalerRepository, never()).updateScaler(any(), any());
    }

    @Test
    @DisplayName("rejects a changed licence cancelled date — owned by the dedicated operation")
    void updateScaler_rejectsChangedLicenceCancelledDate() {
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", true, LocalDate.of(2026, 6, 30),
          List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), null);
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateScaler(cmd));

      assertEquals(
          "Licence cancelled date cannot be changed here — use the licence-cancelled-date operation.",
          ex.getMessage());
      verify(scalerRepository, never()).updateScaler(any(), any());
    }

    @Test
    @DisplayName("accepts an echo of the persisted cancelled date and carries it forward")
    void updateScaler_acceptsCancelledDateEchoAndCarriesItForward() {
      LocalDate cancelled = LocalDate.of(2026, 6, 30);
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", true, cancelled,
          List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), null);
      Scaler existing = stubScaler("1234", cancelled, null, null);
      when(scalerRepository.getScaler("1234")).thenReturn(existing);

      service.updateScaler(cmd);

      verify(scalerRepository).updateScaler(cmd, cancelled);
    }

    @Test
    @DisplayName("carries the persisted cancelled date forward when the request omits the field")
    void updateScaler_carriesPersistedCancelledDateForwardWhenAbsent() {
      LocalDate cancelled = LocalDate.of(2026, 6, 30);
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", false, null,
          List.of(ScalerLicenceType.SCS), appointment("FORS", YesNo.Y, null), null);
      Scaler existing = stubScaler("1234", cancelled, null, null);
      when(scalerRepository.getScaler("1234")).thenReturn(existing);

      service.updateScaler(cmd);

      verify(scalerRepository).updateScaler(cmd, cancelled);
    }

    @Test
    @DisplayName("rejects when Waste is selected without licence expiry (shared rule)")
    void updateScaler_rejectsWasteWithoutLicenceExpiry() {
      ScalerUpdateCommand cmd = updateCommand(
          "1234", "12345678", false, null,
          List.of(ScalerLicenceType.SCS, ScalerLicenceType.WA),
          appointment("FORS", YesNo.Y, null), null);
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      BadRequestException ex = assertThrows(BadRequestException.class, () -> service.updateScaler(cmd));

      assertEquals("Licence expiry date is required when Waste is selected.", ex.getMessage());
      verify(scalerRepository, never()).updateScaler(any(), any());
    }
  }

  // ---------------------------------------------------------------------------
  // updateLicenceCancelledDate
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("updateLicenceCancelledDate")
  class UpdateLicenceCancelledDate {

    @Test
    @DisplayName("delegates to the repository when the cancelled date is on or after the issued date")
    void updateLicenceCancelledDate_valid_delegates() {
      LocalDate cancelled = LocalDate.of(2026, 6, 30);
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));
      when(scalerRepository.updateLicenceCancelledDate("1234", cancelled))
          .thenReturn(stubScaler("1234", cancelled, null, null));

      Scaler result = service.updateLicenceCancelledDate("1234", cancelled);

      assertNotNull(result);
      verify(scalerRepository).updateLicenceCancelledDate("1234", cancelled);
    }

    @Test
    @DisplayName("allows clearing the cancelled date (null)")
    void updateLicenceCancelledDate_null_clears() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));
      when(scalerRepository.updateLicenceCancelledDate("1234", null))
          .thenReturn(stubScaler("1234"));

      service.updateLicenceCancelledDate("1234", null);

      verify(scalerRepository).updateLicenceCancelledDate("1234", null);
    }

    @Test
    @DisplayName("rejects a cancelled date before the issued date")
    void updateLicenceCancelledDate_beforeIssued_throws() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      BadRequestException ex = assertThrows(
          BadRequestException.class,
          () -> service.updateLicenceCancelledDate("1234", LocalDate.of(2024, 12, 31)));

      assertEquals("Licence cancelled date must be on or after the scaler effective date.",
          ex.getMessage());
      verify(scalerRepository, never()).updateLicenceCancelledDate(any(), any());
    }

    @Test
    @DisplayName("throws ResourceNotFoundException without writing when the scaler is missing")
    void updateLicenceCancelledDate_notFound_throws() {
      when(scalerRepository.getScaler("XXXX")).thenReturn(null);

      assertThrows(
          ResourceNotFoundException.class,
          () -> service.updateLicenceCancelledDate("XXXX", LocalDate.of(2026, 6, 30)));

      verify(scalerRepository, never()).updateLicenceCancelledDate(any(), any());
    }
  }

  // ---------------------------------------------------------------------------
  // deleteScaler
  // ---------------------------------------------------------------------------

  @Nested
  @DisplayName("deleteScaler")
  class DeleteScaler {

    @Test
    @DisplayName("clears licence types → all appointments → all exams → core row, in order")
    void deleteScaler_clearsAllChildrenThenCore() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));

      service.deleteScaler("1234");

      InOrder ordered = inOrder(scalerRepository, scalerAppointmentService, scalerExamService);
      ordered.verify(scalerRepository).deleteAssignedLicTypeIfPresent("1234", "SCS");
      ordered.verify(scalerAppointmentService).deleteFirstForScaler("1234");
      ordered.verify(scalerExamService).deleteFirstForScaler("1234");
      ordered.verify(scalerRepository).deleteScaler("1234");
    }

    @Test
    @DisplayName("throws ResourceNotFoundException without deleting when the scaler is missing")
    void deleteScaler_notFound_throws() {
      when(scalerRepository.getScaler("XXXX")).thenReturn(null);

      assertThrows(ResourceNotFoundException.class, () -> service.deleteScaler("XXXX"));

      verify(scalerRepository, never()).deleteScaler(any());
    }

    @Test
    @DisplayName("maps a child-record constraint (ORA-02292) to a 400 with the legacy message")
    void deleteScaler_dependentRecords_throwsBadRequest() {
      when(scalerRepository.getScaler("1234")).thenReturn(stubScaler("1234"));
      doThrow(new DataIntegrityViolationException("ORA-02292")).when(scalerRepository).deleteScaler("1234");

      BadRequestException ex = assertThrows(
          BadRequestException.class, () -> service.deleteScaler("1234"));

      assertEquals(
          "Database Exception: The record can not be deleted because there are associated records that exist.",
          ex.getMessage());
    }
  }

  private void mockClientExists(String clientNumber) {
    when(clientRepository.searchClients(
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        any(),
        eq(clientNumber),
        eq("00"),
        eq(1),
        eq(1)))
        .thenReturn(List.of(new Client().clientNumber(clientNumber).clientLocnCode("00")));
  }
}
