import { When, Then } from '../fixtures';
import { expectRemarkAbsentById, readRemarkById } from './readBack';

/** Delete steps for Performance Remarks (UC-PRF-003) — the one Carbon confirm modal in this feature. */

When('I delete that remark', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.clickDeleteForRow(world.performanceRemarkId as string);
});

When('I confirm the deletion', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.confirmDelete();
});

When('I cancel the delete confirmation', async ({ performanceRemarksTabPage }) => {
  await performanceRemarksTabPage.cancelDelete();
});

Then('the remark should no longer be listed', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.expectRemarkNotListed(world.performanceRemarkId as string);
});

Then('the remark should be gone from the database', async ({ request, world }) => {
  await expectRemarkAbsentById(
    request,
    world.performanceRemarkScalerLicenceNo as string,
    world.performanceRemarkId as string,
  );
});

Then('the remark should still be listed', async ({ performanceRemarksTabPage, world }) => {
  await performanceRemarksTabPage.expectRemarkListed(world.performanceRemarkId as string);
});

Then('the remark should still exist in the database', async ({ request, world }) => {
  // Poll the list until the row is present (a no-op delete must have left it intact).
  await readRemarkById(
    request,
    world.performanceRemarkScalerLicenceNo as string,
    world.performanceRemarkId as string,
  );
});
