import { Given, When, Then, expect } from '../fixtures';
import {
  BASICS_FIELD_BY_LABEL,
  type ScalerAuthBasics,
} from '../../pages/sca/ScalerAuthorizationCreatePage';
import {
  happyBasics,
  expiryBeforeEffective,
  scaleSiteId,
  absentScaleSiteId,
  jobFunctionPiece,
} from '../../fixtures/sca/sca-test-data';

/**
 * UC-SCA-001 — Create Scaler Authorization. Two-stage single-page form: basics → "Add Conditions"
 * (client-side validateBasics, never POSTs) → advanced (Job Functions / SFP / Scale Sites / Conditions) →
 * "Save Record" (POST /api/scaler-authorizations). DOM lives in pages/sca/ScalerAuthorizationCreatePage.
 * Negatives PROVE no write (scalerAuthCreateCalls === 0). Happy-path creates are read back via the API and
 * cleaned up via DELETE /api/scaler-authorizations/{id} (createdScalerAuthIds fixture). Data pinned in
 * fixtures/sca/sca-test-data.ts (ground-truthed 2026-08-05).
 */

const districtWideFromWord = (word: string): '' | 'Y' | 'N' =>
  word === 'Yes' ? 'Y' : word === 'No' ? 'N' : '';

Given('I am on the Scaler Authorization create form', async ({ scalerAuthorizationCreatePage }) => {
  await scalerAuthorizationCreatePage.goto();
});

When('I create a district-wide scaler authorization', async ({ scalerAuthorizationCreatePage }) => {
  await scalerAuthorizationCreatePage.createRecord(happyBasics('Y'), jobFunctionPiece);
});

When('I create a scaler authorization with a scale site', async ({ scalerAuthorizationCreatePage, world }) => {
  world.scaScaleSiteId = scaleSiteId;
  await scalerAuthorizationCreatePage.createRecord(happyBasics('N'), jobFunctionPiece, scaleSiteId);
});

When('I fill valid scaler auth basics with District Wide {string}', async ({ scalerAuthorizationCreatePage }, word) => {
  await scalerAuthorizationCreatePage.fillBasics({ ...happyBasics('Y'), districtWide: districtWideFromWord(word) });
});

When('I fill valid scaler auth basics except {string} is {string}', async ({ scalerAuthorizationCreatePage }, label, value) => {
  const key = BASICS_FIELD_BY_LABEL[label];
  if (!key) throw new Error(`Unknown scaler auth basics field label: "${label}"`);
  const values: ScalerAuthBasics = { ...happyBasics('Y'), [key]: value } as ScalerAuthBasics;
  await scalerAuthorizationCreatePage.fillBasics(values);
});

When('I enter a scaler auth expiry date before the effective date', async ({ scalerAuthorizationCreatePage }) => {
  await scalerAuthorizationCreatePage.fillBasics({ ...happyBasics('Y'), ...expiryBeforeEffective() });
});

// "I click Add Conditions" / "I click Save Record" are shared in steps/common/formActions.steps.ts.

When('I select job function {string}', async ({ scalerAuthorizationCreatePage }, label) => {
  await scalerAuthorizationCreatePage.selectJobFunction(label);
});

/**
 * Argument-free on purpose: the id is pinned in the fixture (why 99999999 is provably absent is documented
 * there), while the expected message stays verbatim in the .feature. A distinct step name is required —
 * `I add scale site {string}` is already registered globally by the MSD suite, and playwright-bdd's step
 * registry is flat across domains.
 */
When('I add a scale site that does not exist', async ({ scalerAuthorizationCreatePage }) => {
  await scalerAuthorizationCreatePage.addScaleSite(absentScaleSiteId);
});

// "I should see the error {string}" is the shared step in steps/common/assertions.steps.ts (getByText.first()).

Then('I should remain on the scaler authorization create form', async ({ page }) => {
  await expect(page).toHaveURL(/\/scaler-authorizations\/create/);
});

Then('no scaler authorization should be created', async ({ scalerAuthCreateCalls }) => {
  expect(scalerAuthCreateCalls()).toBe(0);
});

Then('the Scale Sites section is hidden', async ({ scalerAuthorizationCreatePage }) => {
  await expect(scalerAuthorizationCreatePage.scaleSitesHeading).toHaveCount(0);
});

Then('the scaler authorization is created', async ({ scalerAuthorizationCreatePage, createdScalerAuthIds, world }) => {
  const id = await scalerAuthorizationCreatePage.createdId();
  world.scaId = id;
  createdScalerAuthIds.push(id); // register for DELETE teardown the moment the id is known
});

Then('the created record reads back with district wide {string}', async ({ page, world }, districtWide) => {
  const id = world.scaId;
  expect(id, 'world.scaId set by "the scaler authorization is created"').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scaler-authorizations/${id}`);
      if (!res.ok()) return null;
      return ((await res.json()) as { districtWideInd?: string }).districtWideInd;
    })
    .toBe(districtWide);
});

Then('the created scaler authorization includes its scale site', async ({ page, world }) => {
  const id = world.scaId;
  const siteId = world.scaScaleSiteId;
  expect(siteId, 'world.scaScaleSiteId set by the create step').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scaler-authorizations/${id}`);
      if (!res.ok()) return [] as string[];
      const body = (await res.json()) as { scaleSites?: unknown[] };
      return (body.scaleSites ?? []).map((s) => String((s as { scaleSiteIdNmbr?: string }).scaleSiteIdNmbr));
    })
    .toContain(siteId);
});
