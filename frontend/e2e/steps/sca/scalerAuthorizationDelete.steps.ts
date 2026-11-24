import { When, Then, expect } from '../fixtures';
import { scalerLicenceNo } from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA-004 — Delete Scaler Authorization. Delete is triggered from the read-only view (handleDelete):
 * letterless → window.confirm "Are you sure you want to delete this record?" → DELETE
 * /api/scaler-authorizations/{id} → navigate /scalers/view/{licence}?tab=authorizations. The seed Given
 * ("a scaler authorization exists") + "I open the scaler authorization view" are reused from the view
 * steps; the generic "the delete confirmation asked {string}" assertion is reused (world.deleteConfirmMessage).
 * The letter-issued delete-block (S03/S04) is deferred — no letterExists=true record is obtainable (see the
 * UC's/UC-SCA-003's defects.md). Cancel PROVES no DELETE fired (scalerAuthDeleteCalls === 0).
 */

When('I confirm the scaler authorization delete', async ({ scalerAuthorizationViewPage, world }) => {
  world.deleteConfirmMessage = await scalerAuthorizationViewPage.confirmDelete();
});

When('I cancel the scaler authorization delete', async ({ scalerAuthorizationViewPage, world }) => {
  world.deleteConfirmMessage = await scalerAuthorizationViewPage.cancelDelete();
});

Then('I land on the scaler authorizations tab', async ({ page }) => {
  await expect(page).toHaveURL(new RegExp(`/scalers/view/${scalerLicenceNo}\\?tab=authorizations`));
});

Then('the scaler authorization is deleted', async ({ page, world }) => {
  const id = world.scaId;
  await expect
    .poll(async () => (await page.request.get(`/api/scaler-authorizations/${id}`)).status())
    .toBe(404);
});

Then('no scaler authorization delete request is sent', async ({ scalerAuthDeleteCalls }) => {
  expect(scalerAuthDeleteCalls()).toBe(0);
});

Then('I remain on the scaler authorization view', async ({ page, scalerAuthorizationViewPage }) => {
  await expect(page).toHaveURL(/\/scaler-authorizations\/view\/\d+/);
  await expect(scalerAuthorizationViewPage.licenceField).toBeVisible();
});
