import { Given, When, Then, expect } from '../fixtures';
import {
  searchTimberMarkWithResults,
  noMatchTimberMark,
  searchResultColumns,
  searchRequiredMessage,
  percentWildcardMessage,
  underscoreWildcardMessage,
} from '../../fixtures/qry/qry-mark-site-designation-test-data';

/**
 * Steps for UC-QRY-005 Search Mark Site Designations (route /mark-site-designations, page
 * pages/Queries/MarkSiteDesignations). Read-only timber-mark search: the form and a `?timberMark=` link
 * (the Scale Site MSD tab) take the identical param-driven path. Selectors live in
 * pages/qry/MarkSiteDesignationSearchPage. Client-side guards (required / % / _ wildcard) are proven to
 * dispatch NO search request via `searchMsdCalls` (the MSD-domain GET /mark-site-designations/search spy).
 * The MSD-view landing assertion checks the URL + the view screen's heading directly (same convention as
 * the scale-site → inspection-view and scaler → check-scale branches: don't couple the QRY page object to
 * the MSD view page object).
 */

Given('I am on the Mark Site Designation Search page', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.goto();
});

Given('I open the Mark Site Designation Search page with timber mark {string} in the URL', async ({ markSiteDesignationSearchPage }, mark) => {
  await markSiteDesignationSearchPage.gotoWithTimberMark(mark);
});

// The Scale Site MSD tab links here with the marks-present fixture mark, so the auto-search path uses it.
Given('I arrive at the Mark Site Designation Search with a designated timber mark in the URL', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.gotoWithTimberMark(searchTimberMarkWithResults);
});

When('I search mark site designations by the timber mark with results', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.search(searchTimberMarkWithResults);
});

When('I search mark site designations by timber mark {string}', async ({ markSiteDesignationSearchPage }, mark) => {
  await markSiteDesignationSearchPage.search(mark);
});

When('I search mark site designations for a mark that matches nothing', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.search(noMatchTimberMark);
});

When('I submit the mark site designation search with no timber mark', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.clickSearch();
});

When('I reset the mark site designation search', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.clickReset();
});

Then('the mark site designation results list the searched timber mark', async ({ markSiteDesignationSearchPage }) => {
  await expect(
    markSiteDesignationSearchPage.timberMarkCell(searchTimberMarkWithResults).first(),
  ).toBeVisible({ timeout: 30000 });
});

Then('the mark site designation results table shows the expected columns', async ({ markSiteDesignationSearchPage }) => {
  for (const col of searchResultColumns) {
    await expect(markSiteDesignationSearchPage.columnHeader(col)).toBeVisible({ timeout: 30000 });
  }
});

Then('each MSD # is a link to its mark site designation view', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.firstMsdLink()).toHaveAttribute(
    'href',
    /\/mark-site-designations\/view\?haulingMarkAuthorizationId=\d+/,
    { timeout: 30000 },
  );
});

Then('the Create MSD button is available', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.createMsdButton).toBeVisible({ timeout: 30000 });
});

When('I open the first mark site designation from the results', async ({ markSiteDesignationSearchPage }) => {
  await markSiteDesignationSearchPage.firstMsdLink().click();
});

Then('I land on the mark site designation view screen', async ({ page }) => {
  await expect(page).toHaveURL(/\/mark-site-designations\/view\?haulingMarkAuthorizationId=\d+/, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Mark Site Designation', exact: true })).toBeVisible({ timeout: 30000 });
});

Then('the mark site designation search shows the No-results empty state', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.noResults).toBeVisible({ timeout: 30000 });
});

Then('the mark site designation search shows the required-timber-mark error', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.errorMessage(searchRequiredMessage)).toBeVisible({ timeout: 30000 });
});

Then('the mark site designation search rejects the percent wildcard', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.errorMessage(percentWildcardMessage)).toBeVisible({ timeout: 30000 });
});

Then('the mark site designation search rejects the underscore wildcard', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.errorMessage(underscoreWildcardMessage)).toBeVisible({ timeout: 30000 });
});

Then('no mark site designation search request should be sent', async ({ searchMsdCalls }) => {
  expect(searchMsdCalls()).toBe(0);
});

Then('the mark site designation results should be cleared', async ({ markSiteDesignationSearchPage }) => {
  await expect(markSiteDesignationSearchPage.initialEmptyState).toBeVisible({ timeout: 30000 });
});
