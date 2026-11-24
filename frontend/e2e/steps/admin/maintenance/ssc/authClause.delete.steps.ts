import { When } from '../../../fixtures';

/** SSC delete flow — the shared ConfirmDeleteModal opened from the Authorization Clause View modal. */

When('I delete the authorization clause and confirm', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.openDeleteConfirm();
  await authorizationClausesPage.confirmDelete();
});

When('I delete the authorization clause and cancel', async ({ authorizationClausesPage }) => {
  await authorizationClausesPage.openDeleteConfirm();
  await authorizationClausesPage.cancelDelete();
});
