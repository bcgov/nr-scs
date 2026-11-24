package ca.bc.gov.nrs.scs.backend.service;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.requireDateOrder;

import ca.bc.gov.nrs.scs.backend.domain.appointment.ScalerAppointmentCommand;
import ca.bc.gov.nrs.scs.backend.domain.examupgrade.ScalerExamCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.Scaler;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerCreateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceType;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerUpdateCommand;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerAddressRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceStatus;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerLicenceTypeEntry;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSearchEntry;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryCore;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerSummaryRecord;
import ca.bc.gov.nrs.scs.backend.domain.scaler.ScalerTombstoneRecord;
import ca.bc.gov.nrs.scs.backend.exception.BadRequestException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException;
import ca.bc.gov.nrs.scs.backend.exception.FieldValidationException.FieldErrorDetail;
import ca.bc.gov.nrs.scs.backend.model.Client;
import ca.bc.gov.nrs.scs.backend.model.ScalerAddress;
import ca.bc.gov.nrs.scs.backend.model.ScalerResult;
import ca.bc.gov.nrs.scs.backend.model.ScalerSummary;
import ca.bc.gov.nrs.scs.backend.model.ScalerTombstone;
import ca.bc.gov.nrs.scs.backend.repository.ClientRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import ca.bc.gov.nrs.scs.backend.security.ClientScopeGuard;
import ca.bc.gov.nrs.scs.backend.security.SecurityContextUtils;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerAddressApiMapper;
import ca.bc.gov.nrs.scs.backend.service.mapper.ScalerApiMapper;
import ca.bc.gov.nrs.scs.backend.util.SCSUtils;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ScalerService {

  private static final String NO_SCALER_FOUND = "No scaler found with licence number ";
  private static final Logger logger = LoggerFactory.getLogger(ScalerService.class);

  private final ScalerRepository scalerRepository;
  private final ClientRepository clientRepository;
  private final ScalerExamService scalerExamService;
  private final ScalerAppointmentService scalerAppointmentService;
  private final ClientScopeGuard clientScopeGuard;

  public ScalerService(
      ScalerRepository scalerRepository,
      ClientRepository clientRepository,
      ScalerExamService scalerExamService,
      ScalerAppointmentService scalerAppointmentService,
      ClientScopeGuard clientScopeGuard) {
    this.scalerRepository = scalerRepository;
    this.clientRepository = clientRepository;
    this.scalerExamService = scalerExamService;
    this.scalerAppointmentService = scalerAppointmentService;
    this.clientScopeGuard = clientScopeGuard;
  }

  @Transactional
  public Scaler createScaler(ScalerCreateCommand cmd) {
    validateWrite(
        cmd.issuedDate(), cmd.expiryDate(),
        cmd.licenceTypes(), cmd.appointment(), cmd.exam(),
        true); // new scaler — appointment/exam XOR always applies

    if (!clientExists(cmd.clientNumber())) {
      throw new BadRequestException(
          "No client found for client number " + cmd.clientNumber() + " at location 00.");
    }

    // UX pre-check only — SCLR_UK remains the enforcement (this check is inherently racy).
    if (clientHasScaler(cmd.clientNumber())) {
      throw new FieldValidationException(List.of(
          new FieldErrorDetail("clientNumber", "A scaler already exists for this client.")));
    }

    String licNo = scalerRepository.insertScaler(cmd);

    for (ScalerLicenceType licType : cmd.licenceTypes()) {
      scalerRepository.insertAssignedLicType(licNo, licType.name());
    }

    persistAppointmentOrExam(licNo, cmd.appointment(), cmd.exam());

    return scalerRepository.getScaler(licNo);
  }

  public Scaler getScaler(String scalerLicenceNo) {
    Scaler scaler = scalerRepository.getScaler(scalerLicenceNo);
    SCSUtils.requireFound(scaler, NO_SCALER_FOUND + scalerLicenceNo);
    // Not assertClientAccess(scaler.clientNumber()): that compares employers only, so it refuses a
    // Scale Site Owner reading a scaler authorized at a site their client owns — the access
    // roles-permissions.md §4 grants them and ClientScopeInterceptor already admitted. The guard owns
    // that rule; this is defence in depth against the same rule, not a second stricter one.
    clientScopeGuard.assertScalerRecordInScope(scalerLicenceNo, scaler.clientNumber());
    return scaler;
  }

  /**
   * Updates a scaler with legacy {@code ScalerAction.update} semantics: the appointment/exam
   * mutual exclusion applies only when the scaler has no prior appointment or exam
   * ({@code ScalerBo.appointmentOrExamExists()}); {@code clientNumber} and
   * {@code licenceCancelledDate} are read-only via this operation (identity is fixed once created;
   * cancellation is owned by {@link #updateLicenceCancelledDate}).
   */
  @Transactional
  public Scaler updateScaler(ScalerUpdateCommand cmd) {
    Scaler existing = scalerRepository.getScaler(cmd.scalerLicenceNo());
    SCSUtils.requireFound(existing, NO_SCALER_FOUND + cmd.scalerLicenceNo());

    validateWrite(
        cmd.issuedDate(), cmd.expiryDate(),
        cmd.licenceTypes(), cmd.appointment(), cmd.exam(),
        !existing.hasAppointmentOrExam()); // XOR only when no prior appointment/exam (legacy gate)

    if (!Objects.equals(cmd.clientNumber(), existing.clientNumber())) {
      throw new BadRequestException(
          "Client number cannot be changed on update.");
    }

    if (cmd.licenceCancelledDateProvided()
        && !Objects.equals(cmd.licenceCancelledDate(), existing.licenceCancelledDate())) {
      throw new BadRequestException(
          "Licence cancelled date cannot be changed here — use the licence-cancelled-date operation.");
    }

    scalerRepository.updateScaler(cmd, existing.licenceCancelledDate());

    persistAppointmentOrExam(cmd.scalerLicenceNo(), cmd.appointment(), cmd.exam());

    return scalerRepository.getScaler(cmd.scalerLicenceNo());
  }

  /**
   * Sets (or clears) the scaler's Licence Cancelled Date — the Performance Remarks tab "cancel date"
   * form (legacy {@code cancelScaler}). Preserves all other scaler columns and re-applies the legacy
   * rule that the cancelled date must be on or after the scaler effective (issued) date.
   */
  @Transactional
  public Scaler updateLicenceCancelledDate(String scalerLicenceNo, LocalDate licenceCancelledDate) {
    Scaler existing = scalerRepository.getScaler(scalerLicenceNo);
    SCSUtils.requireFound(existing, NO_SCALER_FOUND + scalerLicenceNo);

    requireDateOrder(
        existing.issuedDate(),
        licenceCancelledDate,
        "Licence cancelled date must be on or after the scaler effective date.");

    return scalerRepository.updateLicenceCancelledDate(scalerLicenceNo, licenceCancelledDate);
  }

  /**
   * Deletes a scaler, reproducing the legacy {@code ScalerDelegate.deleteScaler} cascade in one
   * transaction (there is no DB {@code ON DELETE CASCADE}): clear the scaler's intrinsic sub-records
   * — assigned licence types, then the appointment or exam if present — then delete the core row.
   * Dependent records the cascade does not clear (authorizations, performance remarks, risk
   * questionnaires) raise {@code ORA-02292}; it is caught and surfaced as the legacy generic
   * child-record message (400).
   */
  @Transactional
  public void deleteScaler(String scalerLicenceNo) {
    Scaler scaler = getScaler(scalerLicenceNo); // load-first; 404 when absent

    for (ScalerLicenceType licenceType : scaler.licenceTypes()) {
      scalerRepository.deleteAssignedLicTypeIfPresent(scalerLicenceNo, licenceType.name());
    }
    scalerAppointmentService.deleteFirstForScaler(scalerLicenceNo);
    scalerExamService.deleteFirstForScaler(scalerLicenceNo);

    try {
      scalerRepository.deleteScaler(scalerLicenceNo);
    } catch (DataIntegrityViolationException ex) {
      // Dependent records the cascade does not clear (authorizations, performance remarks, risk
      // questionnaires) raise ORA-02292; surface the legacy generic child-record message (400).
      logger.debug("Scaler {} delete blocked by dependent records (ORA-02292).", SCSUtils.sanitizeForLog(scalerLicenceNo), ex);
      throw new BadRequestException(
          "Database Exception: The record can not be deleted because there are associated records that exist.");
    }
  }

  /**
   * Legacy {@code ScalerDelegate.saveApptExam}. Delegates to the owning table services
   * ({@link ScalerAppointmentService} / {@link ScalerExamService}) — one writer per table — which
   * validate and persist. The appointment command was already org-unit-gated by
   * {@code ScalerApiMapper.toAppointmentCommand}.
   */
  private void persistAppointmentOrExam(
      String licNo, ScalerAppointmentCommand appointment, ScalerExamCommand exam) {
    if (appointment != null) {
      scalerAppointmentService.createScalerAppointment(licNo, appointment);
    } else if (exam != null) {
      scalerExamService.createScalerExam(licNo, exam);
    }
  }

  /**
   * Whether a scaler exists for the given licence number (legacy {@code
   * ScalerVwDelegate.checkScalerExists}). Unlike {@link #getScaler}/{@link #getScalerSummary}, which
   * are get-or-404, this returns a boolean for callers doing referential validation. Blank input is
   * treated as "not found".
   */
  public boolean scalerExists(String scalerLicenceNo) {
    if (SCSUtils.isBlank(scalerLicenceNo)) {
      return false;
    }
    // Licence numbers are stored upper-case, so fold the caller's value before looking it up:
    // typing `001b` must find `001B` rather than reporting the scaler as non-existent.
    return scalerRepository.getScalerSummaryCore(SCSUtils.upperOrNull(scalerLicenceNo)) != null;
  }

  public ScalerSummary getScalerSummary(String scalerLicenceNo) {
    ScalerSummaryCore core = scalerRepository.getScalerSummaryCore(scalerLicenceNo);
    SCSUtils.requireFound(core, NO_SCALER_FOUND + scalerLicenceNo);
    // Owner-aware, for the reason given on getScaler above — the Summary tab is one of the three the
    // owner reads on a scaler authorized at their site.
    clientScopeGuard.assertScalerRecordInScope(scalerLicenceNo, core.clientNumber());

    List<ScalerLicenceTypeEntry> licenceTypes =
        scalerRepository.getScalerSummaryLicenceTypes(scalerLicenceNo);
    ScalerLicenceStatus status = scalerRepository.getScalerSummaryStatus(scalerLicenceNo);

    return ScalerApiMapper.toSummary(new ScalerSummaryRecord(core, licenceTypes, status));
  }

  /**
   * Reads the read-only address/contact record for a scaler. Mirrors the legacy
   * {@code ScalerDelegate.loadScalerAddress}, which returns {@code null} (and renders the page
   * neutrally) when the view yields no row rather than treating a missing address as an error.
   * The controller maps {@code null} to a 204 No Content.
   */
  public ScalerAddress getScalerAddress(String scalerLicenceNo) {
    ScalerAddressRecord address = scalerRepository.getScalerAddress(scalerLicenceNo);
    return address != null ? ScalerAddressApiMapper.toResponse(address) : null;
  }

  public ScalerTombstone getScalerTombstone(String scalerLicenceNo) {
    ScalerTombstoneRecord tombstone = scalerRepository.getScalerTombstone(scalerLicenceNo);
    SCSUtils.requireFound(tombstone, "No scaler tombstone found for licence number " + scalerLicenceNo);
    return ScalerApiMapper.toTombstone(tombstone);
  }

  public List<ScalerResult> searchScalers(
      String scalerLicenceNo,
      String clientNumber,
      Long orgUnitNo,
      String clientName,
      String legalFirstName,
      String scalarTrainingType,
      String scalerLicenceTypeCode,
      String scalerAppointmentType,
      Integer primarySort,
      Integer secondarySort) {

    // Client-restricted external users see only their own forest client — one client per login, legacy
    // QueriesScalersSearchAction:103's "override if user messed with the form" — so the request's client
    // value is ignored. Internal users search the client they asked for. The Scalers query screen renders
    // the field read-only to match (scalerSearch.jsp:37 did the same, keyed on isRestrictUserToClient()).
    //
    // THE OWNER'S SEARCH IS DELIBERATELY WIDER THAN WHAT IT CAN OPEN. Since 2026-08-20 an owner reaches a
    // scaler record only through an in-force authorization at a site it owns, so a row listed here that
    // holds no such authorization answers 403 when opened. That dead link is accepted rather than filtered
    // out: the client number is the criterion the screen states, and whatever it returns is the correct
    // answer to it. Legacy behaved the same way and worse — scaleSiteScalersList.jsp:61 linked every
    // licence on the Authorized Scalers tab and SecurityUtils.hasScalerAccess threw a RuntimeException.
    // Do not "fix" this by intersecting the result with the scaler scope: that was tried on 2026-08-20 and
    // rejected, because it makes the stated criterion and the applied one differ.
    // (Decision: Jonah, 2026-08-20.)
    String effectiveClientNumber = SecurityContextUtils.isClientRestricted()
        ? SecurityContextUtils.currentUserClientNumber()
        : clientNumber;

    return scalerRepository.searchScalers(
        SCSUtils.upperOrNull(scalerLicenceNo),
        effectiveClientNumber,
        orgUnitNo,
        SCSUtils.upperOrNull(clientName),
        SCSUtils.upperOrNull(legalFirstName),
        scalarTrainingType,
        scalerLicenceTypeCode,
        scalerAppointmentType,
        primarySort,
        secondarySort)
        .stream()
        .map(ScalerApiMapper::toSearchResult)
        .toList();
  }

  /**
   * Business rules shared by create and update. {@code enforceApptExamXor} is true on create and,
   * on update, only when the persisted scaler has no prior appointment or exam — legacy
   * {@code ScalerBo.validateAssignedLicType} gated by {@code appointmentOrExamExists()}. When the
   * gate is off, the sections are optional (a filled one adds a new row) but still require Scaling.
   */
  private void validateWrite(
      LocalDate issuedDate,
      LocalDate expiryDate,
      List<ScalerLicenceType> licenceTypes,
      ScalerAppointmentCommand appointment,
      ScalerExamCommand exam,
      boolean enforceApptExamXor) {

    boolean hasScaling = licenceTypes.contains(ScalerLicenceType.SCS);
    boolean hasWaste = licenceTypes.contains(ScalerLicenceType.WA);
    boolean hasAppointment = appointment != null;
    boolean hasExam = exam != null;

    if (licenceTypes.isEmpty()) {
      throw new BadRequestException("At least one licence type is required.");
    }

    if (enforceApptExamXor && hasScaling && hasAppointment == hasExam) {
      throw new BadRequestException(
          "When Scaling is selected, exactly one of appointment or exam is required.");
    }

    if (!hasScaling && (hasAppointment || hasExam)) {
      throw new BadRequestException(
          "Appointment or exam details can only be provided when Scaling is selected.");
    }

    if (hasWaste && expiryDate == null) {
      throw new BadRequestException(
          "Licence expiry date is required when Waste is selected.");
    }

    requireDateOrder(
        issuedDate,
        expiryDate,
        "Scaler effective date must be on or before the licence expiry date.");

    // Appointment-internal rules (province-wide/district, date order, duration) are owned by
    // ScalerAppointmentService and run when persistAppointmentOrExam delegates to it.
  }

  /** Mirrors SCLR_UK, matched by the exact value the insert would store. */
  private boolean clientHasScaler(String clientNumber) {
    List<ScalerSearchEntry> existing = scalerRepository.searchScalers(
        null, clientNumber, null, null, null, null, null, null, 1, 0);
    return existing != null && !existing.isEmpty();
  }

  private boolean clientExists(String clientNumber) {
    List<Client> clients =
        clientRepository.searchClients(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            clientNumber,
            "00",
            1,
            1);
    return clients != null && !clients.isEmpty();
  }

}
