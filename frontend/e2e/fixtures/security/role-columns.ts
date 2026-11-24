/**
 * Per-role expectations for the remaining `SCS_` columns, as one registry.
 *
 * Spec: `roles-permissions.md` §3 × `RolePermissions.<role>()`, cross-checked against
 * `routes/navigation.ts` and `routes/routePaths.tsx` for what each permission actually gates.
 *
 * **Why a registry rather than a fixture per suite.** These columns assert the same *shapes* — which nav
 * groups render, which leaves inside them, which record tabs, which in-page controls — and differ only in
 * the data. Three more copies of the same step logic is three places for one convention to drift, which
 * is the argument `RolePermissions` itself makes for its shared lists. The feature files stay per-role so
 * each keeps its own ledger and its own reasoning.
 *
 * The read-only internal column (`CLE`/`SUP`/`RM`) is deliberately NOT retrofitted onto this: it is green
 * and has its own fixture. `SCS_CLERICAL` appears here only as the narrow contrast the widest column
 * needs.
 *
 * Derived from source on 2026-08-27 and **confirmed against the running app the same day**, once the
 * deployed WAR was rebuilt. The risk-assessment expectations were the one thing source-reading got wrong
 * in both directions — see each suite's `defects.md` for the `dbf826c` rule change.
 */

export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

export const DIST_MANAGER_ROLE = 'SCS_DIST_MANAGER';
export const CE_TECHNICIAN_ROLE = 'SCS_CE_TECHNICIAN';
export const DIST_SCALING_MANAGER_ROLE = 'SCS_DIST_SCALING_MANAGER';
export const REGIONAL_SCALING_MANAGER_ROLE = 'SCS_REGIONAL_SCALING_MANAGER';

/** The two columns `RolePermissions` maps to `scalingManagerColumn()` verbatim. */
export const SCALING_MANAGER_ROLES = [
  DIST_SCALING_MANAGER_ROLE,
  REGIONAL_SCALING_MANAGER_ROLE,
] as const;

/**
 * A narrow enabled role, used as the *inverse* contrast for the widest column.
 *
 * For a read-only column an administrator proves a denied thing exists. For the scaling-manager column
 * almost nothing is denied, so the useful contrast runs the other way: the controls it IS offered must be
 * HIDDEN for a role that lacks them, or "offered" says nothing about the permission.
 */
export const NARROW_CONTRAST_ROLE = 'SCS_CLERICAL';

// ============================================================================== anchors
// Shared with the check-scaler / read-only suites and asserted by preflight/anchors.setup.ts.

export const scalerLicenceNo = '001B';
export const scaleSiteIdNmbr = '520';
export const inspectionId = '322429';
export const checkScaleId = '145988';
export const markSiteDesignationId = '1101';
export const scalerAuthorizationId = '147851';

/**
 * A licence number no scaler holds (`maxLength: 4` in the OpenAPI path param).
 *
 * Used for the licence-cancel write probe so the call reaches `@RequiresPermission` and then dies in the
 * service on a missing record, instead of actually cancelling a licence on a shared anchor. A permission
 * probe must never be able to mutate the seed, and this endpoint's whole purpose is mutation.
 */
export const nonexistentScalerLicenceNo = 'ZZZZ';

/**
 * The licence-cancel body, and it is REQUIRED for the probe to mean anything.
 *
 * `PATCH /api/scalers/{no}/licence-cancelled-date` declares `requestBody: required: true`, and
 * `@RequiresPermission` is method security — an AOP interceptor around the handler — so request-body
 * binding runs BEFORE authorization. A bodyless PATCH is rejected by the binder (415) for *every* caller,
 * which makes a "not 403" assertion true whether the role holds the permission or not.
 *
 * That is not hypothetical: this suite's first version sent no body, so the `DM` row passed on a 415 while
 * the `SCS_CLERICAL` row failed. `null` clears the date rather than setting one, so even if it reached a
 * real record the write would be a no-op — but it is aimed at a nonexistent licence regardless.
 */
export const licenceCancelBody = { licenceCancelledDate: null } as const;

/** The one endpoint `SCALER_LICENCE_CANCEL` gates (`ScalerController:85`). */
export const licenceCancelPath = `/api/scalers/${nonexistentScalerLicenceNo}/licence-cancelled-date`;

// ============================================================================== nav expectations

export type NavExpectation = {
  /** Top-level groups that render. A group with no visible child is dropped entirely. */
  groups: readonly string[];
  /** Top-level groups that must NOT render. */
  hiddenGroups: readonly string[];
  /** `[group, leaf]` pairs that must render. Nested groups are opened by their parent first. */
  leaves: readonly (readonly [string, string])[];
  /** `[group, leaf]` pairs that must NOT render. */
  hiddenLeaves: readonly (readonly [string, string])[];
  /** Nested sub-groups under Administration that must render / must not. */
  subGroups: readonly string[];
  hiddenSubGroups: readonly string[];
};

const ALL_REPORTS = [
  'Scaler Register',
  'Scale Site Register',
  'Mark Site Designation',
  'Designated Mark Exemption', // menu label since #307 (route is still /reports/designated-mark-exception)
  'Scaling Administration',
  'Scaling Exception',
  'District Check Scale Performance',
  'District Site Inspection Performance',
] as const;

const reportLeaves = ALL_REPORTS.map((r) => ['Reports', r] as const);

/**
 * `DM` — the read-only internal column plus `SCALER_LICENCE_CANCEL`, which gates a CONTROL and no route
 * or menu entry. So its navigation is identical to `CLE`/`SUP`/`RM`, and that identity is itself the
 * assertion: the delta must be invisible everywhere except one button.
 */
const DIST_MANAGER_NAV: NavExpectation = {
  groups: ['Queries', 'Reports', 'Administration'],
  hiddenGroups: ['Create'],
  leaves: [
    ['Queries', 'Clients'],
    ['Queries', 'Scalers'],
    ['Queries', 'Scale Sites'],
    ['Queries', 'Mark Site Designations'],
    // Risk assessment follows the record it hangs off: this column reads both records whole, so it holds
    // the query/read verbs and both search screens render (dbf826c). It does NOT hold create/update.
    ['Queries', 'Scaler Risk Assessment'],
    ['Queries', 'Scale Site Risk Assessment'],
    ['Administration', 'Work Bench'],
    ...reportLeaves,
  ],
  hiddenLeaves: [],
  subGroups: [],
  hiddenSubGroups: ['Maintenance'],
};

/**
 * `CET` — the near-inverse of the read-only column's Administration shape, and the reason this role is
 * worth its own suite rather than a delta.
 *
 * It holds **no** `WORKBENCH_QUERY` (§A is `-`), so Work Bench is hidden — the first internal column with
 * no Work Bench. But it holds `MAINTAIN_QUESTIONS_QUERY`, the only §J cell granted to any
 * non-administrator, so Administration still renders and Maintenance appears with exactly one leaf.
 *
 * It also holds two `_CREATE` verbs, so Create renders with two of its seven leaves — the first column
 * to see that menu at all besides the scaling managers and the administrator.
 */
const CE_TECHNICIAN_NAV: NavExpectation = {
  // The Create group is GONE since the client's 2026-09-02 spec made this column read-only: it held only
  // Check Scale and Summary Check Scale, and both went with `CHECK_SCALE_CREATE`. A group with no visible
  // child is dropped, so no special case was needed for it.
  groups: ['Queries', 'Reports', 'Administration'],
  hiddenGroups: ['Create'],
  leaves: [
    ['Queries', 'Clients'],
    ['Queries', 'Scalers'],
    ['Queries', 'Scale Sites'],
    ['Queries', 'Mark Site Designations'],
    // Read on both subjects. The client's spec names CHK/ADM/RSM/DSM as the create roles and puts every
    // other column on read, which withdrew this one's create/update.
    ['Queries', 'Scaler Risk Assessment'],
    ['Queries', 'Scale Site Risk Assessment'],
    ['Maintenance', 'Questions'],
    ...reportLeaves,
  ],
  hiddenLeaves: [
    // §A is "-" for this column — the distinctive absence
    ['Administration', 'Work Bench'],
    // Every Create leaf, now that the column holds no `_CREATE` verb at all
    ['Create', 'Check Scale'],
    ['Create', 'Summary Check Scale'],
    ['Create', 'Scaler'],
    ['Create', 'Scale Site'],
    ['Create', 'Mark Site Designation'],
    ['Create', 'Scaler Authorization'],
    ['Create', 'Scale Site Authorization'],
    // every §J row but Questions
    ['Maintenance', 'Templates'],
    ['Maintenance', 'Conditions'],
    ['Maintenance', 'Signature Blocks'],
    ['Maintenance', 'Exam / Upgrades'],
    ['Maintenance', 'Appointment Types'],
    ['Maintenance', 'Valid Licence Attributes'],
    ['Maintenance', 'Authorization Clauses'],
    ['Maintenance', 'System'],
  ],
  subGroups: ['Maintenance'],
  hiddenSubGroups: [],
};

/**
 * `DSM` / `RSM` — every menu and every leaf except one.
 *
 * Legacy parity: `MenuUtils.getDistScaleManMenus()` = `getAQRMenus()` + Create + Handheld, i.e. every
 * top-level menu but the descoped one. The single withheld leaf is Maintenance → System: §J's Maintain
 * System row is `-`, so `MAINTAIN_SYSTEM_READ` and `SYSTEM_ADMIN` stay with the administrator alone.
 * That one absence is the whole GUI-level deny surface for this column, which is why it is asserted
 * rather than sampled.
 */
const SCALING_MANAGER_NAV: NavExpectation = {
  groups: ['Queries', 'Reports', 'Create', 'Administration'],
  hiddenGroups: [],
  leaves: [
    ['Queries', 'Clients'],
    ['Queries', 'Scalers'],
    ['Queries', 'Scale Sites'],
    ['Queries', 'Mark Site Designations'],
    // the first non-administrator column to be offered either risk screen
    ['Queries', 'Scaler Risk Assessment'],
    ['Queries', 'Scale Site Risk Assessment'],
    ['Create', 'Scaler'],
    ['Create', 'Scale Site'],
    ['Create', 'Check Scale'],
    ['Create', 'Summary Check Scale'],
    ['Create', 'Mark Site Designation'],
    ['Create', 'Scaler Authorization'],
    ['Create', 'Scale Site Authorization'],
    ['Administration', 'Work Bench'],
    ['Maintenance', 'Templates'],
    ['Maintenance', 'Conditions'],
    ['Maintenance', 'Questions'],
    ['Maintenance', 'Signature Blocks'],
    ['Maintenance', 'Exam / Upgrades'],
    ['Maintenance', 'Appointment Types'],
    ['Maintenance', 'Valid Licence Attributes'],
    ['Maintenance', 'Authorization Clauses'],
    ...reportLeaves,
  ],
  hiddenLeaves: [['Maintenance', 'System']],
  subGroups: ['Maintenance'],
  hiddenSubGroups: [],
};

// ============================================================================== record tabs

const SCALER_TABS_NO_RISK = [
  'Summary',
  'Address',
  'Authorizations',
  'Check Scales',
  'Summary Check Scales',
  'Exams / Upgrades',
  'Appointments',
  'Performance Remarks',
] as const;

const SITE_TABS_NO_RISK = [
  'Summary',
  'Contacts',
  'Activity Summary',
  'Site Authorizations',
  'Authorized Scalers',
  'MSD',
  'Inspections',
  'Check Scales',
  'Software',
] as const;

export const RISK_RATING_TAB = 'Risk Rating';

// ============================================================================== write controls

/**
 * One in-page write control, addressed the way the sweep walks it. Declared HERE rather than in
 * `pages/security/RecordTabsPage` because this is the layer that enumerates the rows
 * (`ALL_WRITE_CONTROLS`) and because `fixtures/` must not depend on `pages/` — the dependency runs
 * pages -> fixtures everywhere else in the suite.
 */
export type ControlRow = { record: string; tab: string; control: string };

/**
 * A `ControlRow` plus what the sweep observed. Carried out of a When (which must open each tab to
 * judge its controls) so a single Then can report EVERY leak at once instead of failing on the first.
 * `ScsWorld` and `collectControlVerdicts` both use this — do not re-inline the shape.
 */
export type ControlVerdict = ControlRow & { visible: boolean };

/** Every in-page write control the role suites know about, across both records. */
export const ALL_WRITE_CONTROLS: readonly ControlRow[] = [
  { record: 'scaler', tab: 'Summary', control: 'Edit Record' },
  { record: 'scaler', tab: 'Authorizations', control: 'Add Authorization' },
  { record: 'scaler', tab: 'Check Scales', control: 'Add Check Scale' },
  { record: 'scaler', tab: 'Exams / Upgrades', control: 'Add Exam / Upgrade' },
  { record: 'scaler', tab: 'Appointments', control: 'Add Appointment' },
  { record: 'scaler', tab: 'Performance Remarks', control: 'Add Performance Remark' },
  // SCALER_LICENCE_CANCEL — the licence suspend/cancel form, NOT a scaler edit
  { record: 'scaler', tab: 'Performance Remarks', control: 'Save Record' },
  { record: 'site', tab: 'Summary', control: 'Edit Record' },
  { record: 'site', tab: 'Contacts', control: 'Add Primary Contact' },
  { record: 'site', tab: 'Contacts', control: 'Add Site Contact' },
  { record: 'site', tab: 'Site Authorizations', control: 'Add Authorization' },
  { record: 'site', tab: 'MSD', control: 'Add Mark Site Designation' },
  { record: 'site', tab: 'Inspections', control: 'Add Inspection' },
  { record: 'site', tab: 'Check Scales', control: 'Add Check Scale' },
];

const key = (c: ControlRow) => `${c.record}|${c.tab}|${c.control}`;
const only = (...keys: string[]) => ALL_WRITE_CONTROLS.filter((c) => keys.includes(key(c)));
const except = (...keys: string[]) => ALL_WRITE_CONTROLS.filter((c) => !keys.includes(key(c)));

/** `DM`'s entire write surface: one control, and it is not a scaler edit. */
const DIST_MANAGER_OFFERED = only('scaler|Performance Remarks|Save Record');

/**
 * `CET` records NOTHING. The client's 2026-09-02 spec — "No where in the app should they be able to
 * edit, delete or create something" — withdrew the four controls this column used to offer: Add
 * Performance Remark, both Add Check Scale buttons and Add Inspection.
 *
 * An empty offered set makes the "every control this column grants is offered" scenario vacuous, so that
 * scenario was removed from the GUI feature rather than left to pass for the wrong reason. The withheld
 * sweep stays non-vacuous through its administrator pairing.
 */
const CE_TECHNICIAN_OFFERED: readonly ControlRow[] = [];

// ============================================================================== the registry

export type RoleColumn = {
  role: string;
  /** Human label for scenario prose and failure messages. */
  label: string;
  nav: NavExpectation;
  readableScalerTabs: readonly string[];
  readableScaleSiteTabs: readonly string[];
  /** Whether the Risk Rating tab renders — true only for the scaling managers. */
  readsRiskRatingTab: boolean;
  offeredControls: readonly ControlRow[];
  withheldControls: readonly ControlRow[];
};

export const ROLE_COLUMNS: Record<string, RoleColumn> = {
  [DIST_MANAGER_ROLE]: {
    role: DIST_MANAGER_ROLE,
    label: 'District Manager',
    nav: DIST_MANAGER_NAV,
    readableScalerTabs: [...SCALER_TABS_NO_RISK, RISK_RATING_TAB],
    readableScaleSiteTabs: [...SITE_TABS_NO_RISK, RISK_RATING_TAB],
    readsRiskRatingTab: true,
    offeredControls: DIST_MANAGER_OFFERED,
    withheldControls: except('scaler|Performance Remarks|Save Record'),
  },
  [CE_TECHNICIAN_ROLE]: {
    role: CE_TECHNICIAN_ROLE,
    label: 'C&E Technician',
    nav: CE_TECHNICIAN_NAV,
    readableScalerTabs: [...SCALER_TABS_NO_RISK, RISK_RATING_TAB],
    readableScaleSiteTabs: [...SITE_TABS_NO_RISK, RISK_RATING_TAB],
    readsRiskRatingTab: true,
    offeredControls: CE_TECHNICIAN_OFFERED,
    withheldControls: ALL_WRITE_CONTROLS,
  },
  [DIST_SCALING_MANAGER_ROLE]: {
    role: DIST_SCALING_MANAGER_ROLE,
    label: 'District Scaling Manager',
    nav: SCALING_MANAGER_NAV,
    readableScalerTabs: [...SCALER_TABS_NO_RISK, RISK_RATING_TAB],
    readableScaleSiteTabs: [...SITE_TABS_NO_RISK, RISK_RATING_TAB],
    readsRiskRatingTab: true,
    // Every control. The column authors across both records whole, so there is no withheld set — the
    // contrast for "offered" is therefore a NARROW role, not an administrator (see NARROW_CONTRAST_ROLE).
    offeredControls: ALL_WRITE_CONTROLS,
    withheldControls: [],
  },
  [REGIONAL_SCALING_MANAGER_ROLE]: {
    role: REGIONAL_SCALING_MANAGER_ROLE,
    label: 'Regional Scaling Manager',
    nav: SCALING_MANAGER_NAV,
    readableScalerTabs: [...SCALER_TABS_NO_RISK, RISK_RATING_TAB],
    readableScaleSiteTabs: [...SITE_TABS_NO_RISK, RISK_RATING_TAB],
    readsRiskRatingTab: true,
    offeredControls: ALL_WRITE_CONTROLS,
    withheldControls: [],
  },
};

export function columnFor(role: string): RoleColumn {
  const column = ROLE_COLUMNS[role];
  if (!column) {
    throw new Error(
      `[sec] no role column registered for "${role}". Add it to fixtures/security/role-columns.ts rather ` +
        `than letting a scenario silently assert nothing.`,
    );
  }
  return column;
}
