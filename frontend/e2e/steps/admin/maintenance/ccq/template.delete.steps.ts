import { When } from '../../../fixtures';

/** CCQ delete flow for Maintain Templates — the shared ConfirmDeleteModal opened from the view's Delete. */

When('I delete the template and confirm', async ({ templatesPage }) => {
  await templatesPage.openDeleteConfirm();
  await templatesPage.confirmDelete();
});

When('I delete the template and cancel', async ({ templatesPage }) => {
  await templatesPage.openDeleteConfirm();
  await templatesPage.cancelDelete();
});
