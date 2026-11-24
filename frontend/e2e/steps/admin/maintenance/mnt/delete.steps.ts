import { When } from '../../../fixtures';

/** MNT delete flow — the in-page confirm modal opened from the View modal's Delete button. */

When('I delete the appointment type and confirm', async ({ appointmentTypesPage }) => {
  await appointmentTypesPage.openDeleteConfirm();
  await appointmentTypesPage.confirmDelete();
});
