import { summaryCheckScaleHappyPath } from '../../fixtures/chk/chk-test-data';
import { Given, Then, expect } from '../fixtures';

/**
 * CHK verification steps: the error banner, the create-request spy (prove-the-negative), field
 * enable/disable/visibility gating, the create->update forward with id capture + cleanup registration,
 * and the black-box API read-back. Also the server-error route injections for the exception slice.
 * (Generic assertions — error text, returned-to — live in steps/common/assertions.steps.ts.)
 */
const CREATE_ENDPOINT = '**/api/summary-check-scales/create';
const onEdit = /\/summary-check-scales\/(\d+)\/edit$/;

Then('the error banner should be visible', async ({ createPage }) => {
  await expect(createPage.errorBanner).toBeVisible();
});

// Prove the negative: a client-side-validation block must NOT have sent the create request.
Then('no create request should be sent', async ({ createCalls }) => {
  expect(createCalls()).toBe(0);
});

// Return-type gating: enabled | disabled | visible | hidden for Product / Grade / Partial Load.
Then('the {string} field should be {string}', async ({ createPage }, label, state) => {
  const loc = createPage.field(label);
  switch (state) {
    case 'enabled': await expect(loc).toBeEnabled(); break;
    case 'disabled': await expect(loc).toBeDisabled(); break;
    case 'visible': await expect(loc).toBeVisible(); break;
    case 'hidden': await expect(loc).toHaveCount(0); break;
    default: throw new Error(`Unknown field state "${state}" (expected enabled|disabled|visible|hidden).`);
  }
});

Then(
  'I should be forwarded to the update screen for the new record',
  async ({ page, createPage, createdCheckScaleIds, world }) => {
    await expect(page).toHaveURL(onEdit);
    const id = new URL(page.url()).pathname.match(onEdit)?.[1];
    expect(id).toBeTruthy();
    world.checkScaleId = id!;
    createdCheckScaleIds.push(id!); // register for teardown the moment the id is known
    await expect(createPage.errorBanner).toHaveCount(0);
  },
);

Then('the saved Summary Check Scale should match the submitted values', async ({ page, world }) => {
  const d = summaryCheckScaleHappyPath;
  const id = world.checkScaleId;
  expect(id, 'expected a checkScaleId captured on the forward step').toBeTruthy();

  // Same read path the Update page uses (no GET /summary-check-scales/{id}; the summary row lives in
  // the shared check_scale table, read via the search endpoint). Black-box via :3000 -> Vite proxy.
  const res = await page.request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok()).toBeTruthy();
  const rows = (await res.json()) as SummaryCheckScaleReadModel[];
  expect(rows).toHaveLength(1);
  const rec = rows[0];

  // header persisted as submitted
  expect(rec.checkScaleId).toBe(Number(id));
  expect(rec.ckscType).toBe('SFPSCS');
  expect(rec.checkScaleTypeCode).toBe(d.checkScaleType);
  expect(rec.originalScalerLicenceNo).toBe(d.originalScalerLicence);
  expect(rec.checkScalerLicenceNo).toBe(d.checkScalerLicence);
  expect(rec.scaleSiteIdNmbr).toBe(d.scaleSiteNumber);
  expect(rec.timberMark).toBe(d.timberMark);
  expect(rec.loadArrivalNumber).toBe(d.loadArrivalNumber);
  expect(rec.weighSlipNumber).toBeNull(); // XOR: only load arrival was set
  expect(rec.followedGoodPracticeInd).toBe('Y');
  expect(rec.originalWithinStandardInd).toBe('Y');
  expect(rec.checkReplacesOriginalInd).toBe('N');
  expect(rec.partialInd).toBe('N');
  expect(rec.originalScaleDate).toBe(d.originalDateOfScale);
  expect(rec.chkScaleDate).toBe(d.checkDateOfScale);
  expect(rec.originalScaleReturnNo).toBe(Number(d.originalScaleReturn));
  expect(rec.chkScaleReturnNo).toBe(Number(d.checkScaleReturn));

  // server-computed roll-up totals (single SPG row)
  expect(rec.originalScaleTotalPieces).toBe(10);
  expect(rec.chkScaleTotalPieces).toBe(10);
  expect(rec.originalScaleTotalVolume).toBeCloseTo(15.5, 3);
  expect(rec.chkScaleTotalVolume).toBeCloseTo(15.25, 3);

  // the SPG roll-up row (grade blanked to ' ' for SFP with a non-XM product)
  expect(rec.speciesSummary).toHaveLength(1);
  const spg = rec.speciesSummary![0];
  expect(spg.speciesCode).toBe(d.spgRow.species);
  expect(spg.productCode).toBe(d.spgRow.product);
  expect((spg.speciesGrade ?? '').trim()).toBe(''); // blanked (stored as ' ')
  expect(spg.orgPieces).toBe(10);
  expect(spg.chkPieces).toBe(10);
  expect(spg.orgNetVolume).toBeCloseTo(15.5, 3);
  expect(spg.chkNetVolume).toBeCloseTo(15.25, 3);
  expect(spg.orgNetValue).toBeCloseTo(200, 2);
  expect(spg.chkNetValue).toBeCloseTo(198, 2);
});

Then('exactly one Summary Check Scale should exist for the new record', async ({ page, world }) => {
  const res = await page.request.get(`/api/check-scales/search?checkScaleId=${world.checkScaleId}`);
  expect(res.ok()).toBeTruthy();
  const rows = (await res.json()) as Array<{ checkScaleId: number; ckscType: string }>;
  expect(rows).toHaveLength(1); // the retry created ONE row, not two
  expect(rows[0].ckscType).toBe('SFPSCS');
});

// --- server-error injection for the exception slice (no DB touched on the failing call) ---

Given('the create endpoint always fails with a 500', async ({ page }) => {
  await page.route(CREATE_ENDPOINT, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'Simulated persistence failure.' }),
    }),
  );
});

Given('the create endpoint fails once with a 500 then succeeds', async ({ page }) => {
  let calls = 0;
  await page.route(CREATE_ENDPOINT, async (route) => {
    calls += 1;
    if (calls === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'Simulated transient failure.' }),
      });
    } else {
      await route.continue(); // retry reaches the real backend and persists
    }
  });
});

/** Minimal shape of the check-scale search read model the read-back asserts against. */
interface SummaryCheckScaleReadModel {
  checkScaleId: number;
  ckscType: string;
  checkScaleTypeCode: string;
  originalScalerLicenceNo: string;
  checkScalerLicenceNo: string;
  scaleSiteIdNmbr: string;
  timberMark: string | null;
  loadArrivalNumber: string | null;
  weighSlipNumber: number | null;
  followedGoodPracticeInd: string;
  originalWithinStandardInd: string;
  checkReplacesOriginalInd: string;
  partialInd: string | null;
  originalScaleDate: string;
  chkScaleDate: string;
  originalScaleReturnNo: number | null;
  chkScaleReturnNo: number | null;
  originalScaleTotalPieces: number | null;
  chkScaleTotalPieces: number | null;
  originalScaleTotalVolume: number | null;
  chkScaleTotalVolume: number | null;
  speciesSummary?: Array<{
    speciesCode: string;
    speciesGrade: string | null;
    productCode: string;
    orgPieces: number;
    orgNetVolume: number;
    orgNetValue: number;
    chkPieces: number;
    chkNetVolume: number;
    chkNetValue: number;
  }>;
}
