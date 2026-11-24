import { Given, When, Then, expect } from '../fixtures';

import { INDUSTRY_SCALER_ROLE } from '../../fixtures/security/industry-scaler-test-data';
import {
  SCALE_SITE_OWNER_ROLE,
  SYS_ADMIN_ROLE,
  apiAuthorizedScaleSiteId,
  apiBridgeSeedScaleSiteId,
  authorizedScaleSiteId,
  bridgeSeedScaleSiteId,
  bridgedScalerLicenceNo,
  expectedNavLinks,
  hiddenNavGroups,
  hiddenNavLinks,
  ownClientNumber,
  ownScaleSiteId,
  ownScalerLicenceNo,
  ownedScaleSiteIds,
  permissionProbeScalerLicenceNo,
  permissionProbeSeedScaleSiteId,
  otherClientNumber,
  otherScalerLicenceNo,
  otherSiteOwnerClientNumber,
  readableScaleSiteTabs,
  readableScalerTabs,
  unentitledScaleSiteId,
  withheldScaleSiteTab,
  withheldScalerTabs,
} from '../../fixtures/security/scale-site-owner-test-data';

/**
 * All three levels for `SCS_OWNER`, plus its client-scoping axis, in one file.
 *
 * **Why a separate file rather than parameterising the industry-scaler steps.** Every step there that
 * touches data imports *that* role's anchors — `the client filter should be locked to my own client`
 * asserts the value `00048273`. Reusing those phrases for this role would assert the wrong client while
 * still passing on the generic ones, which is the worst kind of green. So this file redefines any step
 * that reads fixture data, and the genuinely role-agnostic steps are reused untouched:
 * `I browse directly to {string}`, `I should stay on {string}`,
 * `I should be refused with the unauthorized page`, `the API should allow it / refuse it / refuse it with
 * 403`, `the same call should succeed for a system administrator`, `the {string} menu should be offered`,
 * `the {string} control should (not) be offered`, `I open the side navigation`, `I open the Scalers query
 * page`, `I search scalers with the locked filter`, `the record should load`, and
 * `I should be told I have no access to that record`.
 *
 * Visibility, not presence, is asserted throughout — Carbon mounts modal contents (Save Record, Confirm
 * Delete) into the DOM while hidden, so a presence check reports write controls this role is correctly
 * never shown. See the industry-scaler `defects.md` V1.
 */

// =============================================================================== GUI level

When('I open my own scale site record', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${ownScaleSiteId}`);
});

When('I open my own scale site record on the {string} tab', async ({ roleSession }, tab) => {
  await roleSession.visit(`/scale-sites/view/${ownScaleSiteId}?tab=${tab}`);
});

When('I open a scaler record of my own client', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${ownScalerLicenceNo}`);
});

Then('the Queries menu should offer exactly the scale site owner screens', async ({ roleSession }) => {
  await roleSession.openNavGroup('Queries');
  for (const link of expectedNavLinks) {
    await expect(
      roleSession.navLink(link),
      `Queries should offer "${link}" — roles-permissions.md §3 grants it to OWN`,
    ).toBeVisible();
  }
  for (const link of hiddenNavLinks) {
    await expect(
      roleSession.navLink(link),
      `Queries must NOT offer "${link}" — the OWN column is "-" for it. (Mark Site Designations is the ` +
        `one to watch: §3.D grants the MSD *tab* on a site record, §3.F withholds the standalone screen.)`,
    ).toBeHidden();
  }
});

Then('no restricted menu should be offered to a scale site owner', async ({ roleSession }) => {
  for (const group of hiddenNavGroups) {
    await expect(
      roleSession.navGroup(group),
      `the "${group}" menu must not render — every screen under it is "-" for OWN`,
    ).toBeHidden();
  }
});

Then('the scale site record should offer every readable tab', async ({ roleSession }) => {
  for (const tab of readableScaleSiteTabs) {
    await expect(
      roleSession.tab(tab),
      `the "${tab}" tab is "R (ltd)" for OWN in §3.D and must be readable`,
    ).toBeVisible();
  }
});

Then('the scale site record should not offer the Risk Rating tab', async ({ roleSession }) => {
  await expect(
    roleSession.tab(withheldScaleSiteTab),
    '"Scale Site Record – Risk Rating Criteria" is "-" for OWN (granted only to DSM/RSM/ADM as CR)',
  ).toBeHidden();
});

Then('the scale site record should offer the Risk Rating tab', async ({ roleSession }) => {
  await expect(roleSession.tab(withheldScaleSiteTab)).toBeVisible();
});

Then("the scaler record should offer only the owner's readable tabs", async ({ roleSession }) => {
  for (const tab of readableScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `the owner reads the scaler's "${tab}" tab — Summary from §3.C, Address and Exams / Upgrades from ` +
        `the §4-over-§3 decision recorded in RolePermissions.scaleSiteOwner()`,
    ).toBeVisible();
  }
});

Then('the scaler record should not offer the tabs withheld from an owner', async ({ roleSession }) => {
  for (const tab of withheldScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `the scaler's "${tab}" tab is withheld from OWN — §3 and §4 agree on this one`,
    ).toBeHidden();
  }
});

Then('the scaler record should offer the tabs withheld from an owner', async ({ roleSession }) => {
  for (const tab of withheldScalerTabs) {
    await expect(
      roleSession.tab(tab),
      `"${tab}" must exist for an administrator — otherwise the owner's deny assertion for the same tab ` +
        `passes vacuously`,
    ).toBeVisible();
  }
});

// --- the Contacts tab: the column-removal case ---

/**
 * `ContactsTab` renders the Primary and Additional sections as two tables sharing one `aria-label`, so
 * every assertion here counts rather than matching one element. Site `019V` has one contact of each kind,
 * which is why it is the anchor: it exercises both sections at once.
 */
Then("the contacts table should list my site's contacts", async ({ scaleSiteContactsTab }) => {
  await expect(
    scaleSiteContactsTab.contactNameLink('IB SMITH'),
    `site ${ownScaleSiteId} must still show its contacts — gating hides controls, never the data. An ` +
      `empty tab would make the row-action denial below pass for the wrong reason`,
  ).toBeVisible({ timeout: 30_000 });
  expect(
    await scaleSiteContactsTab.tables.count(),
    'both the Primary and Additional contact sections must render for this anchor — it has one contact ' +
      'of each kind. Exact, not >0: if the Additional section stopped rendering, the row-action denials ' +
      'below would pass without ever seeing the table that could carry a leaked Edit button',
  ).toBe(2);
});

Then('the contacts table should offer no row actions', async ({ scaleSiteContactsTab }) => {
  await expect(
    scaleSiteContactsTab.actionsColumnHeaders,
    'the Actions column must be dropped entirely for a read-only role — header included, not rendered ' +
      'as a headed column of empty cells',
  ).toHaveCount(0);
  await expect(scaleSiteContactsTab.editRowButtons).toHaveCount(0);
  await expect(scaleSiteContactsTab.deleteRowButtons).toHaveCount(0);
});

Then('the contacts table should offer row actions', async ({ scaleSiteContactsTab }) => {
  // Waits rather than asserting a snapshot count: the tab loads its contacts lazily.
  await expect(
    scaleSiteContactsTab.contactNameLink('IB SMITH'),
    'the contacts must load before the Actions column can be asserted',
  ).toBeVisible({ timeout: 30_000 });
  expect(
    await scaleSiteContactsTab.actionsColumnHeaders.count(),
    'the Actions column must exist for a role holding the contact write permissions — otherwise the ' +
      "owner's deny assertion proves nothing",
  ).toBeGreaterThan(0);
  expect(await scaleSiteContactsTab.editRowButtons.count()).toBeGreaterThan(0);
});

// =============================================================================== client scoping — GUI

/**
 * Navigation is role-aware (so `roleSession`, not the page object's `goto()`, which logs in as the default
 * administrator) but every SELECTOR is the existing `ScaleSiteSearchPage`'s. That object already scopes
 * the owner-client field to its own container, which is what keeps it unambiguous when the embedded
 * client-picker modal portals a second copy of the same id to `document.body`.
 */
When('I open the Scale Sites query page', async ({ roleSession, scaleSiteSearchPage }) => {
  await roleSession.visit('/scale-sites');
  await expect(scaleSiteSearchPage.siteIdInput).toBeVisible({ timeout: 30_000 });
});

Then('the owner client filter should be locked to my own client', async ({ scaleSiteSearchPage }) => {
  await expect(scaleSiteSearchPage.clientInput).toHaveValue(ownClientNumber);
  await expect(
    scaleSiteSearchPage.clientInput,
    'a client-restricted owner must not be able to widen the search beyond their own client',
  ).not.toBeEditable();
});

Then('the owner client filter should be free to edit', async ({ scaleSiteSearchPage }) => {
  await expect(scaleSiteSearchPage.clientInput).toBeEditable();
});

When('I search my own scale sites', async ({ roleSession, scaleSiteSearchPage }) => {
  await roleSession.visit('/scale-sites');
  await expect(scaleSiteSearchPage.siteIdInput).toBeVisible({ timeout: 30_000 });
  await scaleSiteSearchPage.clickSearch();
});

When('I search all scale sites as an administrator', async ({ roleSession, scaleSiteSearchPage }) => {
  await roleSession.visit('/scale-sites');
  await expect(scaleSiteSearchPage.siteIdInput).toBeVisible({ timeout: 30_000 });
  await scaleSiteSearchPage.clickSearch();
});

/**
 * Exact, not a containment check: the request carried no owner filter, so every row present is one the
 * service bound on the caller's behalf. A site owned by another client appearing here would be the leak.
 */
Then('only my own scale sites should be listed', async ({ scaleSiteSearchPage }) => {
  for (const id of ownedScaleSiteIds) {
    await expect(
      scaleSiteSearchPage.scaleSiteLink(id),
      `site ${id} is owned by ${ownClientNumber} and must be listed`,
    ).toBeVisible({ timeout: 30_000 });
  }
  await expect(
    scaleSiteSearchPage.scaleSiteLink(unentitledScaleSiteId),
    `site ${unentitledScaleSiteId} is owned by another client and must never appear`,
  ).toBeHidden();
});

/**
 * The ALWAYS-SEEDED anchor, for the role-gating suites (`gui-access`, `api-access`), which need a scaler
 * the owner can simply read. Deliberately a different scaler from the bridge anchor: those scenarios
 * assert theirs is refused before seeding it, so a seed from here landing inside that window would make
 * the refusal flap under `fullyParallel` (`defects.md` V2).
 *
 * It also keeps those suites' *refusal* rows honest. `ClientScopeInterceptor` runs before method
 * security, so probing an unreadable scaler would answer 403 on scope and the row would stop proving
 * anything about the permission it names.
 */
Given('a scaler is authorized to scale at a site I own', async ({ seedOwnerScalerBridge, world }) => {
  world.entitlementAuthId =
    await seedOwnerScalerBridge(permissionProbeScalerLicenceNo, permissionProbeSeedScaleSiteId);
});

When('I open the readable scaler record', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${permissionProbeScalerLicenceNo}`);
});

Then('the scaler client filter should be locked to my client', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.clientInput).toHaveValue(ownClientNumber);
  await expect(
    scalerSearchPage.clientInput,
    'a client-restricted owner must not be able to widen the scaler search either — legacy rendered this',
  ).not.toBeEditable();
});

/**
 * Deliberately WIDER than what the role can open: this lists the scalers filed under the caller's client,
 * and `ClientScopeGuard` refuses any of them not authorized at a site that client owns. The paired
 * refusal scenarios assert the other side of exactly that. Accepted, not a defect — see the file header.
 */
Then("only my own client's scaler should be listed", async ({ scalerSearchPage }) => {
  await expect(
    scalerSearchPage.licenceLink(ownScalerLicenceNo),
    `scaler ${ownScalerLicenceNo} is filed under ${ownClientNumber}, so the locked filter must list it — `
      + 'whether or not its record can then be opened',
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    scalerSearchPage.licenceLink(otherScalerLicenceNo),
    `scaler ${otherScalerLicenceNo} belongs to client ${otherClientNumber} and must never appear`,
  ).toBeHidden();
});

// =============================================================================== client scoping — URL

/**
 * The URL-level and API-level seeds deliberately target DIFFERENT sites. Two scenarios seeding the same
 * site overlap under `fullyParallel` — one's seed is live inside the other's "refused before seeding"
 * window — so the refusal half fails intermittently. Asserting both directions inside one scenario fixes
 * the race within a scenario, not between two of them; a separate anchor each is what actually fixes it.
 */
Given("my own scaler has been authorized to scale at another company's site", async ({ seedOwnerSiteEntitlement, world }) => {
  world.entitlementAuthId = await seedOwnerSiteEntitlement(authorizedScaleSiteId);
});

Given('my own scaler has been authorized at the site I query by API', async ({ seedOwnerSiteEntitlement, world }) => {
  world.entitlementAuthId = await seedOwnerSiteEntitlement(apiAuthorizedScaleSiteId);
});

When('I browse directly to my own scale site record', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${ownScaleSiteId}`);
});

When('I browse directly to a scale site owned by another client', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${unentitledScaleSiteId}`);
});

When('I browse directly to a scaler record of my own client', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${ownScalerLicenceNo}`);
});

When('I browse directly to a scaler of another client', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${otherScalerLicenceNo}`);
});

When('I browse directly to the site I am authorized at', async ({ roleSession }) => {
  await roleSession.visit(`/scale-sites/view/${authorizedScaleSiteId}`);
});

// --------------------------------------------------------- the scaler bridge (§4's first bullet)

Given("another client's scaler has been authorized to scale at a site I own", async ({ seedOwnerScalerBridge, world }) => {
  world.entitlementAuthId = await seedOwnerScalerBridge(bridgedScalerLicenceNo, bridgeSeedScaleSiteId);
});

Given("another client's scaler has been authorized at a site I own for the API query", async ({ seedOwnerScalerBridge, world }) => {
  world.entitlementAuthId = await seedOwnerScalerBridge(bridgedScalerLicenceNo, apiBridgeSeedScaleSiteId);
});

When('I browse directly to the scaler authorized at my site', async ({ roleSession }) => {
  await roleSession.visit(`/scalers/view/${bridgedScalerLicenceNo}`);
});

// =============================================================================== API level

When('I call {string} {string} as a scale site owner', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status(method, path);
});

When('I call {string} {string} as a scale site owner with no forest client', async ({ apiAs, world }, method, path) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], []);
  world.apiStatus = await probe.status(method, path);
});

/**
 * The write contrast. A mutating call must be REFUSED for the owner and must REACH THE HANDLER for an
 * administrator — asserted as "not 403" rather than "200", because these probes deliberately name
 * nonexistent child ids so nothing is destroyed if authorization were broken. An administrator therefore
 * gets 404 (or 400), which is itself the proof that method security let them through and the handler ran.
 */
Then('the same call should not be refused for a system administrator', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'the administrator must reach the handler (404/400 for a nonexistent id), not be refused — ' +
      "otherwise the owner's 403 says nothing about the role",
  ).not.toBe(403);
});

Then('the scaler of my own client should still exist', async ({ request }) => {
  const response = await request.get(`/api/scalers/${ownScalerLicenceNo}`);
  expect(
    response.status(),
    `scaler ${ownScalerLicenceNo} must survive the refused DELETE — if this fails the seeded DB has lost ` +
      `a pinned anchor and needs reloading (e2e/README.md step 1)`,
  ).toBe(200);
});

When('I request my own scale site from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scale-sites/${ownScaleSiteId}/tombstone`);
});

When('I request a scale site owned by another client from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scale-sites/${unentitledScaleSiteId}/tombstone`);
});

When('I request a scaler of my own client from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scalers/${ownScalerLicenceNo}`);
});

When('I request a scaler of another client from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scalers/${otherScalerLicenceNo}`);
});

When('I request the site I am authorized at from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status(
    'GET',
    `/api/scale-sites/${apiAuthorizedScaleSiteId}/tombstone`,
  );
});

/**
 * The same site, the same live authorization, the same forest client — only the role differs. It proves
 * two things at once that the owner's 403 alone cannot: that site scope really is resolved per role, and
 * that the seeded authorization is genuinely in force (so the refusal is not a mis-seeded row).
 */
When('I request that same site as an industry scaler of my own client', async ({ apiAs, world }) => {
  const probe = await apiAs([INDUSTRY_SCALER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status(
    'GET',
    `/api/scale-sites/${apiAuthorizedScaleSiteId}/tombstone`,
  );
});

/**
 * The scaler DETAIL read specifically. It carries a second, service-level guard of its own
 * (`ScalerService.getScaler`), and when the bridge was first added that guard still compared employers
 * only — so the interceptor admitted the request and the service refused it, leaving §4's grant dead.
 * The tab endpoints below had no such guard and passed, which is exactly why nothing caught it.
 */
When('I request the scaler authorized at my site from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scalers/${bridgedScalerLicenceNo}`);
});

/** The two tabs §4 names — "addresses, exam and upgrade history" — on the bridged scaler. */
When("I request that scaler's address and exam history from the API", async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scalers/${bridgedScalerLicenceNo}/address`);
  world.baselineApiStatus = await probe.status('GET', `/api/scalers/${bridgedScalerLicenceNo}/exams`);
});

Then('the API should allow both of them', async ({ world }) => {
  expect(world.apiStatus, 'the bridged scaler\'s address must be readable — §4 names it').toBe(200);
  expect(
    world.baselineApiStatus,
    'the bridged scaler\'s exam / upgrade history must be readable — §4 names it too',
  ).toBe(200);
});

/**
 * THE SERVER-SIDE OVERRIDE, which the status code cannot show.
 *
 * `ScaleSiteService.searchScaleSites` discards whatever owner client the request names and binds the
 * caller's own ("override if user messed with the form", legacy `ScaleSiteSearchAction`). Every other
 * scoping assertion in this suite sends the owner's *own* client, so all of them would still pass if that
 * override were deleted — the rows are the only evidence. So: ask for a different client's sites and
 * assert the ones that come back are mine.
 */
When("I search the API for another client's scale sites", async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.scopedSiteIds = (
    await probe.json<{ scaleSiteIdNmbr?: string }[]>(
      `/api/scale-sites/search?ownerClientNumber=${otherSiteOwnerClientNumber}`,
    )
  ).map((row) => String(row.scaleSiteIdNmbr));
});

Then('the API should return only my own scale sites', async ({ world }) => {
  const returned = world.scopedSiteIds ?? [];
  expect(
    returned.length,
    'the search must still return rows — an empty result would satisfy the "no foreign sites" check ' +
      'below for the wrong reason',
  ).toBeGreaterThan(0);
  expect(
    [...returned].sort(),
    `the request asked for client ${otherSiteOwnerClientNumber}'s sites; the server must have discarded ` +
      `that and bound ${ownClientNumber}. Foreign rows here mean the override is gone`,
  ).toEqual([...ownedScaleSiteIds].sort());
});

/** The scaler equivalent: `ScalerService.searchScalers` performs the same override. */
When("I search the API for another client's scalers", async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.scopedScalerLicences = (
    await probe.json<{ scalerLicenceNo?: string }[]>(
      `/api/scalers/search?clientNumber=${otherClientNumber}`,
    )
  ).map((row) => String(row.scalerLicenceNo));
});

Then("the API should return only my own client's scalers", async ({ world }) => {
  const returned = world.scopedScalerLicences ?? [];
  expect(returned.length, 'the search must still return a row').toBeGreaterThan(0);
  expect(
    returned,
    `the request asked for client ${otherClientNumber}'s scalers and must have been rebound to `
      + `${ownClientNumber}; scaler ${otherScalerLicenceNo} appearing here means the override is gone`,
  ).not.toContain(otherScalerLicenceNo);
  expect(returned).toEqual([ownScalerLicenceNo]);
});

/**
 * 403-before-404: the interceptor resolves the record before the handler runs, so a scoped caller asking
 * for an id that does not exist is refused rather than told it is missing. Deliberate — it removes an
 * existence oracle over the whole site keyspace.
 */
const NONEXISTENT_SCALE_SITE_ID = 'ZZZZ';

When('I request a scale site that does not exist from the API', async ({ apiAs, world }) => {
  const probe = await apiAs([SCALE_SITE_OWNER_ROLE], [ownClientNumber]);
  world.apiStatus = await probe.status('GET', `/api/scale-sites/${NONEXISTENT_SCALE_SITE_ID}/tombstone`);
});

When('I request a scale site that does not exist as a system administrator', async ({ apiAs, world }) => {
  const probe = await apiAs([SYS_ADMIN_ROLE], []);
  world.baselineApiStatus = await probe.status(
    'GET',
    `/api/scale-sites/${NONEXISTENT_SCALE_SITE_ID}/tombstone`,
  );
});

Then('the API should report it as not found for a system administrator', async ({ world }) => {
  expect(
    world.baselineApiStatus,
    'an internal user still gets 404 — that contrast is what shows the owner\'s 403 is the scope guard ' +
      'collapsing missing-vs-forbidden, not the endpoint being broken',
  ).toBe(404);
});
