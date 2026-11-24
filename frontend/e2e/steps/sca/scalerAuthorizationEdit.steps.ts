import { When, Then, expect } from '../fixtures';

/**
 * UC-SCA-002 — Update Scaler Authorization. Each scenario reuses the "a scaler authorization exists" seed
 * (view steps), opens the edit screen, and edits. Save (shared "I click Save Record") → PUT
 * /api/scaler-authorizations/{id}. Negatives PROVE no write (scalerAuthUpdateCalls === 0). The letter-lock
 * branch (S07) is deferred — no letterExists=true record obtainable (see defects.md). DOM lives in
 * pages/sca/ScalerAuthorizationEditPage.
 */

const districtWideFromWord = (word: string): 'Y' | 'N' => (word === 'Yes' ? 'Y' : 'N');

When('I open it for scaler authorization editing', async ({ scalerAuthorizationEditPage, world }) => {
  expect(world.scaId, 'world.scaId set by a seed Given').toBeTruthy();
  await scalerAuthorizationEditPage.goto(world.scaId as string);
  // Snapshot the loaded expiry so the Reset scenario can assert it is restored (no date hardcoding).
  world.scaOrigExpiry = await scalerAuthorizationEditPage.expiryDate.inputValue();
});

When('I change the scaler auth expiry date to {string}', async ({ scalerAuthorizationEditPage }, value) => {
  await scalerAuthorizationEditPage.setExpiryDate(value);
});

When('I clear the scaler auth expiry date', async ({ scalerAuthorizationEditPage }) => {
  await scalerAuthorizationEditPage.clearExpiryDate();
});

When('I set scaler auth District Wide to {string}', async ({ scalerAuthorizationEditPage }, word) => {
  await scalerAuthorizationEditPage.setDistrictWide(districtWideFromWord(word));
});

When('I reset the scaler authorization form', async ({ scalerAuthorizationEditPage }) => {
  await scalerAuthorizationEditPage.clickReset();
});

Then('the updated scaler authorization reads back expiry {string}', async ({ page, world }, value) => {
  const id = world.scaId;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scaler-authorizations/${id}`);
      if (!res.ok()) return null;
      return ((await res.json()) as { authorizationExpiryDate?: string }).authorizationExpiryDate;
    })
    .toBe(value);
});

Then('the scaler auth expiry field is restored', async ({ scalerAuthorizationEditPage, world }) => {
  await scalerAuthorizationEditPage.expectExpiryValue(world.scaOrigExpiry as string);
});

Then('no scaler authorization update should be sent', async ({ scalerAuthUpdateCalls }) => {
  expect(scalerAuthUpdateCalls()).toBe(0);
});

Then('the scaler auth Scale Sites section is shown', async ({ scalerAuthorizationEditPage }) => {
  await expect(scalerAuthorizationEditPage.scaleSitesHeading).toBeVisible();
});
