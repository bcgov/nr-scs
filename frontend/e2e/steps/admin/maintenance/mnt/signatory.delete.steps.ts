import { When } from '../../../fixtures';

/** MNT delete flow — the shared ConfirmDeleteModal opened from the Signatory View modal's Delete button. */

When('I delete the signatory and confirm', async ({ signatureBlocksPage }) => {
  await signatureBlocksPage.openDeleteConfirm();
  await signatureBlocksPage.confirmDelete();
});

When('I delete the signatory and cancel', async ({ signatureBlocksPage }) => {
  await signatureBlocksPage.openDeleteConfirm();
  await signatureBlocksPage.cancelDelete();
});
