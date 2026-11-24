import { Given, When, Then, expect } from '../fixtures';

import { collectControlVerdicts } from '../../pages/security/RecordTabsPage';
import {
  CHECK_SCALER_ROLE,
  SYS_ADMIN_ROLE,
  WELCOME_ONLY_ROLE,
  clientNumber,
  expectedAdministrationLeaves,
  expectedCreateLeaves,
  expectedNavGroups,
  expectedQueriesLeaves,
  expectedReportsLeaves,
  hiddenAdministrationGroup,
  hiddenCreateLeaves,
  hiddenQueriesLeaves,
  inspectionId,
  markSiteDesignationId,
  offeredWriteControls,
  readableScaleSiteTabs,
  readableScalerTabs,
  scaleSiteIdNmbr,
  scalerLicenceNo,
  withheldWriteControls,
  buildWriteProbeBody,
} from '../../fixtures/security/check-scaler-test-data';

/**
 * All levels for `SCS_CHECK_SCALER`, plus its (inert) org-unit axis.
 *
 * **Why a separate file rather than parameterising the industry-scaler steps.** Same reason the owner
 * suite has its own: every step there that touches data imports *that* role's anchors, so reusing those
 * phrases would assert another role's values while still going green on the generic ones. The
 * role-agnostic steps ARE reused untouched — `I browse directly to {string}`, `I should stay on {string}`,
 * `I should be refused with the unauthorized page`,
 * `the API should allow it / refuse it / refuse it with 403`, and
 * `the same call should succeed for a system administrator`.
 *
 * The generic `the {string} menu should be offered` / `not be offered` pair is deliberately NOT reused:
 * every menu assertion for this role is a whole-list comparison (`the Queries menu should offer exactly
 * the check scaler screens`), because this is the first column where the interesting claim is which
 * leaves are inside a group the role *can* open, not whether the group renders at all.
 *
 * **What is structurally new here.** This is the first role with write permissions, so a third assertion
 * shape joins allow-and-deny: *proving a write passed authorization*. It cannot be done with a status
 * code alone, because binding and bean validation run before `@RequiresPermission` and answer the same
 * status for every caller. Every allow-side write assertion below therefore compares the Check Scaler
 * against `WELCOME_ONLY_ROLE` on the identical call — see `theSameCallIsRefusedForAWelcomeOnlyRole`.
 *
 * Visibility, not presence, throughout: Carbon mounts modal contents into the DOM while hidden, so a
 * presence check reports write controls this role is correctly never shown.
 */

// =============================================================================== identity

Given('I am signed in as a check scaler', async ({ roleSession }) => {
  // No client numbers, and that is the complete identity: the role is internal, so it is deliberately
  // absent from Roles.CLIENT_SCOPED_ROLES and expandAuthorities grants its column with no client at all.
  await roleSession.signInAs([CHECK_SCALER_ROLE], []);
});

// =============================================================================== GUI — navigation

When('I open the side navigation as a check scaler', async ({ roleSession }) => {
  await roleSession.visit('/welcome');
  await roleSession.waitForRouteDecision();
});

/**
 * Asserted positively, because "all four groups render" is the headline difference an internal writing
 * role makes: for `IND` and `OWN` three of these four disappear entirely.
 */
Then('every top-level menu should be offered', async ({ roleSession }) => {
  for (const group of expectedNavGroups) {
    await expect(
      roleSession.navGroup(group),
      `"${group}" must render — the CHK column grants at least one screen under it`,
    ).toBeVisible();
  }
});

Then('the Queries menu should offer exactly the check scaler screens', async ({ roleSession }) => {
  await roleSession.openNavGroup('Queries');
  for (const link of expectedQueriesLeaves) {
    await expect(
      roleSession.navLink(link),
      `Queries should offer "${link}" — §3 grants it to CHK unscoped (no "(ltd)" on an internal column)`,
    ).toBeVisible();
  }
  for (const link of hiddenQueriesLeaves) {
    await expect(
      roleSession.navLink(link),
      `Queries must NOT offer "${link}" — it is "-" for CHK. (This list is empty since dbf826c: the ` +
        `column now reaches every Queries leaf an administrator does.)`,
    ).toBeHidden();
  }
});

/**
 * The Create group is the sharpest statement of what this role is: it creates the three things it
 * records, and none of the four entities §C/§D/§E withhold from it.
 */
Then('the Create menu should offer only what the role records', async ({ roleSession }) => {
  await roleSession.openNavGroup('Create');
  for (const link of expectedCreateLeaves) {
    await expect(
      roleSession.navLink(link),
      `Create should offer "${link}" — §I gives CHK Check Scale CR and §F gives it MSD CR`,
    ).toBeVisible();
  }
  for (const link of hiddenCreateLeaves) {
    await expect(
      roleSession.navLink(link),
      `Create must NOT offer "${link}" — §C/§D "– Create" and §E's authorization-create rows are all "-"`,
    ).toBeHidden();
  }
});

Then('the Reports menu should offer every report screen', async ({ roleSession }) => {
  await roleSession.openNavGroup('Reports');
  for (const link of expectedReportsLeaves) {
    await expect(
      roleSession.navLink(link),
      `Reports should offer "${link}" — §4 gives CHK "View reports" and all eight ride on the single ` +
        `menu-level REPORT_READ (the matrix has no per-report rows)`,
    ).toBeVisible();
  }
});

/**
 * `Maintenance` is a nested nav GROUP inside Administration, and `filterNavigation` drops a group whose
 * children are all filtered out. Every §J row is `-` for CHK, so asserting the group is gone is both
 * stronger and more legible than checking nine links one by one.
 */
Then('the Administration menu should offer the Work Bench but no maintenance', async ({ roleSession }) => {
  await roleSession.openNavGroup('Administration');
  for (const link of expectedAdministrationLeaves) {
    await expect(
      roleSession.navLink(link),
      `Administration should offer "${link}" — §A gives CHK Work Bench CRU (ltd)`,
    ).toBeVisible();
  }
  await expect(
    roleSession.navGroup(hiddenAdministrationGroup),
    `the "${hiddenAdministrationGroup}" sub-group must not render at all — every §J row is "-" for CHK, ` +
      `so filterNavigation should drop the whole group, not render it empty`,
  ).toBeHidden();
});

Then('the Administration menu should offer maintenance', async ({ roleSession }) => {
  await roleSession.openNavGroup('Administration');
  await expect(
    roleSession.navGroup(hiddenAdministrationGroup),
    `"${hiddenAdministrationGroup}" must render for an administrator — otherwise the check scaler's ` +
      `deny assertion for it passes vacuously`,
  ).toBeVisible();
});

// =============================================================================== GUI — records

When('I open the scaler record', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${scalerLicenceNo}`);
  await roleSession.waitForRouteDecision();
});

When('I open the scale site record', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${scaleSiteIdNmbr}`);
  await roleSession.waitForRouteDecision();
});

Then('the scaler record should offer every tab the column reads', async ({ roleSession }) => {
  for (const tab of readableScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `the "${tab}" tab is readable for CHK in §3.C and must render`,
    ).toBeVisible({ timeout: 30_000 });
  }
});

Then('the scale site record should offer every tab the column reads', async ({ roleSession }) => {
  for (const tab of readableScaleSiteTabs) {
    await expect(
      roleSession.tab(tab),
      `the "${tab}" tab is readable for CHK in §3.D and must render`,
    ).toBeVisible({ timeout: 30_000 });
  }
});

// The Risk Rating tab needs no step of its own any more: it is readable for this column since
// `dbf826c` and is covered by the two tab-list assertions. Its former deny step and administrator
// contrast were removed with the expectation they encoded.

// --- in-page write controls, the part that distinguishes a writing role -------------------------
//
// The tab-strip driver and the sweep live in `pages/security/RecordTabsPage.ts`, shared with the read-only
// internal suite. Two private copies of the settle wait is how one gets fixed and the other keeps the
// bug — and this wait fails in the dangerous direction, so it is the last thing that should be duplicated.

When('I open each tab that carries a write control', async ({ roleSession, recordTabs, world }) => {
  world.chkControlVerdicts = await collectControlVerdicts(
    recordTabs,
    async (path) => {
      await roleSession.visit(path);
      await roleSession.waitForRouteDecision();
    },
    offeredWriteControls,
    { scalerPath: `/scalers/view/${scalerLicenceNo}`, sitePath: `/scale-sites/view/${scaleSiteIdNmbr}` },
  );
});

Then('every control the column grants should be offered', async ({ world }) => {
  const missing = (world.chkControlVerdicts ?? []).filter((v) => !v.visible);
  expect(
    missing,
    'each of these controls maps to a write permission the CHK column grants, so it must render on its ' +
      'tab. A missing one means the frontend permission mirror is stricter than the matrix — the role ' +
      'would be unable to do work the server would allow',
  ).toEqual([]);
});

When(
  'I open each tab that carries a withheld write control',
  async ({ roleSession, recordTabs, world }) => {
    world.chkControlVerdicts = await collectControlVerdicts(
      recordTabs,
      async (path) => {
        await roleSession.visit(path);
        await roleSession.waitForRouteDecision();
      },
      withheldWriteControls,
      { scalerPath: `/scalers/view/${scalerLicenceNo}`, sitePath: `/scale-sites/view/${scaleSiteIdNmbr}` },
    );
  },
);

Then('no control the column withholds should be offered', async ({ world }) => {
  const leaked = (world.chkControlVerdicts ?? []).filter((v) => v.visible);
  expect(
    leaked,
    'every one of these is "-" in the CHK column and was confirmed VISIBLE for an administrator on the ' +
      'same tab, so a hit here is a real leak rather than a renamed button. "Save Record" on Performance ' +
      'Remarks is the subtle one: it is the licence suspend/cancel control, gated on ' +
      'SCALER_LICENCE_CANCEL, which §4 gives to the district and regional managers',
  ).toEqual([]);
});

Then('an administrator should be offered all of them', async ({ world }) => {
  const missing = (world.chkControlVerdicts ?? []).filter((v) => !v.visible);
  expect(
    missing,
    'the contrast half: each control the check scaler must not see has to exist for a role that DOES ' +
      'hold the permission. Anything listed here means the paired deny assertion proves nothing',
  ).toEqual([]);
});

// =============================================================================== API level

When('I call {string} {string} as a check scaler', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([CHECK_SCALER_ROLE], []);
  world.apiStatus = await probe.status(method, path);
});

When('I call {string} {string} as a welcome-only role', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([WELCOME_ONLY_ROLE], []);
  world.baselineApiStatus = await probe.status(method, path);
});

When(
  'I call {string} {string} with a bindable body as a check scaler',
  async ({ apiAs, world }, method, path) => {
    const probe = await apiAs([CHECK_SCALER_ROLE], []);
    world.apiStatus = await probe.status(method, path, buildWriteProbeBody(method, path));
  },
);

When(
  'I call {string} {string} with a bindable body as a welcome-only role',
  async ({ apiAs, world }, method, path) => {
    const probe = await apiAs([WELCOME_ONLY_ROLE], []);
    world.baselineApiStatus = await probe.status(method, path, buildWriteProbeBody(method, path));
  },
);

/**
 * Deliberately NOT phrased "with a bindable body as a system administrator" — that step already exists in
 * `apiAccess.steps.ts` and resolves its body from the INDUSTRY-SCALER table, which has no entry for any
 * of this role's endpoints. Reusing the phrase would either throw on a missing body or, worse, silently
 * probe a different endpoint's body. Two suites, two body tables, two distinct phrases.
 */
When(
  'I call {string} {string} with a check-scaler probe body as a system administrator',
  async ({ apiAs, world }, method, path) => {
    const probe = await apiAs([SYS_ADMIN_ROLE], []);
    world.baselineApiStatus = await probe.status(method, path, buildWriteProbeBody(method, path));
  },
);

/**
 * THE ALLOW-SIDE ASSERTION, and the one this suite could not have borrowed from the two read-only
 * suites before it.
 *
 * A 2xx/4xx for the Check Scaler proves nothing on its own — binding and bean validation run before
 * `@RequiresPermission`, so the same status arrives whether authorization passed or was never reached.
 * What carries the evidence is the DIFFERENCE: the identical call, with the identical body, is refused
 * with 403 for a welcome-only role. That can only happen if the permission layer read the permission and
 * distinguished the two callers.
 *
 * Deliberately not asserting a specific status for the check scaler. The point is "not refused by
 * authorization"; pinning 400 here would couple the security assertion to whichever service-side rule
 * the probe body happens to trip, and those are business rules, free to change.
 */
Then('the API should not refuse it on authorization', async ({ world }) => {
  expect(
    world.apiStatus,
    'the CHK column grants this write, so authorization must let the call through to the handler. A 403 ' +
      'here means the permission layer is stricter than roles-permissions.md §3',
  ).not.toBe(403);
});

Then('the same call should be refused for a welcome-only role', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'the other half of the allow proof. A welcome-only role holds nothing, so the identical call must be ' +
      'refused with 403 — if it is not, the check scaler\'s non-403 above says nothing about its ' +
      'permission, because authorization was never consulted for either caller',
  ).toBe(403);
});

/**
 * The deny-side contrast for a write. Asserted as "not 403" rather than "200" because these probe bodies
 * deliberately violate a service-side rule, so an administrator gets 400/404/422 — and that is itself the
 * proof method security let them through and the handler ran.
 */
Then('the same write should pass authorization for a system administrator', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'the administrator must reach the service (400/404/422 from the business rule the probe body ' +
      'violates), not be refused. A 403 here would mean the check scaler\'s 403 is a blanket refusal, an ' +
      'unmapped route, or a body the server rejects for everyone — not a role decision',
  ).not.toBe(403);
});

/**
 * The letter probe. Both endpoints are GETs with no body, so both reach authorization unaided, which
 * makes the result a pure permission read.
 *
 * THIS USED TO BE A PAIR WITH OPPOSITE HALVES, and the only direct test of judgement call (3): the
 * designation letter passed (404 — authorization let it through, the record has no letter) while
 * `/scaler-authorizations/{id}/letter` was refused 403, because `RolePermissions.checkScaler()` granted
 * `MSD_LETTER` and withheld `SCALER_AUTHORIZATION_LETTER` on an "owns the workflow end to end" test.
 *
 * The client's 2026-09-02 spec names this role among the four holding **all** letters, so both halves
 * now pass and the contrast moved: it is the WELCOME-ONLY baseline below that supplies the 403. Without
 * that baseline a 404 says nothing, because a broken route would answer the same way.
 */
When('I request the designation letter as a check scaler', async ({ apiAs, world }) => {
  const probe = await apiAs([CHECK_SCALER_ROLE], []);
  world.apiStatus = await probe.status(
    'GET',
    `/api/mark-site-designations/${markSiteDesignationId}/letter`,
  );
});

When('I request the designation letter as a welcome-only role', async ({ apiAs, world }) => {
  const probe = await apiAs([WELCOME_ONLY_ROLE], []);
  world.baselineApiStatus = await probe.status(
    'GET',
    `/api/mark-site-designations/${markSiteDesignationId}/letter`,
  );
});

Then('the designation letter should pass authorization', async ({ world }) => {
  expect(
    world.apiStatus,
    'MSD_LETTER_VIEW is granted — the client\'s 2026-09-02 spec gives this column every letter — so ' +
      'this must not be refused. 404 is the expected pass: authorization let it through and the record ' +
      'simply has no letter on file',
  ).not.toBe(403);
});

// =============================================================================== org-unit axis

/**
 * The org-unit (district/region) dimension, asserted as INERT.
 *
 * `roles-permissions.md` marks the Work Bench cell `CRU (ltd)`, and §1 defines `(ltd)` here as district
 * scoping. Nothing enforces it: `UserAccessScope` carries an `orgUnits` field, but it is only ever
 * constructed empty, no code reads `security.org-unit-scoping.enabled`, and no `SCS_ORG_UNIT_*` group is
 * parsed anywhere. So the honest assertion today is that the seam is a no-op — this role sees every
 * district's rows, exactly as an administrator does.
 *
 * This is written as a real assertion rather than a skipped placeholder on purpose. It pins the CURRENT
 * contract, so whoever wires org-unit scoping gets a deliberate, legible failure here telling them the
 * suite's expectations need re-deriving — instead of silently shipping a narrowing nobody tested. See
 * `defects.md` SG-1 and CG-1.
 */
When('I search designations across every district as a check scaler', async ({ apiAs, world }) => {
  const probe = await apiAs([CHECK_SCALER_ROLE], []);
  const rows = await probe.json<{ orgUnitName?: string }[]>(
    '/api/mark-site-designations/search?timberMark=%25',
  );
  world.chkOrgUnitNames = [...new Set(rows.map((r) => String(r.orgUnitName)))];
});

When('an administrator runs the same search', async ({ apiAs, world }) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], []);
  const rows = await probe.json<{ orgUnitName?: string }[]>(
    '/api/mark-site-designations/search?timberMark=%25',
  );
  world.chkAdminOrgUnitNames = [...new Set(rows.map((r) => String(r.orgUnitName)))];
});

Then('the results should span more than one district', async ({ world }) => {
  expect(
    (world.chkOrgUnitNames ?? []).length,
    'with org-unit scoping unwired, an internal role must see every district. One district here would ' +
      'mean something IS narrowing the result — re-read defects.md SG-1 before assuming that is correct',
  ).toBeGreaterThan(1);
});

Then('the results should match an administrator exactly', async ({ world }) => {
  expect(
    [...(world.chkOrgUnitNames ?? [])].sort(),
    'the org-unit dimension is inert, so the check scaler and an administrator must see the same set of ' +
      'districts. A difference is the first sign the seam has been wired up',
  ).toEqual([...(world.chkAdminOrgUnitNames ?? [])].sort());
});

// =============================================================================== survival read-backs

/**
 * The one probe that could destroy a pinned anchor if authorization were broken, so the record is read
 * back rather than trusting the status. A refusal reported while the row was deleted anyway is the single
 * outcome a status assertion cannot see.
 */
Then('the site inspection should still exist', async ({ request }) => {
  const response = await request.get(`/api/scale-sites/inspection/${inspectionId}`);
  expect(
    response.status(),
    `inspection ${inspectionId} must survive the refused DELETE — §H has no delete row for ANY column, ` +
      `so nothing should have removed it. If this fails the seeded DB has lost a pinned anchor and ` +
      `needs reloading (e2e/README.md step 1)`,
  ).toBe(200);
});

Then('the client search should be unscoped', async ({ world }) => {
  expect(
    world.apiStatus,
    `§B gives CHK "Queries – Clients – Results" a plain R, not R (ltd) — an internal role has no forest ` +
      `client, so client ${clientNumber} must be searchable without one`,
  ).toBe(200);
});

// =============================================================================== delete denial

/**
 * The check-scale DELETE probes — the one write in §I that the column does NOT hold.
 *
 * `CHECK_SCALE_DELETE` / `SUMMARY_CHECK_SCALE_DELETE` are granted to NO column in `RolePermissions`; only
 * `ADM` reaches them, through `ALL_PERMISSIONS`. That makes this the sharpest cell in the matrix for this
 * role: the column authors check scales (§I `CR`/`RU`) and the view screen offers it an enabled Delete
 * button, so the refusal happens after the click, not before it. The GUI half of that pairing is asserted
 * in gui-access.feature (Delete is offered); this is the half that says what happens when it is used.
 *
 * The seeded target is disposable BECAUSE the probe cannot know the answer in advance: if authorization
 * does not refuse, the DELETE succeeds and the record is gone.
 */
When('I request deletion of a disposable {string} check scale as a check scaler', async ({ apiAs, seedDeletableCheckScale, world }, kind) => {
  const id = await seedDeletableCheckScale(kind as 'detail' | 'summary');
  world.probeCheckScaleId = id;
  world.probeCheckScaleKind = kind as 'detail' | 'summary';
  const probe = await apiAs([CHECK_SCALER_ROLE], []);
  const path = kind === 'detail' ? `/api/check-scales/${id}` : `/api/summary-check-scales/${id}`;
  world.apiStatus = await probe.status('DELETE', path);
});

/**
 * A refusal reported while the row was deleted anyway is the single outcome a status assertion cannot
 * see — the same reason the site-inspection probe above reads its record back.
 */
Then('that check scale should still exist', async ({ request, world }) => {
  const id = world.probeCheckScaleId;
  const response = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(response.ok(), `read-back of check scale ${id} failed: HTTP ${response.status()}`).toBeTruthy();
  expect(
    (await response.json()) as unknown[],
    `${world.probeCheckScaleKind} check scale ${id} must survive the refused DELETE — no role column ` +
      `holds CHECK_SCALE_DELETE / SUMMARY_CHECK_SCALE_DELETE, so nothing short of ADM should remove it`,
  ).toHaveLength(1);
});
