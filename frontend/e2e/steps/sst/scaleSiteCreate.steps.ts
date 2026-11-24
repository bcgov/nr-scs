import { Given, When, Then, expect } from '../fixtures';
import {
  validOwner,
  validScaleSite,
  primaryMethodCode,
  secondaryMethodCode,
  absentOwner,
} from '../../fixtures/sst/scale-site-test-data';
import type { Dms } from '../../pages/sst/ScaleSiteCreatePage';

/**
 * UC-SST-004 (Create Scale Site). Two flavours:
 *  - POSITIVE (create.feature): the happy-path create (write leaves the browser -> API read-back) and the
 *    search-results entry point. Each created site is registered for DB teardown the moment its id is known.
 *  - NEGATIVE (validation.feature): the form's CLIENT-side validator blocks the write for required /
 *    duplicate-type / timber-brand / coordinate errors — proven via `createScaleSiteCalls() === 0` — while
 *    the unknown-owner case is a SERVER reject (HTTP 422). Error text is asserted with the shared common
 *    step `I should see the error "…"`. DOM lives in pages/sst/ScaleSiteCreatePage.
 */

// --- entry points ---------------------------------------------------------------------------------------

Given('I am on the Scale Site create form', async ({ scaleSiteCreatePage }) => {
  await scaleSiteCreatePage.goto();
});

Given('I have run a scale site search', async ({ scaleSiteSearchPage }) => {
  await scaleSiteSearchPage.goto();
  // Search by the pinned owner (deterministic 1 real row) so the results region — and its "Create Scale
  // Site" button (rendered only after a search resolves) — appear. The search is READ-ONLY and idempotent;
  // under heavy parallel load it can be slow or rate-limited (Bucket4j SEARCH), so retry it up to 3× until
  // the button renders rather than flaking on a single slow/throttled response.
  await scaleSiteSearchPage.clientInput.fill(validOwner.clientNumber);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await scaleSiteSearchPage.clickSearch();
    try {
      await expect(scaleSiteSearchPage.createScaleSiteButton).toBeVisible({ timeout: 15_000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
    }
  }
});

When('I click Create Scale Site in the results', async ({ scaleSiteSearchPage }) => {
  await scaleSiteSearchPage.createScaleSiteButton.click();
});

Then('the Scale Site create form is shown', async ({ scaleSiteCreatePage }) => {
  await expect(scaleSiteCreatePage.page).toHaveURL(/\/scale-sites\/create$/);
  await scaleSiteCreatePage.expectShown();
});

// --- happy path -----------------------------------------------------------------------------------------

When('I create a scale site with valid details', async ({ scaleSiteCreatePage, createdScaleSiteIds }) => {
  const id = await scaleSiteCreatePage.createValid();
  createdScaleSiteIds.push(id); // register for DB teardown the moment the id is known
});

Then('the scale site is created', async ({ scaleSiteCreatePage }) => {
  expect(scaleSiteCreatePage.lastCreatedId).toMatch(/^[A-Za-z0-9]{1,4}$/);
});

Then(
  'the created scale site reads back with its name, owner, and site types',
  async ({ scaleSiteCreatePage, request }) => {
    const id = scaleSiteCreatePage.lastCreatedId;
    // UI-triggered write: poll the read-back (bounded) rather than a single-shot GET.
    await expect
      .poll(async () => {
        const res = await request.get(`/api/scale-sites/${encodeURIComponent(id)}/summary`);
        return res.ok() ? await res.json() : null;
      })
      .toMatchObject({
        siteName: validScaleSite.siteName,
        ownerClientNumber: validOwner.clientNumber,
        ownerClientLocnCode: validOwner.loc,
      });

    const res = await request.get(`/api/scale-sites/${encodeURIComponent(id)}/summary`);
    const body = (await res.json()) as { siteTypes?: Array<{ priorityCode?: string; scaleMethodTypeCode?: string }> };
    const pairs = (body.siteTypes ?? []).map((t) => `${t.priorityCode}:${t.scaleMethodTypeCode}`);
    expect(pairs).toContain(`P:${primaryMethodCode}`);
    expect(pairs).toContain(`S:${secondaryMethodCode}`);
  },
);

// --- negative: client-side validation (no write leaves the browser) -------------------------------------

When('I submit the create form with all required fields blank', async ({ scaleSiteCreatePage }) => {
  // The form defaults Owner Loc to '00'; clear it so its "required" rule is exercised too. Everything
  // else starts blank, so a bare Save surfaces every required error.
  await scaleSiteCreatePage.ownerLoc.fill('');
  await scaleSiteCreatePage.clickSave();
});

When('I submit the create form with duplicate site types', async ({ scaleSiteCreatePage }) => {
  // Valid everywhere except the Secondary type repeats the Primary -> "Site type codes must be distinct."
  await scaleSiteCreatePage.fillValid({ secondaryType: primaryMethodCode });
  await scaleSiteCreatePage.clickSave();
});

When('I submit the create form with timber brand {string}', async ({ scaleSiteCreatePage }, brand) => {
  await scaleSiteCreatePage.fillValid({ timberBrand: brand });
  await scaleSiteCreatePage.clickSave();
});

// Coordinate variants for the S04 outline. Each keeps every other field valid so ONLY the coordinate rule
// fires; the write is still blocked client-side (asserted by the no-request step).
const COORDINATE_CASES: Record<string, { latitude?: Dms; longitude?: Dms }> = {
  'latitude degrees only': { latitude: { degrees: '40' } },
  'latitude degrees out of range': { latitude: { degrees: '95', minutes: '10', seconds: '10' } },
  'latitude minutes out of range': { latitude: { degrees: '48', minutes: '75', seconds: '10' } },
  'longitude degrees out of range': { longitude: { degrees: '200', minutes: '10', seconds: '10' } },
  'latitude without longitude': { latitude: { degrees: '48', minutes: '25', seconds: '30' } },
};

When('I submit the create form with {string}', async ({ scaleSiteCreatePage }, coordinateCase) => {
  const override = COORDINATE_CASES[coordinateCase];
  if (!override) {
    throw new Error(
      `Unknown coordinate case "${coordinateCase}" (expected one of ${Object.keys(COORDINATE_CASES).join(', ')}).`,
    );
  }
  await scaleSiteCreatePage.fillValid(override);
  await scaleSiteCreatePage.clickSave();
});

Then('no create-scale-site request should be sent', async ({ createScaleSiteCalls }) => {
  expect(createScaleSiteCalls()).toBe(0);
});

// --- negative: server reject (write leaves the browser, backend rejects) ---------------------------------

When('I submit the create form with an unknown owner client', async ({ scaleSiteCreatePage, world }) => {
  await scaleSiteCreatePage.fillValid({ ownerClient: absentOwner.clientNumber, ownerLoc: absentOwner.loc });
  world.expected = { createStatus: await scaleSiteCreatePage.saveAwaitingCreateResponse() };
});

Then('the create request is rejected with {string}', async ({ page, world }, message) => {
  expect((world.expected as { createStatus?: number }).createStatus).toBe(422);
  await expect(page.getByText(message).first()).toBeVisible();
});

Then('I remain on the Scale Site create form', async ({ scaleSiteCreatePage }) => {
  await expect(scaleSiteCreatePage.page).toHaveURL(/\/scale-sites\/create$/);
  await scaleSiteCreatePage.expectShown();
});
