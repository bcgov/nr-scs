import { Given, When, Then, expect } from '../fixtures';
import {
  detailCheckScaleEditValues,
  detailCheckScaleMissingId,
  legacyCheckScaleId,
} from '../../fixtures/chk/chk-test-data';

/**
 * Steps for the DETAIL (HBCS) Check Scale UPDATE flow (UC-CHK-002) — the edit screen
 * /check-scales/edit/{id}. The loaded real data has no persistent editable HBCS record, so EVERY
 * scenario creates its own fresh, self-cleaning record via the API (only the happy path then PUTs; the
 * reset/cancel/blocked-save scenarios never save). Reuses the generic "I should see the error {string}"
 * (steps/common) and the S08 skip stubs + "I am authenticated without the Check Scaler role" from
 * detail-create.steps.ts.
 */

// ---- open the edit / view screens ----

Given('I am editing the seeded detail check scale', async ({ seedDetailCheckScaleForEdit, checkScaleEditPage, world }) => {
  // No persistent editable record in the real data — create a fresh one (self-cleaning). These
  // scenarios never save, so each owning its own record is parallel-safe.
  const id = await seedDetailCheckScaleForEdit();
  world.detailCheckScaleId = id;
  await checkScaleEditPage.goto(id);
});

Given('I have created a fresh detail check scale to edit', async ({ seedDetailCheckScaleForEdit, checkScaleEditPage, world }) => {
  const id = await seedDetailCheckScaleForEdit();
  world.detailCheckScaleId = id;
  await checkScaleEditPage.goto(id);
});

Given('I am viewing the legacy check scale', async ({ checkScaleViewPage }) => {
  await checkScaleViewPage.goto(legacyCheckScaleId);
});

Given('I open the edit form for a non-existent check scale', async ({ checkScaleEditPage }) => {
  await checkScaleEditPage.gotoExpectingError(detailCheckScaleMissingId);
});

// ---- edit actions ----

When('I edit all outcome fields with new valid values', async ({ checkScaleEditPage }) => {
  const v = detailCheckScaleEditValues;
  await checkScaleEditPage.setField('Check Scale Type', v.checkScaleType);
  await checkScaleEditPage.setField('Followed Good Practices', v.followedGoodPractices);
  await checkScaleEditPage.setField('Original within Standard', v.originalWithinStandard);
  await checkScaleEditPage.setField('Check Scaler Comment', v.comment);
  await checkScaleEditPage.setField('Original Net Value', v.originalNetValue);
  await checkScaleEditPage.setField('Check Net Value', v.checkNetValue);
});

When('I set the edit field {string} to {string}', async ({ checkScaleEditPage }, field, value) => {
  await checkScaleEditPage.setField(field, value);
});

When('I save the check scale edit', async ({ checkScaleEditPage }) => {
  await checkScaleEditPage.save();
});

When('I reset the edit form', async ({ checkScaleEditPage }) => {
  await checkScaleEditPage.reset();
});

When('I cancel the edit', async ({ checkScaleEditPage }) => {
  await checkScaleEditPage.back();
});

// ---- assertions ----

Then('I should be taken to the check scale view page', async ({ page }) => {
  await expect(page).toHaveURL(/\/check-scales\/view\/\d+$/);
});

Then('the saved detail check scale edit should match the new values', async ({ request, world }) => {
  const id = world.detailCheckScaleId;
  expect(id, 'no edited detail check scale id captured').toBeTruthy();
  const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok()).toBeTruthy();
  const rec = ((await res.json()) as Array<Record<string, unknown>>)[0];
  expect(rec, `check scale ${id} not found on read-back`).toBeTruthy();
  const e = detailCheckScaleEditValues.expected;
  expect(rec.checkScaleTypeCode).toBe(e.checkScaleTypeCode);
  expect(rec.followedGoodPracticeInd).toBe(e.followedGoodPracticeInd);
  expect(rec.originalWithinStandardInd).toBe(e.originalWithinStandardInd);
  expect((rec.chkScalerCommentTxt ?? '') as string).toBe(e.chkScalerCommentTxt);
  expect(rec.originalScaleNetValue).toBeCloseTo(e.originalScaleNetValue, 2);
  expect(rec.checkScaleNetValue).toBeCloseTo(e.checkScaleNetValue, 2);
});

Then('the {string} field should show {string}', async ({ checkScaleEditPage }, field, value) => {
  // toHaveValue auto-retries — Reset re-renders the form asynchronously.
  await expect(checkScaleEditPage.field(field)).toHaveValue(value);
});

Then('no check scale should be updated', async ({ updateDetailCalls }) => {
  expect(updateDetailCalls()).toBe(0);
});

Then('the Edit Record button should be disabled', async ({ checkScaleViewPage }) => {
  await expect(checkScaleViewPage.editButton).toBeDisabled();
});

Then('the check scale not-found error should be shown', async ({ page }) => {
  // DESIRED behavior (legacy ERR-007 "check scale not found"). This currently FAILS FOR REAL: the new
  // app leaves the edit page on a perpetual loading skeleton (its error branch is dead code — see
  // defect-log Divergence #1), so the intended error text never appears. The scenario is tagged
  // @discovered-divergence — a genuinely-failing test (NOT xfail/forced green) that turns green when the
  // app is fixed. Short timeout keeps the (expected) red fast.
  await expect(page.getByText('Could not retrieve check scale data.')).toBeVisible({ timeout: 3000 });
});
