/**
 * Anchors and expectations for the `SCS_CHECK_SCALER` (`CHK`) role-scoping suite.
 *
 * Spec: the roles & permissions matrix §3 column `CHK` + §4's summary, as
 * resolved in `RolePermissions.checkScaler()` (which records the three judgement calls the matrix left
 * open — Work Bench `CRU` over §E's authorization-create denial, summary check scales read under §I's
 * Check Scale rows, and the two `_LETTER` verbs for workflows the role owns end to end).
 *
 * **Two things make this role different from the two suites that came before it**, and they shape every
 * value below:
 *
 * 1. **It is INTERNAL.** `Roles.isClientScoped(SCS_CHECK_SCALER)` is false, so there is no forest client
 *    and no client-scoping axis. `signInAs([CHECK_SCALER_ROLE], [])` is the correct, complete identity —
 *    the empty client array is not an under-specified user here the way it is for `IND`/`OWN`, where it
 *    deliberately yields a user holding nothing.
 * 2. **It is the FIRST column with writes.** So the suite cannot lean on a blanket "every mutation is
 *    refused" assertion. Each write is either an allow that must be proven to have PASSED authorization,
 *    or a deny that must be proven to have been refused BY authorization — see `buildWriteProbeBody`.
 *
 * Every status quoted in a comment here was measured against the seeded local stack on 2026-08-25, not
 * inferred from the matrix. Where the app and the matrix disagreed it is logged in `defects.md`.
 */

export const CHECK_SCALER_ROLE = 'SCS_CHECK_SCALER';
export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

/**
 * The contrast identity for proving an ALLOW.
 *
 * A 200/400 for the Check Scaler on its own says nothing: the same status arrives whether authorization
 * passed or was never consulted (bodyless writes 500 for every role — `defects.md` V2). `SCS_CLERICAL` is
 * still `welcomeOnly()`, so it holds no permission beyond the welcome page and is refused at the same
 * point the Check Scaler is admitted. Same call, same body, different role, different outcome — that
 * difference is the only thing that proves the permission was read.
 *
 * Chosen over `SCS_INDUSTRY_SCALER` deliberately: that role is client-scoped, so a refusal could come
 * from `ClientScopeInterceptor` rather than from `@RequiresPermission`, and the evidence would be
 * ambiguous. A welcome-only internal role has no second mechanism that could be doing the refusing.
 */
export const WELCOME_ONLY_ROLE = 'SCS_CLERICAL';

// ============================================================================== record anchors
// All pinned from the seeded extract and asserted by preflight/anchors.setup.ts where shared with
// another suite. Re-verify on any re-extract.

/** Scaler whose record every CHK read scenario opens. Shared with the industry-scaler suite. */
export const scalerLicenceNo = '001B';

/** A scaler authorization on that scaler — the §E "R" read, and the withheld-letter subject. */
export const scalerAuthorizationId = '147851';

/** Scale site whose record every CHK site scenario opens (TEMBEC - CANAL FLATS). */
export const scaleSiteIdNmbr = '520';

/** A real site inspection on that site — the §H "RU" read and edit-init subject. */
export const inspectionId = '322429';

/** A legacy check scale, for the §I search read. */
export const checkScaleId = '145988';

/** A real mark/site designation — the §F "RU" read, and the GRANTED letter subject. */
export const markSiteDesignationId = '1101';

/** Client number used for the unscoped client/scaler searches. */
export const clientNumber = '00048273';

/**
 * Inspection type + site type codes the create-init endpoint accepts. `MIN`/`W`, not `MI`/`WS` — the
 * abbreviations are a real trap: the wrong pair answers 400 from parameter binding, which looks exactly
 * like a permission failure and would make the allow assertion below pass for the wrong reason.
 */
export const inspectionCreateInitQuery = 'inspectionTypeCode=MIN&siteTypeCodes=W';

// ============================================================================== navigation (GUI level)

/**
 * All four top-level nav groups render for this role — unlike `IND`/`OWN`, where Reports, Create and
 * Administration all disappear. That is the headline difference an internal writing role makes, so it is
 * asserted positively rather than as an absence.
 */
export const expectedNavGroups = ['Queries', 'Reports', 'Create', 'Administration'] as const;

/** §B `Queries – Clients` R, §C `Queries – Scalers` R, §D `Queries – Scale Sites` R, §F `Query – MSD` R. */
export const expectedQueriesLeaves = [
  'Clients',
  'Scalers',
  'Scale Sites',
  'Mark Site Designations',
  // Withheld until `dbf826c`, which replaced the literal reading of §D's lone "Risk Rating Criteria" row
  // with "risk assessment follows the record it hangs off". This column authors across both records, so
  // it holds the risk create/update verbs as well as the reads.
  'Scaler Risk Assessment',
  'Scale Site Risk Assessment',
] as const;

/**
 * Nothing is withheld from Queries any more — this column now reaches every leaf an administrator does.
 * Kept as an empty export so the whole-list comparison in `guiAccess` keeps its shape and a future
 * withholding has somewhere to go.
 */
export const hiddenQueriesLeaves = [] as const;

/**
 * The Create group is where this role's shape shows most clearly: it creates the three things it records
 * (§I Check Scale `CR`, summary check scales under the same rows, §F MSD `CR`) and none of the four
 * entities §C/§D/§E deny it.
 */
export const expectedCreateLeaves = [
  'Check Scale',
  'Summary Check Scale',
  'Mark Site Designation',
] as const;

/** §C/§D `– Create` rows and §E's authorization-create rows are all `-` for `CHK`. */
export const hiddenCreateLeaves = [
  'Scaler',
  'Scale Site',
  'Scaler Authorization',
  'Scale Site Authorization',
] as const;

/** §A `Work Bench` `CRU (ltd)` — the one Administration leaf this role reaches. */
export const expectedAdministrationLeaves = ['Work Bench'] as const;

/**
 * `Maintenance` is a nested nav GROUP inside Administration, not a leaf, and `filterNavigation` drops a
 * group left with no visible children. Every §J row is `-` for `CHK`, so the whole sub-group must vanish
 * — a stronger and more legible assertion than checking nine individual links.
 */
export const hiddenAdministrationGroup = 'Maintenance';

/** All eight report screens ride on the single menu-level `REPORT_READ` (§4 "View reports"). */
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

// ============================================================================== record tabs

/** Every §C tab this column reads. `Risk Rating` is absent from the list because it is withheld. */
export const readableScalerTabs = [
  'Summary',
  'Address',
  'Authorizations',
  'Check Scales',
  'Summary Check Scales',
  'Exams / Upgrades',
  'Appointments',
  'Performance Remarks',
  'Risk Rating',
] as const;

/** Every §D tab this column reads. */
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
  'Risk Rating',
] as const;

/** `Risk Rating` on both records — `-` for `CHK` in §D, and no risk permission is held. */
export const withheldTab = 'Risk Rating';

// ============================================================================== in-page write controls

/**
 * The controls this role IS offered, per tab. Each maps to a write permission the column grants, and each
 * was confirmed rendered for `CHK` and for an administrator.
 *
 * `tab` is the tab to open; `control` is the button's exact accessible name.
 */
export const offeredWriteControls = [
  // §C `Scaler Record – Performance Remarks` CRD
  { record: 'scaler', tab: 'Performance Remarks', control: 'Add Performance Remark' },
  // §I `Check Scale – Create` CR, reached from the scaler's own Check Scales tab
  { record: 'scaler', tab: 'Check Scales', control: 'Add Check Scale' },
  // §F `Scale Site Record – MSD` CR
  { record: 'site', tab: 'MSD', control: 'Add Mark Site Designation' },
  // §H `Site Inspection – Create` CR
  { record: 'site', tab: 'Inspections', control: 'Add Inspection' },
  // §I again, from the site side
  { record: 'site', tab: 'Check Scales', control: 'Add Check Scale' },
] as const;

/**
 * The controls this role must NOT be offered, each paired with the tab it lives on. Every one of these
 * WAS confirmed visible for an administrator on the same tab — that pairing is what stops a renamed
 * button or a tab that failed to load from passing as a permission denial.
 *
 * `Save Record` on the Performance Remarks tab is the subtle one: it is the licence suspend/cancel
 * control, gated on `SCALER_LICENCE_CANCEL`, which §4 gives to the district and regional managers. So
 * this role adds a performance remark and still cannot act on the licence — exactly the boundary
 * `RolePermissions.checkScaler()` calls out, and the reason that permission was carved out of
 * `SCALER_UPDATE`.
 */
export const withheldWriteControls = [
  // §C `Scaler Record – Summary – Edit` is `-`
  { record: 'scaler', tab: 'Summary', control: 'Edit Record' },
  // §E `Scaler Authorization – Create` is `-`
  { record: 'scaler', tab: 'Authorizations', control: 'Add Authorization' },
  // §C `Scaler Exam / Upgrade – Create/Edit` is `-`
  { record: 'scaler', tab: 'Exams / Upgrades', control: 'Add Exam / Upgrade' },
  // §C `Scaler Appointment – Create/Edit` is `-`
  { record: 'scaler', tab: 'Appointments', control: 'Add Appointment' },
  // SCALER_LICENCE_CANCEL — see the note above
  { record: 'scaler', tab: 'Performance Remarks', control: 'Save Record' },
  // §D `Scale Site Record – Summary – Edit` is `-`
  { record: 'site', tab: 'Summary', control: 'Edit Record' },
  // §D `Scale Site Contact – Create` is `-` (both flavours of the control)
  { record: 'site', tab: 'Contacts', control: 'Add Primary Contact' },
  { record: 'site', tab: 'Contacts', control: 'Add Site Contact' },
  // §E `Scale Site Authorization – Create` is `-`
  { record: 'site', tab: 'Site Authorizations', control: 'Add Authorization' },
] as const;

// ============================================================================== write probe bodies

/**
 * Bodies for the API-level write probes, keyed `METHOD path`. Throws on an unknown key so a new row in a
 * write outline fails loudly instead of silently probing with no body.
 *
 * **Why a body is mandatory, and why each of these bodies looks broken on purpose.** Spring method
 * security is an AOP interceptor around the handler, so request-body binding and Jakarta bean validation
 * both run BEFORE `@RequiresPermission`. Measured on this stack: a bodyless `POST` answers `500` for the
 * administrator, for the Check Scaler, and for a welcome-only role alike (`defects.md` V2) — so any
 * assertion built on one is true regardless of what the permission layer did.
 *
 * Each body below therefore has to clear two hurdles and then fail on the third:
 *  1. **bind** — every `required` property of its schema is present and correctly typed;
 *  2. **pass bean validation** — no `@Size`/`@NotNull`/`@Pattern` violation, because those answer `400`
 *     with a `fieldErrors` array *before* authorization and would be equally vacuous;
 *  3. **fail SERVICE-side** — violate a business rule enforced after authorization, so the call can never
 *     mutate anything even if the permission layer were broken in the permissive direction.
 *
 * Hurdle 2 is the one that bites. `{"scalingMethods": []}` looks like a fine way to fail a scale-site
 * create; it is a `@Size` violation, so it answers `400` before authorization and proves nothing. The
 * body below sends one valid method row and points at a nonexistent owner client instead, which reaches
 * `ScaleSiteService` and answers `422`.
 *
 * Distinguishing a service-side rejection from a pre-authorization one is easy at the wire: service rules
 * answer `BAD_REQUEST` / `NOT_FOUND` / `UNPROCESSABLE_ENTITY` with a prose `message`, whereas bean
 * validation answers `VALIDATION_ERROR` with `fieldErrors`. If you add a body here, check for
 * `fieldErrors` before trusting it.
 */
export const buildWriteProbeBody = (method: string, path: string): unknown => {
  const bodies: Record<string, unknown> = {
    // ---------------------------------------------------------------- writes the column DENIES
    // Owner client 99999999 does not exist -> ScaleSiteService, 422. One valid scalingMethods row so the
    // @Size(min=1) check passes and authorization is reached.
    'POST /api/scale-sites': {
      siteName: 'ZZ-PROBE',
      ownerClientNumber: '99999999',
      ownerClientLocnCode: '00',
      orgUnitNo: '1',
      siteLocation: 'ZZ-PROBE',
      scalingMethods: [{ scaleMethodTypeCode: 'W', scaleSitePriorityCode: 'P' }],
    },
    // Client contact 999999999 does not exist -> 404 "A Client Contact could not be found for ...".
    [`POST /api/scale-sites/${scaleSiteIdNmbr}/contacts`]: {
      clientContactId: 999999999,
      contactRoleDescription: 'ZZ-PROBE',
      primaryContactInd: 'N',
      siteInformationAccessInd: 'N',
      effectiveDate: '2020-01-01',
    },
    // Unknown training type -> ScalerExamService, 400 "Unknown exam / upgrade training type: ZZZZ".
    [`POST /api/scalers/${scalerLicenceNo}/exams`]: { scalerTrainingTypeId: 'ZZZZ' },
    // provinceWideInd N with no district -> 400 "District is required when the appointment is not
    // province-wide." Fires after authorization, so the 403 below is the permission talking.
    [`POST /api/scalers/${scalerLicenceNo}/appointments`]: {
      scalerAppointmentType: 'ZZ',
      scaleGradingSystemCode: 'ZZ',
      provinceWideInd: 'N',
      issuedDate: '2020-01-01',
    },

    // ---------------------------------------------------------------- writes the column GRANTS
    // Expiry before effective -> 400 "Effective date must be on or before the expiry date." The Check
    // Scaler reaches this rule (400) while a welcome-only role is refused (403) — that pair is the proof
    // MSD_CREATE is held, and the rule is what guarantees no designation is ever written.
    'POST /api/mark-site-designations': {
      timberMark: 'ZZPROBE',
      effectiveDate: '2020-01-01',
      expiryDate: '2019-01-01',
      orgUnitNo: '1',
      districtWideInd: 'N',
    },
    // Neither an action nor an outcome code -> 400 "Either an action or an outcome must be selected, but
    // not both." Same allow-side shape: 400 for CHK, 403 for a welcome-only role.
    [`POST /api/scalers/${scalerLicenceNo}/performance-remarks`]: {
      loggedTimestamp: '2099-01-01',
      performanceRemarkDesc: 'ZZ-PROBE',
    },
  };

  const key = `${method.toUpperCase()} ${path}`;
  const body = bodies[key];
  if (body === undefined) {
    throw new Error(
      `[sec/chk] no write-probe body defined for "${key}". A write probe without a body is rejected ` +
        `before @RequiresPermission runs, so it would pass for any role — add a body here (see this ` +
        `function's doc comment for the three hurdles it must clear) rather than probing without one.`,
    );
  }
  return body;
};
