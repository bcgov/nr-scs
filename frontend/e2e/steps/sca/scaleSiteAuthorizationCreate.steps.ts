import { Given, When, Then, expect } from '../fixtures';
import {
  BASICS_FIELD_BY_LABEL,
  type ScaleSiteAuthBasics,
} from '../../pages/sca/ScaleSiteAuthorizationCreatePage';
import {
  happyScaleSiteAuthBasics,
  scaleSiteAuthExpiryBeforeEffective,
  scaleSiteAuthExpiryEqualsEffective,
  scaleSiteAuthWindowExceedingMaxLength,
  validSiaConditionId,
} from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA-005 — Create Scale Site Authorization. Two-stage single-page form: basics → "Add Conditions"
 * (client-side validateBasics, never POSTs) → Conditions section → "Save Record" (POST
 * /api/scale-site-authorizations). DOM lives in pages/sca/ScaleSiteAuthorizationCreatePage; "Add Conditions"
 * / "Save Record" / "I should see the error {string}" are shared (steps/common). Negatives PROVE no write
 * (scaleSiteAuthCreateCalls === 0 for client-side cases). Happy-path creates are read back via the API and
 * cleaned up via DELETE /api/scale-site-authorizations/{id} (createdScaleSiteAuthIds). Data pinned in
 * fixtures/sca/sca-test-data.ts (ground-truthed 2026-08-19).
 */

Given('I am on the Scale Site Authorization create form', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.goto();
});

When('I create a scale site authorization', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.createRecord(happyScaleSiteAuthBasics());
});

When('I create a scale site authorization with a condition', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.createRecord(happyScaleSiteAuthBasics(), validSiaConditionId);
});

When('I fill valid scale site auth basics', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.fillBasics(happyScaleSiteAuthBasics());
});

When('I fill valid scale site auth basics except {string} is {string}', async ({ scaleSiteAuthorizationCreatePage }, label, value) => {
  const key = BASICS_FIELD_BY_LABEL[label];
  if (!key) throw new Error(`Unknown scale site auth basics field label: "${label}"`);
  const values: ScaleSiteAuthBasics = { ...happyScaleSiteAuthBasics(), [key]: value } as ScaleSiteAuthBasics;
  await scaleSiteAuthorizationCreatePage.fillBasics(values);
});

When('I enter a scale site auth expiry date {string} the effective date', async ({ scaleSiteAuthorizationCreatePage }, relation) => {
  // "before" = expiry strictly before effective (both client and server reject); "equal to" = expiry ==
  // effective (client rejects, server would allow — the only case the two rules disagree, defects.md #1).
  const dates =
    relation === 'equal to' ? scaleSiteAuthExpiryEqualsEffective() : scaleSiteAuthExpiryBeforeEffective();
  await scaleSiteAuthorizationCreatePage.fillBasics({ ...happyScaleSiteAuthBasics(), ...dates });
});

When('I fill scale site auth basics with a window exceeding the max authorization length', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.fillBasics(scaleSiteAuthWindowExceedingMaxLength());
});

When('I add a scale site auth condition {string}', async ({ scaleSiteAuthorizationCreatePage }, conditionId) => {
  await scaleSiteAuthorizationCreatePage.addConditionById(conditionId);
});

When('I reset the scale site auth create form', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.clickReset();
});

Then('the scale site authorization is created', async ({ scaleSiteAuthorizationCreatePage, createdScaleSiteAuthIds, world }) => {
  const id = await scaleSiteAuthorizationCreatePage.createdId();
  world.scaId = id;
  createdScaleSiteAuthIds.push(id); // register for DELETE teardown the moment the id is known
});

Then('the created scale site authorization reads back with status {string}', async ({ page, world }, status) => {
  const id = world.scaId;
  expect(id, 'world.scaId set by "the scale site authorization is created"').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scale-site-authorizations/${id}`);
      if (!res.ok()) return null;
      return ((await res.json()) as { status?: string }).status;
    })
    .toBe(status);
});

Then('the created scale site authorization reads back site {string} volume {string}', async ({ page, world }, site, volume) => {
  const id = world.scaId;
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scale-site-authorizations/${id}`);
      if (!res.ok()) return null;
      const body = (await res.json()) as { scaleSiteIdNmbr?: string; expectedScaleVolume?: number };
      return `${body.scaleSiteIdNmbr}|${body.expectedScaleVolume}`;
    })
    .toBe(`${site}|${volume}`);
});

Then('the created scale site authorization includes condition {string}', async ({ page, world }, conditionId) => {
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

Then('I should remain on the scale site authorization create form', async ({ page }) => {
  await expect(page).toHaveURL(/\/scale-site-authorizations\/create/);
});

Then('no scale site authorization should be created', async ({ scaleSiteAuthCreateCalls }) => {
  expect(scaleSiteAuthCreateCalls()).toBe(0);
});

Then('the scale site auth create form is cleared', async ({ scaleSiteAuthorizationCreatePage }) => {
  await scaleSiteAuthorizationCreatePage.expectFormCleared();
});
