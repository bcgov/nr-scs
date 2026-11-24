import { Given, Then, When, expect } from '../fixtures';
import { checkScaleLicenceLinkHref } from '../../pages/chk/checkScaleDetailShared';
import {
  detailCheckScaleMissingId,
  detailCheckScaleViewListed,
  detailCheckScaleViewNonLegacyId,
} from '../../fixtures/chk/chk-test-data';

/**
 * Steps for the DETAIL (HBCS) Check Scale VIEW flow (UC-CHK-003) — the read-only view screen
 * /check-scales/view/{id} and its re-grounded "list" entry points (the scaler / scale-site Check
 * Scales tabs). This UC is read-only: every scenario opens a permanent seed record and asserts the
 * display, so nothing mutates and the records are safe to share in parallel.
 *
 * Reuses (do NOT redefine here): `Given I am viewing the legacy check scale` +
 * `Then the Edit Record button should be disabled` (steps/chk/detail-update.steps.ts),
 * `Then I should see the error {string}` (steps/common/assertions.steps.ts).
 */

// ---- open the re-grounded list (scaler / scale-site Check Scales tab) ----

Given("I am on scaler {string}'s Check Scales tab", async ({ checkScaleListPage }, scalerLicenceNo) => {
  await checkScaleListPage.gotoScalerCheckScales(scalerLicenceNo);
});

Given("I am on scale site {string}'s Check Scales tab", async ({ checkScaleListPage }, scaleSiteIdNmbr) => {
  await checkScaleListPage.gotoScaleSiteCheckScales(scaleSiteIdNmbr);
});

When('I open check scale {string} from the list', async ({ checkScaleListPage }, id) => {
  await checkScaleListPage.openCheckScale(id);
});

When('I set the Check Scales filter to {string}', async ({ checkScaleListPage }, value) => {
  await checkScaleListPage.setScalerFilter(value);
});

Then('the Check Scales list should be empty', async ({ checkScaleListPage }) => {
  await expect(checkScaleListPage.emptyState).toBeVisible();
});

// ---- open the view screen directly ----

Given('I am viewing the non-legacy check scale', async ({ checkScaleViewPage }) => {
  await checkScaleViewPage.goto(detailCheckScaleViewNonLegacyId);
});

Given('I am viewing a non-existent check scale', async ({ checkScaleViewPage }) => {
  await checkScaleViewPage.gotoExpectingError(detailCheckScaleMissingId);
});

// ---- view actions ----

When('I click Back on the view', async ({ checkScaleViewPage }) => {
  await checkScaleViewPage.backButton.click();
});

// ---- assertions ----

Then('I should be on the check scale view page for {string}', async ({ page, checkScaleViewPage }, id) => {
  await expect(page).toHaveURL(new RegExp(`/check-scales/view/${id}$`));
  await expect(checkScaleViewPage.heading).toBeVisible();
});

Then("the listed check scale's header fields are displayed read-only", async ({ checkScaleViewPage }) => {
  const d = detailCheckScaleViewListed;
  // Check Scale # tombstone line.
  await expect(checkScaleViewPage.checkScaleIdText).toContainText(d.id);
  // Scaler licences render as links to the scaler summary (view-mode affordance).
  const checkLink = checkScaleViewPage.field('Check Scaler Licence #');
  await expect(checkLink).toHaveText(d.checkScalerLicenceNo);
  await expect(checkLink).toHaveAttribute('href', checkScaleLicenceLinkHref(d.checkScalerLicenceNo));
  const origLink = checkScaleViewPage.field('Original Scaler Licence #');
  await expect(origLink).toHaveText(d.originalScalerLicenceNo);
  await expect(origLink).toHaveAttribute('href', checkScaleLicenceLinkHref(d.originalScalerLicenceNo));
  // Site + comment render read-only.
  await expect(checkScaleViewPage.field('Scale Site #')).toHaveValue(d.scaleSiteIdNmbr);
  await expect(checkScaleViewPage.field('Check Scaler Comment')).toHaveValue(d.comment);
});

Then('the check scale data fields are still displayed read-only', async ({ checkScaleViewPage }) => {
  // Record-agnostic: proves the data still renders read-only (used by the legacy-record scenario).
  await expect(checkScaleViewPage.field('Check Scale Type')).toBeVisible();
  await expect(checkScaleViewPage.field('Check Scale Type')).toHaveJSProperty('readOnly', true);
  await expect(checkScaleViewPage.field('Scale Site #')).toHaveJSProperty('readOnly', true);
});

Then(
  'the Check Scale Summary table shows the Original, Check, Difference, and Variance % rows',
  async ({ checkScaleViewPage }) => {
    await expect(checkScaleViewPage.summaryRowLabel('Original:')).toBeVisible();
    await expect(checkScaleViewPage.summaryRowLabel('Check:')).toBeVisible();
    await expect(checkScaleViewPage.summaryRowLabel('Difference:')).toBeVisible();
    await expect(checkScaleViewPage.summaryRowLabel('Variance %:')).toBeVisible();
    await expect(
      checkScaleViewPage.summaryTable.getByRole('columnheader', { name: 'Net Value' }),
    ).toBeVisible();
  },
);

Then("the Species Product Grade Summary lists the check scale's species rows", async ({ checkScaleViewPage }) => {
  // Record-agnostic: assert the Species Product Grade Summary renders at least one species row. (S01 and
  // S02 open DIFFERENT real records — 145988 has 1 species row, 145849 has 11 — so an exact fixture count
  // no longer fits both; presence of ≥1 row is the shared, meaningful assertion.)
  await expect(checkScaleViewPage.speciesRows().first()).toBeVisible();
});

Then('the Back and Edit Record buttons are present', async ({ checkScaleViewPage }) => {
  await expect(checkScaleViewPage.backButton).toBeVisible();
  await expect(checkScaleViewPage.editButton).toBeVisible();
});

Then('the Edit Record button should be enabled', async ({ checkScaleViewPage }) => {
  await expect(checkScaleViewPage.editButton).toBeEnabled();
});

Then('the Delete button should be disabled', async ({ checkScaleViewPage }) => {
  await expect(checkScaleViewPage.deleteButton).toBeDisabled();
});

Then('the Delete button should be enabled', async ({ checkScaleViewPage }) => {
  await expect(checkScaleViewPage.deleteButton).toBeEnabled();
});

Then('all check scale action buttons are present', async ({ checkScaleViewPage }) => {
  // Re-grounding: the new app has NO per-element permission gating (legacy STA-002/005/006), so every
  // action button always renders — asserted here as the new behavior (see coverage.md Coverage gap #1).
  await expect(checkScaleViewPage.backButton).toBeVisible();
  await expect(checkScaleViewPage.editButton).toBeVisible();
  await expect(checkScaleViewPage.createLetterButton).toBeVisible();
  await expect(checkScaleViewPage.addCheckScaleButton).toBeVisible();
  await expect(checkScaleViewPage.deleteButton).toBeVisible();
});

Then('I should be on scaler {string} record', async ({ page }, scalerLicenceNo) => {
  await expect(page).toHaveURL(new RegExp(`/scalers/view/${scalerLicenceNo}`));
});
