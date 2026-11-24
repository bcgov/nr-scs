import { Given, When, Then, expect } from '../fixtures';

/**
 * Steps for UC-QRY-003 Search Scalers (route /scalers). Read-only screen. Selectors live in
 * pages/qry/ScalerSearchPage. The check-scale branch navigates to /check-scales/view/{id}, so those
 * landing assertions check the URL + the target screen's heading/error directly (kept here rather than
 * coupling the QRY page object to the CHK view page object).
 */

Given('I am on the Scaler Search page', async ({ scalerSearchPage }) => {
  await scalerSearchPage.goto();
});

When('I search scalers by {string} of {string}', async ({ scalerSearchPage }, fieldLabel, value) => {
  await scalerSearchPage.fill(fieldLabel, value);
  await scalerSearchPage.clickSearch();
});

When('I search scalers by check scale number {string}', async ({ scalerSearchPage }, value) => {
  await scalerSearchPage.enterCheckScaleMode();
  await scalerSearchPage.fillCheckScale(value);
  await scalerSearchPage.clickSearch();
});

When('I reset the scaler search', async ({ scalerSearchPage }) => {
  await scalerSearchPage.clickReset();
});

Then('the scaler results should show {int} records', async ({ scalerSearchPage }, count) => {
  await expect(scalerSearchPage.resultsTotal).toHaveText(`Result List: ${count} records`, { timeout: 30000 });
});

Then('the scaler results should list licence {string}', async ({ scalerSearchPage }, licence) => {
  await expect(scalerSearchPage.licenceLink(licence)).toBeVisible({ timeout: 30000 });
});

Then('scaler licence {string} links to its scaler view', async ({ scalerSearchPage }, licence) => {
  await expect(scalerSearchPage.licenceLink(licence)).toHaveAttribute('href', `/scalers/view/${licence}`);
});

Then('the scaler results table shows the expected columns', async ({ scalerSearchPage }) => {
  for (const col of [
    'Licence #',
    'Reg / Dist',
    'Last Name',
    'First Name',
    'Middle Name',
    'Licence Type',
    'Scaler (Client / Loc)',
  ]) {
    await expect(scalerSearchPage.columnHeader(col)).toBeVisible();
  }
});

Then(
  'the scaler row for licence {string} shows last name {string}, first name {string} and region-district {string}',
  async ({ scalerSearchPage }, licence, lastName, firstName, regDist) => {
    await expect(scalerSearchPage.licenceLink(licence)).toBeVisible({ timeout: 30000 });
    await expect(scalerSearchPage.cell('clientName', lastName)).toBeVisible();
    await expect(scalerSearchPage.cell('legalFirstName', firstName)).toBeVisible();
    await expect(scalerSearchPage.cell('orgUnitName', regDist)).toBeVisible();
  },
);

Then('the Create Scaler button is available', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.createScalerButton).toBeVisible({ timeout: 30000 });
});

Then('the {string} field allows entering a client number', async ({ scalerSearchPage }, label) => {
  await scalerSearchPage.expectClientLocFieldEditable(label);
});

Then('the scaler search should show no results', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.noResults).toBeVisible({ timeout: 30000 });
});

Then('the scaler results should be empty', async ({ scalerSearchPage }) => {
  await expect(scalerSearchPage.resultsTotal).toHaveCount(0);
});

// ---- check-scale branch: lands on the Check Scale view (S04) or a field error on the form (S05) ----

Then('I should land on the check scale view for {string}', async ({ page }, checkScaleId) => {
  await expect(page).toHaveURL(new RegExp(`/check-scales/view/${checkScaleId}$`), { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Check Scale', exact: true })).toBeVisible({ timeout: 30000 });
});

Then('the check scale number field shows the error {string}', async ({ scalerSearchPage }, message) => {
  await expect(scalerSearchPage.checkScaleError).toHaveText(message, { timeout: 30000 });
});

Then('I should still be on the Scaler Search page', async ({ page }) => {
  await expect(page).toHaveURL(/\/scalers$/);
});
