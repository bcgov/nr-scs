import { Given, When, Then, expect } from '../fixtures';
import { inspectionHappyPathSiteId } from '../../fixtures/qry/qry-scale-site-test-data';

/**
 * Steps for UC-QRY-004 Search Scale Sites (route /scale-sites). Read-only parameter search; the
 * "OR enter inspection #" branch either navigates to the inspection view (valid, CIMS-viewable id) or
 * surfaces an error notification (client-side rejection of a non-numeric id, or the backend not-found
 * message for an unknown id). Selectors live in pages/qry/ScaleSiteSearchPage. The inspection-view
 * landing assertion checks the URL + the target screen's heading directly (kept here rather than
 * coupling the QRY page object to the INS view page object — same convention as the scaler check-scale
 * branch).
 */

// ---- parameter search (the accordion's default "Choose your search parameters." mode) ----

Given('I am on the Scale Site Search page', async ({ scaleSiteSearchPage }) => {
  await scaleSiteSearchPage.goto();
});

When('I search scale sites by {string} of {string}', async ({ scaleSiteSearchPage }, fieldLabel, value) => {
  await scaleSiteSearchPage.fill(fieldLabel, value);
  await scaleSiteSearchPage.clickSearch();
});

When('I reset the scale site search', async ({ scaleSiteSearchPage }) => {
  await scaleSiteSearchPage.clickReset();
});

Then('the scale site results should show {int} records', async ({ scaleSiteSearchPage }, count) => {
  await expect(scaleSiteSearchPage.resultsTotal).toHaveText(`Result List: ${count} records`, { timeout: 30000 });
});

Then('the scale site results should list scale site {string}', async ({ scaleSiteSearchPage }, id) => {
  await expect(scaleSiteSearchPage.scaleSiteLink(id)).toBeVisible({ timeout: 30000 });
});

Then('scale site {string} links to its scale site view', async ({ scaleSiteSearchPage }, id) => {
  await expect(scaleSiteSearchPage.scaleSiteLink(id)).toHaveAttribute('href', `/scale-sites/view/${id}`);
});

Then('the scale site results table shows the expected columns', async ({ scaleSiteSearchPage }) => {
  for (const col of [
    'Scale Site #',
    'Scale Site Name',
    'Region',
    'District',
    'Site Type',
    'Site Owner (Client / Loc)',
  ]) {
    await expect(scaleSiteSearchPage.columnHeader(col)).toBeVisible();
  }
});

Then(
  'the scale site row for {string} shows name {string}, region {string}, district {string}, site type {string} and owner {string}',
  async ({ scaleSiteSearchPage }, id, siteName, region, district, siteType, owner) => {
    await expect(scaleSiteSearchPage.scaleSiteLink(id)).toBeVisible({ timeout: 30000 });
    await expect(scaleSiteSearchPage.cell('siteName', siteName)).toBeVisible();
    await expect(scaleSiteSearchPage.cell('region', region)).toBeVisible();
    await expect(scaleSiteSearchPage.cell('district', district)).toBeVisible();
    await expect(scaleSiteSearchPage.cell('methodTypeCodeName', siteType)).toBeVisible();
    await expect(scaleSiteSearchPage.cell('ownerClientDisplay', owner)).toBeVisible();
  },
);

Then('the Create Scale Site button is available', async ({ scaleSiteSearchPage }) => {
  await expect(scaleSiteSearchPage.createScaleSiteButton).toBeVisible({ timeout: 30000 });
});

Then('the scale site owner {string} field allows entering a client number', async ({ scaleSiteSearchPage }, label) => {
  await scaleSiteSearchPage.expectClientLocFieldEditable(label);
});

Then('the scale site search should show no results', async ({ scaleSiteSearchPage }) => {
  await expect(scaleSiteSearchPage.noResults).toBeVisible({ timeout: 30000 });
});

Then('the scale site results should be empty', async ({ scaleSiteSearchPage }) => {
  await expect(scaleSiteSearchPage.resultsTotal).toHaveCount(0);
});

// ---- inspection-# branch (the "OR enter inspection #" accordion) ----

Given('a scale site inspection has been seeded', async ({ seedInspection, world }) => {
  // Seeds on the INS happy-path site (520) via the API and registers it for cleanup; its id resolves +
  // is CIMS-viewable via the inspection-# lookup, so the search navigates to the inspection view.
  world.inspectionId = await seedInspection();
});

When('I search scale sites by the seeded inspection number', async ({ scaleSiteSearchPage, world }) => {
  await scaleSiteSearchPage.enterInspectionMode();
  await scaleSiteSearchPage.fillInspection(world.inspectionId!);
  await scaleSiteSearchPage.clickSearch();
});

When('I search scale sites by inspection number {string}', async ({ scaleSiteSearchPage }, value) => {
  await scaleSiteSearchPage.enterInspectionMode();
  await scaleSiteSearchPage.fillInspection(value);
  await scaleSiteSearchPage.clickSearch();
});

Then('I should land on the scale site inspection view for the seeded inspection', async ({ page, world }) => {
  await expect(page).toHaveURL(
    new RegExp(`/scale-sites/${inspectionHappyPathSiteId}/inspections/view/${world.inspectionId}$`),
    { timeout: 30000 },
  );
  await expect(page.getByRole('heading', { name: 'Site Inspection', exact: true })).toBeVisible({ timeout: 30000 });
});

Then('the scale site search shows the error {string}', async ({ scaleSiteSearchPage }, message) => {
  await expect(scaleSiteSearchPage.notification).toContainText(message, { timeout: 30000 });
});

Then('no inspection lookup request should be sent', async ({ inspectionSearchCalls }) => {
  expect(inspectionSearchCalls()).toBe(0);
});
