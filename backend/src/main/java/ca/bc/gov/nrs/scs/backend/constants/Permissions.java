package ca.bc.gov.nrs.scs.backend.constants;

import java.util.Set;

/**
 * Fine-grained functional permissions — the vocabulary the API is authorized against.
 *
 * <p>Two orthogonal layers meet here (see {@code auth-access-scope-design.md}):
 * <ul>
 *   <li><b>Role access control (this class):</b> <i>what</i> a user may do. Roles ({@link Roles})
 *       come from the token; {@code RolePermissions} expands each role into the permissions below,
 *       which are granted as additional authorities and asserted by
 *       {@code @RequiresPermission} on every controller handler.</li>
 *   <li><b>Data scoping:</b> <i>which rows</i> a user may see —
 *       {@code UserAccessScope} / {@code SecurityContextUtils}. Independent of this class: passing
 *       the permission gate still leaves an external user scoped to their own forest client.</li>
 * </ul>
 *
 * <p>Names are derived from the function rows of
 * the roles &amp; permissions matrix §3 (itself the legacy
 * {@code roles-spec.docx} Use Case / Security cross-reference matrix). They deliberately do
 * <b>not</b> start with {@code SCS_} so a permission authority can never collide with a role
 * authority — {@code RolePermissionsTest} pins that invariant.
 *
 * <h2>Verb convention</h2>
 *
 * A permission is {@code {AREA}_{VERB}}, and the verb follows the matrix's own
 * {@code C}/{@code R}/{@code U}/{@code D} letters for that function row — so a cell reading
 * {@code CRU} becomes three permissions and {@code CRUD} four, which is what lets a manager role hold
 * {@code CRU} while only the administrator also holds the {@code D}.
 *
 * <p>{@code R} splits in two, because the matrix itself lists the list screen and the record screen
 * as separate rows with separate cells:
 * <ul>
 *   <li>{@code _QUERY} — reading a <b>collection</b>: a search screen and its results, or a list tab
 *       on a record. Matrix rows such as "Queries – Scalers", "Scaler Record – Authorizations",
 *       "Maintain Conditions".</li>
 *   <li>{@code _READ} — reading a <b>single entity</b> by id. Matrix rows such as "Scaler Record –
 *       Summary", "Scaler Authorization", "Maintain Condition".</li>
 * </ul>
 * The split is what expresses, for example, that an Industry Scaler may read a scale-site record they
 * are authorized at ({@link #SCALE_SITE_READ}) without being able to search the site register
 * ({@link #SCALE_SITE_QUERY}). An area declares only the verbs the API actually exposes: where the
 * matrix has both rows but SCS has just the one endpoint (e.g. appointment types are listed but never
 * fetched singly), only the verb in use is declared, so no permission is dead.
 *
 * <p>Two verbs fall outside CRUD because the underlying capability does:
 * <ul>
 *   <li>{@code _LETTER_CREATE} / {@code _LETTER_VIEW} — composing a new authorization or designation
 *       letter, and retrieving the one already stored against the record. A named legacy action
 *       (WebADE {@code scalerAuthorizationLetterReport}) rather than a CRUD operation, and split in
 *       two because the client's 2026-09-02 spec gives {@code CET} the second without the first. The
 *       check-scale advisory letter declares only {@code _CREATE}: SCS stores no advisory letter and
 *       exposes no endpoint to fetch one back, so a {@code _VIEW} verb would be dead.</li>
 *   <li>{@link #SYSTEM_ADMIN} — operational endpoints (health probe, cache eviction) with no matrix
 *       row at all.</li>
 * </ul>
 * {@link #LOV_READ} and {@link #REPORT_READ} likewise keep {@code _READ} despite returning
 * collections: neither is an entity query. LOVs are shared reference data behind dropdowns, and the
 * matrix governs reports at menu level, not per report.
 */
public final class Permissions {

  private Permissions() {
    // Constants only.
  }

  // ---------------------------------------------------------------------------------------------
  // Cross-cutting
  // ---------------------------------------------------------------------------------------------

  /** The SCS home/welcome page and its supporting summary endpoint. Held by every role. */
  public static final String WELCOME_READ = "WELCOME_READ";

  /**
   * Shared reference data (list-of-values) lookups that populate dropdowns across the app. Keeps
   * {@code _READ} rather than {@code _QUERY}: reference data, not an entity query, and it has no
   * matrix function row.
   */
  public static final String LOV_READ = "LOV_READ";

  /** Operational/administrative endpoints: health probe, LOV cache eviction. No matrix row. */
  public static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";

  // ---------------------------------------------------------------------------------------------
  // Client queries (matrix §B)
  // ---------------------------------------------------------------------------------------------

  /**
   * Queries – Clients (+ results). Held by every role, but the results are not the same for all: a
   * client-restricted external user searches only their own forest client, because
   * {@code ClientService.searchClients} overrides the requested client number the way the scaler and
   * scale-site searches do. That honours the matrix's {@code R (ltd)} on "Queries – Clients – Results"
   * for {@code IND}/{@code OWN} against plain {@code R} for internal roles, and is a deliberate
   * divergence from legacy {@code ClientSearchAction}, which restricted nothing. Internal users still
   * search the whole register.
   *
   * <p>The fields a row exposes are whatever the supported client view package
   * ({@code scs_client_vw_pkg.search_recs}) returns — the same for every caller.
   *
   * <p>No {@code _READ} counterpart: SCS reads clients only as search results, never singly by id.
   */
  public static final String CLIENT_QUERY = "CLIENT_QUERY";

  // ---------------------------------------------------------------------------------------------
  // Scaler record (matrix §C)
  // ---------------------------------------------------------------------------------------------

  /** Queries – Scalers: the scaler search screen and its results. */
  public static final String SCALER_QUERY = "SCALER_QUERY";

  /** Scaler Record – Summary: the scaler detail/summary/tombstone reads for one scaler. */
  public static final String SCALER_READ = "SCALER_READ";

  /**
   * Scaler Record – Address, its own matrix row and so its own permission.
   *
   * <p>Matrix §3 is {@code -} here for {@code OWN} alone — every other column is {@code R} — which is
   * why it was split out of {@link #SCALER_READ}. §4 then grants the Scale Site Owner "addresses,
   * exam and upgrade history" for scalers at their sites, and §4 was taken as authoritative over that
   * one cell, so the split currently distinguishes no enabled role. Kept rather than folded back in:
   * the matrix row is real, the two sources genuinely disagree, and reverting to §3 must stay a
   * one-line change. Same story for {@link #SCALER_EXAM_QUERY}. (Decision: Jonah, 2026-08-18 — see
   * {@code RolePermissions.scaleSiteOwner()}.)
   *
   * <p>The grant is reachable, not nominal: {@code ClientScopeGuard} lets an owner open the record of a
   * scaler authorized at a site their client owns, which is the population §4 is describing.
   */
  public static final String SCALER_ADDRESS_READ = "SCALER_ADDRESS_READ";

  public static final String SCALER_CREATE = "SCALER_CREATE";
  public static final String SCALER_UPDATE = "SCALER_UPDATE";
  public static final String SCALER_DELETE = "SCALER_DELETE";

  /**
   * Setting a scaler's licence-cancelled date — legacy "suspend scaler licence / recommend
   * cancellations", surfaced on the Performance Remarks tab.
   *
   * <p>Deliberately <b>not</b> folded into {@link #SCALER_UPDATE}, because the matrix gives the two to
   * different roles: §4 grants suspend/cancel to the District Manager and Regional Manager, whose
   * "Scaler Record – Summary – Edit" cell is {@code -}. Folding them together would either hand those
   * two managers full scaler edit or deny them a capability they are meant to have.
   */
  public static final String SCALER_LICENCE_CANCEL = "SCALER_LICENCE_CANCEL";

  /** Scaler Record – Check Scales: the scaler's check-scale history (detail + summary lists). */
  public static final String SCALER_CHECK_SCALE_QUERY = "SCALER_CHECK_SCALE_QUERY";

  /**
   * Scaler Record – Exams / Upgrades (the list tab). Like {@link #SCALER_ADDRESS_READ}, §3 denies this
   * row to {@code OWN} alone while §4 grants it; §4 won.
   */
  public static final String SCALER_EXAM_QUERY = "SCALER_EXAM_QUERY";

  public static final String SCALER_EXAM_CREATE = "SCALER_EXAM_CREATE";
  public static final String SCALER_EXAM_UPDATE = "SCALER_EXAM_UPDATE";
  public static final String SCALER_EXAM_DELETE = "SCALER_EXAM_DELETE";

  /** Scaler Record – Appointments (the list tab). */
  public static final String SCALER_APPOINTMENT_QUERY = "SCALER_APPOINTMENT_QUERY";

  public static final String SCALER_APPOINTMENT_CREATE = "SCALER_APPOINTMENT_CREATE";
  public static final String SCALER_APPOINTMENT_UPDATE = "SCALER_APPOINTMENT_UPDATE";
  public static final String SCALER_APPOINTMENT_DELETE = "SCALER_APPOINTMENT_DELETE";

  /**
   * Scaler Record – Performance Remarks (PRF): the list tab. The matrix's separate "Scaler
   * Performance Remark" single-record row has no endpoint of its own — the tab returns the remarks —
   * so there is no {@code _READ} counterpart to declare.
   */
  public static final String SCALER_PERFORMANCE_REMARK_QUERY = "SCALER_PERFORMANCE_REMARK_QUERY";

  public static final String SCALER_PERFORMANCE_REMARK_CREATE =
      "SCALER_PERFORMANCE_REMARK_CREATE";
  public static final String SCALER_PERFORMANCE_REMARK_UPDATE =
      "SCALER_PERFORMANCE_REMARK_UPDATE";
  public static final String SCALER_PERFORMANCE_REMARK_DELETE =
      "SCALER_PERFORMANCE_REMARK_DELETE";

  // ---------------------------------------------------------------------------------------------
  // Scaler authorizations (matrix §E)
  // ---------------------------------------------------------------------------------------------

  /** Scaler Record – Authorizations: the list tab on the scaler record. */
  public static final String SCALER_AUTHORIZATION_QUERY = "SCALER_AUTHORIZATION_QUERY";

  /** Scaler Authorization: one authorization read by id. */
  public static final String SCALER_AUTHORIZATION_READ = "SCALER_AUTHORIZATION_READ";

  /**
   * Scaler Authorization – Create. Also gates the condition/template lookups that only the
   * authorization create+edit form consumes.
   */
  public static final String SCALER_AUTHORIZATION_CREATE = "SCALER_AUTHORIZATION_CREATE";

  public static final String SCALER_AUTHORIZATION_UPDATE = "SCALER_AUTHORIZATION_UPDATE";
  public static final String SCALER_AUTHORIZATION_DELETE = "SCALER_AUTHORIZATION_DELETE";

  /** Composing and storing the scaler authorization letter ({@code POST .../letter}). */
  public static final String SCALER_AUTHORIZATION_LETTER_CREATE =
      "SCALER_AUTHORIZATION_LETTER_CREATE";

  /** Retrieving the stored scaler authorization letter ({@code GET .../letter}). */
  public static final String SCALER_AUTHORIZATION_LETTER_VIEW = "SCALER_AUTHORIZATION_LETTER_VIEW";

  // ---------------------------------------------------------------------------------------------
  // Scaler risk assessment (RSK — scaler subject)
  // ---------------------------------------------------------------------------------------------

  public static final String SCALER_RISK_ASSESSMENT_QUERY = "SCALER_RISK_ASSESSMENT_QUERY";
  public static final String SCALER_RISK_ASSESSMENT_READ = "SCALER_RISK_ASSESSMENT_READ";
  public static final String SCALER_RISK_ASSESSMENT_CREATE = "SCALER_RISK_ASSESSMENT_CREATE";
  public static final String SCALER_RISK_ASSESSMENT_UPDATE = "SCALER_RISK_ASSESSMENT_UPDATE";

  /** The scaler risk-rating tab (a list of ratings). */
  public static final String SCALER_RISK_RATING_QUERY = "SCALER_RISK_RATING_QUERY";

  // ---------------------------------------------------------------------------------------------
  // Scale site record (matrix §D)
  // ---------------------------------------------------------------------------------------------

  /**
   * Queries – Scale Sites: the scale-site search screen and its results. Split from
   * {@link #SCALE_SITE_READ} because an Industry Scaler may read a site record they are authorized
   * at without being able to search the site register.
   */
  public static final String SCALE_SITE_QUERY = "SCALE_SITE_QUERY";

  /**
   * Opening a scale-site record: its tombstone header (site number, name, region, district). Not a
   * matrix row of its own — the matrix has no "may open the record" cell — but the record is the
   * container every tab below hangs off, so reaching it and reading its Summary tab are separate
   * permissions. See
   * {@code RolePermissions.industryScaler()}, which holds this without
   * {@link #SCALE_SITE_SUMMARY_READ}.
   */
  public static final String SCALE_SITE_READ = "SCALE_SITE_READ";

  /**
   * Scale Site Record – Summary: the site's detail fields and site-type list. Denied to the Industry
   * Scaler by the matrix ({@code -} for {@code IND}), who reaches the record for its Check Scales and
   * Software tabs only.
   *
   * <p>A real access boundary, not just a hidden tab: it gates {@code GET
   * /scale-sites/{scaleSiteIdNmbr}/summary}, whose payload is the section's content and nothing else.
   * The record header is served by {@link #SCALE_SITE_READ}'s tombstone endpoint, so withholding the
   * summary costs a denied user nothing they are entitled to see.
   */
  public static final String SCALE_SITE_SUMMARY_READ = "SCALE_SITE_SUMMARY_READ";

  public static final String SCALE_SITE_CREATE = "SCALE_SITE_CREATE";
  public static final String SCALE_SITE_UPDATE = "SCALE_SITE_UPDATE";

  /** Scale Site Record – Activity Summary: a single summary for one site. */
  public static final String SCALE_SITE_ACTIVITY_READ = "SCALE_SITE_ACTIVITY_READ";

  /** Scale Site Record – Contacts: the list tab. */
  public static final String SCALE_SITE_CONTACT_QUERY = "SCALE_SITE_CONTACT_QUERY";

  /** Scale Site Contact: one contact read by id. */
  public static final String SCALE_SITE_CONTACT_READ = "SCALE_SITE_CONTACT_READ";

  public static final String SCALE_SITE_CONTACT_CREATE = "SCALE_SITE_CONTACT_CREATE";
  public static final String SCALE_SITE_CONTACT_UPDATE = "SCALE_SITE_CONTACT_UPDATE";
  public static final String SCALE_SITE_CONTACT_DELETE = "SCALE_SITE_CONTACT_DELETE";

  /** Scale Site Record – Site Authorizations: the list tab. */
  public static final String SCALE_SITE_AUTHORIZATION_QUERY = "SCALE_SITE_AUTHORIZATION_QUERY";

  /** Scale Site Authorization: one authorization read by id. */
  public static final String SCALE_SITE_AUTHORIZATION_READ = "SCALE_SITE_AUTHORIZATION_READ";

  public static final String SCALE_SITE_AUTHORIZATION_CREATE = "SCALE_SITE_AUTHORIZATION_CREATE";
  public static final String SCALE_SITE_AUTHORIZATION_UPDATE = "SCALE_SITE_AUTHORIZATION_UPDATE";
  public static final String SCALE_SITE_AUTHORIZATION_DELETE = "SCALE_SITE_AUTHORIZATION_DELETE";

  /** Composing and storing the scale site authorization letter ({@code POST .../letter}). */
  public static final String SCALE_SITE_AUTHORIZATION_LETTER_CREATE =
      "SCALE_SITE_AUTHORIZATION_LETTER_CREATE";

  /** Retrieving the stored scale site authorization letter ({@code GET .../letter}). */
  public static final String SCALE_SITE_AUTHORIZATION_LETTER_VIEW =
      "SCALE_SITE_AUTHORIZATION_LETTER_VIEW";

  /** Scale Site Record – Authorized Scalers: the list tab. */
  public static final String SCALE_SITE_AUTHORIZED_SCALER_QUERY =
      "SCALE_SITE_AUTHORIZED_SCALER_QUERY";

  /** Scale Site Record – MSD: the mark/site designation list tab on the site record. */
  public static final String SCALE_SITE_MSD_QUERY = "SCALE_SITE_MSD_QUERY";

  /** Scale Site Record – Inspections (INS): the list tab and the inspection search. */
  public static final String SCALE_SITE_INSPECTION_QUERY = "SCALE_SITE_INSPECTION_QUERY";

  /** Site Inspection: one inspection read by id. */
  public static final String SCALE_SITE_INSPECTION_READ = "SCALE_SITE_INSPECTION_READ";

  public static final String SCALE_SITE_INSPECTION_CREATE = "SCALE_SITE_INSPECTION_CREATE";
  public static final String SCALE_SITE_INSPECTION_UPDATE = "SCALE_SITE_INSPECTION_UPDATE";
  public static final String SCALE_SITE_INSPECTION_DELETE = "SCALE_SITE_INSPECTION_DELETE";

  /** Scale Site Record – Check Scales: the list tab. */
  public static final String SCALE_SITE_CHECK_SCALE_QUERY = "SCALE_SITE_CHECK_SCALE_QUERY";

  /** Scale Site Record – Software Use: the list tab. */
  public static final String SCALE_SITE_SOFTWARE_QUERY = "SCALE_SITE_SOFTWARE_QUERY";

  // ---------------------------------------------------------------------------------------------
  // Scale site risk assessment (RSK — scale-site subject)
  // ---------------------------------------------------------------------------------------------

  public static final String SCALE_SITE_RISK_ASSESSMENT_QUERY = "SCALE_SITE_RISK_ASSESSMENT_QUERY";
  public static final String SCALE_SITE_RISK_ASSESSMENT_READ = "SCALE_SITE_RISK_ASSESSMENT_READ";
  public static final String SCALE_SITE_RISK_ASSESSMENT_CREATE =
      "SCALE_SITE_RISK_ASSESSMENT_CREATE";
  public static final String SCALE_SITE_RISK_ASSESSMENT_UPDATE =
      "SCALE_SITE_RISK_ASSESSMENT_UPDATE";

  /** Scale Site Record – Risk Rating Criteria (a list of ratings). */
  public static final String SCALE_SITE_RISK_RATING_QUERY = "SCALE_SITE_RISK_RATING_QUERY";

  // ---------------------------------------------------------------------------------------------
  // Check scales (matrix §I)
  // ---------------------------------------------------------------------------------------------

  /** The standalone check-scale search screen and its results. */
  public static final String CHECK_SCALE_QUERY = "CHECK_SCALE_QUERY";

  /** Check Scale – Create (both wizard steps, including the validate-as-query call). */
  public static final String CHECK_SCALE_CREATE = "CHECK_SCALE_CREATE";

  public static final String CHECK_SCALE_UPDATE = "CHECK_SCALE_UPDATE";

  /**
   * Check Scale – the {@code D} in {@code ADM}'s {@code RUD} on matrix §I's "Check Scale" row; every
   * other column is {@code RU} at most.
   *
   * <p><b>The one permission with no {@code @RequiresPermission} consumer, and deliberately so.</b> The
   * general rule stated at the top of this class — an area declares only the verbs the API exposes, so
   * no permission is dead — is suspended here for a single reason: the Delete button on the check-scale
   * view page <i>exists</i> and is un-wired ({@code View/CheckScale} raises "not wired yet"), so there
   * is a UI control for a capability the API has not built. Without this name the control cannot be
   * gated at all, and enabling {@link ca.bc.gov.nrs.scs.backend.constants.Roles#SCS_CHECK_SCALER} would
   * put a Delete the matrix denies it in front of a non-administrator for the first time.
   *
   * <p>So it gates the button today and the handler when one is written. Do not treat it as licence to
   * add further consumer-less permissions: the alternative here was leaving a mutation control ungated,
   * which is the worse of the two. (Decision: Jonah, 2026-08-24.)
   */
  public static final String CHECK_SCALE_DELETE = "CHECK_SCALE_DELETE";

  /**
   * Check Scale Advisory Letter (UC-RPT-002) — composing one. There is no {@code _VIEW} counterpart:
   * the advisory letter is generated and returned, never stored, so nothing can fetch one back.
   */
  public static final String CHECK_SCALE_ADVISORY_LETTER_CREATE =
      "CHECK_SCALE_ADVISORY_LETTER_CREATE";

  public static final String SUMMARY_CHECK_SCALE_CREATE = "SUMMARY_CHECK_SCALE_CREATE";
  public static final String SUMMARY_CHECK_SCALE_UPDATE = "SUMMARY_CHECK_SCALE_UPDATE";
  public static final String SUMMARY_CHECK_SCALE_DELETE = "SUMMARY_CHECK_SCALE_DELETE";

  // ---------------------------------------------------------------------------------------------
  // Mark / site designations (matrix §F)
  // ---------------------------------------------------------------------------------------------

  /**
   * Query – Mark Site Designations (+ results), and the timber-mark / hauling-authority lookups.
   *
   * <p><b>Deliberately not client-scoped.</b> Matrix §F grants {@code IND} plain {@code R} on every MSD
   * row — no {@code (ltd)}, unlike the scaler and client rows — so an external holder reads designations
   * across clients. That is a decision, not an endpoint the {@code ClientScopeInterceptor} failed to
   * cover: it keys on {@code scalerLicenceNo}/{@code scaleSiteIdNmbr} and MSD is addressed by
   * {@code authorizationId}, so nothing scopes these reads and nothing is meant to.
   *
   * <p>§F is {@code -} for {@code OWN} throughout, so the Scale Site Owner must never hold this or
   * {@link #MSD_READ} — pinned by {@code RolePermissionsTest}. Distinct from
   * {@link #SCALE_SITE_MSD_QUERY}, the site-record tab, which §D <i>does</i> grant {@code OWN}.
   */
  public static final String MSD_QUERY = "MSD_QUERY";

  /** Mark Site Designation: one designation read by id. */
  public static final String MSD_READ = "MSD_READ";

  public static final String MSD_CREATE = "MSD_CREATE";
  public static final String MSD_UPDATE = "MSD_UPDATE";

  /** Composing and storing the mark/site designation letter ({@code POST .../letter}). */
  public static final String MSD_LETTER_CREATE = "MSD_LETTER_CREATE";

  /** Retrieving the stored mark/site designation letter ({@code GET .../letter}). */
  public static final String MSD_LETTER_VIEW = "MSD_LETTER_VIEW";

  /**
   * The signatory picker on the four letter pages ({@code GET /letter-signature-blocks}): a
   * read-only lookup of the signature blocks available to a district, so a letter author can choose
   * who signs.
   *
   * <p><b>Why it is not {@link #MAINTAIN_SIGNATORIES_QUERY}.</b> The picker used to call the
   * Maintenance search, but §J ("Maintain Signatories") is {@code -} for {@code CHK}, which the
   * client's 2026-09-02 statement (§3.1.2) nonetheless names among the letter authors. The 403 was
   * swallowed, the picker came up empty, and letters were issued with no signatory (nr-scs #286
   * follow-up). Choosing a signatory for a letter is part of composing it, not maintenance of the
   * reference data, so it gets its own verb rather than a slice of §J.
   *
   * <p><b>Invariant:</b> held by exactly the roles that hold at least one {@code _LETTER_CREATE}
   * verb — a letter author without it cannot pick a signatory, and a holder with no letter to write
   * has no use for it. {@code RolePermissionsTest} pins that in both directions, so a future letter
   * grant cannot re-open the bug. {@code _LETTER_VIEW} alone ({@code CET}) does not qualify: viewing
   * a stored letter never touches the picker.
   */
  public static final String LETTER_SIGNATORY_QUERY = "LETTER_SIGNATORY_QUERY";

  // ---------------------------------------------------------------------------------------------
  // Work bench (matrix §A)
  // ---------------------------------------------------------------------------------------------

  /**
   * Work Bench: the pending-authorization queues. The matrix grants {@code CRU} here, and the three
   * verbs below are gated on that row rather than on the per-authorization rows because it grants
   * Work Bench {@code CRU} to roles (e.g. Check Scaler) that it denies authorization-create.
   */
  public static final String WORKBENCH_QUERY = "WORKBENCH_QUERY";

  /** Work Bench renewals, which issue a new authorization from a queued item. */
  public static final String WORKBENCH_CREATE = "WORKBENCH_CREATE";

  /** Removing an item from a Work Bench queue. */
  public static final String WORKBENCH_UPDATE = "WORKBENCH_UPDATE";

  // ---------------------------------------------------------------------------------------------
  // Reports (RPT)
  // ---------------------------------------------------------------------------------------------

  /**
   * Access to the Reports menu and every report screen. The matrix has no per-report rows — role
   * access is menu-level (UC-RPT-022-S07: "a user who does not have access to the Reports menu,
   * e.g. an Industry Scaler or Owner"). Per-report granularity is deferred to the ministry-role
   * stories, which have the per-report acceptance criteria (e.g. UC-RPT-021 District Manager).
   */
  public static final String REPORT_READ = "REPORT_READ";

  // ---------------------------------------------------------------------------------------------
  // Reference-data maintenance & system admin (matrix §J)
  // ---------------------------------------------------------------------------------------------

  // Each area below is a pair of matrix §J rows — the plural list screen ("Maintain Conditions") and
  // the singular record screen ("Maintain Condition") — hence both _QUERY and _READ. The matrix
  // grants managers CRU and the administrator CRUD, so the D is what separates the two.

  public static final String MAINTAIN_QUESTIONS_QUERY = "MAINTAIN_QUESTIONS_QUERY";
  public static final String MAINTAIN_QUESTIONS_READ = "MAINTAIN_QUESTIONS_READ";
  public static final String MAINTAIN_QUESTIONS_CREATE = "MAINTAIN_QUESTIONS_CREATE";
  public static final String MAINTAIN_QUESTIONS_UPDATE = "MAINTAIN_QUESTIONS_UPDATE";
  public static final String MAINTAIN_QUESTIONS_DELETE = "MAINTAIN_QUESTIONS_DELETE";

  public static final String MAINTAIN_TEMPLATES_QUERY = "MAINTAIN_TEMPLATES_QUERY";
  public static final String MAINTAIN_TEMPLATES_READ = "MAINTAIN_TEMPLATES_READ";
  public static final String MAINTAIN_TEMPLATES_CREATE = "MAINTAIN_TEMPLATES_CREATE";
  public static final String MAINTAIN_TEMPLATES_UPDATE = "MAINTAIN_TEMPLATES_UPDATE";
  public static final String MAINTAIN_TEMPLATES_DELETE = "MAINTAIN_TEMPLATES_DELETE";

  public static final String MAINTAIN_CONDITIONS_QUERY = "MAINTAIN_CONDITIONS_QUERY";
  public static final String MAINTAIN_CONDITIONS_READ = "MAINTAIN_CONDITIONS_READ";
  public static final String MAINTAIN_CONDITIONS_CREATE = "MAINTAIN_CONDITIONS_CREATE";
  public static final String MAINTAIN_CONDITIONS_UPDATE = "MAINTAIN_CONDITIONS_UPDATE";
  public static final String MAINTAIN_CONDITIONS_DELETE = "MAINTAIN_CONDITIONS_DELETE";

  public static final String MAINTAIN_EXAM_UPGRADES_QUERY = "MAINTAIN_EXAM_UPGRADES_QUERY";
  public static final String MAINTAIN_EXAM_UPGRADES_READ = "MAINTAIN_EXAM_UPGRADES_READ";
  public static final String MAINTAIN_EXAM_UPGRADES_CREATE = "MAINTAIN_EXAM_UPGRADES_CREATE";
  public static final String MAINTAIN_EXAM_UPGRADES_UPDATE = "MAINTAIN_EXAM_UPGRADES_UPDATE";
  public static final String MAINTAIN_EXAM_UPGRADES_DELETE = "MAINTAIN_EXAM_UPGRADES_DELETE";

  /**
   * Appointment types are listed but never fetched singly, so this area has no {@code _READ}
   * counterpart to the matrix's "Maintain Appointment Type" row.
   */
  public static final String MAINTAIN_APPOINTMENT_TYPES_QUERY = "MAINTAIN_APPOINTMENT_TYPES_QUERY";

  public static final String MAINTAIN_APPOINTMENT_TYPES_CREATE =
      "MAINTAIN_APPOINTMENT_TYPES_CREATE";
  public static final String MAINTAIN_APPOINTMENT_TYPES_UPDATE =
      "MAINTAIN_APPOINTMENT_TYPES_UPDATE";
  public static final String MAINTAIN_APPOINTMENT_TYPES_DELETE =
      "MAINTAIN_APPOINTMENT_TYPES_DELETE";

  public static final String MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY =
      "MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY";
  public static final String MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ =
      "MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ";
  public static final String MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE =
      "MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE";
  public static final String MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE =
      "MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE";
  public static final String MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE =
      "MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE";

  public static final String MAINTAIN_AUTHORIZATION_CLAUSES_QUERY =
      "MAINTAIN_AUTHORIZATION_CLAUSES_QUERY";
  public static final String MAINTAIN_AUTHORIZATION_CLAUSES_READ =
      "MAINTAIN_AUTHORIZATION_CLAUSES_READ";
  public static final String MAINTAIN_AUTHORIZATION_CLAUSES_CREATE =
      "MAINTAIN_AUTHORIZATION_CLAUSES_CREATE";
  public static final String MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE =
      "MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE";
  public static final String MAINTAIN_AUTHORIZATION_CLAUSES_DELETE =
      "MAINTAIN_AUTHORIZATION_CLAUSES_DELETE";

  public static final String MAINTAIN_SIGNATORIES_QUERY = "MAINTAIN_SIGNATORIES_QUERY";
  public static final String MAINTAIN_SIGNATORIES_READ = "MAINTAIN_SIGNATORIES_READ";
  public static final String MAINTAIN_SIGNATORIES_CREATE = "MAINTAIN_SIGNATORIES_CREATE";
  public static final String MAINTAIN_SIGNATORIES_UPDATE = "MAINTAIN_SIGNATORIES_UPDATE";
  public static final String MAINTAIN_SIGNATORIES_DELETE = "MAINTAIN_SIGNATORIES_DELETE";

  /** Maintain System: the system enable/disable setting ({@code RU}). Administrator only. */
  public static final String MAINTAIN_SYSTEM_READ = "MAINTAIN_SYSTEM_READ";

  public static final String MAINTAIN_SYSTEM_UPDATE = "MAINTAIN_SYSTEM_UPDATE";

  /**
   * Every permission the application defines. The authoritative set: {@code RolePermissions} may
   * only grant names from here, {@code @RequiresPermission} may only reference names from here, and
   * the frontend mirror ({@code frontend/src/context/auth/permissions.ts}) must list exactly these.
   * {@code RolePermissionsTest} reflects over this class to prove nothing was left out.
   */
  public static final Set<String> ALL_PERMISSIONS = Set.of(
      WELCOME_READ,
      LOV_READ,
      SYSTEM_ADMIN,
      CLIENT_QUERY,
      SCALER_QUERY,
      SCALER_READ,
      SCALER_ADDRESS_READ,
      SCALER_CREATE,
      SCALER_UPDATE,
      SCALER_DELETE,
      SCALER_LICENCE_CANCEL,
      SCALER_CHECK_SCALE_QUERY,
      SCALER_EXAM_QUERY,
      SCALER_EXAM_CREATE,
      SCALER_EXAM_UPDATE,
      SCALER_EXAM_DELETE,
      SCALER_APPOINTMENT_QUERY,
      SCALER_APPOINTMENT_CREATE,
      SCALER_APPOINTMENT_UPDATE,
      SCALER_APPOINTMENT_DELETE,
      SCALER_PERFORMANCE_REMARK_QUERY,
      SCALER_PERFORMANCE_REMARK_CREATE,
      SCALER_PERFORMANCE_REMARK_UPDATE,
      SCALER_PERFORMANCE_REMARK_DELETE,
      SCALER_AUTHORIZATION_QUERY,
      SCALER_AUTHORIZATION_READ,
      SCALER_AUTHORIZATION_CREATE,
      SCALER_AUTHORIZATION_UPDATE,
      SCALER_AUTHORIZATION_DELETE,
      SCALER_AUTHORIZATION_LETTER_CREATE,
      SCALER_AUTHORIZATION_LETTER_VIEW,
      SCALER_RISK_ASSESSMENT_QUERY,
      SCALER_RISK_ASSESSMENT_READ,
      SCALER_RISK_ASSESSMENT_CREATE,
      SCALER_RISK_ASSESSMENT_UPDATE,
      SCALER_RISK_RATING_QUERY,
      SCALE_SITE_QUERY,
      SCALE_SITE_READ,
      SCALE_SITE_SUMMARY_READ,
      SCALE_SITE_CREATE,
      SCALE_SITE_UPDATE,
      SCALE_SITE_ACTIVITY_READ,
      SCALE_SITE_CONTACT_QUERY,
      SCALE_SITE_CONTACT_READ,
      SCALE_SITE_CONTACT_CREATE,
      SCALE_SITE_CONTACT_UPDATE,
      SCALE_SITE_CONTACT_DELETE,
      SCALE_SITE_AUTHORIZATION_QUERY,
      SCALE_SITE_AUTHORIZATION_READ,
      SCALE_SITE_AUTHORIZATION_CREATE,
      SCALE_SITE_AUTHORIZATION_UPDATE,
      SCALE_SITE_AUTHORIZATION_DELETE,
      SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
      SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
      SCALE_SITE_AUTHORIZED_SCALER_QUERY,
      SCALE_SITE_MSD_QUERY,
      SCALE_SITE_INSPECTION_QUERY,
      SCALE_SITE_INSPECTION_READ,
      SCALE_SITE_INSPECTION_CREATE,
      SCALE_SITE_INSPECTION_UPDATE,
      SCALE_SITE_INSPECTION_DELETE,
      SCALE_SITE_CHECK_SCALE_QUERY,
      SCALE_SITE_SOFTWARE_QUERY,
      SCALE_SITE_RISK_ASSESSMENT_QUERY,
      SCALE_SITE_RISK_ASSESSMENT_READ,
      SCALE_SITE_RISK_ASSESSMENT_CREATE,
      SCALE_SITE_RISK_ASSESSMENT_UPDATE,
      SCALE_SITE_RISK_RATING_QUERY,
      CHECK_SCALE_QUERY,
      CHECK_SCALE_CREATE,
      CHECK_SCALE_UPDATE,
      CHECK_SCALE_DELETE,
      CHECK_SCALE_ADVISORY_LETTER_CREATE,
      SUMMARY_CHECK_SCALE_CREATE,
      SUMMARY_CHECK_SCALE_UPDATE,
      SUMMARY_CHECK_SCALE_DELETE,
      MSD_QUERY,
      MSD_READ,
      MSD_CREATE,
      MSD_UPDATE,
      MSD_LETTER_CREATE,
      MSD_LETTER_VIEW,
      LETTER_SIGNATORY_QUERY,
      WORKBENCH_QUERY,
      WORKBENCH_CREATE,
      WORKBENCH_UPDATE,
      REPORT_READ,
      MAINTAIN_QUESTIONS_QUERY,
      MAINTAIN_QUESTIONS_READ,
      MAINTAIN_QUESTIONS_CREATE,
      MAINTAIN_QUESTIONS_UPDATE,
      MAINTAIN_QUESTIONS_DELETE,
      MAINTAIN_TEMPLATES_QUERY,
      MAINTAIN_TEMPLATES_READ,
      MAINTAIN_TEMPLATES_CREATE,
      MAINTAIN_TEMPLATES_UPDATE,
      MAINTAIN_TEMPLATES_DELETE,
      MAINTAIN_CONDITIONS_QUERY,
      MAINTAIN_CONDITIONS_READ,
      MAINTAIN_CONDITIONS_CREATE,
      MAINTAIN_CONDITIONS_UPDATE,
      MAINTAIN_CONDITIONS_DELETE,
      MAINTAIN_EXAM_UPGRADES_QUERY,
      MAINTAIN_EXAM_UPGRADES_READ,
      MAINTAIN_EXAM_UPGRADES_CREATE,
      MAINTAIN_EXAM_UPGRADES_UPDATE,
      MAINTAIN_EXAM_UPGRADES_DELETE,
      MAINTAIN_APPOINTMENT_TYPES_QUERY,
      MAINTAIN_APPOINTMENT_TYPES_CREATE,
      MAINTAIN_APPOINTMENT_TYPES_UPDATE,
      MAINTAIN_APPOINTMENT_TYPES_DELETE,
      MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY,
      MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ,
      MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE,
      MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE,
      MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE,
      MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
      MAINTAIN_AUTHORIZATION_CLAUSES_READ,
      MAINTAIN_AUTHORIZATION_CLAUSES_CREATE,
      MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE,
      MAINTAIN_AUTHORIZATION_CLAUSES_DELETE,
      MAINTAIN_SIGNATORIES_QUERY,
      MAINTAIN_SIGNATORIES_READ,
      MAINTAIN_SIGNATORIES_CREATE,
      MAINTAIN_SIGNATORIES_UPDATE,
      MAINTAIN_SIGNATORIES_DELETE,
      MAINTAIN_SYSTEM_READ,
      MAINTAIN_SYSTEM_UPDATE);
}
