import { daysAgo, daysAhead } from '../common/dates';

/**
 * SEC-9 / Scale Site Owner (`SCS_OWNER`) role-scoping anchors — DB-grounded, ground-truthed 2026-08-19
 * against the live stack. The spec for every expectation is
 * the roles & permissions matrix §3 column `OWN` (+ §4 prose); the enforcers are
 * `RolePermissions.scaleSiteOwner()` (backend) and its mirror `permissions.ts` (frontend).
 *
 * Like `SCS_INDUSTRY_SCALER`, the role has TWO independent axes:
 *  - **Role gating** — WHAT the role may do (permissions). Same for every scale site owner.
 *  - **Client scoping** — WHICH ROWS this particular one may see (forest client). `SCS_OWNER` is
 *    client-scoped (`Roles.isClientScoped`), so it holds NO permissions at all without a client.
 *
 * **Read this before changing an anchor: the owner is the MIRROR IMAGE of the industry scaler.** That
 * role lives on the scaler record and reaches a site only through its own authorizations; this one lives
 * on the scale-site record and holds `SCALE_SITE_QUERY` outright. So the anchor requirements invert: the
 * client must OWN scale sites, and it must own one with enough child data to walk every tab.
 */

/** The role under test, and the admin role used as the not-vacuous contrast baseline. */
export const SCALE_SITE_OWNER_ROLE = 'SCS_OWNER';
export const SYS_ADMIN_ROLE = 'SCS_SYS_ADMIN';

/**
 * The forest client the mock scale site owner is entitled to: AINSWORTH LUMBER CO. LTD.
 *
 * Chosen because it satisfies a constraint that eliminated most candidates — it **both owns scale sites
 * and is registered against a scaler**. The second half mattered while the owner's scaler scope was
 * "filed under my client"; since 2026-08-21 that scope is "authorized at a site I own", so the client's
 * own scaler (`IB60`) is no longer readable and the `SCALER_READ` cells are asserted against a seeded
 * anchor instead (see `permissionProbeScalerLicenceNo`). The client is kept because the *search*
 * assertions still need a row filed under it. Of the 241 owner clients in the seeded extract, only a
 * handful have one; this one owns 5 sites and has exactly 1.
 *
 * Confirmed 2026-08-19: `GET /api/scalers/search?clientNumber=00001009` → 1 row (`IB60`);
 * `GET /api/scale-sites/search?ownerClientNumber=00001009` → 5 rows.
 */
export const ownClientNumber = '00001009';

/**
 * The single scaler the client employs. One owned scaler keeps the scoped-search assertion exact
 * ("only this licence is listed") rather than the weaker "at least one row".
 */
export const ownScalerLicenceNo = 'IB60';

/**
 * The scale-site record anchor — the client's own site, and the one every GUI tab assertion opens.
 *
 * `019V` rather than one of the client's other four because it is the only one with child data on every
 * tab the `OWN` column grants: **2 contacts, 7 site authorizations, 8 inspections, 5 mark/site
 * designations** (confirmed 2026-08-19). That is load-bearing, not cosmetic — the Contacts tab
 * assertions need at least one contact row to prove the **Actions column is absent**, and an empty tab
 * would make the row-action denial pass vacuously. Site `313` was the first pick and was rejected for
 * being empty on all five (contacts=0, auths=0, inspections=0, check-scales=0, msd=0).
 */
export const ownScaleSiteId = '019V';

/**
 * Every scale site the client owns, so the scoped search can be asserted **exactly** rather than as a
 * containment check. Confirmed 2026-08-19: an unfiltered `GET /api/scale-sites/search` as this owner
 * returns precisely these 5 — which is itself the scoping assertion, since the request carried no owner
 * filter at all and the service bound one.
 */
export const ownedScaleSiteIds = ['000', '019V', '313', '601', '619'] as const;

/**
 * One of `019V`'s site authorizations, for the `SCALE_SITE_AUTHORIZATION_READ` single-record read that
 * §3.E grants `OWN` as `R (ltd)`. Read-only — this suite never mutates it. Confirmed 2026-08-19:
 * `GET /api/scale-site-authorizations/239313` → 200 as this owner, status `Active`.
 */
export const ownScaleSiteAuthorizationId = '239313';

/**
 * One of `019V`'s inspections, for the `SCALE_SITE_INSPECTION_READ` single-record read (§3.H `R (ltd)`).
 * Confirmed 2026-08-19: `GET /api/scale-sites/inspection/400091` → 200 as this owner (type `Minor`).
 */
export const ownInspectionId = '400091';

/**
 * `019V`'s primary contact, for the `SCALE_SITE_CONTACT_READ` single-record read (§3.D `R (ltd)`).
 * Confirmed 2026-08-19: `GET /api/scale-sites/019V/contacts/2497` → 200 (`IB SMITH`, primary `Y`).
 */
export const ownContactId = '2497';

/**
 * A scaler belonging to a DIFFERENT forest client that this owner cannot reach — the cross-client
 * restriction anchor. Client `00050660` holds licence `435D`.
 *
 * **Re-anchored 2026-08-21, and the reason is the whole point of the rule that changed.** This was `0017`
 * (client `00020897`) while the owner's scaler scope was "filed under my client". Once scope became
 * "authorized at a site I own", `0017` stopped being unreachable: the extract already gives it in-force
 * authorizations at `019V`, `601` and `619` — three of this client's five sites (auth ids 150016 and
 * 149493, effective July 2026, expiring 2027). So the owner reads it *correctly*, and three scenarios
 * asserting otherwise failed. A refusal anchor for this role must now be a scaler authorized at **none**
 * of the owner's sites, which is a stronger condition than belonging to another client.
 *
 * `435D` satisfies it structurally: it holds no in-force authorization anywhere, so no site it is
 * authorized at can be one of this client's. Confirmed live 2026-08-21: `GET /api/scalers/435D` → 403 as
 * this owner, 200 as an administrator. Referenced by no other suite, and nothing in this one seeds it.
 */
export const otherClientNumber = '00050660';
export const otherScalerLicenceNo = '435D';

/**
 * A real scale site this client never reaches — owned by `00001271` (CANADIAN FOREST PRODUCTS) and with
 * no authorization seeded for it. Confirmed 2026-08-19: `GET /api/scale-sites/120/tombstone` → 403 as
 * this owner, 200 as an administrator.
 */
export const unentitledScaleSiteId = '120';

/**
 * The forest client that owns `unentitledScaleSiteId`, `authorizedScaleSiteId` and
 * `apiAuthorizedScaleSiteId` — CANADIAN FOREST PRODUCTS. Named so the override assertions can *ask* the
 * search for someone else's sites and prove the server rebinds the filter to `ownClientNumber`; that is
 * the one scoping property a status code cannot show.
 */
export const otherSiteOwnerClientNumber = '00001271';

/**
 * Sites the client does NOT own, each carrying a seeded in-force authorization held by one of this
 * client's scalers — and each **still refused**, which is the point.
 *
 * That combination is what an industry scaler is admitted on:
 * `ClientScopeGuard.assertScaleSiteInScope` resolves site scope **per role**, so the
 * owner-OR-authorized rule serves `SCS_INDUSTRY_SCALER` (an authorization is the only way that role ever
 * reaches a site) and is withheld from `SCS_OWNER`, whose scope is the sites its client owns. Sharing one
 * predicate over-granted this role — PR review 2026-08-20, and the reason these two anchors flipped from
 * "readable while authorized" to "refused while authorized".
 *
 * Keeping the seed is deliberate: a refusal with no authorization present would pass under either rule,
 * so it could not detect a regression to the shared predicate. Re-proven 2026-08-20 on the live stack:
 * seeded and in force, `SCS_OWNER` → 403 while `SCS_INDUSTRY_SCALER` of the same client → 200.
 *
 * Both are owned by `00001271`, the same owner as `unentitledScaleSiteId`.
 *
 * **Why TWO sites for one behaviour.** The URL-level and API-level scenarios each seed, and under
 * `fullyParallel` two scenarios seeding the *same* site overlap: one's seed is live inside the other's
 * "refused before seeding" window, so that half fails intermittently. Asserting both directions inside a
 * single scenario fixes the race *within* a scenario but not *between* two of them — which is exactly the
 * bug that shipped in the first draft of this suite (see `defects.md` V2). One site per seeding scenario
 * removes the shared mutable anchor altogether.
 */
export const authorizedScaleSiteId = '121';

/** The API-level counterpart of {@link authorizedScaleSiteId} — see that comment for why it is separate. */
export const apiAuthorizedScaleSiteId = '12U';

/**
 * The scaler bridge anchor: a scaler of a THIRD forest client, reachable only while it holds an in-force
 * authorization at a site this client owns. `roles-permissions.md` §4's first bullet ("select information
 * on scalers authorized to scale at their sites") and §1's legend both describe this population, and
 * `ClientScopeGuard.assertScalerInScope` implements it as the mirror of the industry scaler's site
 * bridge. Without it the site record's Authorized Scalers tab linked every row to a 403, since the
 * scalers listed there work for other companies by definition (PR review 2026-08-20).
 *
 * Licence `001A` (TOTEN), client `00001110` — deliberately **not** `otherScalerLicenceNo`: seeding onto
 * that anchor would make the two "another client's scaler is refused" scenarios flap under
 * `fullyParallel` while the seed was live, the same hazard `authorizedScaleSiteId` documents.
 *
 * Ground-truthed on the live stack 2026-08-20: 403 → seed (`001A` authorized at `313`) → 200 →
 * teardown → 403.
 */
export const bridgedScalerLicenceNo = '001A';

/**
 * The site the bridge is seeded against — one this client owns, so the authorization points *into* the
 * owner's estate. `313` because it is the one owned site with no child data on any tab, so it is not an
 * anchor for anything else in this suite and a seeded authorization on it cannot perturb a row-count or
 * tab assertion elsewhere.
 */
export const bridgeSeedScaleSiteId = '313';

/** The API-level counterpart of {@link bridgeSeedScaleSiteId} — separate anchor, same `fullyParallel` reason. */
export const apiBridgeSeedScaleSiteId = '601';

/**
 * The scaler the **role-gating** suites read, and why it cannot be {@link ownScalerLicenceNo}.
 *
 * Since 2026-08-20 an owner reaches a scaler only by authorization at a site it owns, so `IB60` — filed
 * under this client but authorized nowhere in force — is refused. That breaks the *allow* rows in
 * `api-access` and the tab scenarios in `gui-access`, and quietly poisons the *deny* rows too:
 * `ClientScopeInterceptor` runs before method security, so a scope 403 would arrive first and the
 * assertion would no longer prove anything about the permission. Same class of vacuous-denial finding as
 * `defects.md` Divergence #1.
 *
 * So those suites use a scaler the owner genuinely reaches, with the authorization seeded per scenario.
 * `4313` (client `00016549`) is deliberately a **fourth** anchor: referenced by no other suite, and
 * holding no in-force authorization of its own (confirmed 2026-08-20), so it starts from a known state.
 * It must stay distinct from {@link bridgedScalerLicenceNo} — the client-scoping scenarios assert that
 * one is *refused* before they seed it, and a concurrent seed from another file would land inside that
 * window and make the refusal flap (`defects.md` V2).
 */
export const permissionProbeScalerLicenceNo = '4313';

/** The owned site the probe scaler is authorized at. `619` is claimed by no other scenario. */
export const permissionProbeSeedScaleSiteId = '619';

/**
 * A Reg/Dist the scaler-authorization create accepts. The backend does not enforce a scaler↔district
 * relationship (org-unit scoping is deferred), so any offered district works — 1831 is the one the SCA,
 * MSD and industry-scaler suites already pin.
 */
const entitlementOrgUnitNo = 1831;

/**
 * The create body that grants this client access to `scaleSiteId` for the life of one scenario: an
 * in-force (effective yesterday, expiring in a year) District-Wide=No authorization for the client's own
 * scaler, naming that site.
 *
 * Takes the site rather than hardcoding it, so each seeding scenario can own its own anchor — see
 * {@link authorizedScaleSiteId} for why that matters under `fullyParallel`.
 *
 * Seeded through the API and DELETEd on teardown, so the shared seed DB is left as found. It must be IN
 * FORCE — `ClientScopeGuard.isInForce` rejects a cancelled, not-yet-effective or expired authorization,
 * which is also why this cannot be pinned from the static extract.
 */
export const buildSiteEntitlementAuthBody = (scaleSiteId: string) =>
  buildAuthBodyFor(ownScalerLicenceNo, scaleSiteId);

/**
 * The mirror seed, for the scaler bridge: another client's scaler authorized at a site this client OWNS,
 * which is the only thing that admits the owner to that scaler's record. Same in-force window and same
 * teardown; only the direction differs, which is the point of having both.
 *
 * Takes the licence as well as the site because the suites need different scalers for different jobs —
 * {@link bridgedScalerLicenceNo} where a scenario asserts refused-then-admitted, and
 * {@link permissionProbeScalerLicenceNo} where the authorization is simply always present.
 */
export const buildScalerBridgeAuthBody = (scalerLicenceNo: string, scaleSiteId: string) =>
  buildAuthBodyFor(scalerLicenceNo, scaleSiteId);

const buildAuthBodyFor = (scalerLicenceNo: string, scaleSiteId: string) => ({
  scalerLicenceNo,
  orgUnitNo: entitlementOrgUnitNo,
  districtWideInd: 'N',
  authorizationEffectiveDate: daysAgo(1),
  authorizationExpiryDate: daysAhead(365),
  jobFunctions: ['P'],
  authForestProducts: [] as string[],
  scaleSites: [scaleSiteId],
  conditions: [] as { scaleAuthConditionId: number; scaleConditionClassCode: string }[],
});

/**
 * The side-navigation the role must see, from §3: `Queries – Clients` (§3.B `R`), `Queries – Scalers`
 * (§3.C `R (ltd)`) and `Queries – Scale Sites` (§3.D `R`).
 *
 * **The difference from the industry scaler is the whole point of this list**: `Scale Sites` is present
 * here and absent there, and `Mark Site Designations` is the reverse. Legacy agrees on the menu shape —
 * `MenuUtils.getOwnerMenus()` returned the Queries menu alone, exactly as `getIndScalerMenus()` did — so
 * only the leaves differ.
 */
export const expectedNavLinks = ['Clients', 'Scalers', 'Scale Sites'] as const;

/** Nav groups the role must NOT see at all — every leaf under them is `-` in the `OWN` column. */
export const hiddenNavGroups = ['Reports', 'Create', 'Administration'] as const;

/**
 * Nav leaves under the visible Queries group the role must NOT see. `Mark Site Designations` is the
 * notable one: §3.F is `-` for `OWN` on every MSD row, so the standalone search is withheld even though
 * §3.D grants the MSD **tab** on a site record. Two different permissions
 * (`MSD_QUERY` vs `SCALE_SITE_MSD_QUERY`), and conflating them is the mistake this pins against.
 */
export const hiddenNavLinks = [
  'Mark Site Designations',
  'Scaler Risk Assessment',
  'Scale Site Risk Assessment',
] as const;

/**
 * The Scale Site Record tabs the role reads — every §3.D row granted `R (ltd)`, which is all of them
 * except Risk Rating Criteria. Labels are the `SCALE_SITE_TABS` labels in `ScaleSiteTabs.tsx`.
 */
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
] as const;

/**
 * The one scale-site tab withheld: `Scale Site Record – Risk Rating Criteria` is `-` for `OWN` (§3.D
 * grants it only to DSM/RSM/ADM as `CR`), and the role holds no risk permission at all.
 */
export const withheldScaleSiteTab = 'Risk Rating';

/**
 * The Scaler Record tabs the role reads. Only three — and two of them exist because of a **recorded
 * decision, not a plain matrix reading**: §3.C is `-` for `OWN` on both "Scaler Record – Address" and
 * "– Exams / Upgrades", while §4 says the owner views "addresses, exam and upgrade history" for scalers
 * at their sites. §4 was taken as authoritative for those two rows only
 * (`RolePermissions.scaleSiteOwner()` decision 1, Jonah 2026-08-18).
 *
 * If that decision is ever reverted to §3, this list becomes `['Summary']` and the two names move to
 * `withheldScalerTabs` — which is precisely why the two lists are separate constants.
 */
export const readableScalerTabs = ['Summary', 'Address', 'Exams / Upgrades'] as const;

/**
 * The scaler tabs withheld. §3 and §4 agree on all six: the owner reads a scaler's identity,
 * address and qualifications, never its authorizations, check-scale history, appointments, conduct
 * record or risk rating.
 */
export const withheldScalerTabs = [
  'Authorizations',
  'Check Scales',
  'Summary Check Scales',
  'Appointments',
  'Performance Remarks',
  'Risk Rating',
] as const;
