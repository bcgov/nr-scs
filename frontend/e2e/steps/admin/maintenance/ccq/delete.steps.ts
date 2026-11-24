import { When } from '../../../fixtures';

/** CCQ delete flow — the shared ConfirmDeleteModal component, opened from the View modal's Delete button. */

When('I delete the question and confirm', async ({ questionsPage }) => {
  await questionsPage.openDeleteConfirm();
  await questionsPage.confirmDelete();
});

When('I delete the question and cancel', async ({ questionsPage }) => {
  await questionsPage.openDeleteConfirm();
  await questionsPage.cancelDelete();
});
