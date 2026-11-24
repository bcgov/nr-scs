/**
 * Anchors and expectations for the **read-only internal column** — `SCS_CLERICAL` (`CLE`),
 * `SCS_BRANCH_SYS_SUPPORT` (`SUP`) and `SCS_REGIONAL_MANAGER` (`RM`).
 *
 * Spec: `roles-permissions.md` §3, three columns that agree on 78 of 79 rows, as resolved in
 * `RolePermissions.readOnlyInternalColumn()` — one shared 30-permission list, every entry a `_READ` or
 * `_QUERY`, with `RolePermissionsTest` asserting the three sets equal.
 *
 * **Why one suite for three roles.** They are not merely similar: they resolve to the same `Set`. The
 * only §3 variation is §A's Work Bench — `R (ltd)` for `CLE`/`RM`, plain `R` for `SUP` — and `(ltd)` is
 * org-unit breadth, not a permission letter. Org-unit scoping is not built (see `org-unit-scoping.feature`),
 * so today the three are *behaviourally indistinguishable*. Three copies of one 79-cell matrix would be
 * three places for one fact to rot; the scenarios are outlined over the roles instead, which also asserts
 * the equality claim directly rather than taking the backend's word for it.
 *
 * Statuses quoted below were measured against the seeded local stack on 2026-08-26, not inferred.
 */

export const CLERICAL_ROLE = 'SCS_CLERICAL';
export const BRANCH_SYS_SUPPORT_ROLE = 'SCS_BRANCH_SYS_SUPPORT';
export const REGIONAL_MANAGER_ROLE = 'SCS_REGIONAL_MANAGER';
export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

/** The three roles under test, in matrix-column order. Drives every `Scenario Outline`. */
export const READ_ONLY_INTERNAL_ROLES = [
  CLERICAL_ROLE,
  BRANCH_SYS_SUPPORT_ROLE,
  REGIONAL_MANAGER_ROLE,
] as const;

/**
 * The contrast identity for proving an ALLOW is authorization *passing* rather than an ungated endpoint.
 *
 * This column is entirely reads, so the failure mode it is most exposed to is an endpoint that answers
 * 200 for everyone. An administrator contrast cannot detect that — both callers hold the permission — so
 * the pairing needs a caller that holds NOTHING.
 *
 * **It is the roleless sentinel, not a role.** `apiAs([], [])` sends `X-Mock-Roles: none`, which is
 * refused 403 on every endpoint including `/welcome` (measured 2026-08-26).
 *
 * Deliberately not a real role, and that is the lesson of this suite rather than a detail. Two attempts
 * at a role-based baseline were invalidated within a day: the check-scaler suite pinned `SCS_CLERICAL`
 * as `welcomeOnly()` and it now holds all 30 reads below (`defects.md` V1), and this suite first pinned
 * `SCS_DIST_SCALING_MANAGER`, which was enabled while the suite was being written (`defects.md` V6).
 * **All eleven roles are now enabled, so no role holds nothing and none can serve as this baseline.**
 * The sentinel is structural — it cannot be granted a permission column.
 */
export const NO_ROLES: readonly string[] = [];

// ============================================================================== record anchors
// Shared with the check-scaler / owner suites and asserted by preflight/anchors.setup.ts. Read-only
// here — this column mutates nothing, so no scenario in this suite seeds or tears down.

/** Scaler whose record the record-read scenarios open. */
export const scalerLicenceNo = '001B';

/** A scaler authorization on that scaler — §E's `R`. */
export const scalerAuthorizationId = '147851';

/** Scale site whose record the site scenarios open (TEMBEC - CANAL FLATS). */
export const scaleSiteIdNmbr = '520';

/** A scale site authorization — §E's `R` on the site side. Pinned by the owner suite. */
export const scaleSiteAuthorizationId = '239313';

/** A real site inspection on that site — §H's `R`. */
export const inspectionId = '322429';

/** A mark site designation — §F's `R`. */
export const markSiteDesignationId = '1101';

/**
 * A legacy check scale. Used only in DENY assertions: §I is `-` throughout for this column, so
 * `CHECK_SCALE_QUERY` is withheld even though both check-scale *tabs* are readable.
 */
export const checkScaleId = '145988';

// ============================================================================== navigation
// Derived from routes/navigation.ts × the 30 permissions. Legacy parity: MenuUtils mapped both support
// roles to getAQRMenus() = Administration, Queries, Reports — no Create.

/** The three groups that render. `Create` is absent entirely: all seven children need a `_CREATE`. */
export const expectedNavGroups = ['Queries', 'Reports', 'Administration'] as const;

/** Dropped for having no visible child — the column holds no `_CREATE` permission at all. */
export const hiddenNavGroup = 'Create';

/**
 * Queries offers all six leaves.
 *
 * The two risk screens were withheld until `dbf826c`, which introduced the rule that **risk assessment
 * follows the record it hangs off**: §3 has one risk row and no scaler-subject row at all, so an
 * assessment takes the level the role holds on that record's other tabs. This column reads both records
 * whole, so it holds the risk query/read verbs — and both search screens render.
 *
 * It does NOT hold create or update, so the assessment create/edit routes stay refused. That split is
 * what `url-access.feature` now asserts.
 */
export const expectedQueriesLeaves = [
  'Clients',
  'Scalers',
  'Scale Sites',
  'Mark Site Designations',
  'Scaler Risk Assessment',
  'Scale Site Risk Assessment',
] as const;

/** Nothing is withheld from Queries any more — see `expectedQueriesLeaves`. */
export const hiddenQueriesLeaves = [] as const;

/** Reports is menu-level (`REPORT_READ`); the matrix has no per-report rows, so all eight render. */
export const expectedReportsLeaves = [
  'Scaler Register',
  'Scale Site Register',
  'Mark Site Designation',
  'Designated Mark Exemption', // menu label since #307 (route is still /reports/designated-mark-exception)
  'Scaling Administration',
  'Scaling Exception',
  'District Check Scale Performance',
  'District Site Inspection Performance',
] as const;

/** Administration collapses to Work Bench: §J is `-` throughout, so the nested group is dropped. */
export const expectedAdministrationLeaves = ['Work Bench'] as const;
export const hiddenAdministrationGroup = 'Maintenance';

// ============================================================================== record tabs

/**
 * Scaler record tabs this column reads — the same eight the Check Scaler reads, since this column is a
 * strict read-only subset of that one and both check-scale tabs are `R`.
 *
 * `Summary Check Scales` is in the list on purpose: §I is `-` for this column so the check-scale RECORD
 * is denied, but the tab renders from `SCALER_CHECK_SCALE_QUERY`, which is held. The tab/record split is
 * asserted directly at the URL and API levels.
 */
export const readableScalerTabs = [
  'Summary',
  'Address',
  'Authorizations',
  'Check Scales',
  'Summary Check Scales',
  'Exams / Upgrades',
  'Appointments',
  'Performance Remarks',
  // Gated on SCALER_RISK_RATING_QUERY, held since dbf826c — see expectedQueriesLeaves
  'Risk Rating',
] as const;

/** Scale site record tabs this column reads. Labels as rendered — `Software`, not "Software Use". */
export const readableScaleSiteTabs = [
  'Summary',
  'Contacts',
  'Activity Summary',
  'Site Authorizations',
  'Authorized Scalers',
  'MSD',
  'Inspections',
  'Check Scales',
  'Software',
  // Gated on SCALE_SITE_RISK_RATING_QUERY, held since dbf826c
  'Risk Rating',
] as const;

/**
 * The Risk Rating tab, now READABLE on both records.
 *
 * Kept as a named export because it is the single most-revised expectation in the role suites: §D's lone
 * "Risk Rating Criteria" row reads as `-` for this column, and was followed literally until `dbf826c`
 * replaced that reading with "risk assessment follows the record". Named so the change is greppable.
 */
export const riskRatingTab = 'Risk Rating';

// ============================================================================== write controls
//
// The defining property of this column: THIRTY permissions, not one of them a mutation. So every write
// control on every readable tab must be hidden — the union of what the check-scaler suite proved is
// offered to that role and what it proved is withheld. Each is paired with an administrator contrast,
// because "no write control found" also describes a page that failed to load.

export const withheldWriteControls = [
  // Granted to CHK, withheld here — this column has no create/update/delete row anywhere
  { record: 'scaler', tab: 'Performance Remarks', control: 'Add Performance Remark' },
  { record: 'scaler', tab: 'Check Scales', control: 'Add Check Scale' },
  { record: 'site', tab: 'MSD', control: 'Add Mark Site Designation' },
  { record: 'site', tab: 'Inspections', control: 'Add Inspection' },
  { record: 'site', tab: 'Check Scales', control: 'Add Check Scale' },
  // Withheld from CHK too, so withheld a fortiori from a strict read-only subset of it
  { record: 'scaler', tab: 'Summary', control: 'Edit Record' },
  { record: 'scaler', tab: 'Authorizations', control: 'Add Authorization' },
  { record: 'scaler', tab: 'Exams / Upgrades', control: 'Add Exam / Upgrade' },
  { record: 'scaler', tab: 'Appointments', control: 'Add Appointment' },
  // SCALER_LICENCE_CANCEL — withheld here, and the ONE cell that separates SCS_DIST_MANAGER from this
  // column. Its own suite asserts the opposite on this exact control.
  { record: 'scaler', tab: 'Performance Remarks', control: 'Save Record' },
  { record: 'site', tab: 'Summary', control: 'Edit Record' },
  { record: 'site', tab: 'Contacts', control: 'Add Primary Contact' },
  { record: 'site', tab: 'Contacts', control: 'Add Site Contact' },
  { record: 'site', tab: 'Site Authorizations', control: 'Add Authorization' },
] as const;
