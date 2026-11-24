import type { APIRequestContext } from '@playwright/test';

import {
  WMSG_KEY,
  buildOverLengthMessage,
  buildWelcomeMessage,
} from '../../../../fixtures/admin/maintenance/system-setting-test-data';
import { Given, When, Then, expect } from '../../../fixtures';

/**
 * Steps for Configure System Setting (UC-SYS-002 — the WMSG "Current News" welcome message). Distinct
 * "welcome message" / "system" vocabulary so no phrase collides with another domain's steps.
 */

async function fetchWmsg(request: APIRequestContext): Promise<string> {
  const res = await request.get(`/api/system-settings/${WMSG_KEY}`);
  if (!res.ok()) throw new Error(`[verify] WMSG read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return String(((await res.json()) as { systemSettingValue?: string }).systemSettingValue ?? '');
}

// --- navigation ---------------------------------------------------------------------------------------

// Depends on wmsgGuard so the singleton's original value is captured now and restored on teardown.
Given('I am on the System page', async ({ systemPage, wmsgGuard, world }) => {
  world.wmsgOriginal = wmsgGuard.original;
  await systemPage.goto();
});

// --- form ---------------------------------------------------------------------------------------------

When('I enter a new welcome message', async ({ systemPage, world }) => {
  const value = buildWelcomeMessage('update');
  world.wmsgNewValue = value;
  await systemPage.setNews(value);
});

When('I clear the welcome message', async ({ systemPage }) => {
  await systemPage.setNews('');
});

When('I enter a welcome message over the maximum length', async ({ systemPage, world }) => {
  const value = buildOverLengthMessage();
  world.wmsgNewValue = value;
  await systemPage.setNews(value);
});

When('I save the system setting', async ({ systemPage }) => {
  await systemPage.save();
});

When('I reset the system form', async ({ systemPage }) => {
  await systemPage.reset();
});

When('I go back from the system page', async ({ systemPage }) => {
  await systemPage.back();
});

// --- verify -------------------------------------------------------------------------------------------

Then('the system Save button should be disabled', async ({ systemPage }) => {
  await systemPage.expectSaveDisabled();
});

Then('the system Save button should be enabled', async ({ systemPage }) => {
  await systemPage.expectSaveEnabled();
});

Then('the welcome message should be saved', async ({ systemPage, request, world }) => {
  const value = world.wmsgNewValue;
  if (!value) throw new Error('[verify] no wmsgNewValue in world — enter a message first');
  await systemPage.expectSuccessBanner();
  // POLL: the save is UI-triggered (async); read back the singleton until it reflects the new value.
  await expect
    .poll(async () => fetchWmsg(request), {
      timeout: 10_000,
      message: 'WMSG did not reflect the saved welcome message',
    })
    .toBe(value);
});

Then('the welcome message field should show the saved text', async ({ systemPage, world }) => {
  if (!world.wmsgNewValue) throw new Error('[verify] no wmsgNewValue in world');
  await systemPage.expectNewsValue(world.wmsgNewValue);
});

Then('the welcome message field should show the original text', async ({ systemPage, world }) => {
  await systemPage.expectNewsValue(world.wmsgOriginal ?? '');
});

Then('I should be returned to the welcome page', async ({ page }) => {
  await expect(page).toHaveURL(/\/welcome(\/|$)/);
});

Then('no system setting update should be sent', async ({ updateSystemSettingCalls }) => {
  expect(updateSystemSettingCalls()).toBe(0);
});

Then('the stored welcome message should be unchanged', async ({ request, world }) => {
  const original = world.wmsgOriginal ?? '';
  await expect
    .poll(async () => fetchWmsg(request), {
      timeout: 10_000,
      message: 'the stored WMSG value changed unexpectedly',
    })
    .toBe(original);
});

// --- @discovered-divergence assertions (assert the CORRECT, meaningful message; the app shows a generic
//     500 instead, so these fail honestly) --------------------------------------------------------------

Then('a system save error should be shown', async ({ systemPage }) => {
  await expect(systemPage.errorBanner.first()).toBeVisible({ timeout: 10_000 });
});

Then('a required-field validation message should be shown', async ({ systemPage }) => {
  // Tightened to the exact message the fix delivers (client-side validateNews / backend
  // SystemSettingService), now that divergence #1 is closed — not just a loose /is required/i.
  await systemPage.expectMessage(/Current News is required\./);
});

Then('a maximum-length validation message should be shown', async ({ systemPage }) => {
  // Tightened to the exact message the fix delivers, now that divergence #2 is closed.
  await systemPage.expectMessage(/Current News can not be greater than 4000 characters\./);
});
