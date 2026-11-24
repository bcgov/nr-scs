import {
  AVAILABLE_ROLES,
  isClientScopedRole,
  type FamLoginUser,
  type ROLE_TYPE,
} from './types';

/**
 * Frontend mirror of `Permissions.java` + `RolePermissions.java`. The backend is the enforcer; this
 * exists so the UI offers only what a user can actually use, turning a 403 into a button that was never
 * there.
 *
 * **The whole mirror is pinned, not just the vocabulary.** `permissions.unit.test.ts` reads both Java
 * files off disk and fails if *any* of it drifts in either direction: the permission names, and every
 * one of the eleven role columns against its own `RolePermissions` block. It also asserts that the
 * methods sharing a list (`clerical` / `branchSystemSupport` / `regionalManager` →
 * `readOnlyInternalColumn`, and the two scaling managers → `scalingManagerColumn`) still delegate —
 * because if one stopped, the block this file is checked against would silently no longer be that
 * role's source of truth.
 *
 * Verbs follow the CRUD letters in `roles-permissions.md` §3, with `R` split into `_QUERY` (a
 * collection: search results, or a list tab) and `_READ` (one entity by id). `_LETTER_CREATE` /
 * `_LETTER_VIEW` are named legacy actions — composing a letter and opening the one already stored.
 * Where a column departs from §3 — risk assessment, letters, and the District Manager's licence-cancel
 * — the reasoning is on the matching `RolePermissions` method, not here.
 */
export const PERMISSIONS = {
  // Cross-cutting
  WELCOME_READ: 'WELCOME_READ',
  LOV_READ: 'LOV_READ',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',

  // Client queries
  CLIENT_QUERY: 'CLIENT_QUERY',

  // Scaler record
  SCALER_QUERY: 'SCALER_QUERY',
  SCALER_READ: 'SCALER_READ',
  SCALER_ADDRESS_READ: 'SCALER_ADDRESS_READ',
  SCALER_CREATE: 'SCALER_CREATE',
  SCALER_UPDATE: 'SCALER_UPDATE',
  SCALER_DELETE: 'SCALER_DELETE',
  /**
   * Setting the licence-cancelled date (legacy "suspend licence / recommend cancellation"), on the
   * Performance Remarks tab. Separate from `SCALER_UPDATE` — the matrix gives the two to different
   * roles; see the backend `Permissions.SCALER_LICENCE_CANCEL`.
   */
  SCALER_LICENCE_CANCEL: 'SCALER_LICENCE_CANCEL',
  SCALER_CHECK_SCALE_QUERY: 'SCALER_CHECK_SCALE_QUERY',
  SCALER_EXAM_QUERY: 'SCALER_EXAM_QUERY',
  SCALER_EXAM_CREATE: 'SCALER_EXAM_CREATE',
  SCALER_EXAM_UPDATE: 'SCALER_EXAM_UPDATE',
  SCALER_EXAM_DELETE: 'SCALER_EXAM_DELETE',
  SCALER_APPOINTMENT_QUERY: 'SCALER_APPOINTMENT_QUERY',
  SCALER_APPOINTMENT_CREATE: 'SCALER_APPOINTMENT_CREATE',
  SCALER_APPOINTMENT_UPDATE: 'SCALER_APPOINTMENT_UPDATE',
  SCALER_APPOINTMENT_DELETE: 'SCALER_APPOINTMENT_DELETE',
  SCALER_PERFORMANCE_REMARK_QUERY: 'SCALER_PERFORMANCE_REMARK_QUERY',
  SCALER_PERFORMANCE_REMARK_CREATE: 'SCALER_PERFORMANCE_REMARK_CREATE',
  SCALER_PERFORMANCE_REMARK_UPDATE: 'SCALER_PERFORMANCE_REMARK_UPDATE',
  SCALER_PERFORMANCE_REMARK_DELETE: 'SCALER_PERFORMANCE_REMARK_DELETE',

  // Scaler authorizations
  SCALER_AUTHORIZATION_QUERY: 'SCALER_AUTHORIZATION_QUERY',
  SCALER_AUTHORIZATION_READ: 'SCALER_AUTHORIZATION_READ',
  SCALER_AUTHORIZATION_CREATE: 'SCALER_AUTHORIZATION_CREATE',
  SCALER_AUTHORIZATION_UPDATE: 'SCALER_AUTHORIZATION_UPDATE',
  SCALER_AUTHORIZATION_DELETE: 'SCALER_AUTHORIZATION_DELETE',
  SCALER_AUTHORIZATION_LETTER_CREATE: 'SCALER_AUTHORIZATION_LETTER_CREATE',
  SCALER_AUTHORIZATION_LETTER_VIEW: 'SCALER_AUTHORIZATION_LETTER_VIEW',

  // Scaler risk assessment
  SCALER_RISK_ASSESSMENT_QUERY: 'SCALER_RISK_ASSESSMENT_QUERY',
  SCALER_RISK_ASSESSMENT_READ: 'SCALER_RISK_ASSESSMENT_READ',
  SCALER_RISK_ASSESSMENT_CREATE: 'SCALER_RISK_ASSESSMENT_CREATE',
  SCALER_RISK_ASSESSMENT_UPDATE: 'SCALER_RISK_ASSESSMENT_UPDATE',
  SCALER_RISK_RATING_QUERY: 'SCALER_RISK_RATING_QUERY',

  // Scale site record
  SCALE_SITE_QUERY: 'SCALE_SITE_QUERY',
  /** Opening the record (route, header, tombstone) — distinct from reading its Summary tab. */
  SCALE_SITE_READ: 'SCALE_SITE_READ',
  SCALE_SITE_SUMMARY_READ: 'SCALE_SITE_SUMMARY_READ',
  SCALE_SITE_CREATE: 'SCALE_SITE_CREATE',
  SCALE_SITE_UPDATE: 'SCALE_SITE_UPDATE',
  SCALE_SITE_ACTIVITY_READ: 'SCALE_SITE_ACTIVITY_READ',
  SCALE_SITE_CONTACT_QUERY: 'SCALE_SITE_CONTACT_QUERY',
  SCALE_SITE_CONTACT_READ: 'SCALE_SITE_CONTACT_READ',
  SCALE_SITE_CONTACT_CREATE: 'SCALE_SITE_CONTACT_CREATE',
  SCALE_SITE_CONTACT_UPDATE: 'SCALE_SITE_CONTACT_UPDATE',
  SCALE_SITE_CONTACT_DELETE: 'SCALE_SITE_CONTACT_DELETE',
  SCALE_SITE_AUTHORIZATION_QUERY: 'SCALE_SITE_AUTHORIZATION_QUERY',
  SCALE_SITE_AUTHORIZATION_READ: 'SCALE_SITE_AUTHORIZATION_READ',
  SCALE_SITE_AUTHORIZATION_CREATE: 'SCALE_SITE_AUTHORIZATION_CREATE',
  SCALE_SITE_AUTHORIZATION_UPDATE: 'SCALE_SITE_AUTHORIZATION_UPDATE',
  SCALE_SITE_AUTHORIZATION_DELETE: 'SCALE_SITE_AUTHORIZATION_DELETE',
  SCALE_SITE_AUTHORIZATION_LETTER_CREATE: 'SCALE_SITE_AUTHORIZATION_LETTER_CREATE',
  SCALE_SITE_AUTHORIZATION_LETTER_VIEW: 'SCALE_SITE_AUTHORIZATION_LETTER_VIEW',
  SCALE_SITE_AUTHORIZED_SCALER_QUERY: 'SCALE_SITE_AUTHORIZED_SCALER_QUERY',
  SCALE_SITE_MSD_QUERY: 'SCALE_SITE_MSD_QUERY',
  SCALE_SITE_INSPECTION_QUERY: 'SCALE_SITE_INSPECTION_QUERY',
  SCALE_SITE_INSPECTION_READ: 'SCALE_SITE_INSPECTION_READ',
  SCALE_SITE_INSPECTION_CREATE: 'SCALE_SITE_INSPECTION_CREATE',
  SCALE_SITE_INSPECTION_UPDATE: 'SCALE_SITE_INSPECTION_UPDATE',
  SCALE_SITE_INSPECTION_DELETE: 'SCALE_SITE_INSPECTION_DELETE',
  SCALE_SITE_CHECK_SCALE_QUERY: 'SCALE_SITE_CHECK_SCALE_QUERY',
  SCALE_SITE_SOFTWARE_QUERY: 'SCALE_SITE_SOFTWARE_QUERY',

  // Scale site risk assessment
  SCALE_SITE_RISK_ASSESSMENT_QUERY: 'SCALE_SITE_RISK_ASSESSMENT_QUERY',
  SCALE_SITE_RISK_ASSESSMENT_READ: 'SCALE_SITE_RISK_ASSESSMENT_READ',
  SCALE_SITE_RISK_ASSESSMENT_CREATE: 'SCALE_SITE_RISK_ASSESSMENT_CREATE',
  SCALE_SITE_RISK_ASSESSMENT_UPDATE: 'SCALE_SITE_RISK_ASSESSMENT_UPDATE',
  SCALE_SITE_RISK_RATING_QUERY: 'SCALE_SITE_RISK_RATING_QUERY',

  // Check scales
  CHECK_SCALE_QUERY: 'CHECK_SCALE_QUERY',
  CHECK_SCALE_CREATE: 'CHECK_SCALE_CREATE',
  CHECK_SCALE_UPDATE: 'CHECK_SCALE_UPDATE',
  /**
   * The `D` in `ADM`'s `RUD` on §I's "Check Scale" row. Gates the check-scale view page's Delete
   * button, which is un-wired — there is no delete endpoint, so this is the one permission with no
   * backend handler behind it. See the backend `Permissions.CHECK_SCALE_DELETE` for why.
   */
  CHECK_SCALE_DELETE: 'CHECK_SCALE_DELETE',
  /** No `_VIEW` counterpart: SCS stores no advisory letter, so there is nothing to fetch back. */
  CHECK_SCALE_ADVISORY_LETTER_CREATE: 'CHECK_SCALE_ADVISORY_LETTER_CREATE',
  SUMMARY_CHECK_SCALE_CREATE: 'SUMMARY_CHECK_SCALE_CREATE',
  SUMMARY_CHECK_SCALE_UPDATE: 'SUMMARY_CHECK_SCALE_UPDATE',
  SUMMARY_CHECK_SCALE_DELETE: 'SUMMARY_CHECK_SCALE_DELETE',

  // Mark / site designations
  MSD_QUERY: 'MSD_QUERY',
  MSD_READ: 'MSD_READ',
  MSD_CREATE: 'MSD_CREATE',
  MSD_UPDATE: 'MSD_UPDATE',
  MSD_LETTER_CREATE: 'MSD_LETTER_CREATE',
  MSD_LETTER_VIEW: 'MSD_LETTER_VIEW',

  // Letters — the signatory picker on the four letter pages (`GET /letter-signature-blocks`). Held by
  // exactly the roles holding a `_LETTER_CREATE` verb; deliberately not `MAINTAIN_SIGNATORIES_QUERY`,
  // which letter authors such as the Check Scaler do not hold (§J is `-` for them).
  LETTER_SIGNATORY_QUERY: 'LETTER_SIGNATORY_QUERY',

  // Work bench
  WORKBENCH_QUERY: 'WORKBENCH_QUERY',
  WORKBENCH_CREATE: 'WORKBENCH_CREATE',
  WORKBENCH_UPDATE: 'WORKBENCH_UPDATE',

  // Reports
  REPORT_READ: 'REPORT_READ',

  // Reference-data maintenance & system admin
  MAINTAIN_QUESTIONS_QUERY: 'MAINTAIN_QUESTIONS_QUERY',
  MAINTAIN_QUESTIONS_READ: 'MAINTAIN_QUESTIONS_READ',
  MAINTAIN_QUESTIONS_CREATE: 'MAINTAIN_QUESTIONS_CREATE',
  MAINTAIN_QUESTIONS_UPDATE: 'MAINTAIN_QUESTIONS_UPDATE',
  MAINTAIN_QUESTIONS_DELETE: 'MAINTAIN_QUESTIONS_DELETE',
  MAINTAIN_TEMPLATES_QUERY: 'MAINTAIN_TEMPLATES_QUERY',
  MAINTAIN_TEMPLATES_READ: 'MAINTAIN_TEMPLATES_READ',
  MAINTAIN_TEMPLATES_CREATE: 'MAINTAIN_TEMPLATES_CREATE',
  MAINTAIN_TEMPLATES_UPDATE: 'MAINTAIN_TEMPLATES_UPDATE',
  MAINTAIN_TEMPLATES_DELETE: 'MAINTAIN_TEMPLATES_DELETE',
  MAINTAIN_CONDITIONS_QUERY: 'MAINTAIN_CONDITIONS_QUERY',
  MAINTAIN_CONDITIONS_READ: 'MAINTAIN_CONDITIONS_READ',
  MAINTAIN_CONDITIONS_CREATE: 'MAINTAIN_CONDITIONS_CREATE',
  MAINTAIN_CONDITIONS_UPDATE: 'MAINTAIN_CONDITIONS_UPDATE',
  MAINTAIN_CONDITIONS_DELETE: 'MAINTAIN_CONDITIONS_DELETE',
  MAINTAIN_EXAM_UPGRADES_QUERY: 'MAINTAIN_EXAM_UPGRADES_QUERY',
  MAINTAIN_EXAM_UPGRADES_READ: 'MAINTAIN_EXAM_UPGRADES_READ',
  MAINTAIN_EXAM_UPGRADES_CREATE: 'MAINTAIN_EXAM_UPGRADES_CREATE',
  MAINTAIN_EXAM_UPGRADES_UPDATE: 'MAINTAIN_EXAM_UPGRADES_UPDATE',
  MAINTAIN_EXAM_UPGRADES_DELETE: 'MAINTAIN_EXAM_UPGRADES_DELETE',
  MAINTAIN_APPOINTMENT_TYPES_QUERY: 'MAINTAIN_APPOINTMENT_TYPES_QUERY',
  MAINTAIN_APPOINTMENT_TYPES_CREATE: 'MAINTAIN_APPOINTMENT_TYPES_CREATE',
  MAINTAIN_APPOINTMENT_TYPES_UPDATE: 'MAINTAIN_APPOINTMENT_TYPES_UPDATE',
  MAINTAIN_APPOINTMENT_TYPES_DELETE: 'MAINTAIN_APPOINTMENT_TYPES_DELETE',
  MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY: 'MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY',
  MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ: 'MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ',
  MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE: 'MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE',
  MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE: 'MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE',
  MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE: 'MAINTAIN_VALID_LICENCE_ATTRIBUTES_DELETE',
  MAINTAIN_AUTHORIZATION_CLAUSES_QUERY: 'MAINTAIN_AUTHORIZATION_CLAUSES_QUERY',
  MAINTAIN_AUTHORIZATION_CLAUSES_READ: 'MAINTAIN_AUTHORIZATION_CLAUSES_READ',
  MAINTAIN_AUTHORIZATION_CLAUSES_CREATE: 'MAINTAIN_AUTHORIZATION_CLAUSES_CREATE',
  MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE: 'MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE',
  MAINTAIN_AUTHORIZATION_CLAUSES_DELETE: 'MAINTAIN_AUTHORIZATION_CLAUSES_DELETE',
  MAINTAIN_SIGNATORIES_QUERY: 'MAINTAIN_SIGNATORIES_QUERY',
  MAINTAIN_SIGNATORIES_READ: 'MAINTAIN_SIGNATORIES_READ',
  MAINTAIN_SIGNATORIES_CREATE: 'MAINTAIN_SIGNATORIES_CREATE',
  MAINTAIN_SIGNATORIES_UPDATE: 'MAINTAIN_SIGNATORIES_UPDATE',
  MAINTAIN_SIGNATORIES_DELETE: 'MAINTAIN_SIGNATORIES_DELETE',
  MAINTAIN_SYSTEM_READ: 'MAINTAIN_SYSTEM_READ',
  MAINTAIN_SYSTEM_UPDATE: 'MAINTAIN_SYSTEM_UPDATE',
} as const;

export type PERMISSION_TYPE = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Every permission the application defines. Must match the backend `ALL_PERMISSIONS` exactly. */
export const ALL_PERMISSIONS: readonly PERMISSION_TYPE[] = Object.values(PERMISSIONS);

/**
 * Industry Scaler (`IND`) — external and read-only; matrix column `IND` is `R` throughout, so no
 * create, update or delete.
 *
 * **The column's recurring shape: open what you are entitled to, search no register.** `SCALE_SITE_READ`
 * without `SCALE_SITE_QUERY` — they open a site record reached from their own authorizations but have no
 * Scale Sites search screen — and, since 2026-09-03, `SCALER_RISK_ASSESSMENT_READ` without
 * `SCALER_RISK_ASSESSMENT_QUERY`, because the scaler record's Risk Rating tab lists and links its own
 * assessments. Mirrors `RolePermissions.industryScaler()`, which records the judgement calls.
 */
const INDUSTRY_SCALER_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  // Risk assessment: read, scaler subject only, client-scoped on the backend — the client's 2026-09-02
  // spec ("read permissions with limitations"). No `_ASSESSMENT_QUERY`: reached from the scaler
  // record's Risk Rating tab, which lists and links its assessments, so the standalone search screen is
  // withheld (2026-09-03). Same shape as `SCALE_SITE_READ` without `SCALE_SITE_QUERY` below.
  PERMISSIONS.SCALER_RISK_RATING_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
  PERMISSIONS.WELCOME_READ,
  PERMISSIONS.LOV_READ,
  PERMISSIONS.CLIENT_QUERY,
  PERMISSIONS.SCALER_QUERY,
  PERMISSIONS.SCALER_READ,
  PERMISSIONS.SCALER_ADDRESS_READ,
  PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALER_AUTHORIZATION_READ,
  PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALER_EXAM_QUERY,
  PERMISSIONS.SCALER_APPOINTMENT_QUERY,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
  PERMISSIONS.SCALE_SITE_READ,
  PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
  PERMISSIONS.MSD_QUERY,
  PERMISSIONS.MSD_READ,
];

/**
 * Scale Site Owner / Operator / Contractor (`OWN`) — external and read-only; matrix column `OWN` is
 * `R` throughout. The mirror image of the Industry Scaler: this role lives on the scale-site record and
 * *does* hold `SCALE_SITE_QUERY`, while its reach into the scaler record stops at Summary, Address and
 * Exams / Upgrades. Note `SCALE_SITE_AUTHORIZED_SCALER_QUERY` without `SCALER_AUTHORIZATION_READ` (§E
 * is `-`), and `SCALE_SITE_MSD_QUERY` without `MSD_QUERY`/`MSD_READ` (§F is `-`). Mirrors
 * `RolePermissions.scaleSiteOwner()`, which records the judgement calls — including that §4 was taken
 * over §3 for the Address and Exams tabs.
 */
const SCALE_SITE_OWNER_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  // Risk assessment: read, scale-site subject only, client-scoped — the mirror of the Industry
  // Scaler's grant above, `_ASSESSMENT_QUERY` withheld included (2026-09-03). Reached from the site
  // record's Risk Rating tab. Note this role DOES hold `SCALE_SITE_QUERY`, so what is withheld is the
  // assessment register specifically, not registers generally.
  PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
  PERMISSIONS.WELCOME_READ,
  PERMISSIONS.LOV_READ,
  PERMISSIONS.CLIENT_QUERY,
  PERMISSIONS.SCALER_QUERY,
  PERMISSIONS.SCALER_READ,
  PERMISSIONS.SCALER_ADDRESS_READ,
  PERMISSIONS.SCALER_EXAM_QUERY,
  PERMISSIONS.SCALE_SITE_QUERY,
  PERMISSIONS.SCALE_SITE_READ,
  PERMISSIONS.SCALE_SITE_SUMMARY_READ,
  PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
  PERMISSIONS.SCALE_SITE_CONTACT_READ,
  PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
  PERMISSIONS.SCALE_SITE_MSD_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_READ,
  PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
];

/**
 * Check Scaler (`CHK`) — Ministry field staff, and the first *internal* role enabled below the
 * administrator, so two things differ from the two columns above:
 *
 * - **No forest-client scoping.** The role is not in `EXTERNAL_CLIENT_ROLES`, so it grants its column
 *   with no client number and the client switcher never appears for it.
 * - **The first column with writes.** It records check scales, site inspections, performance remarks
 *   and mark/site designations, and renews expiring authorizations from the Work Bench — but creates no
 *   scaler, scale site or authorization through the create wizards.
 *
 * The `(dist)` / `(rgn)` org-unit qualifiers on its matrix cells are **not enforced anywhere yet**, so
 * it currently sees every district's rows. Mirrors `RolePermissions.checkScaler()`, which records the
 * judgement calls — Work Bench `CRU` taken over §E's denial of authorization-create, summary check
 * scales read under §I's Check Scale rows, and (since the client's 2026-09-02 spec) every letter verb,
 * view and create alike — plus `LETTER_SIGNATORY_QUERY`, the letter pages' signatory picker, since §J
 * gives it no `MAINTAIN_SIGNATORIES_*` to borrow.
 */
const CHECK_SCALER_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  PERMISSIONS.SCALER_RISK_RATING_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
  PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
  PERMISSIONS.WELCOME_READ,
  PERMISSIONS.LOV_READ,
  PERMISSIONS.CLIENT_QUERY,
  PERMISSIONS.SCALER_QUERY,
  PERMISSIONS.SCALER_READ,
  PERMISSIONS.SCALER_ADDRESS_READ,
  PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALER_AUTHORIZATION_READ,
  PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
  PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
  PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALER_EXAM_QUERY,
  PERMISSIONS.SCALER_APPOINTMENT_QUERY,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
  PERMISSIONS.SCALE_SITE_QUERY,
  PERMISSIONS.SCALE_SITE_READ,
  PERMISSIONS.SCALE_SITE_SUMMARY_READ,
  PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
  PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
  PERMISSIONS.SCALE_SITE_CONTACT_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
  PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
  PERMISSIONS.SCALE_SITE_MSD_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_READ,
  PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
  PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE,
  PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
  PERMISSIONS.CHECK_SCALE_QUERY,
  PERMISSIONS.CHECK_SCALE_CREATE,
  PERMISSIONS.CHECK_SCALE_UPDATE,
  PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
  PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
  PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE,
  PERMISSIONS.MSD_QUERY,
  PERMISSIONS.MSD_READ,
  PERMISSIONS.MSD_CREATE,
  PERMISSIONS.MSD_UPDATE,
  PERMISSIONS.MSD_LETTER_CREATE,
  PERMISSIONS.MSD_LETTER_VIEW,
  PERMISSIONS.LETTER_SIGNATORY_QUERY,
  PERMISSIONS.WORKBENCH_QUERY,
  PERMISSIONS.WORKBENCH_CREATE,
  PERMISSIONS.WORKBENCH_UPDATE,
  PERMISSIONS.REPORT_READ,
];

/**
 * The read-only internal column — **one list, shared verbatim by three roles** because §3 gives them
 * the same cells: `SCS_CLERICAL`, `SCS_BRANCH_SYS_SUPPORT` and `SCS_REGIONAL_MANAGER`. All three are
 *
 * - **internal**: not in `EXTERNAL_CLIENT_ROLES`, so each grants its column with no client number and
 *   the client switcher never appears;
 * - **read-only**: every cell is `R` or `-`, so the allowlist invariant ("every granted name ends
 *   `_READ` or `_QUERY`") applies to all three.
 *
 * The columns were compared cell by cell across all 79 rows of §3 and agree on 78. The only variation
 * is §A's Work Bench — `R (ltd)` for clerical and regional manager, plain `R` for branch support — and
 * that is org-unit *breadth*, not a different permission: all three hold `WORKBENCH_QUERY` and nothing
 * more.
 *
 * It is also a strict subset of `CHECK_SCALER_PERMISSIONS`, so none of the three opens a screen that
 * role did not already open. Legacy parity: `MenuUtils` sent all three to `getAQRMenus()` —
 * Administration, Queries, Reports, and no Create menu, which falls out of holding no `_CREATE`.
 *
 * Mirrors `RolePermissions.readOnlyInternalColumn()`. The per-role reasoning is *not* shared — see
 * `clerical()` (§3 over §4 on the site tabs; check-scale lists granted while §I denies the record),
 * `branchSystemSupport()` (§4's non-existent exam schedules) and `regionalManager()` (§4's "create
 * scaler licences", denied) for the conflicts each column resolves.
 */
const READ_ONLY_INTERNAL_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  PERMISSIONS.SCALER_RISK_RATING_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
  PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
  PERMISSIONS.WELCOME_READ,
  PERMISSIONS.LOV_READ,
  PERMISSIONS.CLIENT_QUERY,
  PERMISSIONS.SCALER_QUERY,
  PERMISSIONS.SCALER_READ,
  PERMISSIONS.SCALER_ADDRESS_READ,
  PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALER_AUTHORIZATION_READ,
  PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALER_EXAM_QUERY,
  PERMISSIONS.SCALER_APPOINTMENT_QUERY,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
  PERMISSIONS.SCALE_SITE_QUERY,
  PERMISSIONS.SCALE_SITE_READ,
  PERMISSIONS.SCALE_SITE_SUMMARY_READ,
  PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
  PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
  PERMISSIONS.SCALE_SITE_CONTACT_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
  PERMISSIONS.SCALE_SITE_MSD_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_READ,
  PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
  PERMISSIONS.MSD_QUERY,
  PERMISSIONS.MSD_READ,
  PERMISSIONS.WORKBENCH_QUERY,
  PERMISSIONS.REPORT_READ,
];

/**
 * District Manager (`DM`) — the shared read-only column **plus exactly one write**,
 * `SCALER_LICENCE_CANCEL`.
 *
 * Its §3 column is cell-for-cell identical to the three that share `READ_ONLY_INTERNAL_PERMISSIONS`,
 * so folding it in there is an inviting and wrong edit: §4 gives this column a fourth bullet the others
 * lack — "Suspend scaler licence / recommend cancellations" — and that bullet is why the permission
 * exists at all. §3's "Scaler Record – Summary – Edit" stays `-`, so the role edits no scaler field;
 * legacy gated the licence-cancelled date under its own WebADE action, independent of both scaler edit
 * and remark authoring. See `RolePermissions.districtManager()`.
 *
 * Visible effect, and a combination no enabled role had before: on the Performance Remarks tab the
 * licence date is editable with Save Record, while Add Performance Remark stays hidden and the row
 * Actions column is dropped.
 */
const DISTRICT_MANAGER_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  ...READ_ONLY_INTERNAL_PERMISSIONS,
  PERMISSIONS.SCALER_LICENCE_CANCEL,
];

/**
 * C&E Technician / Forest Officer (`CET`) — **read-only everywhere**, plus the ability to view letters
 * someone else composed. The client's 2026-09-02 spec governs this column: "in general they should only
 * have read permissions. No where in the app should they be able to edit, delete or create something."
 *
 * Now read as a delta from `READ_ONLY_INTERNAL_PERMISSIONS`, not from the Check Scaler:
 *
 * - **no Work Bench** (§A is `-`) — still the only internal role with none;
 * - **plus `CHECK_SCALE_QUERY`** — §I's read row is `R` here and `-` for the clerical column, so the
 *   check-scale record and the "OR enter check scale #" lookup stay open;
 * - **plus the three `_LETTER_VIEW` verbs** — "CE_TECH should only be able to view letters". There is
 *   no advisory-letter view: SCS stores no advisory letter, so CET reaches none at all;
 * - **plus `MAINTAIN_QUESTIONS_QUERY`/`_READ`** — §J's "Maintain Questions" is `R` here and `-` for
 *   every other non-administrator. Read-only, which the client's rule independently requires.
 *
 * Mirrors `RolePermissions.ceTechnician()`, which records what the spec withdrew: §3's §I gave this
 * column check-scale writes, §H gave it inspection writes and §C gave it performance-remark `CRD`.
 */
const CE_TECHNICIAN_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  // Risk assessment: read only. The client named CHECK_SCALER, SYS_ADMIN, REG_SCAL_MAN and
  // REG_DIST_MAN as the create roles; this column is not one of them.
  PERMISSIONS.SCALER_RISK_RATING_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
  PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
  PERMISSIONS.WELCOME_READ,
  PERMISSIONS.LOV_READ,
  PERMISSIONS.CLIENT_QUERY,
  PERMISSIONS.SCALER_QUERY,
  PERMISSIONS.SCALER_READ,
  PERMISSIONS.SCALER_ADDRESS_READ,
  PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALER_AUTHORIZATION_READ,
  PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALER_EXAM_QUERY,
  PERMISSIONS.SCALER_APPOINTMENT_QUERY,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
  PERMISSIONS.SCALE_SITE_QUERY,
  PERMISSIONS.SCALE_SITE_READ,
  PERMISSIONS.SCALE_SITE_SUMMARY_READ,
  PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
  PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
  PERMISSIONS.SCALE_SITE_CONTACT_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
  PERMISSIONS.SCALE_SITE_MSD_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_READ,
  PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
  PERMISSIONS.CHECK_SCALE_QUERY,
  PERMISSIONS.MSD_QUERY,
  PERMISSIONS.MSD_READ,
  // Letters: view only, never compose.
  PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
  PERMISSIONS.MSD_LETTER_VIEW,
  PERMISSIONS.MAINTAIN_QUESTIONS_QUERY,
  PERMISSIONS.MAINTAIN_QUESTIONS_READ,
  PERMISSIONS.REPORT_READ,
];

/**
 * District Scaling Manager (`DSM`) — the widest non-administrator column: **almost the administrator,
 * minus the deletes**. The first to reach the record create wizards, the maintenance screens and risk
 * assessment.
 *
 * The deletes it *does* hold are contacts, both authorization kinds and performance remarks; it authors
 * reference data and scalers it cannot remove. `MAINTAIN_SIGNATORIES_CREATE` is withheld too — §J's
 * Signatory rows are `RU (dist)`, the one maintenance area with no `C`.
 *
 * Mirrors `RolePermissions.districtScalingManager()`. Two of its cells now come from the client's
 * 2026-09-02 spec rather than §3: REG_SCAL_MAN and REG_DIST_MAN are two of the four roles that create
 * risk assessments (both subjects, create and update), and two of the four with "access to all
 * letters" — so this column holds all seven letter verbs, view and create alike, and with them
 * `LETTER_SIGNATORY_QUERY` for the letter pages' signatory picker.
 */
const SCALING_MANAGER_PERMISSIONS: readonly PERMISSION_TYPE[] = [
  PERMISSIONS.WELCOME_READ,
  PERMISSIONS.LOV_READ,
  PERMISSIONS.CLIENT_QUERY,
  PERMISSIONS.SCALER_QUERY,
  PERMISSIONS.SCALER_READ,
  PERMISSIONS.SCALER_CREATE,
  PERMISSIONS.SCALER_UPDATE,
  PERMISSIONS.SCALER_ADDRESS_READ,
  PERMISSIONS.SCALER_LICENCE_CANCEL,
  PERMISSIONS.SCALER_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALER_AUTHORIZATION_READ,
  PERMISSIONS.SCALER_AUTHORIZATION_CREATE,
  PERMISSIONS.SCALER_AUTHORIZATION_UPDATE,
  PERMISSIONS.SCALER_AUTHORIZATION_DELETE,
  PERMISSIONS.SCALER_AUTHORIZATION_LETTER_CREATE,
  PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW,
  PERMISSIONS.SCALER_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALER_EXAM_QUERY,
  PERMISSIONS.SCALER_EXAM_CREATE,
  PERMISSIONS.SCALER_EXAM_UPDATE,
  PERMISSIONS.SCALER_APPOINTMENT_QUERY,
  PERMISSIONS.SCALER_APPOINTMENT_CREATE,
  PERMISSIONS.SCALER_APPOINTMENT_UPDATE,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_QUERY,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE,
  PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
  PERMISSIONS.SCALE_SITE_QUERY,
  PERMISSIONS.SCALE_SITE_READ,
  PERMISSIONS.SCALE_SITE_SUMMARY_READ,
  PERMISSIONS.SCALE_SITE_CREATE,
  PERMISSIONS.SCALE_SITE_UPDATE,
  PERMISSIONS.SCALE_SITE_ACTIVITY_READ,
  PERMISSIONS.SCALE_SITE_CONTACT_QUERY,
  PERMISSIONS.SCALE_SITE_CONTACT_READ,
  PERMISSIONS.SCALE_SITE_CONTACT_CREATE,
  PERMISSIONS.SCALE_SITE_CONTACT_UPDATE,
  PERMISSIONS.SCALE_SITE_CONTACT_DELETE,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_QUERY,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_UPDATE,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_DELETE,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_CREATE,
  PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW,
  PERMISSIONS.SCALE_SITE_AUTHORIZED_SCALER_QUERY,
  PERMISSIONS.SCALE_SITE_MSD_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_QUERY,
  PERMISSIONS.SCALE_SITE_INSPECTION_READ,
  PERMISSIONS.SCALE_SITE_INSPECTION_CREATE,
  PERMISSIONS.SCALE_SITE_INSPECTION_UPDATE,
  PERMISSIONS.SCALE_SITE_CHECK_SCALE_QUERY,
  PERMISSIONS.SCALE_SITE_SOFTWARE_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_RATING_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE,
  PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
  PERMISSIONS.SCALER_RISK_RATING_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_QUERY,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_READ,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE,
  PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
  PERMISSIONS.CHECK_SCALE_QUERY,
  PERMISSIONS.CHECK_SCALE_CREATE,
  PERMISSIONS.CHECK_SCALE_UPDATE,
  PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE,
  PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE,
  PERMISSIONS.SUMMARY_CHECK_SCALE_UPDATE,
  PERMISSIONS.MSD_QUERY,
  PERMISSIONS.MSD_READ,
  PERMISSIONS.MSD_CREATE,
  PERMISSIONS.MSD_UPDATE,
  PERMISSIONS.MSD_LETTER_CREATE,
  PERMISSIONS.MSD_LETTER_VIEW,
  PERMISSIONS.LETTER_SIGNATORY_QUERY,
  PERMISSIONS.WORKBENCH_QUERY,
  PERMISSIONS.WORKBENCH_CREATE,
  PERMISSIONS.WORKBENCH_UPDATE,
  PERMISSIONS.REPORT_READ,
  PERMISSIONS.MAINTAIN_QUESTIONS_QUERY,
  PERMISSIONS.MAINTAIN_QUESTIONS_READ,
  PERMISSIONS.MAINTAIN_TEMPLATES_QUERY,
  PERMISSIONS.MAINTAIN_TEMPLATES_READ,
  PERMISSIONS.MAINTAIN_TEMPLATES_CREATE,
  PERMISSIONS.MAINTAIN_TEMPLATES_UPDATE,
  PERMISSIONS.MAINTAIN_CONDITIONS_QUERY,
  PERMISSIONS.MAINTAIN_CONDITIONS_READ,
  PERMISSIONS.MAINTAIN_CONDITIONS_CREATE,
  PERMISSIONS.MAINTAIN_CONDITIONS_UPDATE,
  PERMISSIONS.MAINTAIN_EXAM_UPGRADES_QUERY,
  PERMISSIONS.MAINTAIN_EXAM_UPGRADES_READ,
  PERMISSIONS.MAINTAIN_EXAM_UPGRADES_CREATE,
  PERMISSIONS.MAINTAIN_EXAM_UPGRADES_UPDATE,
  PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_QUERY,
  PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_CREATE,
  PERMISSIONS.MAINTAIN_APPOINTMENT_TYPES_UPDATE,
  PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_QUERY,
  PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_READ,
  PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_CREATE,
  PERMISSIONS.MAINTAIN_VALID_LICENCE_ATTRIBUTES_UPDATE,
  PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_QUERY,
  PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_READ,
  PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_CREATE,
  PERMISSIONS.MAINTAIN_AUTHORIZATION_CLAUSES_UPDATE,
  PERMISSIONS.MAINTAIN_SIGNATORIES_QUERY,
  PERMISSIONS.MAINTAIN_SIGNATORIES_READ,
  PERMISSIONS.MAINTAIN_SIGNATORIES_UPDATE,
];

/**
 * The role → permission matrix. Mirrors `RolePermissions.PERMISSIONS_BY_ROLE`;
 * `permissions.unit.test.ts` asserts every role in `AVAILABLE_ROLES` has an entry.
 */
export const PERMISSIONS_BY_ROLE: Record<ROLE_TYPE, readonly PERMISSION_TYPE[]> = {
  // Matrix §4: "Full create, read, update, and delete access to all portions of the application."
  SCS_SYS_ADMIN: ALL_PERMISSIONS,
  SCS_INDUSTRY_SCALER: INDUSTRY_SCALER_PERMISSIONS,
  SCS_OWNER: SCALE_SITE_OWNER_PERMISSIONS,
  SCS_CHECK_SCALER: CHECK_SCALER_PERMISSIONS,
  SCS_CE_TECHNICIAN: CE_TECHNICIAN_PERMISSIONS,
  /**
   * The two scaling-manager columns. §3 gives them the same cells in all 79 rows — the six `(dist)` vs
   * `(rgn)` qualifiers on §J's Template and Signatory rows are org-unit breadth, not permissions — so
   * they share one list. RSM's §4 names three extra capabilities, none of which adds anything: site
   * inspections and exam results are already `CR`/`CRU` for both in §3, and exam *scheduling* has no
   * surface in SCS at all. See `RolePermissions.regionalScalingManager()`.
   */
  SCS_DIST_SCALING_MANAGER: SCALING_MANAGER_PERMISSIONS,
  SCS_REGIONAL_SCALING_MANAGER: SCALING_MANAGER_PERMISSIONS,
  SCS_DIST_MANAGER: DISTRICT_MANAGER_PERMISSIONS,
  /**
   * The three columns §3 gives identical cells. Each has its own §4 story and its own decisions — see
   * `READ_ONLY_INTERNAL_PERMISSIONS` and the Java methods it names — but one list.
   *
   * `SCS_REGIONAL_MANAGER` is the first management role here, and the one whose §4 claims a write the
   * matrix denies: "create scaler licences" is **not** granted, because §3 denies it in two rows and
   * legacy gave the role no Create menu. See `RolePermissions.regionalManager()`.
   */
  SCS_REGIONAL_MANAGER: READ_ONLY_INTERNAL_PERMISSIONS,
  SCS_CLERICAL: READ_ONLY_INTERNAL_PERMISSIONS,
  SCS_BRANCH_SYS_SUPPORT: READ_ONLY_INTERNAL_PERMISSIONS,
};

/**
 * The union of the permissions a user's roles grant. Unrecognised roles grant nothing (fail closed),
 * and a client-scoped role grants nothing without a forest client number — both mirroring
 * `RolePermissions.expandAuthorities`, so the UI never offers what the API will refuse.
 * @param {FamLoginUser | undefined} user - The authenticated user, if any.
 * @returns {Set<PERMISSION_TYPE>} The user's permissions; empty when not logged in.
 */
export const permissionsFor = (user: FamLoginUser | undefined): Set<PERMISSION_TYPE> => {
  const granted = new Set<PERMISSION_TYPE>();
  const hasClient = (user?.clientNumbers?.length ?? 0) > 0;
  for (const role of user?.roles ?? []) {
    if (!AVAILABLE_ROLES.includes(role as ROLE_TYPE)) {
      continue;
    }
    if (!hasClient && isClientScopedRole(role)) {
      continue;
    }
    for (const permission of PERMISSIONS_BY_ROLE[role as ROLE_TYPE]) {
      granted.add(permission);
    }
  }
  return granted;
};

/**
 * Whether the user holds a permission. The UI-side counterpart of the backend's
 * `@RequiresPermission` — used to hide controls the user cannot use, never as the enforcement point.
 * @param {FamLoginUser | undefined} user - The authenticated user, if any.
 * @param {PERMISSION_TYPE | undefined} permission - The permission to check; `undefined` means
 *   "no permission required" and always passes, so unrestricted routes need no special casing.
 * @returns {boolean} True if the permission is not required, or the user holds it.
 */
export const hasPermission = (
  user: FamLoginUser | undefined,
  permission: PERMISSION_TYPE | undefined,
): boolean => {
  if (!permission) {
    return true;
  }
  return permissionsFor(user).has(permission);
};

/**
 * Whether the user holds at least one of the given permissions. Suits a container — a nav group or a
 * route that lists several screens — which should appear when any of its children is reachable.
 * @param {FamLoginUser | undefined} user - The authenticated user, if any.
 * @param {readonly PERMISSION_TYPE[]} permissions - The permissions to check; an empty list passes.
 * @returns {boolean} True if the list is empty, or the user holds any of them.
 */
export const hasAnyPermission = (
  user: FamLoginUser | undefined,
  permissions: readonly PERMISSION_TYPE[],
): boolean => {
  if (permissions.length === 0) {
    return true;
  }
  const granted = permissionsFor(user);
  return permissions.some((permission) => granted.has(permission));
};
