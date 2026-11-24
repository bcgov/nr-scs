import { Given, When, Then, expect } from '../fixtures';
import { daysAgo } from '../../fixtures/common/dates';
import {
  letterMarkSiteDesignationId,
  absentAuthorizationId,
  updatedGeographicLocation,
  updatedEstVolume,
  pickScaleSite,
} from '../../fixtures/msd/msd-test-data';

/**
 * MSD-domain steps for the Mark Site Designation EDIT screen (UC-MSD-002). DOM lives in the page object;
 * these read as reusable domain language. Negatives PROVE no write (update-spy === 0) or read back the
 * persisted record via the API (bounded poll — the Save is UI-triggered/async). Update scenarios seed a
 * fresh record through the API (self-cleaning) rather than mutating a shared row.
 *
 * Save/Reset phrasing here is edit-specific ("save my changes" / "reset the form") to stay distinct from
 * the create steps' "I click Save Record" — playwright-bdd binds one definition per phrase.
 */

// --- Seed / navigate ------------------------------------------------------------------------------

Given('a mark site designation exists', async ({ seedMarkSiteDesignation, world }) => {
  world.msdId = await seedMarkSiteDesignation('Y');
});

// District Wide=N seed carrying a per-worker scale site (distinct by parallelIndex so concurrent runs
// never collide on the hauling_mark_site (mark, site) unique key). Used by S10 (N→Y clears sites).
Given('a mark site designation with a scale site exists', async ({ seedMarkSiteDesignation, world, $testInfo }) => {
  const siteId = pickScaleSite($testInfo.parallelIndex);
  world.msdScaleSiteId = siteId;
  world.msdId = await seedMarkSiteDesignation('N', [siteId]);
});

// A real, pre-existing record that already has an issued letter — used READ-ONLY (no save), so it is
// NOT registered for cleanup and never mutated. Pinned in fixtures (re-verify on DB re-extract).
Given('a mark site designation with an issued letter', async ({ world }) => {
  world.msdId = letterMarkSiteDesignationId;
  world.msdExpectLetterLock = true; // a real letter record — expected to render locked, no unlock recovery
});

When('I open it for editing', async ({ markSiteDesignationEditPage, world }) => {
  expect(world.msdId, 'world.msdId set by a Given seed step').toBeTruthy();
  if (world.msdExpectLetterLock) {
    // S04: a real letter record SHOULD be locked — open plainly and let the scenario assert restriction.
    await markSiteDesignationEditPage.goto(world.msdId as string);
    await markSiteDesignationEditPage.waitReady();
  } else {
    // Functional edit: the seeded record is letterless; recover from the intermittent spurious lock
    // (Bug #1) so a backend concurrency defect doesn't flake the functional assertion.
    await markSiteDesignationEditPage.openForEditingUnlocked(world.msdId as string);
  }
});

When('I open a non-existent mark site designation for editing', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.goto(absentAuthorizationId);
});

// --- Edit actions ---------------------------------------------------------------------------------

When('I change the geographic location and estimated volume', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.setGeographicLocation(updatedGeographicLocation);
  await markSiteDesignationEditPage.setEstVolume(updatedEstVolume);
});

When('I change the geographic location', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.setGeographicLocation(updatedGeographicLocation);
});

When('I set District Wide to {string}', async ({ markSiteDesignationEditPage }, word) => {
  await markSiteDesignationEditPage.setDistrictWide(word);
});

// Reveal the Scale Sites section (District Wide=No) then add a fresh per-worker site (S06). The seed was
// district-wide, so the site is chosen here and stashed for the read-back.
When('I add its scale site', async ({ markSiteDesignationEditPage, world, $testInfo }) => {
  const siteId = pickScaleSite($testInfo.parallelIndex);
  world.msdScaleSiteId = siteId;
  await markSiteDesignationEditPage.addScaleSite(siteId);
});

// Distinct phrasing ("edit the … field") — a generic `I set the {string} field to {string}` already
// exists for CHK; playwright-bdd binds one definition per phrase.
When('I edit the {string} field to {string}', async ({ markSiteDesignationEditPage }, label, value) => {
  await markSiteDesignationEditPage.setField(label, value);
});

// ERR-019..ERR-022 length rules; the count keeps a 4001-character value out of the Examples table.
// Edit-specific phrasing, as with every other step here — playwright-bdd binds one definition per phrase.
When('I edit the {string} field with {int} characters', async ({ markSiteDesignationEditPage }, label, count) => {
  await markSiteDesignationEditPage.setField(label, 'X'.repeat(count));
});

// Distinct from the create step of the same intent (that one drives the create page object).
When('I change the expiry date to before the effective date', async ({ markSiteDesignationEditPage }) => {
  // The seed's effective date is yesterday; 30 days ago is strictly before it.
  await markSiteDesignationEditPage.setField('Expiry Date', daysAgo(30));
});

When('I try to add scale site {string}', async ({ markSiteDesignationEditPage }, id) => {
  await markSiteDesignationEditPage.tryAddScaleSite(id);
});

// ERR-015 duplicate: re-adds the site the seed already put on the record. No row can appear, so this
// deliberately does NOT wait for one (same reason as tryAddScaleSite).
When('I try to add its existing scale site again', async ({ markSiteDesignationEditPage, world }) => {
  expect(world.msdScaleSiteId, 'world.msdScaleSiteId set by the seeded-site Given').toBeTruthy();
  await markSiteDesignationEditPage.tryAddScaleSite(world.msdScaleSiteId as string);
});

// Species content guards on the EDIT screen (UC-MSD-002 Coverage gap #4). Edit-specific phrasing ("on
// the edit form") keeps these distinct from the create species steps — playwright-bdd binds one
// definition per phrase. None of these POST/PUT; they run addSpeciesRow's client-side guards.
When('I add a species with no selection on the edit form', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.addSpecies();
});

When('I select species {string} on the edit form', async ({ markSiteDesignationEditPage }, code) => {
  await markSiteDesignationEditPage.selectSpecies(code);
});

When('I enter species content {string} on the edit form', async ({ markSiteDesignationEditPage }, value) => {
  await markSiteDesignationEditPage.enterSpeciesContent(value);
});

When('I add the species on the edit form', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.addSpecies();
});

When('I save my changes', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.clickSaveRecord();
});

When('I reset the mark site designation form', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.clickReset();
});

// --- Assertions -----------------------------------------------------------------------------------

Then('I should see the validation error {string}', async ({ page }, message) => {
  await expect(page.getByText(message, { exact: false }).first()).toBeVisible();
});

Then('no mark site designation update should be sent', async ({ updateMsdCalls }) => {
  expect(updateMsdCalls()).toBe(0);
});

// A not-found scale site is REJECTED: the add appends no row (observable truth). Since Divergence #2 was
// closed the inline MESSAGE surfaces too, and the scenario asserts it alongside this rejection.
Then('the scale site {string} is not added to the list', async ({ page }, id) => {
  await expect(page.getByRole('cell', { name: id, exact: true })).toHaveCount(0);
});

// ERR-015: the duplicate is rejected with the legacy wording naming the site, and the row it collided
// with is still there exactly once (a rejected add must neither append nor disturb the existing row).
Then('I should see the duplicate scale site error for that site', async ({ page, world }) => {
  await expect(
    page.getByText(`The Scale Site ${world.msdScaleSiteId} has already been added.`, { exact: false }).first(),
  ).toBeVisible();
});

Then('that scale site is listed exactly once', async ({ page, world }) => {
  await expect(
    page.getByRole('cell', { name: world.msdScaleSiteId as string, exact: true }),
  ).toHaveCount(1);
});

Then('the geographic location field is restored to its saved value', async ({ markSiteDesignationEditPage }) => {
  // The seeded record has no geographic location, so the saved state is empty — Reset must discard the edit.
  expect(await markSiteDesignationEditPage.geographicLocationValue()).toBe('');
});

Then('I should see a load error', async ({ markSiteDesignationEditPage }) => {
  await expect(markSiteDesignationEditPage.loadErrorBanner).toBeVisible();
  await expect(markSiteDesignationEditPage.heading).toBeHidden();
});

Then('only the expiry date is editable', async ({ markSiteDesignationEditPage }) => {
  await markSiteDesignationEditPage.expectRestrictedMode();
});

// --- API read-backs (UI-triggered write => bounded poll, never single-shot) -----------------------

Then('the updated record reads back with the new geographic location and estimated volume', async ({ page, world }) => {
  const id = world.msdId;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/mark-site-designations/${id}`);
      if (!res.ok()) return null;
      const b = (await res.json()) as { geographicLocation?: string; estimatedVolume?: number };
      return `${b.geographicLocation}|${b.estimatedVolume}`;
    })
    .toBe(`${updatedGeographicLocation}|${Number(updatedEstVolume)}`);
});

Then('the updated record reads back with district wide {string}', async ({ page, world }, districtWide) => {
  const id = world.msdId;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/mark-site-designations/${id}`);
      if (!res.ok()) return null;
      return ((await res.json()) as { districtWideInd?: string }).districtWideInd;
    })
    .toBe(districtWide);
});

Then('the updated record includes its scale site', async ({ page, world }) => {
  const id = world.msdId;
  const siteId = world.msdScaleSiteId;
  expect(siteId, 'world.msdScaleSiteId set by the add/seed step').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/mark-site-designations/${id}`);
      if (!res.ok()) return [] as string[];
      const b = (await res.json()) as { scaleSites?: { scaleSiteIdNmbr?: string }[] };
      return (b.scaleSites ?? []).map((s) => String(s.scaleSiteIdNmbr));
    })
    .toContain(siteId);
});

Then('the updated record has no scale sites', async ({ page, world }) => {
  const id = world.msdId;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/mark-site-designations/${id}`);
      if (!res.ok()) return -1;
      const b = (await res.json()) as { scaleSites?: unknown[] };
      return (b.scaleSites ?? []).length;
    })
    .toBe(0);
});

// --- Divergence assertion (UC-MSD-002 S02/ERR-011 — see defects.md Divergence #1) -----------------
// CORRECT (re-grounded) behaviour: updating to District Wide=No with zero scale sites must be blocked,
// exactly as the CREATE screen blocks it ("At least one Scale Site is required when District Wide is
// No."). The edit screen enforces no such rule (nor does the backend), so this stays RED until fixed.
Then('a scale-site-required error should block the save', async ({ page, markSiteDesignationEditPage, updateMsdCalls }) => {
  await expect(
    page.getByText('At least one Scale Site is required when District Wide is No.', { exact: false }).first(),
  ).toBeVisible();
  await expect(markSiteDesignationEditPage.heading).toBeVisible(); // stayed on the edit form
  expect(updateMsdCalls()).toBe(0); // no PUT should have fired
});
