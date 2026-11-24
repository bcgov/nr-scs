import { Given, When, Then, expect } from '../fixtures';
import { type VIEW_FIELD_ID } from '../../pages/sca/ScalerAuthorizationViewPage';
import { scaleSiteId, jobFunctionPiece, absentScalerAuthId } from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA-003 — View Scaler Authorization (read-only). Scenarios API-SEED a fresh record (licence 8437) via
 * `seedScalerAuthorization` then open the view; the record is removed via DELETE on teardown
 * (createdScalerAuthIds). DOM lives in pages/sca/ScalerAuthorizationViewPage. Shared seed Givens live here
 * (reused by the delete UC). Data pinned in fixtures/sca/sca-test-data.ts.
 */

Given('a scaler authorization exists', async ({ seedScalerAuthorization, world }) => {
  world.scaId = await seedScalerAuthorization('Y');
});

Given('a scaler authorization with a scale site exists', async ({ seedScalerAuthorization, world }) => {
  world.scaScaleSiteId = scaleSiteId;
  world.scaId = await seedScalerAuthorization('N', [scaleSiteId]);
});

When('I open the scaler authorization view', async ({ scalerAuthorizationViewPage, world }) => {
  expect(world.scaId, 'world.scaId set by a seed Given').toBeTruthy();
  await scalerAuthorizationViewPage.goto(world.scaId as string);
  await scalerAuthorizationViewPage.waitReady();
});

Given('I open the scaler authorization view for a non-existent id', async ({ scalerAuthorizationViewPage }) => {
  await scalerAuthorizationViewPage.goto(absentScalerAuthId);
});

Then('the scaler authorization view shows {string} of {string}', async ({ scalerAuthorizationViewPage }, field, value) => {
  await scalerAuthorizationViewPage.expectFieldValue(field as keyof typeof VIEW_FIELD_ID, value);
});

Then('the Job Functions table shows the authorized job function', async ({ scalerAuthorizationViewPage }) => {
  // The view maps the seeded job-function code ('P') to its SCALE_METHOD_TYPE_CODE label ("Piece Scale").
  await expect(scalerAuthorizationViewPage.page.getByText(jobFunctionPiece).first()).toBeVisible();
});

Then('the Scale Sites table shows the authorized scale site', async ({ scalerAuthorizationViewPage, world }) => {
  await expect(scalerAuthorizationViewPage.scaleSiteCell(world.scaScaleSiteId as string)).toBeVisible();
});

Then('the scaler authorization Scale Sites section is not shown', async ({ scalerAuthorizationViewPage }) => {
  await expect(scalerAuthorizationViewPage.scaleSitesHeading).toHaveCount(0);
});

Then('the scaler authorization {string} action button is shown', async ({ scalerAuthorizationViewPage }, label) => {
  const map: Record<string, import('@playwright/test').Locator> = {
    'Edit Record': scalerAuthorizationViewPage.editRecordButton,
    Delete: scalerAuthorizationViewPage.deleteButton,
    'Create Letter': scalerAuthorizationViewPage.createLetterButton,
  };
  const locator = map[label];
  if (!locator) throw new Error(`Unknown scaler authorization action button: "${label}"`);
  await expect(locator).toBeVisible();
});

Then('the scaler authorization view shows a load error', async ({ page }) => {
  await expect(page.locator('.cds--inline-notification--error')).toBeVisible();
  await expect(page.locator('#authorized-scaler-licence')).toHaveCount(0);
});
