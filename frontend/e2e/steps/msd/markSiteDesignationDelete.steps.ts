import { When, Then, expect } from '../fixtures';
import { onView } from './markSiteDesignationRoutes';

/**
 * UC-MSD-004 — Delete Mark Site Designation. The new app has NO hard delete: the MSD View screen's
 * "Delete" button pops a `window.confirm` and, on accept, calls POST /api/mark-site-designations/{id}/
 * workbench/remove (sets the expiry-notification indicator) then navigates to /welcome — a SOFT
 * workbench-remove, not the legacy hard cascade-delete, and with no letter/scale-site/role gating. That
 * legacy→new gap is filed as defects.md Divergence #1 (suspected-intentional). These steps drive the
 * MarkSiteDesignationViewPage; negatives PROVE no write via the workbench-remove spy (removeMsdCalls===0).
 *
 * Reused Givens (defined elsewhere): "a mark site designation exists" (seeds a fresh letterless,
 * no-scale-site MSD via the API + registers DB cleanup — markSiteDesignationUpdate.steps.ts) and
 * "I open the Mark Site Designation view for the rich sample record" (a real read-only record —
 * markSiteDesignationView.steps.ts).
 */

When('I open the seeded mark site designation in the view screen', async ({ markSiteDesignationViewPage, world }) => {
  expect(world.msdId, 'world.msdId set by a Given seed step').toBeTruthy();
  await markSiteDesignationViewPage.goto(world.msdId as string);
  await markSiteDesignationViewPage.waitReady();
});

When('I confirm the delete', async ({ markSiteDesignationViewPage, world }) => {
  world.deleteConfirmMessage = await markSiteDesignationViewPage.confirmDelete();
});

When('I cancel the delete', async ({ markSiteDesignationViewPage, world }) => {
  world.deleteConfirmMessage = await markSiteDesignationViewPage.cancelDelete();
});

Then('the delete confirmation asked {string}', async ({ world }, message) => {
  expect(world.deleteConfirmMessage).toBe(message);
});

// The app awaits the workbench-remove POST, THEN navigates — so once we are on /welcome the POST has
// certainly fired. Assert the landing first (web-first), then the spy count is stable.
Then('I land on the welcome page', async ({ page }) => {
  await expect(page).toHaveURL(/\/welcome/);
});

Then('a workbench-remove request was sent', async ({ removeMsdCalls }) => {
  expect(removeMsdCalls()).toBe(1);
});

Then('no workbench-remove request is sent', async ({ removeMsdCalls }) => {
  expect(removeMsdCalls()).toBe(0);
});

Then('I remain on the Mark Site Designation view', async ({ page, markSiteDesignationViewPage }) => {
  await expect(page).toHaveURL(onView);
  await expect(markSiteDesignationViewPage.heading).toBeVisible();
});

// Documents the current soft-remove behaviour (Divergence #1): the record is NOT hard-deleted — a GET
// still returns it (HTTP 200). UI-triggered write => bounded poll, never single-shot.
Then('the mark site designation still exists', async ({ page, world }) => {
  const id = world.msdId;
  await expect
    .poll(async () => (await page.request.get(`/api/mark-site-designations/${id}`)).status())
    .toBe(200);
});
