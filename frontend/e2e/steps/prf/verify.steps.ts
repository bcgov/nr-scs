import { Then, expect } from '../fixtures';
import { readRemarkById } from './readBack';
import {
  actionCode,
  outcomeCode,
  happyActionRemark,
  happyOutcomeRemark,
  validCheckScaleId,
} from '../../fixtures/prf/performance-remark-test-data';

/**
 * Verify steps for Performance Remarks. Success asserts a full API read-back; client-blocked saves prove the
 * negative via the create-spy (POST count 0); server-rejected saves prove nothing persisted.
 */

Then('I should be returned to the remarks list', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.expectOnList();
});

// One phrase for both create and edit — the form panel is the same in-tab surface. A PRF-specific name
// avoids colliding with chk's URL-bound "I should remain on the create form".
Then('I should remain on the performance remark form', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.expectOnForm();
});

Then('the scaler should have no performance remarks listed', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.expectEmptyList();
});

Then('the create form should be cleared', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.expectFormCleared();
});

// The create POST id is captured asynchronously by the spy; poll it, record it for later steps + cleanup,
// then assert the row is visible on the refreshed list (id-scoped — parallel-safe on the shared scaler).
Then('the new remark should be listed', async ({ performanceRemarksTabPage, performanceRemarkCreateSpy, world }) => {
  await expect
    .poll(() => performanceRemarkCreateSpy.createdIds[0] ?? '', {
      message: 'no create POST id was captured for the new performance remark',
    })
    .not.toBe('');
  const id = performanceRemarkCreateSpy.createdIds[0];
  world.performanceRemarkId = id;
  await performanceRemarksTabPage.expectRemarkListed(id, world.performanceRemarkExpectedDesc as string);
});

Then('the saved remark should match what I entered', async ({ request, world }) => {
  const scaler = world.performanceRemarkScalerLicenceNo as string;
  const rec = await readRemarkById(request, scaler, world.performanceRemarkId as string);
  expect(rec.performanceRemarkDesc).toBe(world.performanceRemarkExpectedDesc);
  // Key off the arm the scenario explicitly recorded — never infer it from the description text (two
  // fixtures could share a description and silently assert the wrong code). Exactly one code is stored.
  if (world.performanceRemarkExpectedIssueType === 'Outcome') {
    expect(rec.scalerPerformanceOutcmCode).toBe(outcomeCode);
    expect(rec.scalerPerformanceActnCode).toBeNull();
    expect(rec.loggedTimestamp).toBe(happyOutcomeRemark.dateOfIncident);
  } else {
    expect(rec.scalerPerformanceActnCode).toBe(actionCode);
    expect(rec.scalerPerformanceOutcmCode).toBeNull();
    expect(rec.loggedTimestamp).toBe(happyActionRemark.dateOfIncident);
  }
});

Then('the saved remark should reference the linked check scale', async ({ request, world }) => {
  const scaler = world.performanceRemarkScalerLicenceNo as string;
  const rec = await readRemarkById(request, scaler, world.performanceRemarkId as string);
  expect(rec.checkScaleId).toBe(Number(validCheckScaleId));
});

Then('no performance-remark create request should be sent', async ({ performanceRemarkCreateCalls }) => {
  expect(performanceRemarkCreateCalls()).toBe(0);
});

// Server-side rejection (well-formed but non-existent check scale): the write DID leave the browser (>=1
// POST) but no row was persisted (no 2xx, so the spy captured no id and nothing was registered for cleanup).
Then('the create request should be rejected with nothing persisted', async ({ performanceRemarkCreateCalls, performanceRemarkCreateSpy }) => {
  expect(performanceRemarkCreateCalls()).toBeGreaterThanOrEqual(1);
  expect(performanceRemarkCreateSpy.createdIds).toHaveLength(0);
});

// --- update read-backs ---

Then('the remark should be updated to my new Description', async ({ request, world }) => {
  const scaler = world.performanceRemarkScalerLicenceNo as string;
  const rec = await readRemarkById(request, scaler, world.performanceRemarkId as string);
  expect(rec.performanceRemarkDesc).toBe(world.performanceRemarkExpectedDesc);
});

Then('the remark should still have its original Description', async ({ request, world }) => {
  const scaler = world.performanceRemarkScalerLicenceNo as string;
  const rec = await readRemarkById(request, scaler, world.performanceRemarkId as string);
  // The seed uses the Action happy-path description; a client-blocked update must not have changed it.
  expect(rec.performanceRemarkDesc).toBe(happyActionRemark.description);
});

Then('no performance-remark update request should be sent', async ({ performanceRemarkUpdateCalls }) => {
  expect(performanceRemarkUpdateCalls()).toBe(0);
});

// Server-side rejection of an EDIT (well-formed but non-existent check scale): the PUT DID leave the browser
// (>= 1) but the backend refused it, so the persisted remark is untouched. Assert the field the row actually
// mutated — checkScaleId stays null (the seed never links one) — not just the Description, which this row
// never edits and so would hold even if the bad PUT had persisted.
Then('the update request should be rejected leaving the remark unchanged', async ({ request, world, performanceRemarkUpdateCalls }) => {
  expect(performanceRemarkUpdateCalls()).toBeGreaterThanOrEqual(1);
  const scaler = world.performanceRemarkScalerLicenceNo as string;
  const rec = await readRemarkById(request, scaler, world.performanceRemarkId as string);
  expect(rec.checkScaleId).toBeNull();
  expect(rec.performanceRemarkDesc).toBe(happyActionRemark.description);
});
