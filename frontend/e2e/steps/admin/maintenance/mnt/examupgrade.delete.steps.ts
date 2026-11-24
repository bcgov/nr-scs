import { When } from '../../../fixtures';

/** MNT delete flow — the shared ConfirmDeleteModal opened from the Exam/Upgrade View modal. */

When('I delete the exam upgrade and confirm', async ({ examUpgradesPage }) => {
  await examUpgradesPage.openDeleteConfirm();
  await examUpgradesPage.confirmDelete();
});

When('I delete the exam upgrade and cancel', async ({ examUpgradesPage }) => {
  await examUpgradesPage.openDeleteConfirm();
  await examUpgradesPage.cancelDelete();
});
