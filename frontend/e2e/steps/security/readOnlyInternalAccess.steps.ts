import { When, Then, expect } from '../fixtures';

import { collectControlVerdicts } from '../../pages/security/RecordTabsPage';
import {
  CLERICAL_ROLE,
  NO_ROLES,
  READ_ONLY_INTERNAL_ROLES,
  SYS_ADMIN_ROLE,
  expectedAdministrationLeaves,
  expectedQueriesLeaves,
  expectedReportsLeaves,
  hiddenAdministrationGroup,
  hiddenQueriesLeaves,
  readableScaleSiteTabs,
  readableScalerTabs,
  scaleSiteIdNmbr,
  scalerLicenceNo,
  riskRatingTab,
  withheldWriteControls,
} from '../../fixtures/security/read-only-internal-test-data';

/**
 * All three levels for the **read-only internal column** — `SCS_CLERICAL`, `SCS_BRANCH_SYS_SUPPORT` and
 * `SCS_REGIONAL_MANAGER`, which resolve to the same 30-permission set.
 *
 * **What is structurally different from the suites before it.** Those covered one role each. Here the
 * role is a scenario parameter, so every assertion runs three times and the suite *proves* the equality
 * `RolePermissionsTest` claims rather than trusting it — if a future requirement separates the columns,
 * these outlines are where it surfaces.
 *
 * **The assertion shape a read-only column needs.** Thirty permissions, not one a mutation, so there is
 * no allow-side write to prove. The exposure is the opposite: an endpoint that answers 200 for everyone
 * would satisfy every allow row here. An administrator contrast cannot detect that — both callers hold
 * the permission — so the allow rows are paired with `WELCOME_ONLY_ROLE`, a role holding nothing, and the
 * deny rows are paired with the administrator. Two different contrasts, each covering what the other
 * cannot.
 *
 * Reused untouched from the generic step files: `I browse directly to {string}`, `I should stay on
 * {string}`, `I should be refused with the unauthorized page`, `the {string} menu should be offered` /
 * `not be offered`, `the {string} control should be offered` / `not be offered`, `the API should allow it`
 * / `refuse it` / `refuse it with 403`, and `the same call should succeed for a system administrator`.
 */

// =============================================================================== GUI — navigation

When('I open the side navigation as an internal reader', async ({ roleSession }) => {
  await roleSession.visit('/welcome');
  await roleSession.waitForRouteDecision();
});

/**
 * Asserted as a whole-list comparison rather than leaf by leaf: the interesting claim is that Queries
 * offers exactly four of its six children, and "the two risk screens are absent" is only meaningful
 * beside "the other four are present" — otherwise a Queries group that failed to render would pass.
 */
Then('the Queries menu should offer exactly the internal read-only screens', async ({ roleSession }) => {
  await roleSession.openNavGroup('Queries');
  for (const leaf of expectedQueriesLeaves) {
    await expect(
      roleSession.navLink(leaf),
      `Queries must offer "${leaf}" — §3 grants its _QUERY to all three columns`,
    ).toBeVisible();
  }
  for (const leaf of hiddenQueriesLeaves) {
    await expect(
      roleSession.navLink(leaf),
      `Queries must NOT offer "${leaf}" — RSK has no row for this column at all`,
    ).toBeHidden();
  }
});

Then('every report screen should be offered', async ({ roleSession }) => {
  await roleSession.openNavGroup('Reports');
  for (const leaf of expectedReportsLeaves) {
    await expect(
      roleSession.navLink(leaf),
      `Reports is gated as one menu-level permission (REPORT_READ), so "${leaf}" must render — the ` +
        `matrix has no per-report rows to withhold it`,
    ).toBeVisible();
  }
});

/**
 * The Administration group is the one place this column's shape is visible in the nav: it renders,
 * because Work Bench is `R`, but collapses to that single leaf because §J is `-` throughout. Legacy did
 * the same thing by a different route — `MenuUtils` gave both support roles `getAQRMenus()` and
 * `scsMenu.jsp` wrapped the whole Maintenance submenu in one WebADE action they did not hold.
 */
Then('Administration should offer only the Work Bench', async ({ roleSession }) => {
  await roleSession.openNavGroup('Administration');
  for (const leaf of expectedAdministrationLeaves) {
    await expect(
      roleSession.navLink(leaf),
      `Administration must offer "${leaf}" — §A gives this column WORKBENCH_QUERY`,
    ).toBeVisible();
  }
  await expect(
    roleSession.navGroup(hiddenAdministrationGroup),
    `the nested "${hiddenAdministrationGroup}" group must be dropped for having no visible child — ` +
      `every §J row is "-" for this column`,
  ).toBeHidden();
});

/**
 * The pairing for the withheld Maintenance sub-group. Expands Administration first: the nested group is
 * only rendered once its parent is open, so asserting it against the collapsed tree reports it missing
 * for an administrator too — a contrast that fails for the wrong reason proves nothing.
 */
Then('an administrator should be offered the Maintenance sub-group', async ({ roleSession }) => {
  await roleSession.openNavGroup('Administration');
  await expect(
    roleSession.navGroup(hiddenAdministrationGroup),
    `"${hiddenAdministrationGroup}" must render for an administrator — otherwise this column's ` +
      `withheld-sub-group assertion passes vacuously on a nav tree that never built it`,
  ).toBeVisible();
});

// =============================================================================== GUI — record tabs

Then('the scaler record should offer every tab this column reads', async ({ roleSession }) => {
  for (const tab of readableScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `"${tab}" is R for this column in §C and must be readable`,
    ).toBeVisible({ timeout: 30_000 });
  }
});

Then('the scale site record should offer every tab this column reads', async ({ roleSession }) => {
  for (const tab of readableScaleSiteTabs) {
    await expect(
      roleSession.tab(tab),
      `"${tab}" is R for this column in §D and must be readable`,
    ).toBeVisible({ timeout: 30_000 });
  }
});

/**
 * The Risk Rating tab — asserted READABLE, which is the reverse of what this suite first claimed.
 *
 * §D's lone "Risk Rating Criteria" row reads as `-` for this column and was followed literally, so the tab
 * was asserted hidden. `dbf826c` replaced that reading with **risk assessment follows the record it hangs
 * off**: an assessment is another tab on a record, so it takes the level the role holds on that record's
 * other tabs. This column reads both records whole, so it holds the risk query/read verbs and the tab
 * renders.
 *
 * Kept as its own step rather than folded into the tab lists because the reversal is worth being explicit
 * about: the create/update verbs are still withheld, so the tab opens and the assessment routes behind it
 * do not — see `url-access.feature`.
 */
Then('the record should offer the Risk Rating tab', async ({ roleSession }) => {
  await expect(
    roleSession.tab(riskRatingTab),
    `"${riskRatingTab}" renders from *_RISK_RATING_QUERY, which this column holds since dbf826c — ` +
      `risk assessment follows the record it hangs off. If this is hidden, either that rule was reverted ` +
      `or the frontend mirror is stricter than RolePermissions.readOnlyInternalColumn()`,
  ).toBeVisible({ timeout: 30_000 });
});

// =============================================================================== GUI — write controls
//
// The column's defining property, asserted as one sweep: thirty permissions, none of them a mutation, so
// NO write control on any readable tab may render. Paired with the administrator running the identical
// loop, because "no write control found" also describes a page that never loaded.

// Phrased distinctly from the check-scaler suite's equivalent: that step sweeps ITS list (the controls
// that role is offered), this one sweeps the full set that must all be hidden. Same mechanism, different
// expectation, so one phrase for both would resolve ambiguously.
When('I sweep every tab that carries a write control', async ({ roleSession, recordTabs, world }) => {
  world.readOnlyControlVerdicts = await collectControlVerdicts(
    recordTabs,
    async (path) => {
      await roleSession.visit(path);
      await roleSession.waitForRouteDecision();
    },
    withheldWriteControls,
    {
      scalerPath: `/scalers/view/${scalerLicenceNo}`,
      sitePath: `/scale-sites/view/${scaleSiteIdNmbr}`,
    },
  );
});

Then('no write control should be offered anywhere', async ({ world }) => {
  const leaked = (world.readOnlyControlVerdicts ?? []).filter((v) => v.visible);
  expect(
    leaked,
    'every permission in this column is a _READ or _QUERY, so no write control may render. A control ' +
      'listed here is offered to a role that cannot use it — the frontend mirror is more permissive ' +
      'than RolePermissions.readOnlyInternalColumn()',
  ).toEqual([]);
});

Then('an administrator should be offered every one of them', async ({ world }) => {
  const missing = (world.readOnlyControlVerdicts ?? []).filter((v) => !v.visible);
  expect(
    missing,
    'each of these controls must exist for a role that holds its permission — otherwise the deny sweep ' +
      'above proves nothing about the read-only column, only that the tabs did not render',
  ).toEqual([]);
});

// =============================================================================== API

When('I call {string} {string} as the {string} role', async ({ apiAs, world }, method, path, role) => {
  const probe = await apiAs([role], []);
  world.apiStatus = await probe.status(method, path);
});

/**
 * The allow-side pairing, and the one a read-only column cannot do without.
 *
 * A 200 for this column proves it holds the permission only if some caller is refused the same call. The
 * administrator cannot play that part — it holds everything — so an ungated endpoint would satisfy every
 * allow row in this suite undetected.
 *
 * The baseline is the roleless sentinel (`X-Mock-Roles: none`) rather than a role that happens to hold
 * nothing. All eleven roles are enabled now, so no such role exists — and the two suites that tried one
 * were both invalidated inside a day (`defects.md` V1 and V6). See `NO_ROLES`.
 */
When('I call {string} {string} as a caller with no roles', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([...NO_ROLES], []);
  world.baselineApiStatus = await probe.status(method, path);
});

Then('the same call should be refused for a caller with no roles', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'a caller holding no roles must be refused 403. If it succeeds, the endpoint is ungated and this ' +
      "column's 200 on it says nothing about the permission — which is the one thing an administrator " +
      'contrast cannot detect',
  ).toBe(403);
});

/**
 * The equality claim, asserted directly rather than inferred from three passing outlines.
 *
 * `RolePermissionsTest` asserts the three sets are equal in Java. This asserts the same thing end to end,
 * over HTTP, on the endpoint that most sharply divides this column from the Check Scaler — and it is the
 * assertion that will fail first if a real requirement ever separates the three columns.
 */
Then('all three read-only internal roles should agree on {string} {string}', async ({ apiAs }, method, path) => {
  const statuses: Record<string, number> = {};
  for (const role of READ_ONLY_INTERNAL_ROLES) {
    const probe = await apiAs([role], []);
    statuses[role] = await probe.status(method, path);
  }
  const distinct = [...new Set(Object.values(statuses))];
  expect(
    distinct,
    `§3 gives these three columns the same cells and RolePermissions maps all three to ` +
      `readOnlyInternalColumn(), so they must answer identically. Measured: ${JSON.stringify(statuses)}. ` +
      `A split means the shared list has been separated without this suite being re-derived`,
  ).toHaveLength(1);
});

Then('an administrator should be allowed {string} {string}', async ({ apiAs }, method, path) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], []);
  const status = await probe.status(method, path);
  expect(
    status,
    'the endpoint must work for a role that holds the permission — otherwise the refusal above proves ' +
      'nothing about the role under test',
  ).toBeLessThan(300);
});

// =============================================================================== survival read-back

/**
 * The one probe that could destroy a pinned anchor if authorization were broken, so the record is read
 * back rather than trusting the status. A refusal reported while the row was deleted anyway is the single
 * outcome a status assertion cannot see.
 */
Then('the scaler record should still exist', async ({ request }) => {
  const response = await request.get(`/api/scalers/${scalerLicenceNo}`);
  expect(
    response.status(),
    `scaler ${scalerLicenceNo} must survive the refused DELETE — this column holds no delete verb at ` +
      `all, so nothing should have removed it. If this fails the seeded DB has lost a pinned anchor and ` +
      `needs reloading (e2e/README.md step 1)`,
  ).toBe(200);
});

// =============================================================================== org-unit scoping
//
// Distinct phrases from the check-scaler suite's equivalents on purpose: those write their findings to
// `world.chk*` keys, so reusing the phrase would have this suite's Then read the other suite's data.

When('I search designations across every district as an internal reader', async ({ apiAs, world }) => {
  const probe = await apiAs([CLERICAL_ROLE], []);
  const rows = await probe.json<{ orgUnitName?: string }[]>(
    '/api/mark-site-designations/search?timberMark=%25',
  );
  world.readOnlyOrgUnitNames = [...new Set(rows.map((r) => String(r.orgUnitName)))];
});

When('an administrator runs the same designation search', async ({ apiAs, world }) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], []);
  const rows = await probe.json<{ orgUnitName?: string }[]>(
    '/api/mark-site-designations/search?timberMark=%25',
  );
  world.readOnlyAdminOrgUnitNames = [...new Set(rows.map((r) => String(r.orgUnitName)))];
});

Then('the designation results should span more than one district', async ({ world }) => {
  expect(
    (world.readOnlyOrgUnitNames ?? []).length,
    'with org-unit scoping unwired, an internal role must see every district. One district here would ' +
      'mean something IS narrowing the result — read defects.md SG-1 before assuming that is correct',
  ).toBeGreaterThan(1);
});

Then('the designation results should match an administrator exactly', async ({ world }) => {
  expect(
    [...(world.readOnlyOrgUnitNames ?? [])].sort(),
    'the org-unit dimension is inert, so this column and an administrator must see the same districts. ' +
      'A difference is the first sign the seam has been wired up',
  ).toEqual([...(world.readOnlyAdminOrgUnitNames ?? [])].sort());
});

/**
 * The claim that makes THIS suite's shape valid, asserted rather than assumed.
 *
 * `CLE`/`RM` carry `R (ltd)` on §A's Work Bench and `SUP` carries plain `R`. That is the single cell
 * separating the three columns, and it is a *breadth* qualifier — so while org-unit scoping is unbuilt,
 * all three must read the same queue. When the seam is wired, `CLE`/`RM` narrow and `SUP` does not, the
 * three columns stop being interchangeable, and this suite's shared-outline design expires with it.
 */
Then('all three roles should read the same Work Bench queue', async ({ apiAs }) => {
  const counts: Record<string, number> = {};
  for (const role of READ_ONLY_INTERNAL_ROLES) {
    const probe = await apiAs([role], []);
    const rows = await probe.json<unknown[]>('/api/scaler-authorizations/workbench');
    counts[role] = rows.length;
  }
  const distinct = [...new Set(Object.values(counts))];
  expect(
    distinct,
    `§A's "(ltd)" on CLE/RM against SUP's plain "R" is org-unit breadth, which is not built — so all ` +
      `three must read an identical queue today. Measured: ${JSON.stringify(counts)}. A split means ` +
      `org-unit scoping has been wired, and this whole suite needs re-deriving per one suite per role`,
  ).toHaveLength(1);
});
