import { daysAgo, daysAhead } from '../common/dates';

/**
 * SEC-8 / Industry Scaler (`SCS_INDUSTRY_SCALER`) role-scoping anchors — DB-grounded, ground-truthed
 * 2026-08-17 against the live stack. The spec for every expectation is
 * the roles & permissions matrix §3 column `IND` (+ §4 prose); the enforcers
 * are `RolePermissions.industryScaler()` (backend) and its mirror `permissions.ts` (frontend).
 *
 * The role has TWO independent axes, and the fixtures below are grouped by which one they feed:
 *  - **Role gating** — WHAT the role may do (permissions). Same for every industry scaler.
 *  - **Client scoping** — WHICH ROWS this particular one may see (forest client). `SCS_INDUSTRY_SCALER`
 *    is client-scoped (`Roles.isClientScoped`), so it holds NO permissions at all without a client.
 */

/** The role under test, and the admin role used as the not-vacuous contrast baseline. */
export const INDUSTRY_SCALER_ROLE = 'SCS_INDUSTRY_SCALER';
export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

/**
 * The forest client the mock industry scaler is entitled to, and the single scaler it owns.
 *
 * **This anchor must not be shared with another suite.** The client-scoping scenarios SEED an in-force
 * authorization on this scaler (see `buildSiteEntitlementAuthBody`), so for the life of a scenario it
 * has one extra, *Active* authorization. Any other suite asserting this scaler's authorization list —
 * a row count, or "the Active filter empties the list" — would fail intermittently whenever the two run
 * in parallel. `00048273` / `001B` is therefore chosen for being referenced NOWHERE else in the suite;
 * re-check that before re-pinning it. (It replaced `00001110` / `001A` on 2026-08-18, which the SCA
 * tab suite pins as "exactly one, long-expired authorization" — precisely the collision described.)
 *
 * Confirmed 2026-08-18: GET /api/scalers/search?clientNumber=00048273 → 1 row, licence 001B (FINONA);
 * every read endpoint on 001B returns 200. One owned scaler keeps the scoped-search assertion exact
 * rather than "at least one row".
 */
export const ownClientNumber = '00048273';
export const ownScalerLicenceNo = '001B';

/**
 * The one authorization `001B` holds — long expired (2009-06-01 → 2009-06-25), so it is stable
 * read-only data for the "own authorization is readable" assertion, and can never be mistaken for the
 * in-force one a scenario seeds. Confirmed 2026-08-18: GET /api/scalers/001B/authorizations →
 * [{scalerAuthorizationId:147851, status:"Expired"}] (1 row).
 */
export const ownScalerAuthorizationId = '147851';

/**
 * A scaler belonging to a DIFFERENT forest client — the cross-client restriction anchor. Client
 * `00109772` owns licence `0001`. Confirmed 2026-08-17: GET /api/scalers/0001 → scalerClientLoc
 * "00109772 / 00", and the same GET as `00048273` → 403.
 */
export const otherClientNumber = '00109772';
export const otherScalerLicenceNo = '0001';

/**
 * The scale site the client is entitled to ONLY via a seeded in-force scaler authorization —
 * `ClientScopeGuard.assertScaleSiteInScope` admits a site the client does not own when one of its
 * scalers holds a currently in-force authorization there (roles-permissions.md §4: "view scale sites
 * they are authorized to scale at"). Site 520 (TEMBEC - CANAL FLATS) is owned by client `00001402`,
 * NOT by `00048273` — so entitlement here is purely the authorization, which is exactly the path worth
 * testing. Without the seed the same site is refused; the scenario proves both directions.
 */
export const entitledScaleSiteId = '520';

/**
 * A real scale site the client is never entitled to — not its owner, and no authorization seeded for
 * it. Site 525 (TEMBEC - ELKO), confirmed present 2026-08-17 (GET /api/scale-sites/525/tombstone → 200
 * as an internal user, → 403 as the scoped external user).
 */
export const unentitledScaleSiteId = '525';

/**
 * A Reg/Dist the scaler-authorization create accepts. The backend does NOT enforce a scaler↔district
 * relationship (org-unit scoping is deferred), so any offered district works — 1831 is the one the SCA
 * and MSD suites already pin.
 */
const entitlementOrgUnitNo = 1831;

/**
 * The create body that grants `ownClientNumber` access to `entitledScaleSiteId` for the life of one
 * scenario: an in-force (effective yesterday, expiring in a year) District-Wide=No authorization for
 * the client's own scaler, naming that site.
 *
 * Seeded through the API and DELETEd on teardown, so the shared seed DB is left as found. It must be
 * IN FORCE — `ClientScopeGuard.isInForce` rejects a cancelled, not-yet-effective, or expired
 * authorization, so `001B`'s real 2009-expired authorization grants nothing.
 */
export const buildSiteEntitlementAuthBody = () => ({
  scalerLicenceNo: ownScalerLicenceNo,
  orgUnitNo: entitlementOrgUnitNo,
  districtWideInd: 'N',
  authorizationEffectiveDate: daysAgo(1),
  authorizationExpiryDate: daysAhead(365),
  jobFunctions: ['P'],
  authForestProducts: [] as string[],
  scaleSites: [entitledScaleSiteId],
  conditions: [] as { scaleAuthConditionId: number; scaleConditionClassCode: string }[],
});

/**
 * Body for a write-refusal probe, keyed `METHOD path`. Throws on an unknown endpoint so a new row in
 * the write outline fails loudly rather than silently probing with no body.
 *
 * **A write probe must send a body, and the body must be good enough to REACH the permission check.**
 * Spring method security is an AOP interceptor around the handler, so request-body binding and bean
 * validation run FIRST: a body-less `POST` is rejected by the binder with `400` before
 * `@RequiresPermission` is ever consulted — the same `400` an administrator gets. An empty-body probe
 * therefore cannot tell a permission denial from a malformed request, and would stay green if the role
 * were wrongly granted the permission (defects.md V5, where the ordering is measured).
 *
 * Each body below satisfies every `required` field of its schema — so binding and bean validation pass
 * and authorization is the only thing left that can refuse it — and then violates a business rule
 * enforced SERVICE-side, which runs *after* authorization. That second half is what makes it safe to
 * point these at real anchors: if the role were ever wrongly granted the permission, the call still
 * cannot mutate anything, it answers `400` — and that `400` is precisely what the administrator
 * contrast asserts, which is how the `403` is shown to be a role decision rather than a blanket refusal.
 */
export const buildWriteProbeBody = (method: string, path: string): unknown => {
  const bodies: Record<string, unknown> = {
    // `licenceTypes: ['WA']` with no `expiryDate` — ScalerService.validateWrite: "Licence expiry date
    // is required when Waste is selected", thrown before the client lookup and before any insert.
    'POST /api/scalers': {
      clientNumber: ownClientNumber,
      orgUnitNo: entitlementOrgUnitNo,
      issuedDate: daysAgo(1),
      oathTakenInd: 'N',
      licenceTypes: ['WA'],
    },
    // The same rule on the update path: validateWrite runs before the read-only-field checks and the
    // update itself, so not even a wrongful grant can touch the pinned anchor.
    [`PUT /api/scalers/${ownScalerLicenceNo}`]: {
      clientNumber: ownClientNumber,
      orgUnitNo: entitlementOrgUnitNo,
      issuedDate: daysAgo(1),
      oathTakenInd: 'N',
      licenceTypes: ['WA'],
    },
    // The seed body with its scale sites emptied — ScalerAuthorizationService.validateCreateRequest:
    // "At least one Scale Site is required when District Wide is No." `jobFunctions` stays populated
    // because that same validator dereferences it without a null check.
    'POST /api/scaler-authorizations': { ...buildSiteEntitlementAuthBody(), scaleSites: [] },
  };

  const key = `${method.toUpperCase()} ${path}`;
  const body = bodies[key];
  if (body === undefined) {
    throw new Error(
      `[sec] no write-probe body defined for "${key}". A write probe without a body is rejected by ` +
        `the request-body binder BEFORE @RequiresPermission runs, so it would pass for any role — ` +
        `add a body here (see this function's doc comment) rather than probing without one.`,
    );
  }
  return body;
};

/**
 * The side-navigation the role must see, straight from roles-permissions.md §3: the `IND` column grants
 * `Queries – Clients`, `Queries – Scalers` and `Query – Mark Site Designations`, and nothing else. Note
 * what is deliberately ABSENT: Scale Sites (the register row is `-`; a site is reached only from the
 * scaler's own authorizations) and both Risk Assessment entries.
 */
export const expectedNavLinks = ['Clients', 'Scalers', 'Mark Site Designations'] as const;

/** Nav groups the role must NOT see at all — every leaf under them is `-` in the `IND` column. */
export const hiddenNavGroups = ['Reports', 'Create', 'Administration'] as const;

/** Nav leaves under the visible Queries group that the role must NOT see. */
export const hiddenNavLinks = [
  'Scale Sites',
  'Scaler Risk Assessment',
  'Scale Site Risk Assessment',
] as const;

/**
 * The Scaler Record tabs the role reads. Every one is `R (ltd)` in the `IND` column: Summary, Address,
 * Authorizations, Check Scales, Exams / Upgrades, Appointments, Performance Remarks. "Summary Check
 * Scales" rides on the same `SCALER_CHECK_SCALE_QUERY` permission as Check Scales.
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
] as const;

/**
 * The Risk Rating tab is withheld — `Scale Site Record – Risk Rating Criteria` is `-` for `IND`, and the
 * role holds neither `SCALER_RISK_RATING_QUERY` nor `SCALER_RISK_ASSESSMENT_QUERY`. Named separately
 * because it is the one tab that distinguishes the role's record view from an administrator's.
 */
export const withheldScalerTab = 'Risk Rating';
