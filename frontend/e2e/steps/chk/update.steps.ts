import { daysAhead } from '../../fixtures/common/dates';
import { secondSpgRow } from '../../fixtures/chk/chk-test-data';
import { Given, Then, When, expect } from '../fixtures';
import { onCreate, onUpdate } from './checkScaleRoutes';

/**
 * UC-CHK-006 (Update Summary Check Scale) steps. Each scenario SEEDS a fresh, DB-grounded record via
 * the API (seedCheckScale) and drives the UI update against it, so tests stay independent and never
 * mutate a shared seed row. Success is proven by an API read-back; a client-side block is proven by a
 * zero mutation-call count (updateCalls/addSpgCalls). Generic assertions (error text) come from
 * steps/common; DOM lives in the SummaryCheckScaleUpdatePage page object.
 */

/** Visible label -> read-back field on the check-scale search model (+ optional value transform). */
const READBACK: Record<string, { key: string; map?: (v: string) => unknown }> = {
  'Check Scaler Comment': { key: 'chkScalerCommentTxt' },
  'Check Scale Type': { key: 'checkScaleTypeCode' },
  'Followed Good Practices': { key: 'followedGoodPracticeInd', map: (v) => (v === 'Yes' ? 'Y' : 'N') },
  'Original within Standard': { key: 'originalWithinStandardInd', map: (v) => (v === 'Yes' ? 'Y' : 'N') },
  'Check Replaces Original': { key: 'checkReplacesOriginalInd', map: (v) => (v === 'Yes' ? 'Y' : 'N') },
  'Original Scale Return': { key: 'originalScaleReturnNo', map: (v) => Number(v) },
  'Check Scale Return': { key: 'chkScaleReturnNo', map: (v) => Number(v) },
};

interface CheckScaleReadModel {
  checkScaleId: number;
  speciesSummary?: Array<{ speciesCode: string; productCode: string; speciesGrade: string | null }>;
  [key: string]: unknown;
}

async function readBack(page: import('@playwright/test').Page, id: string): Promise<CheckScaleReadModel> {
  const res = await page.request.get(`/api/check-scales/search?checkScaleId=${id}`);
  expect(res.ok()).toBeTruthy();
  const rows = (await res.json()) as CheckScaleReadModel[];
  expect(rows).toHaveLength(1);
  return rows[0];
}

// --- Given: seed a record and open the update form ---------------------------------------------

Given('I am editing an existing summary check scale', async ({ seedCheckScale, updatePage, world }) => {
  world.checkScaleId = await seedCheckScale(1);
  await updatePage.goto(world.checkScaleId);
});

Given('I am editing a summary check scale that has two SPG rows', async ({ seedCheckScale, updatePage, world }) => {
  world.checkScaleId = await seedCheckScale(2);
  await updatePage.goto(world.checkScaleId);
});

Given(
  'I am editing a summary check scale reached from scaler {string} returning to {string}',
  async ({ seedCheckScale, updatePage, world }, scalerName, backTo) => {
    world.checkScaleId = await seedCheckScale(1);
    await updatePage.gotoWithBackContext(world.checkScaleId, scalerName, backTo);
  },
);

// --- When: edit / act --------------------------------------------------------------------------

When('I change the {string} field to {string}', async ({ updatePage, world }, label, value) => {
  await updatePage.setField(label, value);
  world.expected = { ...(world.expected ?? {}), [label]: value };
});

When('I clear the {string} field', async ({ updatePage }, label) => {
  await updatePage.clearField(label);
});

When('I enter a future date in {string}', async ({ updatePage }, label) => {
  await updatePage.setField(label, daysAhead(5));
});

When('I enter a valid new SPG row', async ({ updatePage }) => {
  await updatePage.fillSpgAddRow(secondSpgRow);
});

When('I add the SPG row', async ({ updatePage }) => {
  await updatePage.clickAdd();
});

When('I save the summary check scale', async ({ updatePage }) => {
  await updatePage.save();
});

When('I reset the form', async ({ updatePage }) => {
  await updatePage.reset();
});

When('I delete the first SPG row', async ({ updatePage }) => {
  await updatePage.deleteSpgRow(0);
});

When('I delete the entire record', async ({ updatePage }) => {
  await updatePage.deleteRecord();
});

// --- Then: assert ------------------------------------------------------------------------------

Then('I should remain on the update form', async ({ page }) => {
  await expect(page).toHaveURL(onUpdate);
});

Then('the update form should be displayed', async ({ updatePage }) => {
  await expect(updatePage.page.getByRole('heading', { name: 'Summary Check Scale - Update' })).toBeVisible();
});

Then('no update request should be sent', async ({ updateCalls }) => {
  expect(updateCalls()).toBe(0);
});

Then('no SPG add request should be sent', async ({ addSpgCalls }) => {
  expect(addSpgCalls()).toBe(0);
});

Then('the saved summary check scale header should reflect my changes', async ({ page, world }) => {
  expect(world.checkScaleId, 'expected a seeded checkScaleId').toBeTruthy();
  expect(world.expected, 'expected changed fields recorded').toBeTruthy();
  // The Save click fires PUT asynchronously; poll the read-back until the persisted record catches up
  // (eventual consistency), reporting the offending field on timeout rather than a bare true/false.
  await expect
    .poll(
      async () => {
        const rec = await readBack(page, world.checkScaleId!);
        const mismatches = Object.entries(world.expected!)
          .map(([label, raw]) => {
            const mapping = READBACK[label];
            if (!mapping) throw new Error(`No read-back mapping for changed field "${label}".`);
            const expectedValue = mapping.map ? mapping.map(String(raw)) : raw;
            return rec[mapping.key] === expectedValue
              ? null
              : `${label} (${mapping.key})=${JSON.stringify(rec[mapping.key])}, want ${JSON.stringify(expectedValue)}`;
          })
          .filter(Boolean);
        return mismatches.length === 0 ? 'all-match' : mismatches.join('; ');
      },
      { timeout: 10_000, message: 'update read-back never reflected the submitted changes' },
    )
    .toBe('all-match');
});

Then('the Check Scaler Comment should display {string}', async ({ updatePage }, value) => {
  await expect.poll(() => updatePage.commentValue()).toBe(value);
});

Then('the summary check scale should have {int} SPG rows', async ({ page, world }, count) => {
  // Poll: the add/delete SPG mutation completes asynchronously after the click.
  await expect
    .poll(async () => (await readBack(page, world.checkScaleId!)).speciesSummary?.length ?? 0, {
      timeout: 10_000,
      message: `summary check scale never settled at ${count} SPG rows`,
    })
    .toBe(count);
});

Then(
  'the SPG summary should include species {string} product {string}',
  async ({ page, world }, species, product) => {
    await expect
      .poll(
        async () => {
          const rec = await readBack(page, world.checkScaleId!);
          return (rec.speciesSummary ?? []).some((s) => s.speciesCode === species && s.productCode === product);
        },
        { timeout: 10_000, message: `expected an SPG row for species ${species} / product ${product}` },
      )
      .toBe(true);
  },
);

Then('each SPG row delete action should be disabled', async ({ updatePage }) => {
  const buttons = updatePage.rowDeleteButtons;
  const n = await buttons.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i += 1) await expect(buttons.nth(i)).toBeDisabled();
});

Then('the SPG row delete actions should be enabled', async ({ updatePage }) => {
  const buttons = updatePage.rowDeleteButtons;
  const n = await buttons.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i += 1) await expect(buttons.nth(i)).toBeEnabled();
});

Then('the summary check scale record should no longer exist', async ({ page, world }) => {
  await expect
    .poll(
      async () => {
        const res = await page.request.get(`/api/check-scales/search?checkScaleId=${world.checkScaleId}`);
        expect(res.ok()).toBeTruthy();
        return ((await res.json()) as unknown[]).length;
      },
      { timeout: 10_000, message: 'deleted summary check scale still resolves on read-back' },
    )
    .toBe(0);
});

Then('I should be taken to the create form', async ({ page }) => {
  await expect(page).toHaveURL(onCreate);
});

Then('the Return Type options should be disabled', async ({ page }) => {
  for (const name of ['Log Tally', 'Sample Log Tally', 'Special Forest Product']) {
    await expect(page.getByRole('radio', { name, exact: true })).toBeDisabled();
  }
});

// --- update-form action-row visibility (button state) ------------------------------------------

const ACTION_BUTTONS = {
  Reset: (p: import('../../pages/chk/SummaryCheckScaleUpdatePage').SummaryCheckScaleUpdatePage) => p.resetButton,
  'Save Record': (p: import('../../pages/chk/SummaryCheckScaleUpdatePage').SummaryCheckScaleUpdatePage) => p.saveButton,
  'Delete Record': (p: import('../../pages/chk/SummaryCheckScaleUpdatePage').SummaryCheckScaleUpdatePage) =>
    p.deleteRecordButton,
  'Create Letter': (p: import('../../pages/chk/SummaryCheckScaleUpdatePage').SummaryCheckScaleUpdatePage) =>
    p.createLetterButton,
  Back: (p: import('../../pages/chk/SummaryCheckScaleUpdatePage').SummaryCheckScaleUpdatePage) => p.backButton,
} as const;

Then('the {string} action should be visible on the update form', async ({ updatePage }, name) => {
  const get = ACTION_BUTTONS[name as keyof typeof ACTION_BUTTONS];
  if (!get) throw new Error(`Unknown update action button: "${name}".`);
  await expect(get(updatePage)).toBeVisible();
});

Then('the {string} action should not be rendered on the update form', async ({ updatePage }, name) => {
  const get = ACTION_BUTTONS[name as keyof typeof ACTION_BUTTONS];
  if (!get) throw new Error(`Unknown update action button: "${name}".`);
  await expect(get(updatePage)).toHaveCount(0);
});
