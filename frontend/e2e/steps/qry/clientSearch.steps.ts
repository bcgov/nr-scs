import { Given, When, Then, expect } from '../fixtures';

/**
 * Steps for UC-QRY-001 Search Clients (route /client). Read-only screen — every scenario just fills the
 * search form, submits, and asserts the results table / empty state / count. All selectors live in
 * pages/qry/ClientSearchPage; the generic `Then I should see the error {string}` is reused from
 * steps/common/assertions.steps.ts (not redefined here).
 */

Given('I am on the Client Search page', async ({ clientSearchPage }) => {
  await clientSearchPage.goto();
});

When('I search clients by {string} of {string}', async ({ clientSearchPage }, fieldLabel, value) => {
  await clientSearchPage.fill(fieldLabel, value);
  await clientSearchPage.clickSearch();
});

When('I submit the client search with all fields blank', async ({ page, clientSearchPage, world }) => {
  // Capture — deterministically — whether the all-blank submit dispatches GET /clients/search. Arm a
  // BOUNDED watch BEFORE the click so the dispatch is caught whether it fires inside the click round-trip
  // OR a beat later. (Accepted divergence: the app RUNS the query on a blank submit, so the downstream Then
  // expects the flag TRUE.) waitForRequest resolves the INSTANT the request fires and only waits the full
  // window when nothing fires; it is an event wait, not a fixed `waitForTimeout` sleep (which this suite
  // forbids). The flag has settled by the time the Then reads the spy counter as defence-in-depth.
  const dispatched = page
    .waitForRequest(
      (req) => req.method() === 'GET' && new URL(req.url()).pathname.endsWith('/clients/search'),
      { timeout: 3000 },
    )
    .then(() => true)
    .catch(() => false);
  await clientSearchPage.clickSearch();
  world.blankClientSearchDispatched = await dispatched;
});

When('I reset the client search', async ({ clientSearchPage }) => {
  await clientSearchPage.clickReset();
});

// A UI-triggered read (the search fires async after the click), so poll the results total web-first
// rather than single-shot — the row/count can land a beat after the click settles.
Then('the client results should list client {string}', async ({ clientSearchPage }, client) => {
  await expect(clientSearchPage.clientCell(client)).toBeVisible({ timeout: 15000 });
});

Then('the client results should show {int} records', async ({ clientSearchPage }, count) => {
  await expect(clientSearchPage.resultsTotal).toHaveText(`Result List: ${count} records`, { timeout: 15000 });
});

Then(
  'the client row for {string} shows last name {string}, first name {string} and city {string}',
  async ({ clientSearchPage }, client, lastName, firstName, city) => {
    await expect(clientSearchPage.clientCell(client)).toBeVisible({ timeout: 15000 });
    await expect(clientSearchPage.cell('lastName', lastName)).toBeVisible();
    await expect(clientSearchPage.cell('firstName', firstName)).toBeVisible();
    await expect(clientSearchPage.cell('city', city)).toBeVisible();
  },
);

Then('the client results table shows the expected columns', async ({ clientSearchPage }) => {
  // The 8 default-selected legacy result columns (slices.md:72-75 + the results field reference).
  for (const col of [
    'Client (Client / Loc)',
    'Company Name',
    'Last Name',
    'First Name',
    'City',
    'Business Phone #',
    'Cell Phone #',
    'Email Address',
  ]) {
    await expect(clientSearchPage.columnHeader(col)).toBeVisible();
  }
});

Then('the client search should show no results', async ({ clientSearchPage }) => {
  await expect(clientSearchPage.noResults).toBeVisible({ timeout: 15000 });
});

Then('a client search request should be sent', async ({ world, clientSearchCalls }) => {
  // Accepted intentional divergence: an all-blank submit RUNS the query (the legacy ERR-001 blank-guard is
  // deliberately not enforced — see defects.md Divergence #1). Assert on the dispatch flag the When captured
  // via a pre-armed bounded watch (deterministic — no reliance on assertion timing), with the spy counter as
  // defence-in-depth.
  expect(
    world.blankClientSearchDispatched,
    'an all-blank client search should dispatch a /clients/search request (blank-guard intentionally dropped)',
  ).toBe(true);
  // Polled, not read once: the flag comes from the page's `request` event, but the spy increments inside
  // its `page.route` handler, which can run a beat later. Under load (2026-10-01, 8 workers) a single read
  // landed in that gap and saw 0 while the page went on to show 1,550 records.
  await expect.poll(() => clientSearchCalls()).toBeGreaterThanOrEqual(1);
});

Then('the client results should be empty', async ({ clientSearchPage }) => {
  // After a reset (or a search that never ran), no "Result List" total is shown.
  await expect(clientSearchPage.resultsTotal).toHaveCount(0);
});
