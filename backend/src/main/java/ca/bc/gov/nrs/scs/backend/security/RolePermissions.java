package ca.bc.gov.nrs.scs.backend.security;

import ca.bc.gov.nrs.scs.backend.constants.Permissions;
import ca.bc.gov.nrs.scs.backend.constants.Roles;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * The role → permission matrix: the single place that says what each SCS role may do.
 *
 * <p>Source of truth for the values below is
 * the roles &amp; permissions matrix — §3's matrix first, but not §3 alone:
 * where §3 and a role's §4 summary disagree, the departure and its reasoning are recorded on the role's
 * own method below. Read those before treating a cell as settled. Both authentication filters
 * ({@code JwtRequestFilter}, {@code MockRequestFilter}) call {@link #expandAuthorities} so a token's
 * role authorities arrive at the security context accompanied by the permission authorities they
 * imply; {@code @RequiresPermission} on each controller handler then asserts the permission.
 *
 * <p><b>External roles need a client number.</b> {@link Roles#CLIENT_SCOPED_ROLES} are delivered by FAM
 * as {@code <role>_<clientNumber>}. Held without one, they grant nothing whatsoever and the caller is
 * refused the API outright — see {@link #expandAuthorities}.
 *
 * <p><b>Roll-out state: complete.</b> All eleven roles now have their column filled in. They were
 * enabled one at a time, each with its own story, and until its turn came a role held only
 * {@link Permissions#WELCOME_READ} — exactly its behaviour before permissions existed. That staging
 * mechanism is gone: there is no {@code welcomeOnly()} any more, and a role reaching only the welcome
 * page is now a bug rather than a waiting state.
 *
 * <p><b>What changes look like from here.</b> Adjusting a role means editing its column below and the
 * frontend mirror — still no controller or route changes. But the sweep that each roll-out step
 * carried is done: every screen and in-page control now names its own permission, so widening a column
 * reveals controls that are already gated rather than ungated ones. The remaining known gap is
 * org-unit scoping, below.
 *
 * <ul>
 *   <li>{@link Roles#SCS_SYS_ADMIN} — every permission (matrix §4: "Full create, read, update, and
 *       delete access to all portions of the SCS application").</li>
 *   <li>{@link Roles#SCS_INDUSTRY_SCALER} — enabled; see {@link #industryScaler()}.</li>
 *   <li>{@link Roles#SCS_OWNER} — enabled; see {@link #scaleSiteOwner()}.</li>
 *   <li>{@link Roles#SCS_CHECK_SCALER} — enabled; see {@link #checkScaler()}. The first internal role
 *       below the administrator, and the first with write permissions.</li>
 *   <li>{@link Roles#SCS_CLERICAL}, {@link Roles#SCS_BRANCH_SYS_SUPPORT} and
 *       {@link Roles#SCS_REGIONAL_MANAGER} — enabled, and §3 gives all three the <i>same</i> cells, so
 *       they share one list: {@link #readOnlyInternalColumn()}. Each keeps its own method and javadoc for
 *       its own §4 reading — see {@link #clerical()}, {@link #branchSystemSupport()} and
 *       {@link #regionalManager()}.</li>
 *   <li>{@link Roles#SCS_DIST_MANAGER} — enabled; see {@link #districtManager()}. The same §3 column as
 *       those three <i>plus</i> {@link Permissions#SCALER_LICENCE_CANCEL}, which §4 gives it and them
 *       not — so it shares the list as a union rather than joining it.</li>
 *   <li>{@link Roles#SCS_CE_TECHNICIAN} — enabled; see {@link #ceTechnician()}. Read-only since the
 *       2026-09-02 client spec, so now closest to {@link #readOnlyInternalColumn()} rather than to
 *       {@link #checkScaler()}. Still the only non-administrator to reach a §J maintenance screen, and
 *       the only role that may view a letter without being able to compose one.</li>
 *   <li>{@link Roles#SCS_DIST_SCALING_MANAGER} and {@link Roles#SCS_REGIONAL_SCALING_MANAGER} — the
 *       widest non-administrator columns: almost {@code ADM} minus the deletes, and the only ones that
 *       reach the create wizards, the maintenance screens and risk assessment. §3 gives the two the same
 *       cells, so they share {@link #scalingManagerColumn()}; the six {@code (dist)} / {@code (rgn)}
 *       qualifiers that separate them are org-unit breadth, not permissions. See
 *       {@link #districtScalingManager()} and {@link #regionalScalingManager()}.</li>
 * </ul>
 *
 * <p><b>Risk assessment is set by the client, not by §3.</b> <i>(Client spec, 2026-09-02.)</i> The
 * matrix was nearly silent here — §D's "Scale Site Record – Risk Rating Criteria" is its only risk row
 * and there is no scaler-subject row at all — so this class read the silence through a
 * "follows the record it hangs off" rule. The client has now stated the column directly, and it wins:
 * <ul>
 *   <li><b>Create and update</b>: {@link Roles#SCS_CHECK_SCALER}, {@link Roles#SCS_SYS_ADMIN},
 *       {@link Roles#SCS_REGIONAL_SCALING_MANAGER} and {@link Roles#SCS_DIST_SCALING_MANAGER}, on both
 *       subjects. (There is no {@code _DELETE} verb for either, so this is as far as the vocabulary
 *       goes.)</li>
 *   <li><b>Read</b>: every other role, on both subjects — including {@link Roles#SCS_CE_TECHNICIAN},
 *       which held create and update until this spec withdrew them.</li>
 *   <li><b>Read, client-scoped</b>: the two external roles, on <i>one</i> subject each — the record
 *       each lives on. {@link Roles#SCS_INDUSTRY_SCALER} gets the scaler subject,
 *       {@link Roles#SCS_OWNER} the scale-site subject. That is the "with limitations" the spec
 *       asks for.
 *       <p><b>Both reach their subject from the record only.</b> Each holds {@code _RATING_QUERY} and
 *       {@code _ASSESSMENT_READ} but <i>not</i> {@code _ASSESSMENT_QUERY}: the record's Risk Rating tab
 *       lists its own assessments and links each one, so the standalone search screen reaches nothing
 *       the record does not and is withheld. It is the same shape as
 *       {@link Permissions#SCALE_SITE_READ} without {@link Permissions#SCALE_SITE_QUERY} on the Industry
 *       Scaler — open what you are entitled to, search no register. (Decision: Jonah, 2026-09-03.)
 *       <p>A consequence worth knowing: <b>no client-restricted role now reaches either assessment
 *       search</b>, so the own-client override in both services is inert. It stays anyway — it is the
 *       precondition for ever granting the permission, and removing it would silently re-open the hole
 *       that kept these columns empty before 2026-09-02.</li>
 * </ul>
 *
 * <p><b>The external grant required scoping to be built first, and it was.</b> Four endpoints were
 * previously unreachable by any external role precisely because nothing scoped them:
 * {@code GET /scaler-risk-assessments/search} and {@code /{riskQuestionnaireId}}, and the same pair
 * under {@code /scale-site-risk-assessments}. The reads are keyed on {@code riskQuestionnaireId}, which
 * {@code ClientScopeInterceptor} cannot cover (it keys on {@code scalerLicenceNo} /
 * {@code scaleSiteIdNmbr}), and the searches took the caller's client as a criterion. Both services now
 * close that: the read-by-id resolves the assessment's owning scaler or site and calls
 * {@code ClientScopeGuard} before its own not-found check, and the search overrides the client
 * criterion with the caller's own — the shapes {@code /scaler-authorizations/\{id\}} and
 * {@code ScalerService.searchScalers} already used. The four endpoints are listed in
 * {@code ClientScopeInterceptorTest}'s {@code GUARDED_IN_SERVICE} / {@code SCOPED_BY_SEARCH_OVERRIDE}
 * accordingly. The risk <i>rating</i> tabs needed nothing: their paths carry the record id, so the
 * interceptor covers them for free.
 *
 * <p>Legacy offers no guidance either way: {@code scsMenu.jsp} put "Scaler Risk Assessments"
 * ({@code 1_6}) and "Scale Site Risk Assessments" ({@code 1_7}) in the Queries menu behind no WebADE
 * action at all, so every role holding that menu — the Industry Scaler included — saw both, with no
 * client-scoping on them whatsoever. That hole is what SEC-7 was written to close, and closing it is
 * what makes the client's grant safe to honour.
 *
 * <p><b>Letters are split into a view verb and a create verb</b>, also by the 2026-09-02 spec:
 * {@code CHK}, {@code ADM}, {@code RSM} and {@code DSM} hold all of them, {@code CET} holds only the
 * three {@code _LETTER_VIEW} verbs, and no other role holds any. The check-scale advisory letter has
 * only {@code CHECK_SCALE_ADVISORY_LETTER_CREATE} — SCS stores no advisory letter, so there is nothing
 * for a view verb to fetch and {@code CET} reaches no advisory letter at all. Every role holding a
 * {@code _LETTER_CREATE} verb also holds {@link Permissions#LETTER_SIGNATORY_QUERY}, the signatory
 * picker on the letter pages, and no other role does — {@code RolePermissionsTest} pins it both ways.
 *
 * <p>One boundary among the internal columns, because it is the only role it is not obvious for:
 * {@link Roles#SCS_DIST_MANAGER} gets <b>read only</b> on risk assessment. Its sole write is
 * {@link Permissions#SCALER_LICENCE_CANCEL}, a single carved-out field rather than authoring on any tab,
 * and the client's list of create roles does not name it.
 *
 * <p><b>Two shared lists, and why.</b> {@link #readOnlyInternalColumn()} (three roles) and
 * {@link #scalingManagerColumn()} (two) each hold one list for several columns that §3 gives identical
 * cells. The list is a fact of the matrix; the reasoning is not, so every role keeps its own method and
 * javadoc for its own §4 reading. {@code RolePermissionsTest} asserts each group's equality <i>with the
 * reason in the failure message</i>, so splitting a group later is a deliberate act rather than a silent
 * edit. {@link #districtManager()} shows the third shape: the read-only list <i>plus</i> one permission
 * §4 grants it alone, expressed as a union rather than a fourth copy.</p>
 *
 * <p><b>Org-unit (district/region) scoping is not built.</b> Several matrix cells are qualified
 * {@code (dist)} / {@code (rgn)} and none of them is enforced — the seam is designed in
 * {@code auth-access-scope-design.md} but nothing implements it, so an internal role sees every
 * district's rows. Forest-client scoping (the {@code (ltd)} on the two external columns) <i>is</i>
 * enforced, by {@code ClientScopeInterceptor} / {@code ClientScopeGuard}. Do not read the presence of
 * one as implying the other.
 */
public final class RolePermissions {

  private RolePermissions() {
  }

  /**
   * Industry Scaler ({@code IND}) — external, read-only, and additionally restricted to their own
   * forest client's rows by the data-scoping layer ({@code UserAccessScope}).
   *
   * <p>Straight from matrix §3 column {@code IND} plus the plain-language summary in §4 ("view their
   * own exam and qualification information / their own record / their own authorizations and
   * appointments / scale sites they are authorized to scale at / their own check-scale history").
   * Every cell is {@code R} — the role holds no create, update or delete permission at all, so the
   * "apply for exams / authorizations" items in §4 are not represented: legacy implemented those as
   * printed application forms (the Reports menu's {@code notBuilt.do} placeholders), never as SCS
   * writes.
   *
   * <p><b>Two judgement calls, recorded because the matrix is ambiguous:</b>
   * <ol>
   *   <li>{@link Permissions#SCALE_SITE_READ} is granted so the record can be opened at all — the two
   *       rows the matrix <i>does</i> grant ("Scale Site Record – Check Scales" {@code R},
   *       "– Software Use" {@code R}) are tabs on it. It grants the tombstone header only; the Summary
   *       row's {@code -} is honoured separately by withholding
   *       {@link Permissions#SCALE_SITE_SUMMARY_READ}, which closes the summary endpoint as well as the
   *       tab, so the record opens on Check Scales and the denied fields are never sent.
   *       {@link Permissions#SCALE_SITE_QUERY} is also withheld, so
   *       the site register stays closed and sites are reached only from the scaler's own
   *       authorizations — matching §4's "scale sites they are authorized to scale at".</li>
   *   <li>{@link Permissions#LOV_READ} is granted: the shared reference-data lookups populate
   *       region/district and code labels on the screens above. It exposes code tables only.</li>
   * </ol>
   */
  private static Set<String> industryScaler() {
    return Set.of(
        Permissions.WELCOME_READ,
        Permissions.LOV_READ,
        // Queries – Clients / – Clients – Results: R (ltd)
        Permissions.CLIENT_QUERY,
        // Queries – Scalers (+ results), Scaler Record – Summary / – Address: R (ltd)
        Permissions.SCALER_QUERY,
        Permissions.SCALER_READ,
        Permissions.SCALER_ADDRESS_READ,
        // Scaler Record – Authorizations (list) + Scaler Authorization (single): R (ltd)
        Permissions.SCALER_AUTHORIZATION_QUERY,
        Permissions.SCALER_AUTHORIZATION_READ,
        // Scaler Record – Check Scales: R (ltd)
        Permissions.SCALER_CHECK_SCALE_QUERY,
        // Scaler Record – Exams / Upgrades: R (ltd)
        Permissions.SCALER_EXAM_QUERY,
        // Scaler Record – Appointments: R (ltd)
        Permissions.SCALER_APPOINTMENT_QUERY,
        // Scaler Record – Performance Remarks: R (ltd)
        Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
        // Scaler risk assessment: read, client-scoped, and reached ONLY from the scaler record. Granted
        // by the client's 2026-09-02 spec — "read permissions with limitations" — on the scaler subject,
        // because that is the record this role lives on. SCALER_RISK_ASSESSMENT_QUERY is withheld: the
        // Risk Rating tab lists the record's own assessments and links each to the view page, so the
        // standalone search screen adds nothing this role cannot already reach. Same shape as
        // SCALE_SITE_READ without SCALE_SITE_QUERY above — open the record, do not search the register.
        // (Decision: Jonah, 2026-09-03.) ClientScopeGuard still scopes the read-by-id
        Permissions.SCALER_RISK_RATING_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_READ,
        // Scale-site record: openable, but neither searchable nor Summary-readable — see (1) above
        Permissions.SCALE_SITE_READ,
        // Scale Site Record – Check Scales: R
        Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
        // Scale Site Record – Software Use: R
        Permissions.SCALE_SITE_SOFTWARE_QUERY,
        // Query – Mark Site Designations (+ results) and Mark Site Designation: R
        Permissions.MSD_QUERY,
        Permissions.MSD_READ);
  }

  /**
   * Scale Site Owner / Operator / Contractor ({@code OWN}) — external, read-only, and restricted to
   * their own forest client's rows by the data-scoping layer, exactly like {@link #industryScaler()}.
   *
   * <p>Matrix §3 column {@code OWN} plus §4 ("view select information on scalers authorized to scale at
   * their sites / on their scale sites / on software approved for their site"). Every cell is
   * {@code R}, so the role holds no create, update or delete permission; §4's two "apply for
   * authorizations" items are unrepresented for the same reason they are for the Industry Scaler —
   * legacy implemented them as {@code notBuilt.do} placeholders, never as SCS writes.
   *
   * <p>The shape is the mirror image of the Industry Scaler: that role lives on the <b>scaler</b>
   * record and reaches a site only through its own authorizations, while this one lives on the
   * <b>scale-site</b> record and holds {@link Permissions#SCALE_SITE_QUERY} — legacy
   * {@code MenuUtils.getOwnerMenus()} returned the Queries menu alone, as it did for the Industry
   * Scaler, but §D grants "Queries – Scale Sites" plain {@code R} here.
   *
   * <p><b>Recorded decisions:</b>
   * <ol>
   *   <li><b>§4 wins over §3 on the scaler record's Address and Exams / Upgrades tabs.</b> §3 is
   *       {@code -} for both, yet §4 says the owner views "addresses, exam and upgrade history" for
   *       scalers at their sites. {@link Permissions#SCALER_ADDRESS_READ} and
   *       {@link Permissions#SCALER_EXAM_QUERY} are therefore granted alongside
   *       {@link Permissions#SCALER_READ}. The other five scaler tabs stay denied — §3 and §4 agree
   *       there, since §4 names only these two. (Decision: Jonah, 2026-08-18.)</li>
   *   <li><b>A scaler <i>record</i> is reachable only when the scaler is authorized at a site the client
   *       owns.</b> §1's legend defines the owner's {@code (ltd)} that way and §4's first bullet names the
   *       same population ("scalers authorized to scale at their sites"), so that is the whole rule —
   *       {@code ClientScopeGuard.assertScalerInScope}. The permissions granted here are exactly what
   *       those scalers' tabs need.
   *       <p>The scaler <b>search</b> keeps legacy's own-client binding and the screen keeps legacy's
   *       read-only client field, so it can list a scaler whose record this rule then refuses. Those dead
   *       links are accepted deliberately — see {@code ClientScopeGuard} and
   *       {@code ScalerService.searchScalers}.
   *       <p>Scoping by the scaler's own forest client was dropped on 2026-08-20. It was legacy's rule —
   *       {@code SecurityUtils.hasScalerAccess} compared {@code SCALER.CLIENT_NUMBER} to the caller's
   *       client and nothing else, for owner and industry scaler alike — but that column is documented
   *       only as "Reference to CLIENT", so it asserts an association rather than a current engagement,
   *       which is thin ground for reading a person's address and exam history. Legacy also did not keep
   *       its search and its record rule aligned: {@code scaleSiteScalersList.jsp:61} linked every
   *       licence on the Authorized Scalers tab and {@code hasScalerAccess} then threw for any scaler
   *       outside the caller's client. Binding both layers to one population is what fixes that.
   *       (Decision: Jonah, 2026-08-18; rule replaced 2026-08-20 after review.)</li>
   *   <li><b>Scale-site rows are scoped to the client that owns the site, and nothing else.</b> The
   *       Industry Scaler's "authorized at this site" bridge is <i>not</i> extended to this role: an
   *       owner whose client also employs an authorized scaler would otherwise reach another company's
   *       site summary, contacts, authorizations and inspections by direct URL — records the owner's own
   *       scale-site search never shows and the use cases deny. {@code ClientScopeGuard} therefore
   *       resolves site scope per role rather than per external caller.</li>
   *   <li><b>{@link Permissions#LOV_READ} is granted</b>, as for the Industry Scaler: the shared
   *       reference-data lookups populate region/district and code labels on every screen above. Code
   *       tables only.</li>
   * </ol>
   *
   * <p>Two boundaries worth stating because a neighbouring permission looks similar:
   * <ul>
   *   <li>{@link Permissions#SCALE_SITE_MSD_QUERY} (the site record's MSD tab, §D {@code R (ltd)}) is
   *       granted; {@link Permissions#MSD_QUERY} and {@link Permissions#MSD_READ} (the standalone
   *       search and record, §F {@code -} throughout) are not. {@code RolePermissionsTest} pins that.</li>
   *   <li>The Authorized Scalers tab is readable ({@code SCALE_SITE_AUTHORIZED_SCALER_QUERY}), but
   *       {@link Permissions#SCALER_AUTHORIZATION_READ} is withheld — §E's "Scaler Authorization" row
   *       is {@code -} for {@code OWN}. The tab's authorization-id column therefore renders as plain
   *       text via {@code PermissionLink} while its licence-number column stays a link.</li>
   * </ul>
   */
  private static Set<String> scaleSiteOwner() {
    return Set.of(
        Permissions.WELCOME_READ,
        Permissions.LOV_READ,
        // Queries – Clients / – Clients – Results: R / R (ltd)
        Permissions.CLIENT_QUERY,
        // Queries – Scalers (+ results), Scaler Record – Summary: R (ltd)
        Permissions.SCALER_QUERY,
        Permissions.SCALER_READ,
        // Scaler Record – Address / – Exams / Upgrades: §3 says -, §4 says yes — see (1) above
        Permissions.SCALER_ADDRESS_READ,
        Permissions.SCALER_EXAM_QUERY,
        // Queries – Scale Sites (+ results): R / R (ltd)
        Permissions.SCALE_SITE_QUERY,
        // Scale Site Record – Summary: R (ltd) — opening the record, and its Summary tab
        Permissions.SCALE_SITE_READ,
        Permissions.SCALE_SITE_SUMMARY_READ,
        // Scale Site Record – Contacts (list) + Scale Site Contact (single): R (ltd)
        Permissions.SCALE_SITE_CONTACT_QUERY,
        Permissions.SCALE_SITE_CONTACT_READ,
        // Scale Site Record – Activity Summary: R (ltd)
        Permissions.SCALE_SITE_ACTIVITY_READ,
        // Scale Site Record – Site Authorizations (list) + Scale Site Authorization (single): R (ltd)
        Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
        Permissions.SCALE_SITE_AUTHORIZATION_READ,
        // Scale Site Record – Authorized Scalers: R (ltd)
        Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        // Scale Site Record – MSD: R (ltd) — the site tab only; §F denies the standalone MSD screens
        Permissions.SCALE_SITE_MSD_QUERY,
        // Scale Site Record – Inspections (list) + Site Inspection (single): R (ltd)
        Permissions.SCALE_SITE_INSPECTION_QUERY,
        Permissions.SCALE_SITE_INSPECTION_READ,
        // Scale Site Record – Check Scales: R (ltd)
        Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
        // Scale Site Record – Software Use: R (ltd)
        Permissions.SCALE_SITE_SOFTWARE_QUERY,
        // Scale-site risk assessment: read, client-scoped, and reached ONLY from the scale-site record.
        // The mirror of the Industry Scaler's grant — the site subject, because that is the record this
        // role lives on, and _ASSESSMENT_QUERY withheld for the same reason: the Risk Rating tab lists
        // the record's own assessments and links each to the view page, so the standalone search screen
        // adds nothing. (Decision: Jonah, 2026-09-03.) Note this role DOES hold SCALE_SITE_QUERY, so the
        // withheld search is the assessment register specifically, not registers generally
        Permissions.SCALE_SITE_RISK_RATING_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_READ);
  }

  /**
   * Check Scaler ({@code CHK}) — Ministry field staff, and the <b>first internal role enabled below
   * the administrator</b>. Two things follow from "internal" and are worth stating plainly:
   *
   * <ul>
   *   <li><b>No forest-client scoping.</b> The role is not in {@link Roles#CLIENT_SCOPED_ROLES}, so
   *       {@code SecurityContextUtils.isClientRestricted()} is false and {@code ClientScopeGuard} /
   *       {@code ClientScopeInterceptor} are no-ops for it. It reads any client's records, which is what
   *       matrix §B's plain {@code R} on "Queries – Clients – Results" says (contrast the external
   *       columns' {@code R (ltd)}).</li>
   *   <li><b>Org-unit scoping is not built yet.</b> §A's Work Bench cell is {@code CRU (ltd)} and the
   *       legend defines the ministry-field {@code (ltd)} as the user's district/region. Nothing enforces
   *       that today — the seam is designed in {@code auth-access-scope-design.md} § "How org-unit access
   *       plugs in later" ({@code UserAccessScope.orgUnits}, the same interceptor/guard shape, region
   *       roll-up). Until it lands, this role sees every district's rows on the screens below. That is a
   *       <i>known, deliberate</i> gap, not an oversight: it is the same gap every remaining ministry
   *       column carries, and closing it for one role in isolation would fork the scoping layer.</li>
   * </ul>
   *
   * <p>It is also the first role with <b>write</b> permissions, so unlike the two external columns there
   * is no "read-only" invariant to lean on. {@code RolePermissionsTest} pins the granted set exactly and
   * pins the mutations it must <i>not</i> hold, which is the equivalent guard.
   *
   * <p>Legacy parity on the menu: {@code MenuUtils.getCheckScalerMenus()} returned Create, Queries,
   * Reports, Administration (and Handheld, descoped) — every top-level menu. The Administration menu
   * collapses to Work Bench here, because §J denies this column every Maintenance row.
   *
   * <h2>What it does, in one line per area</h2>
   *
   * <p>Reads the scaler and scale-site registers whole; <b>writes</b> exactly four things — check scales
   * (§I), site inspections (§H), performance remarks (§C) and mark/site designations (§F) — and renews
   * expiring authorizations from the Work Bench (§A). It creates no scaler, no scale site, and no
   * authorization through the create wizards (§C/§D/§E are {@code -} on every create row).
   *
   * <p><b>Judgement calls, recorded because the matrix has no row for them</b> (Decisions: Jonah,
   * 2026-08-24):
   * <ol>
   *   <li><b>Work Bench {@code CRU} is taken at face value, §A over §E.</b>
   *       {@link Permissions#WORKBENCH_CREATE} gates the three renew endpoints, which issue a
   *       <i>new</i> scaler / scale-site / MSD authorization from a queued expiring one — while §E denies
   *       this column every authorization-create row. The Work Bench row wins, which is the reading
   *       {@link Permissions#WORKBENCH_QUERY}'s own javadoc was written for: the verbs are gated on §A's
   *       row precisely "because it grants Work Bench {@code CRU} to roles (e.g. Check Scaler) that it
   *       denies authorization-create". Renewing a queued item and opening the create wizard are
   *       different capabilities; the wizard stays closed
   *       ({@link Permissions#SCALER_AUTHORIZATION_CREATE} and
   *       {@link Permissions#SCALE_SITE_AUTHORIZATION_CREATE} are withheld).</li>
   *   <li><b>Summary check scales are governed by §I's "Check Scale" rows.</b> They have no row of their
   *       own, but they are check scales — same table, same {@code CheckScaleDetail} payload, and the
   *       Summary Check Scales tab is already readable through
   *       {@link Permissions#SCALER_CHECK_SCALE_QUERY}. §I gives this column {@code CR} on create and
   *       {@code RU} on the record, so {@link Permissions#SUMMARY_CHECK_SCALE_CREATE} and
   *       {@link Permissions#SUMMARY_CHECK_SCALE_UPDATE} are granted and
   *       {@link Permissions#SUMMARY_CHECK_SCALE_DELETE} is not — the {@code D} appears only in
   *       {@code ADM}'s "Check Scale" {@code RUD}. Denying them outright would leave the role able to
   *       read summary check scales it may never record, against §4's "complete check-scale
   *       reports".</li>
   *   <li><b>Every letter verb is granted, by the client's 2026-09-02 spec.</b> "For letters,
   *       CHECK_SCALER, SYS_ADMIN, REG_SCAL_MAN and REG_DIST_MAN have access to all letters and can
   *       create letters" — so this column holds all seven, view and create alike.
   *       <p>That <b>supersedes</b> the narrower reading this method used to carry. MSD and advisory were
   *       granted on an "owns the workflow end to end" test (§F gives this column {@code CRUD} on "Mark
   *       Site Designation – Create/Edit"; the advisory letter is the output of a check scale it records)
   *       and the two authorization letters were withheld by it, because §E gives this column plain
   *       {@code R} and no create row. The client named the role explicitly, so the test no longer
   *       decides it. The test still governs {@link #ceTechnician()}, which the same spec limits to
   *       viewing.
   *       <p>Composing a letter also needs its signatory picker, so the column holds
   *       {@link Permissions#LETTER_SIGNATORY_QUERY} — and <b>not</b>
   *       {@link Permissions#MAINTAIN_SIGNATORIES_QUERY}, which the picker used to borrow: §J is
   *       {@code -} here, and borrowing it left this role's letters with an empty picker and no
   *       signatory (nr-scs #286 follow-up).</li>
   *   <li><b>{@link Permissions#LOV_READ} is granted</b>, as for every enabled role: the shared
   *       reference-data lookups populate region/district and code labels on every screen below. Code
   *       tables only.</li>
   * </ol>
   *
   * <p>Three boundaries worth stating because a neighbouring permission looks similar:
   * <ul>
   *   <li>{@link Permissions#SCALER_PERFORMANCE_REMARK_DELETE} <b>is</b> held while
   *       {@link Permissions#SCALER_UPDATE} is not — §C's "Performance Remarks" cell is {@code CRD} and
   *       its "Summary – Edit" cell is {@code -}. A role that deletes a remark but cannot edit the
   *       scaler reads oddly and is exactly what the matrix says.</li>
   *   <li>{@link Permissions#SCALER_LICENCE_CANCEL} is withheld even though it is surfaced on the
   *       Performance Remarks tab this role writes to: §4 gives suspend/cancel to the district and
   *       regional managers, and this is the split that permission was carved out of
   *       {@link Permissions#SCALER_UPDATE} for.</li>
   *   <li>{@link Permissions#SCALE_SITE_INSPECTION_DELETE} is withheld: §H's "Site Inspection" row is
   *       {@code RU} here and {@code RU} even for {@code ADM}, so no column has the {@code D}. Same shape
   *       for check scales, which have no delete endpoint at all.</li>
   * </ul>
   */
  private static Set<String> checkScaler() {
    return Set.of(
        Permissions.WELCOME_READ,
        Permissions.LOV_READ,
        // Queries – Clients / – Clients – Results: R, unscoped (no "(ltd)" on an internal column)
        Permissions.CLIENT_QUERY,
        // Queries – Scalers (+ results), Scaler Record – Summary / – Address: R
        Permissions.SCALER_QUERY,
        Permissions.SCALER_READ,
        Permissions.SCALER_ADDRESS_READ,
        // Scaler Record – Authorizations (list): R. §E "Scaler Authorization" (single): R
        Permissions.SCALER_AUTHORIZATION_QUERY,
        Permissions.SCALER_AUTHORIZATION_READ,
        // The client's 2026-09-02 spec puts this column among the four with all letters — see (3)
        Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
        Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
        // Scaler Record – Check Scales: CR — the R (the C is CHECK_SCALE_CREATE below)
        Permissions.SCALER_CHECK_SCALE_QUERY,
        // Scaler Record – Exams / Upgrades, – Appointments: R (no create/edit rows for this column)
        Permissions.SCALER_EXAM_QUERY,
        Permissions.SCALER_APPOINTMENT_QUERY,
        // Scaler Record – Performance Remarks: CRD, + "Scaler Performance Remark" RU / Create-Edit CRU
        Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
        Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
        Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
        Permissions.SCALER_PERFORMANCE_REMARK_DELETE,
        // Queries – Scale Sites (+ results): R
        Permissions.SCALE_SITE_QUERY,
        // Scale Site Record – Summary: R — opening the record, and its Summary tab
        Permissions.SCALE_SITE_READ,
        Permissions.SCALE_SITE_SUMMARY_READ,
        // Scale Site Record – Activity Summary: R
        Permissions.SCALE_SITE_ACTIVITY_READ,
        // Scale Site Record – Contacts (list) + Scale Site Contact (single): R — no C/U/D rows here
        Permissions.SCALE_SITE_CONTACT_QUERY,
        Permissions.SCALE_SITE_CONTACT_READ,
        // Scale Site Record – Site Authorizations (list): R. §E "Scale Site Authorization": R
        Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
        Permissions.SCALE_SITE_AUTHORIZATION_READ,
        Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        // Scale Site Record – Authorized Scalers: R
        Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        // Scale Site Record – MSD: CR — the R (the C is MSD_CREATE below)
        Permissions.SCALE_SITE_MSD_QUERY,
        // Scale Site Record – Inspections: CR, + §H "Site Inspection" RU / – Create CR. No D anywhere
        Permissions.SCALE_SITE_INSPECTION_QUERY,
        Permissions.SCALE_SITE_INSPECTION_READ,
        Permissions.SCALE_SITE_INSPECTION_CREATE,
        Permissions.SCALE_SITE_INSPECTION_UPDATE,
        // Scale Site Record – Check Scales: CR — the R. – Software Use: R
        Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
        Permissions.SCALE_SITE_SOFTWARE_QUERY,
        // §I Check Scale – Create (both steps) CR, – Edit RU, Check Scale RU. The R is the search
        // endpoint: there is no read-one handler, the view page resolves a check scale through it
        Permissions.CHECK_SCALE_QUERY,
        Permissions.CHECK_SCALE_CREATE,
        Permissions.CHECK_SCALE_UPDATE,
        // No matrix row — granted, see judgement call (3). No view verb: SCS stores no advisory letter
        Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
        // No matrix row of their own — read under §I's Check Scale rows, see judgement call (2)
        Permissions.SUMMARY_CHECK_SCALE_CREATE,
        Permissions.SUMMARY_CHECK_SCALE_UPDATE,
        // §F Query – MSD R, – Results CR, MSD – Create CR, – Create/Edit CRUD, MSD RU.
        // No MSD_DELETE permission exists: SCS exposes no delete endpoint for a designation
        Permissions.MSD_QUERY,
        Permissions.MSD_READ,
        Permissions.MSD_CREATE,
        Permissions.MSD_UPDATE,
        // No matrix row — granted, see judgement call (3)
        Permissions.MSD_LETTER_CREATE,
        Permissions.MSD_LETTER_VIEW,
        // The signatory picker every letter above needs — not §J's Maintain Signatories. See (3)
        Permissions.LETTER_SIGNATORY_QUERY,
        // Risk assessment: one of the four create roles named by the client's 2026-09-02 spec, on
        // both subjects. See the class javadoc
        Permissions.SCALER_RISK_RATING_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_READ,
        Permissions.SCALER_RISK_ASSESSMENT_CREATE,
        Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
        Permissions.SCALE_SITE_RISK_RATING_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
        // §A Work Bench: CRU (ltd) — the (ltd) is org-unit scoping, not yet enforced. See (1)
        Permissions.WORKBENCH_QUERY,
        Permissions.WORKBENCH_CREATE,
        Permissions.WORKBENCH_UPDATE,
        // §4 "View reports"; legacy getCheckScalerMenus() included the Reports menu. Menu-level, as
        // the matrix has no per-report rows — see Permissions.REPORT_READ
        Permissions.REPORT_READ);
  }

  /**
   * Branch &amp; District Clerical ({@code CLE}) — Ministry support staff, and the first role that is
   * <b>both internal and read-only</b>. That combination is the whole character of the column:
   *
   * <ul>
   *   <li><b>Internal</b>, like the Check Scaler: absent from {@link Roles#CLIENT_SCOPED_ROLES}, so
   *       forest-client scoping is a no-op and §B's plain {@code R} on "Queries – Clients – Results"
   *       (against the external columns' {@code R (ltd)}) is honoured.</li>
   *   <li><b>Read-only</b>, like the two external columns: every cell in the column is {@code R} or
   *       {@code -}, so the allowlist invariant those two lean on comes back — every granted name must
   *       end {@code _READ} or {@code _QUERY}, and {@code RolePermissionsTest} asserts it rather than
   *       enumerating forbidden verbs.</li>
   * </ul>
   *
   * <p><b>It is exactly the read-only subset of {@link #checkScaler()}</b> — a strict subset, pinned by
   * a test. Nothing here is new surface: every page this role opens was already opened by the Check
   * Scaler, so the in-page control sweep that role's story ran covers this one, and the four pages the
   * subset drops (the check-scale view and edit, the summary check-scale edit, and the create wizards)
   * are closed by route permissions this column does not hold.
   *
   * <p>Legacy parity on the menu: {@code MenuUtils} mapped {@code SCS_BRANCH_DIST_CLERICAL} to
   * {@code getAQRMenus()} = <b>Administration, Queries, Reports</b> — no Create menu, which is exactly
   * what holding no {@code _CREATE} permission produces. Administration collapses to Work Bench, since
   * §J denies this column every Maintenance row.
   *
   * <p><b>Judgement calls</b> (Decisions: Jonah, 2026-08-25):
   * <ol>
   *   <li><b>§3 wins over §4 on the scale-site tabs, and the columns themselves prove why.</b> §4
   *       summarises this role's site access as "addresses, site authorizations", yet §D grants it plain
   *       {@code R} on Contacts, Activity Summary, Authorized Scalers, MSD, Inspections, Check Scales and
   *       Software Use. Unlike the Scale Site Owner's case — where §4 <i>widened</i> access past a
   *       {@code -} and won — honouring §4 here would <i>withdraw</i> access §3 states row by row.
   *       <p>The tell is {@code SUP}: its §3 column is identical to this one (bar the Work Bench
   *       {@code (ltd)} qualifier), while its §4 bullet names four site items where this one names two.
   *       Two identical columns cannot carry different permissions, so the §4 lists are illustrative
   *       rather than exhaustive, and §3 is the authority. That reading also settles {@code SUP} in
   *       advance, since the same argument applies to it unchanged.</li>
   *   <li><b>The check-scale <i>record</i> is denied while both check-scale <i>tabs</i> are granted.</b>
   *       §I is {@code -} throughout for this column, so {@link Permissions#CHECK_SCALE_QUERY} is
   *       withheld — but §C's "Scaler Record – Check Scales" and §D's "Scale Site Record – Check Scales"
   *       are both {@code R}, so the history lists are readable. The rows are separate and they disagree
   *       for a reason: §4's "check-scale history" is the list, not the report. Two visible consequences,
   *       both already built: a Check Scale # renders as plain text through {@code PermissionLink}, and
   *       the "OR enter check scale #" box on Queries – Scalers is hidden — that field is gated on
   *       {@code CHECK_SCALE_QUERY} precisely because it is an unscoped lookup by number.
   *       <p>{@link Permissions#SUMMARY_CHECK_SCALE_CREATE} and {@code _UPDATE} follow §I too, by the
   *       same reading {@link #checkScaler()} judgement call (2) established: summary check scales are
   *       governed by the "Check Scale" rows, which are {@code -} here. The Summary Check Scales tab
   *       stays readable through {@link Permissions#SCALER_CHECK_SCALE_QUERY}.</li>
   *   <li><b>Work Bench is {@code R (ltd)}, so the queue is readable and nothing can be renewed.</b>
   *       {@link Permissions#WORKBENCH_QUERY} alone, without {@code _CREATE} / {@code _UPDATE} — the
   *       inverse of the Check Scaler's {@code CRU}, and the case the Work Bench's actions column was
   *       already taught to drop via {@code canAny}. The {@code (ltd)} is org-unit scoping, which is not
   *       built (see the class javadoc), so this role currently sees every district's queue.</li>
   *   <li><b>No {@code _LETTER} verb.</b> Same "owns the workflow end to end" test the Check Scaler was
   *       given: §E and §F are plain {@code R} here with no create row anywhere, so this role documents
   *       no lifecycle of its own.</li>
   *   <li><b>{@link Permissions#LOV_READ} is granted</b>, as for every enabled role: the shared
   *       reference-data lookups populate region/district and code labels on every screen below. Code
   *       tables only.</li>
   * </ol>
   *
   * <p>One vocabulary note, because a reader will look for the permission and not find it: §C's "Scaler
   * Performance Remark" {@code R} row needs no name of its own. SCS exposes no read-one handler for a
   * remark — the detail view is rendered from the tab's payload — so
   * {@link Permissions#SCALER_PERFORMANCE_REMARK_QUERY} covers both rows.
   */
  private static Set<String> clerical() {
    return readOnlyInternalColumn();
  }

  /**
   * The read-only internal column — <b>one list, shared verbatim by three roles</b> because §3 gives
   * them the same cells: {@link Roles#SCS_CLERICAL}, {@link Roles#SCS_BRANCH_SYS_SUPPORT} and
   * {@link Roles#SCS_REGIONAL_MANAGER}.
   *
   * <p>Not an impression — the three columns were compared cell by cell across all 79 rows of §3 and
   * agree on 78. The only variation is §A's Work Bench: {@code R (ltd)} for the clerical and regional
   * manager columns, plain {@code R} for branch support. That is a <b>scoping qualifier, not a
   * permission letter</b> — all three are {@code R}, so all three hold
   * {@link Permissions#WORKBENCH_QUERY} and nothing more. What differs is breadth, which belongs to the
   * org-unit layer: a branch role reads the queue province-wide, the other two within their district or
   * region.
   *
   * <p><b>Why a shared list rather than three copies.</b> The list is a fact of §3, so duplicating it
   * three times would be three places for one fact to rot, and thirty per-row comments to keep in step.
   * The <i>reasoning</i> is not shared: each role keeps its own method and its own javadoc, because each
   * has a different §4 summary and its own conflicts to resolve. {@code RolePermissionsTest} asserts the
   * three sets are equal <b>with the reason in the failure message</b>, so if a real requirement ever
   * separates them, the failing test says where to write down why and each role can be given its own
   * {@code Set.of}.
   *
   * <p><b>What the column is.</b> Every entry is a {@code _READ} or {@code _QUERY} — the reads of the
   * scaler and scale-site registers, <b>both records whole, risk assessment included</b> (the client's
   * 2026-09-02 spec puts every role it does not name as a create role on read), the standalone
   * authorization / MSD / inspection views, the Work Bench queue, and the reports. No letter verb: that
   * spec names {@code CHK}, {@code ADM}, {@code RSM} and {@code DSM} for letters and {@code CET} for
   * viewing them, and none of these three. It is a strict subset of {@link #checkScaler()}, which is what
   * makes these roles cheap to enable: they open no page that role's in-page control sweep has not
   * already covered.
   *
   * @see #clerical()
   * @see #branchSystemSupport()
   * @see #regionalManager()
   */
  private static Set<String> readOnlyInternalColumn() {
    return Set.of(
        Permissions.WELCOME_READ,
        Permissions.LOV_READ,
        // Queries – Clients / – Clients – Results: R, unscoped (no "(ltd)" on an internal column)
        Permissions.CLIENT_QUERY,
        // Queries – Scalers (+ results), Scaler Record – Summary / – Address: R. Results is R, not CR
        Permissions.SCALER_QUERY,
        Permissions.SCALER_READ,
        Permissions.SCALER_ADDRESS_READ,
        // Scaler Record – Authorizations (list): R. §E "Scaler Authorization" (single): R
        Permissions.SCALER_AUTHORIZATION_QUERY,
        Permissions.SCALER_AUTHORIZATION_READ,
        // Scaler Record – Check Scales: R — the list only; §I denies the record. clerical() call (2)
        Permissions.SCALER_CHECK_SCALE_QUERY,
        // Scaler Record – Exams / Upgrades, – Appointments: R (both Create/Edit rows are -)
        Permissions.SCALER_EXAM_QUERY,
        Permissions.SCALER_APPOINTMENT_QUERY,
        // Scaler Record – Performance Remarks R + "Scaler Performance Remark" R; Create/Edit is -
        Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
        // Queries – Scale Sites (+ results): R. Results is R, not CR
        Permissions.SCALE_SITE_QUERY,
        // Scale Site Record – Summary: R — opening the record, and its Summary tab
        Permissions.SCALE_SITE_READ,
        Permissions.SCALE_SITE_SUMMARY_READ,
        // Scale Site Record – Activity Summary: R
        Permissions.SCALE_SITE_ACTIVITY_READ,
        // Scale Site Record – Contacts (list) + Scale Site Contact (single): R — clerical() call (1)
        Permissions.SCALE_SITE_CONTACT_QUERY,
        Permissions.SCALE_SITE_CONTACT_READ,
        // Scale Site Record – Site Authorizations (list): R. §E "Scale Site Authorization": R
        Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
        Permissions.SCALE_SITE_AUTHORIZATION_READ,
        // Scale Site Record – Authorized Scalers: R
        Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        // Scale Site Record – MSD: R — the site tab. §F grants the standalone screens separately below
        Permissions.SCALE_SITE_MSD_QUERY,
        // Scale Site Record – Inspections (list): R. §H "Site Inspection" (single): R. No create row
        Permissions.SCALE_SITE_INSPECTION_QUERY,
        Permissions.SCALE_SITE_INSPECTION_READ,
        // Scale Site Record – Check Scales: R — the list only, as above. – Software Use: R
        Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
        Permissions.SCALE_SITE_SOFTWARE_QUERY,
        // Risk assessment: read on both subjects, which is where the client's 2026-09-02 spec puts
        // every role it does not name as a create role. Holds for the District Manager too, which
        // unions this list — its one write is a carved-out field, not authoring
        Permissions.SCALER_RISK_RATING_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_READ,
        Permissions.SCALE_SITE_RISK_RATING_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
        // §F Query – MSD R, – Results R (not CR), Mark Site Designation R. Create/Edit rows are -
        Permissions.MSD_QUERY,
        Permissions.MSD_READ,
        // §A Work Bench: R for all three columns — read the queue, renew nothing. The (ltd) on two of
        // them is breadth, not a different permission; see this method's javadoc
        Permissions.WORKBENCH_QUERY,
        // §4 "View reports"; legacy getAQRMenus() included the Reports menu for all three. Menu-level,
        // as the matrix has no per-report rows — see Permissions.REPORT_READ
        Permissions.REPORT_READ);
  }

  /**
   * Branch System Support ({@code SUP}) — {@link #readOnlyInternalColumn()}, the list §3 gives this
   * column and two others verbatim. Its own §A cell is the plain {@code R} of the three: a branch
   * (headquarters) role reads the Work Bench queue province-wide, where the clerical and regional
   * manager columns carry {@code R (ltd)}. Same permission either way; see that method for why the
   * qualifier is not one.
   *
   * <p><b>§4 names four capabilities the clerical summary does not, and none of them changes the set:</b>
   * <ul>
   *   <li><b>"site inspection results, approved software applications"</b> — already granted, by §D's
   *       "Scale Site Record – Inspections" {@code R} and "– Software Use" {@code R}. §4 is confirming
   *       §3 here, not extending it.
   *       <p>This pair is also the <i>evidence</i> for the reading recorded in {@link #clerical()}
   *       judgement call (1): the clerical §4 summary omits both items while §3 grants that column the
   *       identical cells. Two columns that are identical in §3 cannot carry different permissions, so
   *       the §4 lists are illustrative rather than exhaustive — confirmed from both directions.</li>
   *   <li><b>"exam requirements, exam schedules"</b> — nothing in SCS to grant. Searched the legacy
   *       source: no {@code examSchedule} / {@code examRequirement} action, JSP or table exists at all,
   *       and the Reports menu's exam item is a {@code notBuilt.do} placeholder (the same dead end as the
   *       Industry Scaler's "apply for exams"). The nearest real screen is Maintenance → Exam/Upgrades
   *       ({@code trainingTypes.do}), which §J denies this column outright <i>and</i> which legacy kept
   *       behind {@code <webade:ifUserCanPerformAction action="maintainTemplates">} — an action this role
   *       did not hold. So the phrase describes a capability the system never built.
   *       {@link Permissions#SCALER_EXAM_QUERY} (the scaler record's Exams / Upgrades tab) is this role's
   *       whole exam surface, and it is granted.</li>
   * </ul>
   *
   * <p>Legacy parity on the menu: {@code MenuUtils} mapped {@code SCS_BRANCH_SYS_SUPPORT} to
   * {@code getAQRMenus()} — Administration, Queries, Reports — the identical mapping it gave the clerical
   * role. And {@code scsMenu.jsp} wraps the entire Maintenance submenu in that one WebADE action while
   * leaving Work Bench unconditional, so "Administration → Work Bench only" is precisely what legacy
   * rendered for this role. The port reproduces it without a special case: §J is {@code -} throughout,
   * so the nested group is dropped for having no visible child.
   */
  private static Set<String> branchSystemSupport() {
    return readOnlyInternalColumn();
  }

  /**
   * Regional Manager ({@code RM}) — {@link #readOnlyInternalColumn()} again. §3 gives this column the
   * same 79 cells as the clerical one, {@code R (ltd)} Work Bench included, so there is no third list.
   *
   * <p>It is the <b>first management role enabled</b>, and the first whose §4 summary claims a write the
   * matrix denies. That claim is the only decision here, and it goes against §4:
   *
   * <p><b>"Create scaler licences (full create for acting exams; pending branch approval for licensed
   * exams)" is NOT granted.</b> {@link Permissions#SCALER_CREATE} stays withheld. <i>(Decision: Jonah,
   * 2026-08-25.)</i>
   *
   * <p>The phrase maps to the Create → Scaler wizard: {@code DSM} and {@code RSM} carry the identical §4
   * bullet and both hold {@code CR} on §C's "Scaler – Create", so that is what it means in this
   * document's own terms. Three independent things then deny it to this column:
   * <ol>
   *   <li><b>§3 denies it twice, in two rows that are separately about it.</b> "Scaler – Create" is
   *       {@code -}, and "Queries – Scalers – Results" is {@code R} where {@code DSM}, {@code RSM} and
   *       {@code ADM} are {@code CR} — the matrix has a dedicated row for creating from the search
   *       results, and this column is read-only in it. A single {@code -} might be an omission; two rows
   *       disagreeing with §4 in the same direction is a position.</li>
   *   <li><b>Legacy positively denied it.</b> {@code MenuUtils} mapped {@code SCS_REGIONAL_MANAGER} to
   *       {@code getAQRMenus()} — Administration, Queries, Reports, <b>no Create menu</b> — while giving
   *       {@code getDistScaleManMenus()} and {@code getRegScalManMenus()} the Create menu explicitly.
   *       {@code scalerCreate.do} lives at menu level {@code 3_1}, so a legacy Regional Manager could not
   *       reach the wizard at all.</li>
   *   <li><b>The bullet describes an out-of-system step.</b> "Pending branch approval for licensed exams"
   *       is an approval workflow, not a screen; SCS has no exam-application or approval surface (see
   *       {@link #branchSystemSupport()} on the missing exam-schedule screens, and the Industry Scaler's
   *       {@code notBuilt.do} application forms).</li>
   * </ol>
   *
   * <p>This is the mirror of the Scale Site Owner's resolution rather than a contradiction of it. There,
   * §4 won because §3's {@code -} would have made a specific §4 statement meaningless and legacy offered
   * nothing against it. Here legacy is the thing arguing <i>for</i> §3. The general test that falls out:
   * <b>§4 outranks a bare §3 {@code -} only when nothing else corroborates the {@code -}.</b>
   *
   * <p>Two further notes, both about what this column does <i>not</i> get:
   * <ul>
   *   <li>{@link Permissions#SCALER_LICENCE_CANCEL} is withheld. §4's "Suspend scaler licence / recommend
   *       cancellations" belongs to {@code DM}, {@code DSM} and {@code RSM} — <b>not</b> to this role,
   *       whose four bullets do not include it. Worth stating because that permission was carved out of
   *       {@link Permissions#SCALER_UPDATE} for the manager roles as a group, which invites granting it to
   *       any role with "Manager" in the name.</li>
   *   <li>§4 omits the Work Bench, which §A grants as {@code R (ltd)}. {@link Permissions#WORKBENCH_QUERY}
   *       is granted anyway: §4 omission is not denial — the same reading {@link #clerical()} judgement
   *       call (1) rests on, where §4 named two site tabs and §3 granted seven.</li>
   * </ul>
   */
  private static Set<String> regionalManager() {
    return readOnlyInternalColumn();
  }

  /**
   * District Manager ({@code DM}) — {@link #readOnlyInternalColumn()} <b>plus exactly one write</b>:
   * {@link Permissions#SCALER_LICENCE_CANCEL}.
   *
   * <p>Its §3 column is cell-for-cell identical to the three that share the read-only list, Work Bench
   * {@code R (ltd)} included — so it is tempting to add it to them. <b>Do not.</b> §4 gives this column a
   * fourth bullet the other three do not have — "Suspend scaler licence / recommend cancellations" — and
   * that bullet is the entire reason {@link Permissions#SCALER_LICENCE_CANCEL} exists as a permission of
   * its own. Folding this role into the shared list would deny the one capability §4 names for it, and
   * would leave that permission held by nobody but the administrator, making the split pointless.
   *
   * <p><b>§4 wins over §3's {@code -} here, and legacy is why.</b> <i>(Decision: Jonah, 2026-08-26.)</i>
   * §3's "Scaler Record – Summary – Edit" is {@code -}, so {@link Permissions#SCALER_UPDATE} stays
   * withheld and this role edits no scaler field. But the licence-cancelled date is not a Summary field:
   * in legacy it lived on the Performance Remarks screen inside its <b>own</b> WebADE action —
   * {@code <webade:ifUserCanPerformAction action="scalerPerformanceRemarkCancelScaler">} wrapping the date
   * input and its Save Record ({@code scalerPerformanceRemarkSummary.jsp:92-114}), separate from the
   * {@code scalerPerformanceRemarkCreate} action gating Add Performance Remark on the same page. Legacy
   * therefore treated suspend-the-licence as a capability in its own right, gated independently of both
   * scaler edit and remark authoring — which is precisely the boundary this permission draws, and
   * precisely what §4 asks for.
   *
   * <p>Contrast {@link #regionalManager()}, where §4 also claimed a write and was <i>refused</i>: there
   * legacy's own role→menu map denied the capability (no Create menu), so §3's {@code -} was corroborated.
   * Here legacy corroborates §4 instead. Same test applied, opposite answer — see that method for the
   * rule the pair establishes.
   *
   * <p><b>Three structural consequences, each with its own test:</b>
   * <ol>
   *   <li><b>It is not read-only</b>, so the allowlist invariant the other three lean on does not apply.
   *       Replaced by the {@link #checkScaler()} shape: the mutations it holds are enumerated — exactly
   *       one — and any other mutating permission fails the build.</li>
   *   <li><b>It is not a subset of {@link #checkScaler()}</b>, the first enabled role that is not. That
   *       role deliberately withholds {@link Permissions#SCALER_LICENCE_CANCEL} (its own javadoc records
   *       why), so the "every page was already swept" argument cannot be made by containment. It still
   *       holds by inspection: this permission gates a <i>control</i>, not a route — the licence-cancelled
   *       date and its Save Record on the Performance Remarks tab, which this role reaches through
   *       {@link Permissions#SCALER_PERFORMANCE_REMARK_QUERY} in the shared list. No new page.</li>
   *   <li><b>It is a new combination on that tab: cancel without remark writes.</b> The administrator has
   *       both, the Check Scaler has the remark writes and not the cancel, the read-only columns have
   *       neither. So this role sees the licence date editable with Save Record, while Add Performance
   *       Remark is hidden and the row Actions column is dropped rather than headed and empty. Covered by
   *       {@code PerformanceRemarksTab.browser.test}.</li>
   * </ol>
   *
   * <p>Written as a union rather than a fourth copy of thirty names: the shared list is the same fact of
   * §3 for this column as for the other three, and this method adds the one cell where §4 departs from it.
   */
  private static Set<String> districtManager() {
    Set<String> column = new LinkedHashSet<>(readOnlyInternalColumn());
    // §4 "Suspend scaler licence / recommend cancellations" — the only write in the column, and the
    // reason SCALER_LICENCE_CANCEL was split out of SCALER_UPDATE. §3's Summary – Edit stays -.
    column.add(Permissions.SCALER_LICENCE_CANCEL);
    return Set.copyOf(column);
  }

  /**
   * C&amp;E Technician / Forest Officer ({@code CET}) — <b>read-only, everywhere in the application</b>,
   * plus the ability to view letters someone else composed.
   *
   * <p><b>The client's 2026-09-02 spec governs this column, not matrix §3.</b> It states the rule in one
   * line — "For CE_TECH, in general they should only have read permissions. No where in the app should
   * they be able to edit, delete or create something" — which settles by fiat the contradiction §3 could
   * not: §I gave this column {@code CR}/{@code RU} on all four check-scale rows while §C's "Scaler
   * Record – Check Scales" gave it {@code R} and §4 said "<b>view</b> check-scale history". The write
   * side of §3 is now dead for this role. Withdrawn accordingly, on 2026-09-02: the performance-remark
   * create/update/delete, the site-inspection create/update, the check-scale and summary-check-scale
   * create/update, the advisory letter, and risk-assessment create/update.
   *
   * <p>So the column is now {@link #readOnlyInternalColumn()} with four differences:
   * <ul>
   *   <li><b>No Work Bench</b> — §A is {@code -} here, where the read-only internal roles have
   *       {@code R (ltd)}. This is still the only internal column with no Work Bench at all.</li>
   *   <li><b>Plus {@link Permissions#CHECK_SCALE_QUERY}</b> — §I's read survives the client's rule, so
   *       the check-scale record and the "OR enter check scale #" lookup stay open where
   *       {@link #clerical()} has them closed.</li>
   *   <li><b>Plus the three {@code _LETTER_VIEW} verbs</b> — the client's spec gives {@code CET} letters
   *       to view and not to compose, which is the whole reason those permissions were split from the
   *       old single {@code _LETTER} verb. There is no advisory-letter view: SCS never stores one.</li>
   *   <li><b>Plus {@link Permissions#MAINTAIN_QUESTIONS_QUERY} and {@code _READ}</b> — §J's "Maintain
   *       Questions" is {@code R} for this column and {@code -} for every other non-administrator. Its
   *       create, update and delete stay withheld, which the client's rule independently requires.</li>
   * </ul>
   *
   * <p>Legacy delivered that maintenance cell somewhere else entirely:
   * {@code MenuUtils.getCeTechnicianMenus()} returned Queries, Reports and Handheld Management — no
   * Administration menu — and the questions were reached through Handheld → "Download Questions"
   * ({@code siteInspectionQuestions.do}). Handheld is descoped, so the capability survives on the only
   * surface SCS still has for it: the maintenance screen, read-only.
   *
   * <p>Being read-only again makes the allowlist invariant available: every granted name ends
   * {@code _READ}, {@code _QUERY} or {@code _LETTER_VIEW}, and {@code RolePermissionsTest} asserts that
   * rather than enumerating forbidden verbs.
   */
  private static Set<String> ceTechnician() {
    return Set.of(
        Permissions.WELCOME_READ,
        Permissions.LOV_READ,
        // Queries – Clients / – Clients – Results: R
        Permissions.CLIENT_QUERY,
        // Queries – Scalers (+ results), Scaler Record – Summary / – Address: R
        Permissions.SCALER_QUERY,
        Permissions.SCALER_READ,
        Permissions.SCALER_ADDRESS_READ,
        // Scaler Record – Authorizations (list): R. §E "Scaler Authorization" (single): R
        Permissions.SCALER_AUTHORIZATION_QUERY,
        Permissions.SCALER_AUTHORIZATION_READ,
        // Scaler Record – Check Scales, – Exams / Upgrades, – Appointments: R
        Permissions.SCALER_CHECK_SCALE_QUERY,
        Permissions.SCALER_EXAM_QUERY,
        Permissions.SCALER_APPOINTMENT_QUERY,
        // §C Performance Remarks: the R only — the CRD went with the client's read-only rule
        Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
        // Queries – Scale Sites (+ results): R
        Permissions.SCALE_SITE_QUERY,
        // Scale Site Record – Summary: R — opening the record, and its Summary tab
        Permissions.SCALE_SITE_READ,
        Permissions.SCALE_SITE_SUMMARY_READ,
        // Scale Site Record – Activity Summary: R
        Permissions.SCALE_SITE_ACTIVITY_READ,
        // Scale Site Record – Contacts (list) + Scale Site Contact (single): R
        Permissions.SCALE_SITE_CONTACT_QUERY,
        Permissions.SCALE_SITE_CONTACT_READ,
        // Scale Site Record – Site Authorizations (list): R. §E "Scale Site Authorization": R
        Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
        Permissions.SCALE_SITE_AUTHORIZATION_READ,
        // Scale Site Record – Authorized Scalers, – MSD: R
        Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        Permissions.SCALE_SITE_MSD_QUERY,
        // Scale Site Record – Inspections + §H "Site Inspection": the R only, as above
        Permissions.SCALE_SITE_INSPECTION_QUERY,
        Permissions.SCALE_SITE_INSPECTION_READ,
        // Scale Site Record – Check Scales: R. – Software Use: R
        Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
        Permissions.SCALE_SITE_SOFTWARE_QUERY,
        // §I Check Scale: the search endpoint, which is how the view page resolves a check scale.
        // Unlike clerical(), this column keeps it — §I's read row is R, not -
        Permissions.CHECK_SCALE_QUERY,
        // §F Query – MSD R, – Results R, Mark Site Designation R. Both create rows are -
        Permissions.MSD_QUERY,
        Permissions.MSD_READ,
        // Risk assessment: read only. The client's 2026-09-02 spec names CHK/ADM/RSM/DSM as the create
        // roles and puts every other role on read, which withdrew this column's create/update
        Permissions.SCALER_RISK_RATING_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_READ,
        Permissions.SCALE_SITE_RISK_RATING_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
        // "CE_TECH should only be able to view letters" — the stored letter, never the composer
        Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
        Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        Permissions.MSD_LETTER_VIEW,
        // §J "Maintain Questions" R — the only §J cell granted to any non-administrator column
        Permissions.MAINTAIN_QUESTIONS_QUERY,
        Permissions.MAINTAIN_QUESTIONS_READ,
        // §4 "View reports"; legacy getCeTechnicianMenus() included the Reports menu
        Permissions.REPORT_READ);
  }

  /**
   * District Scaling Manager ({@code DSM}) — the widest non-administrator column, and the first to reach
   * the record <b>create wizards</b>, the <b>maintenance</b> screens and <b>risk assessment</b>.
   *
   * <p>The useful way to hold it: <b>almost the administrator, minus the deletes</b>. §3 gives it
   * {@code CRU} or {@code CR} nearly everywhere the administrator has {@code CRUD}, so the shape of the
   * column is "authors everything, destroys almost nothing". The exceptions are worth listing, because
   * they are what the in-page sweep had to gate:
   * <ul>
   *   <li><b>Deletes it does hold</b> — {@link Permissions#SCALE_SITE_CONTACT_DELETE} (§D Contacts
   *       {@code CRUD}), {@link Permissions#SCALER_AUTHORIZATION_DELETE} and
   *       {@link Permissions#SCALE_SITE_AUTHORIZATION_DELETE} (§E {@code CRUD} on both create/edit rows),
   *       and {@link Permissions#SCALER_PERFORMANCE_REMARK_DELETE} (§C Performance Remarks {@code CRD}).</li>
   *   <li><b>Deletes it does not</b> — the scaler and every maintenance area: §C's "Summary – Edit" is
   *       {@code RU} against the administrator's {@code RUD}, and every §J row is {@code CRU} against
   *       {@code CRUD}. So it authors reference data it cannot remove.</li>
   *   <li><b>{@link Permissions#MAINTAIN_SIGNATORIES_CREATE} is withheld</b> — §J's three Signatory rows
   *       are {@code RU (dist)}, the only maintenance area with no {@code C} for this column. It edits
   *       signature blocks but cannot add one.</li>
   *   <li><b>Maintain System is {@code -}</b>, so {@link Permissions#MAINTAIN_SYSTEM_READ},
   *       {@code _UPDATE} and {@link Permissions#SYSTEM_ADMIN} stay with the administrator alone.</li>
   * </ul>
   *
   * <p>Legacy parity: {@code MenuUtils.getDistScaleManMenus()} = {@code getAQRMenus()} + Create +
   * Handheld — Administration, Queries, Reports and Create, i.e. every top-level menu but the descoped
   * one. This is the first enabled role to see the <b>Create</b> menu at all, and the first to see the
   * <b>Maintenance</b> submenu with more than one leaf.
   *
   * <p><b>Judgement calls</b> (Decisions: Jonah, 2026-08-26):
   * <ol>
   *   <li><b>Risk assessment: every verb both subjects expose</b>, by the rule in the class javadoc —
   *       these columns read and author across the whole scaler and scale-site records, so risk
   *       assessment, being another tab, follows.
   *       <p>This supersedes an earlier, narrower reading taken while §3 was being followed literally:
   *       §D's lone "Risk Rating Criteria" {@code CR} was treated as the ceiling, which withheld
   *       {@code _UPDATE} from <i>every</i> column (the administrator excepted only because it holds
   *       everything) and left the two assessment edit routes reachable by nobody else. That looked like
   *       a document slip at the time and was recorded as such; the rule now resolves it.</li>
   *   <li><b>{@link Permissions#SCALER_LICENCE_CANCEL} is granted</b>, as for {@link #districtManager()}:
   *       §4's "Suspend scaler licence / recommend cancellations" is one of this column's thirteen
   *       bullets. Unlike that role, this one also holds {@link Permissions#SCALER_UPDATE}, so the two
   *       controls on the Performance Remarks tab are both live here.</li>
   *   <li><b>All four {@code _LETTER} verbs are granted</b>, by the "owns the workflow end to end" test:
   *       §E gives it {@code CRUD} on both authorization create/edit rows, §F {@code CRUD} on the MSD
   *       create/edit row, and §I the check-scale create and edit. It authors every document it can then
   *       issue — the first column of which that is true besides the administrator. (The client's
   *       2026-09-02 spec names this column among the four letter authors as well, so the grant stands on
   *       either reading.) With them comes {@link Permissions#LETTER_SIGNATORY_QUERY}, the letter pages'
   *       signatory picker. This column also holds {@link Permissions#MAINTAIN_SIGNATORIES_QUERY}
   *       through §J, but the picker no longer depends on it, so a letter author without §J — the Check
   *       Scaler — can still sign a letter.</li>
   *   <li><b>{@link Permissions#MAINTAIN_QUESTIONS_QUERY} / {@code _READ} only</b>, as for
   *       {@link #ceTechnician()}: §J's Questions row is {@code R} for this column too, the one
   *       maintenance area it reads without authoring.</li>
   * </ol>
   *
   * <p>The {@code (dist)} qualifiers on Templates and Signatories are org-unit scoping and are not
   * enforced (see the class javadoc) — so this role currently maintains every district's templates and
   * signature blocks, not just its own. That is the single largest gap the flag will close, and it is why
   * {@link Roles#SCS_REGIONAL_SCALING_MANAGER} shares this exact list: {@code (dist)} against
   * {@code (rgn)} is the only thing §3 uses to separate the two columns.
   */
  private static Set<String> districtScalingManager() {
    return scalingManagerColumn();
  }

  /**
   * Regional Scaling Manager / Specialist ({@code RSM}) — {@link #scalingManagerColumn()}, the same list
   * §3 gives {@link #districtScalingManager()}.
   *
   * <p>The two columns were compared cell by cell across all 79 rows and agree on every one. The only
   * variation is the qualifier on six of them — §J's three Template rows and three Signatory rows read
   * {@code CRU (dist)} / {@code RU (dist)} for the district column and {@code (rgn)} here — which is
   * org-unit <b>breadth</b>, not a different permission. A regional specialist maintains the templates
   * and signature blocks of every district in their region; a district manager only their own. That
   * distinction belongs to the org-unit layer (see the class javadoc), and it is the reason this column
   * is worth keeping separate even though the permission set is identical.
   *
   * <p><b>§4 names three things the district summary does not, and none of them changes the set:</b>
   * <ul>
   *   <li><b>"Complete site-inspection reports"</b> — §3 gives <i>both</i> columns {@code CR} on §H's
   *       create rows and {@code RU} on the record, so the district column already holds it. Its §4
   *       omission is the usual illustrative narrowness (see {@link #clerical()} judgement call 1).</li>
   *   <li><b>"schedule exams; record exam results"</b> — recording results is §C's "Exams / Upgrades"
   *       {@code CRU}, held by both. Exam <i>scheduling</i> has no surface in SCS at all: no
   *       {@code examSchedule} action, JSP or table exists anywhere in the legacy source, the same dead
   *       end recorded on {@link #branchSystemSupport()}.</li>
   *   <li><b>"full create for acting exams; pending branch approval for licensed exams"</b> against the
   *       district column's "(acting exams)" — both map to {@link Permissions#SCALER_CREATE}, {@code CR}
   *       for both in §3. The parenthetical distinguishes the two branches <i>inside</i> the create
   *       wizard — an acting appointment against a licensed exam, which {@code ScalerCreate} models as
   *       mutually exclusive {@code appointment} / {@code exam} payloads — and one permission gates the
   *       wizard, so the distinction is not expressible here. "Pending branch approval" describes an
   *       out-of-system step; SCS has no approval state.</li>
   * </ul>
   */
  private static Set<String> regionalScalingManager() {
    return scalingManagerColumn();
  }

  /**
   * The scaling-manager column — <b>one list, shared by the district and regional scaling managers</b>,
   * because §3 gives them the same cells in all 79 rows. See {@link #regionalScalingManager()} for the
   * comparison and for why the six {@code (dist)} / {@code (rgn)} qualifiers are not a difference in
   * permissions.
   *
   * <p>Same split as {@link #readOnlyInternalColumn()}: the list is a fact of §3 and is shared, while the
   * reasoning stays per-role, since each column has its own §4 summary to reconcile.
   * {@code RolePermissionsTest} asserts the two sets are equal with the reason in the failure message,
   * so separating them later has to be deliberate.
   */
  private static Set<String> scalingManagerColumn() {
    return Set.of(
        Permissions.WELCOME_READ,
        Permissions.LOV_READ,
        // Queries – Clients / – Clients – Results: R
        Permissions.CLIENT_QUERY,
        // §C Queries – Scalers R, – Results CR, Scaler – Create CR, Summary RU, – Edit RU (no D: the
        // administrator's RUD is the only one), Address R
        Permissions.SCALER_QUERY,
        Permissions.SCALER_READ,
        Permissions.SCALER_CREATE,
        Permissions.SCALER_UPDATE,
        Permissions.SCALER_ADDRESS_READ,
        // §4 "Suspend scaler licence / recommend cancellations" — see judgement call (3)
        Permissions.SCALER_LICENCE_CANCEL,
        // §C Authorizations CR + §E Scaler Authorization CRU / – Create CR / – Create/Edit CRUD
        Permissions.SCALER_AUTHORIZATION_QUERY,
        Permissions.SCALER_AUTHORIZATION_READ,
        Permissions.SCALER_AUTHORIZATION_CREATE,
        Permissions.SCALER_AUTHORIZATION_UPDATE,
        Permissions.SCALER_AUTHORIZATION_DELETE,
        Permissions.SCALER_AUTHORIZATION_LETTER_CREATE,
        Permissions.SCALER_AUTHORIZATION_LETTER_VIEW,
        // §C Check Scales CR — the R (the C is CHECK_SCALE_CREATE below)
        Permissions.SCALER_CHECK_SCALE_QUERY,
        // §C Exams / Upgrades CRU and – Create/Edit CRU (no D: administrator's CRUD only)
        Permissions.SCALER_EXAM_QUERY,
        Permissions.SCALER_EXAM_CREATE,
        Permissions.SCALER_EXAM_UPDATE,
        // §C Appointments CRU and – Create/Edit CRU (no D, same reason)
        Permissions.SCALER_APPOINTMENT_QUERY,
        Permissions.SCALER_APPOINTMENT_CREATE,
        Permissions.SCALER_APPOINTMENT_UPDATE,
        // §C Performance Remarks CRD + "Scaler Performance Remark" RU + – Create/Edit CRU: all four
        Permissions.SCALER_PERFORMANCE_REMARK_QUERY,
        Permissions.SCALER_PERFORMANCE_REMARK_CREATE,
        Permissions.SCALER_PERFORMANCE_REMARK_UPDATE,
        Permissions.SCALER_PERFORMANCE_REMARK_DELETE,
        // §D Queries – Scale Sites R, – Results CR, Scale Site – Create CR, Summary RU / – Edit RU
        Permissions.SCALE_SITE_QUERY,
        Permissions.SCALE_SITE_READ,
        Permissions.SCALE_SITE_SUMMARY_READ,
        Permissions.SCALE_SITE_CREATE,
        Permissions.SCALE_SITE_UPDATE,
        // §D Activity Summary R
        Permissions.SCALE_SITE_ACTIVITY_READ,
        // §D Contacts CRUD — the one record area where this column holds the delete
        Permissions.SCALE_SITE_CONTACT_QUERY,
        Permissions.SCALE_SITE_CONTACT_READ,
        Permissions.SCALE_SITE_CONTACT_CREATE,
        Permissions.SCALE_SITE_CONTACT_UPDATE,
        Permissions.SCALE_SITE_CONTACT_DELETE,
        // §D Site Authorizations CR + §E Scale Site Authorization CRU / – Create CRUD / – C/E CRUD
        Permissions.SCALE_SITE_AUTHORIZATION_QUERY,
        Permissions.SCALE_SITE_AUTHORIZATION_READ,
        Permissions.SCALE_SITE_AUTHORIZATION_CREATE,
        Permissions.SCALE_SITE_AUTHORIZATION_UPDATE,
        Permissions.SCALE_SITE_AUTHORIZATION_DELETE,
        Permissions.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
        Permissions.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
        // §D Authorized Scalers CR — only the query verb exists; the C is the authorization create above
        Permissions.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
        // §D MSD CR — the site tab (the C is MSD_CREATE below)
        Permissions.SCALE_SITE_MSD_QUERY,
        // §D Inspections CR + §H Site Inspection RU / – Create CR / – Create/Edit CR. No D anywhere
        Permissions.SCALE_SITE_INSPECTION_QUERY,
        Permissions.SCALE_SITE_INSPECTION_READ,
        Permissions.SCALE_SITE_INSPECTION_CREATE,
        Permissions.SCALE_SITE_INSPECTION_UPDATE,
        // §D Check Scales CR — the R. – Software Use R
        Permissions.SCALE_SITE_CHECK_SCALE_QUERY,
        Permissions.SCALE_SITE_SOFTWARE_QUERY,
        // Risk assessment: REG_SCAL_MAN and REG_DIST_MAN are two of the four create roles the
        // client's 2026-09-02 spec names, so every verb both subjects expose — §D's lone "Risk Rating
        // Criteria" CR is not the ceiling, and _UPDATE is what keeps the two edit routes reachable
        Permissions.SCALE_SITE_RISK_RATING_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_QUERY,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_READ,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_CREATE,
        Permissions.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
        Permissions.SCALER_RISK_RATING_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_QUERY,
        Permissions.SCALER_RISK_ASSESSMENT_READ,
        Permissions.SCALER_RISK_ASSESSMENT_CREATE,
        Permissions.SCALER_RISK_ASSESSMENT_UPDATE,
        // §I Check Scale – Create (both steps) CR, – Edit RU, Check Scale RU. No D (administrator only)
        Permissions.CHECK_SCALE_QUERY,
        Permissions.CHECK_SCALE_CREATE,
        Permissions.CHECK_SCALE_UPDATE,
        Permissions.CHECK_SCALE_ADVISORY_LETTER_CREATE,
        Permissions.SUMMARY_CHECK_SCALE_CREATE,
        Permissions.SUMMARY_CHECK_SCALE_UPDATE,
        // §F Query R, – Results CR, MSD – Create CR, – Create/Edit CRUD, MSD RU. No MSD_DELETE exists
        Permissions.MSD_QUERY,
        Permissions.MSD_READ,
        Permissions.MSD_CREATE,
        Permissions.MSD_UPDATE,
        Permissions.MSD_LETTER_CREATE,
        Permissions.MSD_LETTER_VIEW,
        // The letter pages' signatory picker, held by every _LETTER_CREATE holder — judgement call (3)
        Permissions.LETTER_SIGNATORY_QUERY,
        // §A Work Bench CRU (ltd)
        Permissions.WORKBENCH_QUERY,
        Permissions.WORKBENCH_CREATE,
        Permissions.WORKBENCH_UPDATE,
        // §4 "View tasks (Work Bench) and reports"
        Permissions.REPORT_READ,
        // §J Maintain Questions R — read only, as for the C&E Technician
        Permissions.MAINTAIN_QUESTIONS_QUERY,
        Permissions.MAINTAIN_QUESTIONS_READ,
        // §J every other area is CRU (dist) or CRU — authored, never deleted
        Permissions.MAINTAIN_TEMPLATES_QUERY,
        Permissions.MAINTAIN_TEMPLATES_READ,
        Permissions.MAINTAIN_TEMPLATES_CREATE,
        Permissions.MAINTAIN_TEMPLATES_UPDATE,
        Permissions.MAINTAIN_CONDITIONS_QUERY,
        Permissions.MAINTAIN_CONDITIONS_READ,
        Permissions.MAINTAIN_CONDITIONS_CREATE,
        Permissions.MAINTAIN_CONDITIONS_UPDATE,
        Permissions.MAINTAIN_EXAM_UPGRADES_QUERY,
        Permissions.MAINTAIN_EXAM_UPGRADES_READ,
        Permissions.MAINTAIN_EXAM_UPGRADES_CREATE,
        Permissions.MAINTAIN_EXAM_UPGRADES_UPDATE,
        // Appointment types are listed, never fetched singly — no _READ verb exists for this area
        Permissions.MAINTAIN_APPOINTMENT_TYPES_QUERY,
        Permissions.MAINTAIN_APPOINTMENT_TYPES_CREATE,
        Permissions.MAINTAIN_APPOINTMENT_TYPES_UPDATE,
        Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY,
        Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ,
        Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE,
        Permissions.MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE,
        Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
        Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_READ,
        Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_CREATE,
        Permissions.MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE,
        // §J Signatories RU (dist) — the one maintenance area with no C for this column
        Permissions.MAINTAIN_SIGNATORIES_QUERY,
        Permissions.MAINTAIN_SIGNATORIES_READ,
        Permissions.MAINTAIN_SIGNATORIES_UPDATE);
  }


  private static final Map<String, Set<String>> PERMISSIONS_BY_ROLE = Map.ofEntries(
      Map.entry(Roles.SCS_SYS_ADMIN, Permissions.ALL_PERMISSIONS),
      Map.entry(Roles.SCS_INDUSTRY_SCALER, industryScaler()),
      Map.entry(Roles.SCS_OWNER, scaleSiteOwner()),
      Map.entry(Roles.SCS_CHECK_SCALER, checkScaler()),
      Map.entry(Roles.SCS_CE_TECHNICIAN, ceTechnician()),
      Map.entry(Roles.SCS_DIST_SCALING_MANAGER, districtScalingManager()),
      Map.entry(Roles.SCS_DIST_MANAGER, districtManager()),
      Map.entry(Roles.SCS_REGIONAL_SCALING_MANAGER, regionalScalingManager()),
      Map.entry(Roles.SCS_REGIONAL_MANAGER, regionalManager()),
      Map.entry(Roles.SCS_CLERICAL, clerical()),
      Map.entry(Roles.SCS_BRANCH_SYS_SUPPORT, branchSystemSupport()));

  /**
   * The permissions granted by a single role. An unrecognised role name grants nothing (fail
   * closed), so a group the token carries but SCS does not know cannot widen access.
   */
  public static Set<String> forRole(String roleName) {
    return PERMISSIONS_BY_ROLE.getOrDefault(roleName, Set.of());
  }

  /** The union of the permissions granted by {@code roleNames}. Never null. */
  public static Set<String> forRoles(Collection<String> roleNames) {
    if (roleNames == null || roleNames.isEmpty()) {
      return Set.of();
    }
    return roleNames.stream()
        .filter(roleName -> roleName != null)
        .flatMap(roleName -> forRole(roleName).stream())
        .collect(Collectors.toUnmodifiableSet());
  }

  /**
   * The client-scoped roles whose permissions were withheld because {@code clientNumbers} is empty.
   * Empty when nothing was withheld; lets the filters log why a user holds a role yet reaches nothing.
   */
  public static Set<String> rolesDeniedForMissingClient(
      Collection<? extends GrantedAuthority> roleAuthorities, Set<String> clientNumbers) {
    if (roleAuthorities == null || (clientNumbers != null && !clientNumbers.isEmpty())) {
      return Set.of();
    }
    return roleAuthorities.stream()
        .map(GrantedAuthority::getAuthority)
        .filter(Roles::isClientScoped)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  /**
   * The roles themselves (so the role-based {@code /api/**} rule keeps working) plus every permission
   * they imply. Called from both authentication filters, so resolution happens in exactly one place.
   *
   * <p>A {@linkplain Roles#isClientScoped client-scoped} role held without a client number contributes
   * <b>nothing at all</b> — not its permissions and not its own role authority. It only means "may act
   * on this client's rows", so without a client there is nothing to act on, and FAM delivering the bare
   * group ({@code SCS_OWNER} rather than {@code SCS_OWNER_00001074}) is a misconfiguration, not a
   * lesser grade of access.
   *
   * <p><b>Withholding the role authority is what makes that a block rather than a wall of 403s.</b>
   * Keeping it — as this did until 2026-08-20 — cleared {@code SecurityConfig}'s coarse
   * {@code hasAnyAuthority(ALL_ROLES)} gate on {@code /api/**}, so such a caller reached method security
   * on every endpoint and was refused there, one handler at a time. Dropping it means they hold no
   * authority at all and the URL rule itself refuses, before any handler runs. The {@code permitAll}
   * paths are untouched, so the SPA still loads and can render {@code /unauthorized} — which is what it
   * does, since {@code hasWelcomeAccess} discounts the same role for the same reason.
   *
   * <p>An internal role held alongside it is unaffected and keeps its own authority and permissions.
   * {@link #rolesDeniedForMissingClient} reports what was withheld so the refusal is explainable in the
   * log.
   *
   * @param clientNumbers the caller's forest clients; empty for an internal user. Required rather than
   *     defaulted because either default is a silent trap: one denies internal users, the other grants
   *     unscoped external ones.
   */
  public static Collection<GrantedAuthority> expandAuthorities(
      Collection<? extends GrantedAuthority> roleAuthorities, Set<String> clientNumbers) {
    if (roleAuthorities == null || roleAuthorities.isEmpty()) {
      return Set.of();
    }

    boolean hasClient = clientNumbers != null && !clientNumbers.isEmpty();

    // The roles that still count. An unrecognised name survives the filter and is carried through as
    // before: it is not client-scoped, and it grants nothing and matches no rule.
    Set<String> effectiveRoles = roleAuthorities.stream()
        .map(GrantedAuthority::getAuthority)
        .filter(roleName -> roleName != null)
        .filter(roleName -> hasClient || !Roles.isClientScoped(roleName))
        .collect(Collectors.toCollection(LinkedHashSet::new));

    // LinkedHashSet: de-duplicates, and keeps roles ahead of permissions so log lines stay readable.
    Collection<GrantedAuthority> expanded = new LinkedHashSet<>();
    effectiveRoles.stream().map(SimpleGrantedAuthority::new).forEach(expanded::add);
    effectiveRoles.stream()
        .flatMap(roleName -> forRole(roleName).stream())
        .map(SimpleGrantedAuthority::new)
        .forEach(expanded::add);
    return expanded;
  }
}
