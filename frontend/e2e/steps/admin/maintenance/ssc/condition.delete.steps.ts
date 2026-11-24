import { When } from '../../../fixtures';

/** SSC delete flow — the shared ConfirmDeleteModal (happy) or the dependents-blocked warning path. */

When('I delete the condition and confirm', async ({ conditionsPage }) => {
  await conditionsPage.openDeleteConfirm();
  await conditionsPage.confirmDelete();
});

// Dependent record: clicking Delete runs checkDependents, sets deleteBlocked, and swaps the Delete button
// for a "Cannot delete" warning — no confirm dialog appears.
When('I attempt to delete the dependent condition', async ({ conditionsPage }) => {
  await conditionsPage.clickDelete();
});
