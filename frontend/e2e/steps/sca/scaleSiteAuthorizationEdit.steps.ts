import { When, Then, expect } from '../fixtures';
import { daysAhead } from '../../fixtures/common/dates';

/**
 * UC-SCA-006 — Update Scale Site Authorization. Each scenario reuses the "a scale site authorization exists"
 * seed (view steps), opens the edit screen, and edits. Save (shared "I click Save Record") → PUT
 * /api/scale-site-authorizations/{id}. Negatives PROVE no write (scaleSiteAuthUpdateCalls === 0). The
 * letter-lock branch is deferred — no letterExists=true record obtainable (see defects.md). DOM lives in
 * pages/sca/ScaleSiteAuthorizationEditPage.
 */

When('I open it for scale site auth editing', async ({ scaleSiteAuthorizationEditPage, world }) => {
  expect(world.scaId, 'world.scaId set by a seed Given').toBeTruthy();
  await scaleSiteAuthorizationEditPage.goto(world.scaId as string);
  // Snapshot the loaded expiry so the Reset scenario can assert it is restored (no date hardcoding).
  world.scaOrigExpiry = await scaleSiteAuthorizationEditPage.expiryDate.inputValue();
});

// Today-relative so the target expiry never ages below the (today-relative) seeded effective date and trips
// the client "Expiry Date must be after Effective Date." rule. daysAhead(240) is distinct from the seed's
// expiry (daysAhead(180)), so it is a real change; the read-back compares against the stored value. Both
// windows sit well inside the server's SALM max-length cap (see fixtures/sca/sca-test-data.ts).
When('I change the scale site auth expiry date to a valid later date', async ({ scaleSiteAuthorizationEditPage, world }) => {
  const value = daysAhead(240);
  world.expected = { expiry: value };
  await scaleSiteAuthorizationEditPage.setExpiryDate(value);
});

When('I clear the scale site auth expiry date', async ({ scaleSiteAuthorizationEditPage }) => {
  await scaleSiteAuthorizationEditPage.clearExpiryDate();
});

When('I reset the scale site authorization form', async ({ scaleSiteAuthorizationEditPage }) => {
  await scaleSiteAuthorizationEditPage.clickReset();
});

Then('the updated scale site authorization reads back the new expiry', async ({ page, world }) => {
  const id = world.scaId;
  const value = (world.expected as { expiry?: string } | undefined)?.expiry;
  expect(value, 'world.expected.expiry set by the change-expiry step').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scale-site-authorizations/${id}`);
      if (!res.ok()) return null;
      return ((await res.json()) as { authorizationExpiryDate?: string }).authorizationExpiryDate;
    })
    .toBe(value);
});

// Guards the destructive delete-then-add update path: a record seeded WITH a condition must still carry it
// after an unrelated-field edit. A miss here means the edit-save dropped the record's existing conditions.
Then('the updated scale site authorization still includes condition {string}', async ({ page, world }, conditionId) => {
  const id = world.scaId;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scale-site-authorizations/${id}`);
      if (!res.ok()) return [] as string[];
      const body = (await res.json()) as { conditions?: unknown[] };
      return (body.conditions ?? []).map((c) => String((c as { scaleAuthConditionId?: number }).scaleAuthConditionId));
    })
    .toContain(conditionId);
});

Then('the scale site auth expiry field is restored', async ({ scaleSiteAuthorizationEditPage, world }) => {
  await scaleSiteAuthorizationEditPage.expectExpiryValue(world.scaOrigExpiry as string);
  // Reset restores loaded values — it must not blank unrelated fields; the (disabled) site # stays populated.
  await expect(scaleSiteAuthorizationEditPage.scaleSiteNumber).not.toHaveValue('');
});

Then('no scale site authorization update should be sent', async ({ scaleSiteAuthUpdateCalls }) => {
  expect(scaleSiteAuthUpdateCalls()).toBe(0);
});
