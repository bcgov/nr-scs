import { When, Then, expect } from '../fixtures';
import { scaleSiteAuthSiteId } from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA-008 — Delete Scale Site Authorization. Delete is triggered from the read-only view
 * (pages/View/ScaleSiteAuthorization handleDelete): a letterless record pops window.confirm
 * "Are you sure you want to delete this record?", then DELETE /api/scale-site-authorizations/{id} →
 * navigates to /scale-sites/view/{scaleSiteIdNmbr}?tab=authorizations. The seed Given
 * ("a scale site authorization exists") + "I open the scale site authorization view" are reused from the
 * view steps; the generic "the delete confirmation asked {string}" assertion is reused
 * (world.deleteConfirmMessage). Cancel PROVES no DELETE fired (scaleSiteAuthDeleteCalls === 0). The
 * letter-issued delete-block is deferred — no letterExists=true record obtainable (see defects.md).
 */

When('I confirm the scale site authorization delete', async ({ scaleSiteAuthorizationViewPage, world }) => {
  world.deleteConfirmMessage = await scaleSiteAuthorizationViewPage.confirmDelete();
});

When('I cancel the scale site authorization delete', async ({ scaleSiteAuthorizationViewPage, world }) => {
  world.deleteConfirmMessage = await scaleSiteAuthorizationViewPage.cancelDelete();
});

Then('I land on the scale site authorizations tab', async ({ page }) => {
  await expect(page).toHaveURL(new RegExp(`/scale-sites/view/${scaleSiteAuthSiteId}\\?tab=authorizations`));
});

Then('the scale site authorization is deleted', async ({ page, world }) => {
  const id = world.scaId;
  await expect
    .poll(async () => (await page.request.get(`/api/scale-site-authorizations/${id}`)).status())
    .toBe(404);
});

Then('no scale site authorization delete request is sent', async ({ scaleSiteAuthDeleteCalls }) => {
  expect(scaleSiteAuthDeleteCalls()).toBe(0);
});

Then('I remain on the scale site authorization view', async ({ page, scaleSiteAuthorizationViewPage }) => {
  await expect(page).toHaveURL(/\/scale-site-authorizations\/view\/\d+/);
  await expect(scaleSiteAuthorizationViewPage.statusField).toBeVisible();
});
