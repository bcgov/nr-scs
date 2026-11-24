package ca.bc.gov.nrs.scs.backend.security;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.sanitizeForLog;

import static ca.bc.gov.nrs.scs.backend.util.SCSUtils.trimToNull;

import ca.bc.gov.nrs.scs.backend.constants.Roles;
import ca.bc.gov.nrs.scs.backend.domain.scalesite.SiteAuthorizationCoverage;
import ca.bc.gov.nrs.scs.backend.exception.ForbiddenException;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteAuthorizedScalerRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScaleSiteRepository;
import ca.bc.gov.nrs.scs.backend.repository.ScalerRepository;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Resolves the forest client that owns a scaler or scale site and refuses a client-restricted caller
 * anything outside their own. The one place that knows how to get from a record id to its client.
 *
 * <p>Used by {@link ClientScopeInterceptor} for the ~34 endpoints addressed by
 * {@code scalerLicenceNo}/{@code scaleSiteIdNmbr}, and directly by the few services whose endpoint
 * identifies a record by some other id and so cannot be covered from the path (the scaler- and
 * scale-site-authorization detail reads, and the inspection reads and writes, which reach their record
 * through the authorization's or inspection's own scaler/site).
 *
 * <p>Every method is a no-op for internal (unrestricted) users, so callers need no guard of their own.
 *
 * <h2>Scope is per role, not one predicate for every external caller</h2>
 *
 * <p>The two enabled external roles live on opposite records and each needs one bridge to the other,
 * in <b>one</b> direction only:
 *
 * <table border="1">
 *   <caption>Which records a client-restricted role reaches</caption>
 *   <tr><th></th><th>Scalers</th><th>Scale sites</th></tr>
 *   <tr><td>{@link Roles#SCS_INDUSTRY_SCALER}</td>
 *       <td>their own client's <b>only</b></td>
 *       <td>their own client's, <b>plus</b> any site one of its scalers is authorized at</td></tr>
 *   <tr><td>{@link Roles#SCS_OWNER}</td>
 *       <td>any scaler authorized at a site it owns — and <b>nothing else</b></td>
 *       <td>their own client's <b>only</b></td></tr>
 * </table>
 *
 * <p>Each role gets one rule per record type, taken from its own {@code roles-permissions.md} §4 summary:
 * "view scale sites they are authorized to scale at" for the industry scaler, "view select information on
 * scalers authorized to scale at their sites" for the owner, with §1's legend defining the owner's
 * {@code (ltd)} the same way. Crossing them over-grants in both directions — an owner reaching another
 * company's site by direct URL because one of its scalers is authorized there, or an industry scaler
 * reaching another company's scaler because that scaler works at a site its client owns.
 *
 * <p><b>The owner does not reach a scaler merely because the scaler is filed under its own forest
 * client.</b> That branch existed until 2026-08-20 as legacy parity
 * ({@code QueriesScalersSearchAction:103} scoped every client-restricted user's scaler search by
 * {@code SCALER.CLIENT_NUMBER}), and it was removed on the grounds that the column is documented only as
 * "Reference to CLIENT" — it asserts an association, not a current engagement, so it is not a reason for
 * an owner to read a person's address and exam history. §4 names the population the owner may read, and
 * this is now exactly that population. (Decision: Jonah, 2026-08-20.)
 *
 * <p><b>The owner's scaler SEARCH is wider than this, on purpose.</b>
 * {@code ScalerService.searchScalers} binds the caller's own forest client for every client-restricted
 * role, and the Scalers query screen renders the field read-only to match — legacy did both
 * ({@code QueriesScalersSearchAction:103}, {@code scalerSearch.jsp:37}, each keyed on
 * {@code isRestrictUserToClient()}). So an owner's search lists the scalers filed under their client,
 * including ones this guard then refuses because they hold no in-force authorization at a site the client
 * owns. <b>Those rows are dead links, and that is accepted:</b> the client number is the criterion the
 * screen states, and whatever it returns is the correct answer to it. Legacy had the same shape and worse
 * — {@code scaleSiteScalersList.jsp:61} linked every licence on the Authorized Scalers tab and
 * {@code SecurityUtils.hasScalerAccess} threw a {@code RuntimeException}.
 *
 * <p>Intersecting the search with this scope was implemented on 2026-08-20 and rejected: it makes the
 * criterion the screen states and the one the server applies differ. Do not reintroduce it without
 * revisiting that decision. (Decision: Jonah, 2026-08-20.)
 *
 * <p><b>A caller holding both roles gets both bridges</b>, because the scope is resolved per role and
 * unioned. That is wider than either role alone, and wide enough to combine one role's permission with
 * the other's reach — the owner's {@code SCALE_SITE_SUMMARY_READ} on a site reached by the industry
 * scaler's authorization bridge, say. FAM delivers one external role per account today, so nothing
 * exercises it. Closing it properly means resolving scope per <i>permission</i> rather than per role
 * (the interceptor knows the handler, so it can read its {@code @RequiresPermission}); that is a
 * larger change and is deliberately left until an account needs both.
 */
@Component
public class ClientScopeGuard {

  private static final Logger LOGGER = LoggerFactory.getLogger(ClientScopeGuard.class);

  private static final String DENIED = "You do not have access to this record.";

  private final ScalerRepository scalerRepository;
  private final ScaleSiteRepository scaleSiteRepository;
  private final ScaleSiteAuthorizedScalerRepository authorizedScalerRepository;

  public ClientScopeGuard(
      ScalerRepository scalerRepository,
      ScaleSiteRepository scaleSiteRepository,
      ScaleSiteAuthorizedScalerRepository authorizedScalerRepository) {
    this.scalerRepository = scalerRepository;
    this.scaleSiteRepository = scaleSiteRepository;
    this.authorizedScalerRepository = authorizedScalerRepository;
  }

  /**
   * Refuses (403) unless the given scaler belongs to the caller's forest client, or — for a
   * {@link Roles#SCS_OWNER} — is authorized to scale at a site that client owns. An unknown licence
   * number is refused too rather than reported missing — see {@link ClientScopeInterceptor} for why a
   * restricted caller gets no existence oracle.
   */
  public void assertScalerInScope(String scalerLicenceNo) {
    if (!SecurityContextUtils.isClientRestricted()) {
      return;
    }
    var summary = scalerRepository.getScalerSummaryCore(scalerLicenceNo);
    if (summary == null) {
      LOGGER.warn("Client-restricted caller requested unknown scaler '{}' — denying.",
          sanitizeForLog(scalerLicenceNo));
      throw new ForbiddenException(DENIED);
    }
    assertScalerRecordInScope(scalerLicenceNo, summary.clientNumber());
  }

  /**
   * {@link #assertScalerInScope} for a caller that has already loaded the scaler and so knows its forest
   * client: the same rule, without re-reading the row to find out.
   *
   * <p><b>Use this rather than {@link SecurityContextUtils#assertClientAccess} for a scaler.</b> That one
   * compares the record's client to the caller's and nothing else, so it silently overrides the owner's
   * bridge: {@link ClientScopeInterceptor} would admit an owner to a scaler authorized at a site their
   * client owns, and then the service's own defence-in-depth check would refuse the same request. Which
   * is precisely what happened when the bridge was first added — the interceptor was updated and
   * {@code ScalerService}'s two guards were not, so every bridged read still answered 403 and only an
   * end-to-end probe against the database showed it.
   */
  public void assertScalerRecordInScope(String scalerLicenceNo, String recordClientNumber) {
    if (!SecurityContextUtils.isClientRestricted()) {
      return;
    }
    String callerClient = SecurityContextUtils.currentUserClientNumber();

    // Own-client scalers, for every client-restricted role EXCEPT the Scale Site Owner. That role's
    // scaler access is defined entirely by the bridge below — see the role table on this class for why
    // "the scaler is filed under my forest client" is not a reason for an owner to read it.
    //
    // Checked first because it is free: an industry scaler reading its own client's scaler pays nothing,
    // and only the owner reaches the queries the bridge needs.
    boolean readsOwnClientScalers = !SecurityContextUtils.hasRole(Roles.SCS_OWNER)
        || SecurityContextUtils.hasRole(Roles.SCS_INDUSTRY_SCALER);
    if (readsOwnClientScalers && callerClient.equals(recordClientNumber)) {
      return;
    }

    if (SecurityContextUtils.hasRole(Roles.SCS_OWNER)
        && isAuthorizedAtSiteOwnedBy(scalerLicenceNo, callerClient)) {
      return;
    }
    throw new ForbiddenException(DENIED);
  }

  /**
   * Refuses (403) unless the caller's forest client owns the scale site, or — for a
   * {@link Roles#SCS_INDUSTRY_SCALER} — has a scaler authorized to scale at it.
   *
   * <p>The second case is what makes roles-permissions.md §4's "view scale sites they are authorized
   * to scale at" work: an industry scaler employed by one company is routinely authorized at sites
   * owned by another, so owner-only scoping would deny exactly the records the role exists to read.
   * Legacy applied no client scoping here at all (see {@code auth-access-scope-design.md}); this keeps
   * SEC-7's deep-link protection while restoring the intended access. It is withheld from the owner
   * on purpose — see the role table on this class.
   */
  public void assertScaleSiteInScope(String scaleSiteIdNmbr) {
    if (!SecurityContextUtils.isClientRestricted()) {
      return;
    }
    var summary = scaleSiteRepository.getScaleSiteSummaryCore(scaleSiteIdNmbr);
    if (summary == null) {
      LOGGER.warn("Client-restricted caller requested unknown scale site '{}' — denying.",
          sanitizeForLog(scaleSiteIdNmbr));
      throw new ForbiddenException(DENIED);
    }

    String callerClient = SecurityContextUtils.currentUserClientNumber();
    if (callerClient.equals(summary.ownerClientNumber())) {
      return;
    }
    if (SecurityContextUtils.hasRole(Roles.SCS_INDUSTRY_SCALER)
        && isAuthorizedAtSite(callerClient, scaleSiteIdNmbr)) {
      return;
    }
    throw new ForbiddenException(DENIED);
  }

  /**
   * {@link #assertScaleSiteInScope} for a service guard that must run <b>before</b> the record's own
   * not-found check, so a restricted caller cannot use the id as an existence oracle.
   *
   * <p>Pass the site of the record just loaded, or {@code null} when it was not found. A null site
   * refuses a restricted caller (403, indistinguishable from another client's record) and is a no-op
   * for an internal user, whose {@code requireFound} then reports the 404 it should. That reproduces
   * for id-addressed endpoints the 403-before-404 behaviour {@link ClientScopeInterceptor} gets for
   * free by running before the handler.
   */
  public void assertRecordSiteInScope(String scaleSiteIdNmbr) {
    if (!SecurityContextUtils.isClientRestricted()) {
      return;
    }
    if (trimToNull(scaleSiteIdNmbr) == null) {
      LOGGER.warn("Client-restricted caller requested a record that does not exist — denying "
          + "rather than reporting it missing.");
      throw new ForbiddenException(DENIED);
    }
    assertScaleSiteInScope(scaleSiteIdNmbr);
  }

  /**
   * {@link #assertScalerInScope} for a service guard that must run before the record's own not-found
   * check. Same contract as {@link #assertRecordSiteInScope}, on the scaler side.
   */
  public void assertRecordScalerInScope(String scalerLicenceNo) {
    if (!SecurityContextUtils.isClientRestricted()) {
      return;
    }
    if (trimToNull(scalerLicenceNo) == null) {
      LOGGER.warn("Client-restricted caller requested a record that does not exist — denying "
          + "rather than reporting it missing.");
      throw new ForbiddenException(DENIED);
    }
    assertScalerInScope(scalerLicenceNo);
  }

  /**
   * Whether any scaler of {@code clientNumber} holds a currently in-force authorization at the site.
   * Two bounded queries intersected on licence number. Only reached when the client does not own it.
   *
   * <p>Both must read a view that sees <i>every</i> row, never one built for a search or display screen:
   * a row those drop is indistinguishable here from "not authorized". See each repository method.
   */
  private boolean isAuthorizedAtSite(String clientNumber, String scaleSiteIdNmbr) {
    Set<String> clientLicences = scalerRepository.listLicenceNumbersForClient(clientNumber);

    if (clientLicences.isEmpty()) {
      LOGGER.warn("Client '{}' has no scalers — cannot be authorized at site '{}'.",
          sanitizeForLog(clientNumber), sanitizeForLog(scaleSiteIdNmbr));
      return false;
    }

    return authorizedScalerRepository.listAuthorizationCoverageForSite(scaleSiteIdNmbr).stream()
        .filter(ClientScopeGuard::isInForce)
        .map(coverage -> trimToNull(coverage.scalerLicenceNo()))
        .anyMatch(licence -> licence != null && clientLicences.contains(licence));
  }

  /**
   * Whether the scaler holds a currently in-force authorization at any site {@code clientNumber} owns —
   * the owner's bridge, and the mirror of {@link #isAuthorizedAtSite}.
   *
   * <p>Runs scaler → sites → owner rather than owner → sites → scalers: the first step reads the same
   * coverage view as the site direction, and each site's owner then comes from the scale-site table
   * package, which sees every site. The reverse order would have to enumerate the client's sites from
   * a display view, and a site that view drops would read here as "not my site" — a wrongful denial of
   * exactly the records §4 grants. Costs one coverage query plus one indexed lookup per distinct site
   * the scaler is authorized at, short-circuiting on the first match.
   */
  private boolean isAuthorizedAtSiteOwnedBy(String scalerLicenceNo, String clientNumber) {
    Set<String> authorizedSites = inForceSiteIds(
        authorizedScalerRepository.listAuthorizationCoverageForScaler(scalerLicenceNo));

    if (authorizedSites.isEmpty()) {
      LOGGER.warn("Scaler '{}' holds no in-force authorization — cannot be reached by owner client "
          + "'{}'.", sanitizeForLog(scalerLicenceNo), sanitizeForLog(clientNumber));
      return false;
    }

    for (String scaleSiteIdNmbr : authorizedSites) {
      var site = scaleSiteRepository.getScaleSiteSummaryCore(scaleSiteIdNmbr);
      if (site != null && clientNumber.equals(site.ownerClientNumber())) {
        return true;
      }
    }
    return false;
  }

  /** The distinct sites covered by the in-force authorizations among {@code authorizations}. */
  private static Set<String> inForceSiteIds(List<SiteAuthorizationCoverage> authorizations) {
    Set<String> siteIds = new LinkedHashSet<>();
    for (SiteAuthorizationCoverage authorization : authorizations) {
      if (!isInForce(authorization)) {
        continue;
      }
      String siteId = trimToNull(authorization.scaleSiteIdNmbr());
      if (siteId != null) {
        siteIds.add(siteId);
      }
    }
    return siteIds;
  }

  /**
   * Whether an authorization currently entitles its scaler to the site. The coverage query returns
   * every state, so without this a long-expired authorization would grant permanent access.
   *
   * <p>Cancellation and expiry mirror {@code scs_authorized_scalers_vw}'s status derivation (both
   * {@code <= sysdate}), so what is readable matches what the screen labels Active. That makes an
   * authorization out of force <b>on</b> its expiry date — the database's boundary, not one chosen here.
   * The effective date is honoured too, which that status does not do.
   */
  private static boolean isInForce(SiteAuthorizationCoverage authorization) {
    LocalDate today = LocalDate.now();

    LocalDate cancellation = authorization.cancellationDate();
    if (cancellation != null && !cancellation.isAfter(today)) {
      return false;
    }

    LocalDate effective = authorization.authorizationEffectiveDate();
    if (effective != null && today.isBefore(effective)) {
      return false;
    }

    LocalDate expiry = authorization.authorizationExpiryDate();
    return expiry == null || expiry.isAfter(today);
  }
}
