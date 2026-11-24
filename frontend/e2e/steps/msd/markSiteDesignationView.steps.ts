import { Given, When, Then, expect } from '../fixtures';
import {
  richViewMsdId,
  letterMarkSiteDesignationId,
  absentAuthorizationId,
} from '../../fixtures/msd/msd-test-data';
import { type VIEW_FIELD_ID } from '../../pages/msd/MarkSiteDesignationViewPage';

/**
 * UC-MSD-003 — View Mark Site Designation (read-only). Steps drive the MarkSiteDesignationViewPage
 * page object; no seed / no cleanup (the view never mutates, so tests open DISCOVERED REAL records that
 * no other test owns — parallel-safe by construction). Data ids/values are pinned in
 * fixtures/msd/msd-test-data.ts (re-verify on any DB re-extract).
 */

Given('I open the Mark Site Designation view for the rich sample record', async ({ markSiteDesignationViewPage }) => {
  // Reopen until the letterless ("Create Letter") state renders — works around the filed letterExists
  // concurrency false-positive (uc-msd-002 defects.md Bug #1) without masking it.
  await markSiteDesignationViewPage.reopenUntilLetterState(richViewMsdId, 'create');
});

Given('I open the Mark Site Designation view for the letter-issued record', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.reopenUntilLetterState(letterMarkSiteDesignationId, 'view');
});

Given('I open the Mark Site Designation view for a non-existent id', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.goto(absentAuthorizationId);
});

Then('the read-only MSD view has loaded', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.waitReady();
});

Then('the MSD view page title is shown', async ({ markSiteDesignationViewPage }) => {
  await expect(markSiteDesignationViewPage.heading).toBeVisible();
});

Then('the MSD header field {string} shows {string}', async ({ markSiteDesignationViewPage }, field, value) => {
  await markSiteDesignationViewPage.expectFieldValue(field as keyof typeof VIEW_FIELD_ID, value);
});

Then('the Scale Sites table shows site {string} with name {string}', async ({ markSiteDesignationViewPage }, id, name) => {
  await expect(markSiteDesignationViewPage.scaleSiteCell(id)).toBeVisible();
  await expect(markSiteDesignationViewPage.scaleSiteCell(name)).toBeVisible();
});

/**
 * Legacy S04's cross-navigation from the MSD view to a scale-site record. Re-grounded 2026-08-18: this
 * asserted the OPPOSITE until the role work (nr-scs `81a4a62`, 2026-08-13) restored the link, closing
 * Divergence #2 — the app rendered plain text and the old assertion green-guarded that gap.
 *
 * The href is asserted rather than a click-through: this UC owns the MSD view, and where
 * `/scale-sites/view/{id}` leads is UC-SCL/scale-site territory.
 *
 * Note what is NOT asserted here. `ScaleSiteLink` wraps `PermissionLink`, so the cell is a link only
 * for a role holding `SCALE_SITE_READ` and plain text without it — which is legacy S04's own condition
 * ("when the user may view scale sites"). The plain-text half is unreachable today because no enabled
 * role holds `MSD_READ` without `SCALE_SITE_READ`; logged as Coverage gap #5.
 */
Then('the Scale Sites Site # {string} links to its scale-site view', async ({ markSiteDesignationViewPage }, id) => {
  const link = markSiteDesignationViewPage.scaleSiteLink(id);
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', `/scale-sites/view/${id}`);
});

Then('the Species Content table shows content {string}', async ({ markSiteDesignationViewPage }, content) => {
  await expect(markSiteDesignationViewPage.speciesCell(content)).toBeVisible();
});

Then(
  'the Conditions table shows condition {string} titled {string} marked mandatory {string}',
  async ({ markSiteDesignationViewPage }, number, title, mandatory) => {
    // Scope Title + Mandatory? to condition {number}'s own row — several rows share Mandatory? = "Yes".
    const row = markSiteDesignationViewPage.conditionRow(number);
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', { name: title, exact: true })).toBeVisible();
    await expect(row.getByRole('cell', { name: mandatory, exact: true })).toBeVisible();
  },
);

/** Resolve an action-button label to its page-object locator (all four view-screen buttons). */
function actionButton(pageObj: { editRecordButton: unknown; deleteButton: unknown; createLetterButton: unknown; viewLetterButton: unknown }, label: string) {
  const map: Record<string, unknown> = {
    'Edit Record': pageObj.editRecordButton,
    Delete: pageObj.deleteButton,
    'Create Letter': pageObj.createLetterButton,
    'View Letter': pageObj.viewLetterButton,
  };
  const locator = map[label];
  if (!locator) throw new Error(`Unknown MSD action button: "${label}"`);
  return locator as import('@playwright/test').Locator;
}

Then('the MSD {string} action button is shown', async ({ markSiteDesignationViewPage }, label) => {
  await expect(actionButton(markSiteDesignationViewPage, label)).toBeVisible();
});

Then('the MSD {string} action button is not shown', async ({ markSiteDesignationViewPage }, label) => {
  await expect(actionButton(markSiteDesignationViewPage, label)).toHaveCount(0);
});

Then('the MSD view shows a load error', async ({ markSiteDesignationViewPage }) => {
  await expect(markSiteDesignationViewPage.errorBanner).toBeVisible();
  // Both the server 404 body ("No mark site designation found with id …") and the client fallback
  // ("Could not load mark site designation.") contain this phrase — assert the class of error, robustly.
  await expect(markSiteDesignationViewPage.errorBanner).toContainText(/mark site designation/i);
});

Then('no MSD record fields are shown', async ({ markSiteDesignationViewPage }) => {
  await expect(markSiteDesignationViewPage.msdNumber).toHaveCount(0);
});

// --- Navigation from the view screen (the action buttons actually navigate, not merely render) --------

When('I click the MSD Edit Record button', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.clickEditRecord();
});

Then('I land on the mark site designation edit screen', async ({ page }) => {
  await expect(page).toHaveURL(/\/mark-site-designations\/edit\/\d+/);
  await expect(page.getByRole('heading', { name: 'Mark Site Designation - Edit' })).toBeVisible();
});

When('I click the MSD Create Letter button', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.clickCreateLetter();
});

Then('I land on the mark site designation letter options screen', async ({ page }) => {
  await expect(page).toHaveURL(/\/mark-site-designations\/\d+\/letter/);
  await expect(page.getByRole('heading', { name: 'Mark Site Designation Letter Options' })).toBeVisible();
});

// --- Empty child sections (a designation with no scale sites / no species) ----------------------------

Then('the Scale Sites section is empty', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.expectScaleSitesEmpty();
});

Then('the Species Content section is empty', async ({ markSiteDesignationViewPage }) => {
  await markSiteDesignationViewPage.expectSpeciesEmpty();
});
