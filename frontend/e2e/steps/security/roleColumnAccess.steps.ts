import { When, Then, expect } from '../fixtures';

import { collectControlVerdicts } from '../../pages/security/RecordTabsPage';
import {
  NARROW_CONTRAST_ROLE,
  licenceCancelBody,
  licenceCancelPath,
  RISK_RATING_TAB,
  SCALING_MANAGER_ROLES,
  columnFor,
  scaleSiteIdNmbr,
  scalerLicenceNo,
} from '../../fixtures/security/role-columns';

/**
 * Registry-driven steps shared by the `DM`, `CET` and `DSM`/`RSM` suites.
 *
 * Every one takes the role as a parameter and looks its expectations up in
 * `fixtures/security/role-columns.ts`. The three columns assert the same shapes and differ only in data, so
 * one step layer serves all of them — and a fourth column becomes a registry entry rather than a fourth
 * copy of these steps.
 *
 * Reused untouched from the generic step files: `I am signed in as the {string} role`, `I browse directly
 * to {string}`, `I should stay on {string}`, `I should be refused with the unauthorized page`, `the API
 * should allow it` / `refuse it` / `refuse it with 403`, `I call {string} {string} as the {string} role`,
 * `I call {string} {string} as a caller with no roles` and its Then, and `the same call should succeed for
 * a system administrator`.
 */

/**
 * Open whatever ancestors a leaf needs before it renders.
 *
 * `Maintenance` is nested under `Administration`, so a leaf inside it needs two expansions. Getting this
 * wrong reports a leaf as missing for every role including the administrator — a contrast that fails for
 * the wrong reason, which is how the read-only suite's first Maintenance pairing went red.
 */
async function openTo(roleSession: { openNavGroup: (n: string) => Promise<void> }, group: string) {
  if (group === 'Maintenance') {
    await roleSession.openNavGroup('Administration');
  }
  await roleSession.openNavGroup(group);
}

// =============================================================================== GUI — navigation

// Distinct from `guiAccess.steps.ts`'s `I open the side navigation`, which visits /welcome without
// waiting for the route guard to commit.
When('I open the side navigation as that role', async ({ roleSession }) => {
  await roleSession.visit('/welcome');
  await roleSession.waitForRouteDecision();
});

Then('the {string} column should be offered exactly its own menus', async ({ roleSession }, role) => {
  const { nav, label } = columnFor(role);
  for (const group of nav.groups) {
    await expect(
      roleSession.navGroup(group),
      `the ${label} column holds at least one screen under "${group}", so the group must render`,
    ).toBeVisible();
  }
  for (const group of nav.hiddenGroups) {
    await expect(
      roleSession.navGroup(group),
      `every screen under "${group}" is "-" for the ${label} column, so the group must be dropped for ` +
        `having no visible child`,
    ).toBeHidden();
  }
});

Then('the {string} column should be offered exactly its own menu leaves', async ({ roleSession }, role) => {
  const { nav, label } = columnFor(role);

  for (const [group, leaf] of nav.leaves) {
    await openTo(roleSession, group);
    await expect(
      roleSession.navLinkIn(group, leaf),
      `"${group} → ${leaf}" is granted to the ${label} column in §3 and must render`,
    ).toBeVisible();
  }

  for (const [group, leaf] of nav.hiddenLeaves) {
    // A hidden leaf inside a group that itself renders: expand the group, or "hidden" is trivially true.
    if (nav.groups.includes(group) || nav.subGroups.includes(group)) {
      await openTo(roleSession, group);
    }
    await expect(
      roleSession.navLinkIn(group, leaf),
      `"${group} → ${leaf}" is "-" for the ${label} column and must NOT render`,
    ).toBeHidden();
  }
});

Then('the {string} column should be offered exactly its own sub-groups', async ({ roleSession }, role) => {
  const { nav, label } = columnFor(role);
  await roleSession.openNavGroup('Administration');
  for (const sub of nav.subGroups) {
    await expect(
      roleSession.navGroup(sub),
      `the ${label} column holds at least one screen under "${sub}", so the nested group must render`,
    ).toBeVisible();
  }
  for (const sub of nav.hiddenSubGroups) {
    await expect(
      roleSession.navGroup(sub),
      `every screen under "${sub}" is "-" for the ${label} column, so the nested group must be dropped`,
    ).toBeHidden();
  }
});

// =============================================================================== GUI — record tabs

Then('the scaler record should offer the {string} column its tabs', async ({ roleSession }, role) => {
  const { readableScalerTabs, label } = columnFor(role);
  for (const tab of readableScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `"${tab}" is readable for the ${label} column in §C and must render`,
    ).toBeVisible({ timeout: 30_000 });
  }
});

Then('the scale site record should offer the {string} column its tabs', async ({ roleSession }, role) => {
  const { readableScaleSiteTabs, label } = columnFor(role);
  for (const tab of readableScaleSiteTabs) {
    await expect(
      roleSession.tab(tab),
      `"${tab}" is readable for the ${label} column in §D and must render`,
    ).toBeVisible({ timeout: 30_000 });
  }
});

/**
 * The Risk Rating tab, asserted in whichever direction the column calls for.
 *
 * The scaling managers are the first non-administrator columns to be offered it — risk assessment follows
 * the record it hangs off, and they author across both records whole. Every other column is denied it, so
 * one step covering both directions keeps the two claims adjacent instead of in separate suites.
 */
Then('the {string} column should see the Risk Rating tab as its column allows', async ({ roleSession }, role) => {
  const { readsRiskRatingTab, label } = columnFor(role);
  const locator = roleSession.tab(RISK_RATING_TAB);
  if (readsRiskRatingTab) {
    await expect(
      locator,
      `risk assessment follows the record it hangs off, and the ${label} column authors across the whole ` +
        `record, so "${RISK_RATING_TAB}" must render`,
    ).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(
      locator,
      `the ${label} column holds no risk permission, so "${RISK_RATING_TAB}" must NOT render`,
    ).toBeHidden();
  }
});

// =============================================================================== GUI — write controls

When('I sweep every write control as the {string} role', async ({ roleSession, recordTabs, world }, role) => {
  const { offeredControls, withheldControls } = columnFor(role);
  world.roleColumnVerdicts = await collectControlVerdicts(
    recordTabs,
    async (path) => {
      await roleSession.visit(path);
      await roleSession.waitForRouteDecision();
    },
    [...offeredControls, ...withheldControls],
    { scalerPath: `/scalers/view/${scalerLicenceNo}`, sitePath: `/scale-sites/view/${scaleSiteIdNmbr}` },
  );
});

Then('every control the {string} column grants should be offered', async ({ world }, role) => {
  const { offeredControls, label } = columnFor(role);
  const wanted = new Set(offeredControls.map((c) => `${c.record}|${c.tab}|${c.control}`));
  const missing = (world.roleColumnVerdicts ?? []).filter(
    (v) => wanted.has(`${v.record}|${v.tab}|${v.control}`) && !v.visible,
  );
  expect(
    missing,
    `each of these maps to a write permission the ${label} column holds, so it must render. A missing ` +
      `one means the frontend mirror is stricter than RolePermissions and the role cannot do work the ` +
      `server would allow`,
  ).toEqual([]);
});

Then('no control the {string} column withholds should be offered', async ({ world }, role) => {
  const { withheldControls, label } = columnFor(role);
  const forbidden = new Set(withheldControls.map((c) => `${c.record}|${c.tab}|${c.control}`));
  const leaked = (world.roleColumnVerdicts ?? []).filter(
    (v) => forbidden.has(`${v.record}|${v.tab}|${v.control}`) && v.visible,
  );
  expect(
    leaked,
    `every one of these is "-" for the ${label} column. Each was confirmed visible for a role that DOES ` +
      `hold it, so a hit here is a real leak rather than a renamed button`,
  ).toEqual([]);
});

/**
 * The pairing for a withheld-control sweep: everything the sweep looked for renders for a caller that
 * holds it. Without this, a clean sweep also describes a record page that never loaded its tabs.
 */
Then('an administrator should be offered every control swept', async ({ world }) => {
  const missing = (world.roleColumnVerdicts ?? []).filter((v) => !v.visible);
  expect(
    missing,
    'every control swept must exist for an administrator — otherwise the withheld assertion above ' +
      'proves nothing about the column, only that the tabs did not render',
  ).toEqual([]);
});

/**
 * The inverse contrast, for the widest column.
 *
 * `DSM`/`RSM` are offered every write control, so there is no withheld set and an administrator contrast
 * proves nothing — both hold everything. What carries the evidence is that the same controls are HIDDEN
 * for a narrow enabled role on the identical pages.
 */
When('I sweep the same controls as a narrow role', async ({ roleSession, recordTabs, world }) => {
  await roleSession.signInAs([NARROW_CONTRAST_ROLE], []);
  world.roleColumnNarrowVerdicts = await collectControlVerdicts(
    recordTabs,
    async (path) => {
      await roleSession.visit(path);
      await roleSession.waitForRouteDecision();
    },
    columnFor(SCALING_MANAGER_ROLES[0]).offeredControls,
    { scalerPath: `/scalers/view/${scalerLicenceNo}`, sitePath: `/scale-sites/view/${scaleSiteIdNmbr}` },
  );
});

Then('a narrow role should be offered none of them', async ({ world }) => {
  const leaked = (world.roleColumnNarrowVerdicts ?? []).filter((v) => v.visible);
  expect(
    leaked,
    `${NARROW_CONTRAST_ROLE} holds no write permission at all, so none of these may render for it. A hit ` +
      `here means the control is ungated rather than granted — which would make the scaling manager's ` +
      `"offered" assertion vacuous`,
  ).toEqual([]);
});

// =============================================================================== API

/**
 * The equality claim for `DSM`/`RSM`, asserted over HTTP.
 *
 * `RolePermissions` maps both to `scalingManagerColumn()` verbatim; §3 separates them only by `(dist)`
 * against `(rgn)`, which is org-unit breadth and unenforced. So they must answer identically today. When
 * reg/dist scoping lands they will not, and this is the assertion that says so.
 */
Then('both scaling manager roles should agree on {string} {string}', async ({ apiAs }, method, path) => {
  const statuses: Record<string, number> = {};
  for (const role of SCALING_MANAGER_ROLES) {
    const probe = await apiAs([role], []);
    statuses[role] = await probe.status(method, path);
  }
  const distinct = [...new Set(Object.values(statuses))];
  expect(
    distinct,
    `DSM and RSM share scalingManagerColumn() verbatim, so they must answer identically. Measured: ` +
      `${JSON.stringify(statuses)}. A split means the shared list has been separated, or reg/dist ` +
      `scoping has been wired and these suites need re-deriving`,
  ).toHaveLength(1);
});

/**
 * The licence-cancel probe, WITH its body. See `licenceCancelBody` for why a bodyless version is vacuous.
 */
When('I patch the licence-cancelled date as the {string} role', async ({ apiAs, world }, role) => {
  const probe = await apiAs([role], []);
  world.apiStatus = await probe.status('PATCH', licenceCancelPath, licenceCancelBody);
});

When('I patch the licence-cancelled date as a caller with no roles', async ({ apiAs, world }) => {
  const probe = await apiAs([], []);
  world.baselineApiStatus = await probe.status('PATCH', licenceCancelPath, licenceCancelBody);
});

Then('the licence-cancel call should be refused with 403', async ({ world }) => {
  expect(
    world.apiStatus,
    'this column does not hold SCALER_LICENCE_CANCEL, so the call must be refused by authorization. A ' +
      '415 here means the body stopped binding before authorization was consulted and the probe is ' +
      'vacuous — see licenceCancelBody',
  ).toBe(403);
});

/**
 * A write that must reach authorization without being able to mutate anything.
 *
 * The licence-cancel endpoint exists to change a scaler's cancelled date, so probing it against a real
 * anchor would cancel a licence every run. Aimed at a licence number no scaler holds: authorization runs
 * first (it is not record-scoped for an internal role), then the service fails to load the row. So a
 * non-403 proves the permission was granted, and nothing is written either way.
 */
Then('the call should pass authorization rather than be refused', async ({ world }) => {
  expect(
    world.apiStatus,
    'this column holds the permission, so authorization must let the call through to the handler. A 403 ' +
      'means the permission layer is stricter than RolePermissions',
  ).not.toBe(403);
});
