import { When, Then, expect } from '../fixtures';
import { makeRequire } from '../common/world';

/**
 * Steps for the APP-ONLY Site Inspection DELETE flow (`features/ins/inspection-delete/`).
 *
 * The legacy INS use cases never specified a delete: UC-INS-002's S04 control matrix only lists a
 * permission-gated "Delete" control, with no slice driving it. The new app implements it as a
 * two-step gesture on the read-only view — a danger Button that OPENS a Carbon confirm modal, whose
 * primary action issues DELETE `/api/scale-sites/inspection/{id}`. Ground-truthed by hand on
 * 2026-09-09: 204 on success, then 404 on a re-read (and on a second delete).
 *
 * The two-step shape is why "I click Delete" and "I confirm the deletion" are SEPARATE steps: a test
 * that clicked only the danger button and then asserted the record was gone would pass for the wrong
 * reason if the button ever started deleting directly, and — the trap the role-probe suites hit — a
 * test that clicks only the button proves nothing about whether a delete is reachable at all.
 *
 * Records are always ones the scenario seeded itself, never the shared real anchor the security suites
 * read; the cleanup registry's DELETE tolerates the 404 a successfully-deleted record returns.
 */

/** Reads required scenario state; see `steps/common/world.ts`. */
const req = makeRequire('ins-delete');

// --- the two-step gesture -----------------------------------------------------------------------

When('I click Delete on the inspection view', async ({ inspectionViewPage }) => {
  await inspectionViewPage.clickDelete();
});

Then('the delete confirmation prompt is shown', async ({ inspectionViewPage }) => {
  await inspectionViewPage.expectDeleteConfirmModal();
});

When('I confirm the inspection deletion', async ({ inspectionViewPage }) => {
  await inspectionViewPage.confirmDelete();
});

When('I cancel the inspection deletion', async ({ inspectionViewPage }) => {
  await inspectionViewPage.cancelDelete();
});

Then('the delete confirmation prompt is closed', async ({ inspectionViewPage }) => {
  await inspectionViewPage.expectDeleteConfirmModalClosed();
});

// --- outcomes -----------------------------------------------------------------------------------

Then('that inspection is no longer listed', async ({ inspectionsTabPage, world }) => {
  await inspectionsTabPage.expectInspectionNotListed(req(world.inspectionId, 'inspectionId'));
});

Then('the inspection no longer exists', async ({ inspectionDetailStatus, world }) => {
  const id = req(world.inspectionId, 'inspectionId');
  // The delete was UI-triggered, so the DELETE commits asynchronously after the confirm click — poll
  // rather than single-shotting, or the read can beat the commit and still see HTTP 200.
  await expect
    .poll(() => inspectionDetailStatus(id), {
      message: `inspection ${id} is still readable after a confirmed delete`,
      timeout: 20_000,
    })
    .toBe(404);
});

Then('the inspection still exists', async ({ inspectionDetailStatus, world }) => {
  const id = req(world.inspectionId, 'inspectionId');
  expect(
    await inspectionDetailStatus(id),
    `inspection ${id} was removed although the delete was not confirmed`,
  ).toBe(200);
});

Then('no inspection delete request should be sent', async ({ inspectionDeleteCalls }) => {
  expect(
    inspectionDeleteCalls(),
    'a DELETE reached /api/scale-sites/inspection/{id} — the record was removed without a confirmation',
  ).toBe(0);
});

Then('the inspection delete failure is reported', async ({ inspectionViewPage }) => {
  await inspectionViewPage.expectDeleteFailedBanner();
});
