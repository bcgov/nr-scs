import { Given, When, Then, expect } from '../fixtures';
import {
  detailCheckScaleDdns,
  detailCheckScaleHappyPath,
  detailCheckScaleReachStep2,
} from '../../fixtures/chk/chk-test-data';

/**
 * Seeds a prerequisite HBCS check scale via POST /api/check-scales/create on the given (check, original)
 * doc pair, registering it for DB teardown. Used by the S03 "already a check" and S04 "original at max
 * checks" scenarios, whose required state does not exist in the loaded data (no loaded check scale is
 * linked to a log tally). Baseline outcome fields are arbitrary-but-valid; only the doc linkage matters.
 */
async function seedPrereqCheckScale(
  request: import('@playwright/test').APIRequestContext,
  ids: string[],
  checkDdn: string,
  originalDdn: string,
): Promise<void> {
  const res = await request.post('/api/check-scales/create', {
    data: {
      chkLogTallyDocNo: checkDdn,
      chkLogTallyVer: 1,
      orgLogTallyDocNo: originalDdn,
      orgLogTallyVer: 1,
      checkScaleTypeCode: 'FST',
      followedGoodPracticeInd: 'Y',
      originalWithinStandardInd: 'N',
      originalScaleNetValue: 50,
      checkScaleNetValue: 50,
    },
  });
  if (!res.ok()) {
    throw new Error(`[seed] prerequisite detail create failed: HTTP ${res.status()} — ${await res.text()}`);
  }
  ids.push(String(((await res.json()) as { checkScaleId: number }).checkScaleId));
}

/**
 * Steps for the DETAIL (HBCS) Check Scale create flow (UC-CHK-001) — a two-step, HBS-driven screen at
 * /check-scales/create. Distinct from the Summary Check Scale steps (form/verify/update.steps.ts),
 * which drive a different screen + endpoints. Selectors live in CheckScaleCreatePage; the generic
 * "I should see the error {string}" / "I should be returned to {string}" live in steps/common.
 */

// ---- step 1: DDN/DDV ----

Given('I am on the Check Scale create form', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.goto();
});

// The happy-path CREATE pair (168D492V77Y90) — used by S01, which then actually creates a record on it.
// Do NOT reuse this for validate-only "reach step 2" scenarios: while S01's created record is live,
// validate(168D492V77Y90) returns "already exists" and step 2 never renders (parallel-execution flake).
When('I complete step 1 with a valid check and original scale', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.fillStep1(detailCheckScaleHappyPath);
  await checkScaleCreatePage.clickNext();
  await checkScaleCreatePage.expectOnStep2();
});

// Reach step 2 WITHOUT creating, using the dedicated validate-only pair (017L212D02E3C/2101K02700F30) that
// no test creates on — so its validate is always ok, independent of the happy-path create (S01). Used by
// the step-2 validation scenarios (S05). This is the parallel-safe way to get to the outcome fields.
When('I complete step 1 to reach the outcome fields', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.fillStep1(detailCheckScaleReachStep2);
  await checkScaleCreatePage.clickNext();
  await checkScaleCreatePage.expectOnStep2();
});

When(
  'I enter check scale {string} and original scale {string}',
  async ({ checkScaleCreatePage }, checkDdn, originalDdn) => {
    // DDV is always 1 in the seed; the scenarios vary the DDN, not the version.
    await checkScaleCreatePage.enterDdnPair(checkDdn, '1', originalDdn, '1');
  },
);

When(
  'I set the DDN entry field {string} to {string}',
  async ({ checkScaleCreatePage }, field: string, value: string) => {
    await checkScaleCreatePage.setStep1Field(field, value);
  },
);

/**
 * Typed keystroke by keystroke, NOT filled — the distinction is the whole point when the assertion is
 * a `maxlength` cap (DDN 13 / DDV 9), which `fill()` bypasses.
 */
When(
  'I type {string} character by character into the DDN entry field {string}',
  async ({ checkScaleCreatePage }, value: string, field: string) => {
    await checkScaleCreatePage.typeStep1Field(field, value);
  },
);

Then(
  'the DDN entry field {string} should hold {string}',
  async ({ checkScaleCreatePage }, field: string, value: string) => {
    await expect(checkScaleCreatePage.step1Field(field)).toHaveValue(value);
  },
);

When('I submit the DDN pair', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.clickNext();
});

Then('I should remain on the DDN entry step', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.expectOnStep1();
});

Then('no validation request should be sent', async ({ validateCalls }) => {
  expect(validateCalls()).toBe(0);
});

// ---- step 2: outcome fields ----

When('I enter valid Check Scale outcome fields', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.fillStep2(detailCheckScaleHappyPath);
});

When('I set the outcome field {string} to {string}', async ({ checkScaleCreatePage }, field, value) => {
  await checkScaleCreatePage.setStep2Field(field, value);
});

When('I save the check scale', async ({ checkScaleCreatePage }) => {
  await checkScaleCreatePage.save();
});

Then('no check scale should be created', async ({ createDetailCalls }) => {
  expect(createDetailCalls()).toBe(0);
});

// ---- legacy parity: same-scaler detail create is allowed (UC-CHK-001 S06) ----

When('I create a check scale with the same scaler on both sides', async ({ checkScaleCreatePage, page, world, createdDetailCheckScaleIds }) => {
  // 222TS34E40F40 and 2232O32730F30 both resolve to scaler 220F. Legacy applied the "scalers not same"
  // rule (ERR-012) only to SUMMARY check scales, never the detail flow, so the new detail app creates
  // this record and navigates to the view — legacy parity, not a divergence (see defects.md
  // "Verified — not a defect"). Capture the created id so teardown deletes it.
  await checkScaleCreatePage.enterDdnPair('222TS34E40F40', '1', '2232O32730F30', '1');
  await checkScaleCreatePage.clickNext();
  await checkScaleCreatePage.expectOnStep2();
  await checkScaleCreatePage.setStep2Field('Check Scale Type', 'FST');
  await checkScaleCreatePage.setStep2Field('Followed Good Practices', 'Yes');
  await checkScaleCreatePage.setStep2Field('Original within Standard', 'No');
  await checkScaleCreatePage.setStep2Field('Original Net Value', '50');
  await checkScaleCreatePage.setStep2Field('Check Net Value', '50');
  // Register the new id from the CREATE RESPONSE, not from the post-save URL. The record exists the
  // moment the server answers 201; deriving the id from the URL instead means a slow navigation leaks
  // the row, because the step throws before it ever reaches the registration line. That is not
  // hypothetical: it is how check scale 147071 leaked on 2026-07-22 and then blocked this very scenario
  // for every later run — the create had succeeded, the assertion after it had not.
  const [createResponse] = await Promise.all([
    page.waitForResponse(
      (r) => new URL(r.url()).pathname.endsWith('/api/check-scales/create') && r.request().method() === 'POST',
    ),
    checkScaleCreatePage.save(),
  ]);
  if (createResponse.ok()) {
    const created = (await createResponse.json()) as { checkScaleId: number };
    world.detailCheckScaleId = String(created.checkScaleId);
    createdDetailCheckScaleIds.push(String(created.checkScaleId)); // registered before anything can throw
  }

  await page.waitForURL(/\/check-scales\/view\/\d+$/, { timeout: 10000 });
  expect(
    world.detailCheckScaleId,
    `expected POST /check-scales/create to succeed; it answered HTTP ${createResponse.status()}`,
  ).toBeTruthy();
});

Then('the same-scaler detail check scale should be created', async ({ createDetailCalls, world }) => {
  expect(createDetailCalls(), 'expected the detail create to be POSTed').toBeGreaterThan(0);
  expect(world.detailCheckScaleId, 'no created detail check scale id captured').toBeTruthy();
});

Then('the saved check scale should show the same scaler on both sides', async ({ request, world }) => {
  const id = world.detailCheckScaleId;
  expect(id, 'no created detail check scale id captured').toBeTruthy();
  const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok()).toBeTruthy();
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  const rec = rows[0];
  expect(rec, `check scale ${id} not found on read-back`).toBeTruthy();
  // Legacy parity: the detail flow permits check-scaler == original-scaler (both docs resolve to 220F).
  expect(rec.checkScalerLicenceNo, 'check scaler licence should be present').toBeTruthy();
  expect(rec.originalScalerLicenceNo).toBe(rec.checkScalerLicenceNo);
});

// ---- prerequisites for S03 "already a check" / S04 "original at max checks" (state absent in real data) ----

Given(
  'a check scale already exists for check DDN {string}',
  async ({ request, createdDetailCheckScaleIds }, checkDdn) => {
    await seedPrereqCheckScale(
      request,
      createdDetailCheckScaleIds,
      checkDdn,
      detailCheckScaleDdns.usedCheckPrereqOriginalDdn,
    );
  },
);

Given(
  'the original DDN {string} already has the maximum check scales',
  async ({ request, createdDetailCheckScaleIds }, originalDdn) => {
    for (const checkDdn of detailCheckScaleDdns.maxChecksCheckDdns) {
      await seedPrereqCheckScale(request, createdDetailCheckScaleIds, checkDdn, originalDdn);
    }
  },
);

// ---- shared field-scoped error (unambiguous for short messages like "Required.") ----

Then(
  'the {string} field should show the error {string}',
  async ({ checkScaleCreatePage }, field, message) => {
    await expect(checkScaleCreatePage.fieldError(field)).toContainText(message);
  },
);

// ---- success read-back ----

Then(
  'I should be taken to the new check scale view page',
  async ({ page, world, createdDetailCheckScaleIds, checkScaleCreatePage }) => {
    await expect(page).toHaveURL(/\/check-scales\/view\/\d+$/);
    const id = new URL(page.url()).pathname.match(/\/check-scales\/view\/(\d+)$/)?.[1];
    expect(id, 'could not parse the new check scale id from the view URL').toBeTruthy();
    world.detailCheckScaleId = id;
    createdDetailCheckScaleIds.push(id!); // register for DB teardown the moment the id is known
    await expect(checkScaleCreatePage.errorBanner).toHaveCount(0);
  },
);

Then('the saved detail check scale should match the submitted values', async ({ request, world }) => {
  const id = world.detailCheckScaleId;
  expect(id, 'no created detail check scale id captured').toBeTruthy();
  const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok()).toBeTruthy();
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  const rec = rows[0];
  expect(rec, `check scale ${id} not found on read-back`).toBeTruthy();

  const d = detailCheckScaleHappyPath;
  // Outcome fields come straight from the form...
  expect(rec.ckscType).toBe(d.expected.ckscType);
  expect(rec.checkScaleTypeCode).toBe(d.checkScaleType);
  expect(rec.followedGoodPracticeInd).toBe(d.followedGoodPractices === 'Yes' ? 'Y' : 'N');
  expect(rec.originalWithinStandardInd).toBe(d.originalWithinStandard === 'Yes' ? 'Y' : 'N');
  expect(rec.originalScaleNetValue).toBeCloseTo(Number(d.originalNetValue), 2);
  expect(rec.checkScaleNetValue).toBeCloseTo(Number(d.checkNetValue), 2);
  expect(rec.chkLogTallyDocNo).toBe(d.checkDdn);
  expect(rec.orgLogTallyDocNo).toBe(d.originalDdn);
  expect((rec.chkScalerCommentTxt ?? '') as string).toBe(d.comment);
  // ...while the scaler licences + scale site are HBS-DERIVED from the linked log_tally headers.
  expect(rec.checkScalerLicenceNo).toBe(d.expected.checkScalerLicenceNo);
  expect(rec.originalScalerLicenceNo).toBe(d.expected.originalScalerLicenceNo);
  expect(rec.scaleSiteIdNmbr).toBe(d.expected.scaleSiteIdNmbr);
});

// ---- navigation / render ----

Then('the Return Type {string} should be selected', async ({ page }, label) => {
  await expect(page.getByRole('radio', { name: label, exact: true })).toBeChecked();
});

Then('the Next button should be visible', async ({ checkScaleCreatePage }) => {
  await expect(checkScaleCreatePage.nextButton).toBeVisible();
});

