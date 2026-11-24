import { Given, Then, When, expect } from '../fixtures';
import { detailCheckScaleViewNonLegacyId } from '../../fixtures/chk/chk-test-data';

/**
 * Steps for the DETAIL (HBCS) Check Scale DELETE flow (UC-CHK-004) — the Delete button + confirm modal
 * on the view screen /check-scales/view/{id}, and its failure surface.
 *
 * Delete IS wired: the confirm handler calls `DELETE /api/check-scales/{id}`, drops the cached tab lists
 * and navigates back (View/CheckScale index.tsx:157-178); a refusal is surfaced as a "Delete failed"
 * banner on the view. Only the scenarios that mutate seed their own disposable record and clean it up at
 * the DB; S02 (cancel) and S07 (legacy Delete disabled) open permanent records read-only.
 *
 * Reuses (do NOT redefine here): `Given I am viewing the non-legacy check scale` +
 * `Given I am viewing the legacy check scale` (view/detail-update steps), `Then the Delete button should
 * be disabled` (view.steps.ts). Read-only-LEGACY server-guard steps live in legacy-guard.steps.ts,
 * shared with UC-CHK-002.
 */

// ---- open a delete target ----

Given('I have created a fresh detail check scale to delete', async ({ seedDetailCheckScaleForEdit, checkScaleViewPage, world }) => {
  // seedDetailCheckScaleForEdit seeds a generic disposable HBCS record via POST /api/check-scales/create
  // and registers it for DB teardown — it is not edit-specific. Parallel-safe under --repeat-each: the
  // only unique index on CHECK_SCALE is the PK, so concurrent creates on the shared HBS pair each get a
  // fresh sequence id and never collide.
  const id = await seedDetailCheckScaleForEdit();
  world.detailCheckScaleId = id;
  await checkScaleViewPage.goto(id);
});

/**
 * Remove the open record out-of-band, so the next Delete click meets a REAL server refusal (404) instead
 * of a stubbed one. Deliberately not a `page.route` fulfil: the point of this scenario is that the app
 * surfaces what the SERVER actually says, and a stub would assert the stub. The record is already
 * registered for teardown, and the DB delete is a no-op once it is gone.
 */
Given('the record has been deleted by someone else in the meantime', async ({ request, world }) => {
  const id = world.detailCheckScaleId;
  expect(id, 'no seeded detail check scale id captured').toBeTruthy();
  const res = await request.delete(`/api/check-scales/${id}`);
  expect(res.status(), `out-of-band delete of ${id} should have succeeded`).toBe(204);
});

// ---- delete actions ----

When('I click Delete', async ({ checkScaleViewPage }) => {
  await checkScaleViewPage.openDeleteModal();
});

When('I click Delete and confirm the deletion', async ({ checkScaleViewPage, world }) => {
  await checkScaleViewPage.openDeleteModal();
  world.deleteStatus = await checkScaleViewPage.confirmDelete();
});

When('I cancel the deletion', async ({ checkScaleViewPage }) => {
  await checkScaleViewPage.cancelDelete();
});

// ---- assertions ----

Then('the delete confirmation dialog should appear', async ({ checkScaleViewPage }) => {
  await expect(checkScaleViewPage.deleteModalHeading).toBeVisible();
});

/**
 * The record is gone. POLLED, not single-shot: the delete was triggered through the UI, so the read-back
 * has to tolerate the request still settling (the suite's read-back rule). `confirmDelete` already awaits
 * the DELETE response, so this normally satisfies on the first probe — the poll is the safety margin, not
 * the mechanism.
 */
Then('the check scale should be deleted', async ({ request, world }) => {
  const id = world.detailCheckScaleId;
  expect(id, 'no seeded detail check scale id captured').toBeTruthy();
  expect(world.deleteStatus, 'the view screen should have issued a DELETE that the server accepted').toBe(204);
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
        return res.ok() ? ((await res.json()) as unknown[]).length : -1;
      },
      { message: `check scale ${id} was still readable after the confirmed delete`, timeout: 10000 },
    )
    .toBe(0);
});

/** The post-delete navigation contract: the view screen for a deleted record is left, not re-rendered. */
Then('I should be taken off the check scale view page', async ({ page }) => {
  await expect(page).not.toHaveURL(/\/check-scales\/view\/\d+$/);
});

Then('the check scale should still exist', async ({ request }) => {
  // S02 opens the permanent non-legacy record (146803) read-only; cancelling must not delete it.
  const res = await request.get(`/api/check-scales/search?checkScaleId=${detailCheckScaleViewNonLegacyId}`);
  expect(res.ok()).toBeTruthy();
  expect((await res.json()) as unknown[]).toHaveLength(1);
});

Then('I should remain on the check scale view page', async ({ page, checkScaleViewPage }) => {
  await expect(page).toHaveURL(/\/check-scales\/view\/\d+$/);
  await expect(checkScaleViewPage.heading).toBeVisible();
});

/**
 * The refusal surface. Asserting the banner alone would pass just as happily if the app had swallowed the
 * error and navigated away, so the status the DELETE actually returned is asserted too — that pairing is
 * what shows the banner is the server's refusal being reported rather than a coincidence.
 */
Then('the delete failure should be reported on the view', async ({ checkScaleViewPage, world }) => {
  expect(
    world.deleteStatus,
    'the server should have refused the delete of an already-deleted record',
  ).toBeGreaterThanOrEqual(400);
  await expect(checkScaleViewPage.deleteFailedBanner).toBeVisible();
  await expect(checkScaleViewPage.deleteModalHeading).toBeHidden();
});
