import { Given, When, Then, expect } from '../fixtures';
import {
  scaleSiteWithMarks,
  scaleSiteWithMarksTimberMark,
  emptyMsdTabScaleSite,
} from '../../fixtures/msd/msd-test-data';

/**
 * UC-MSD-005 — Maintain Scale Site MSD Tab. The Scale Site view's "MSD" tab lists a site's designated
 * timber marks (each a link → the MSD list for that mark) and an "Add Mark Site Designation" button
 * (→ the MSD create flow). Steps drive the ScaleSiteMsdTabPage; the tab is read-only, so tests open
 * DISCOVERED REAL sites that no test mutates — parallel-safe by construction, no seed / no cleanup.
 * Data ids pinned in fixtures/msd/msd-test-data.ts (re-verify on any DB re-extract).
 */

Given('I open the MSD tab for a scale site with designated marks', async ({ scaleSiteMsdTabPage }) => {
  await scaleSiteMsdTabPage.open(scaleSiteWithMarks);
});

Given('I open the MSD tab for a scale site with no designated marks', async ({ scaleSiteMsdTabPage }) => {
  await scaleSiteMsdTabPage.open(emptyMsdTabScaleSite);
});

Then('the MSD tab lists the designated timber mark', async ({ scaleSiteMsdTabPage }) => {
  await expect(scaleSiteMsdTabPage.heading).toBeVisible();
  await expect(scaleSiteMsdTabPage.markLink(scaleSiteWithMarksTimberMark)).toBeVisible();
});

Then('the MSD tab shows the empty state', async ({ scaleSiteMsdTabPage }) => {
  await expect(scaleSiteMsdTabPage.heading).toBeVisible();
  await expect(scaleSiteMsdTabPage.emptyState).toBeVisible();
});

Then('the Add Mark Site Designation button is shown', async ({ scaleSiteMsdTabPage }) => {
  await expect(scaleSiteMsdTabPage.addButton).toBeVisible();
});

When('I click the designated timber mark', async ({ scaleSiteMsdTabPage }) => {
  await scaleSiteMsdTabPage.clickMarkLink(scaleSiteWithMarksTimberMark);
});

When('I click Add Mark Site Designation', async ({ scaleSiteMsdTabPage }) => {
  await scaleSiteMsdTabPage.clickAddMarkSiteDesignation();
});

Then('I am taken to the mark site designation list for that timber mark', async ({ page }) => {
  await expect(page).toHaveURL(
    new RegExp(`/mark-site-designations\\?timberMark=${encodeURIComponent(scaleSiteWithMarksTimberMark)}`),
  );
});

Then('I am taken to the Create Mark Site Designation screen', async ({ page }) => {
  await expect(page).toHaveURL(/\/mark-site-designations\/create/);
  await expect(page.getByRole('heading', { name: 'Mark Site Designation - Create' })).toBeVisible();
});
