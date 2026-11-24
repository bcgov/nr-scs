import { When, Then, Given, expect } from '../fixtures';
import { appointmentDeleteSeedClientNumber, deleteConfirmMessage } from '../../fixtures/scl/scaler-appointment-test-data';

/**
 * SCL steps for Delete Scaler Appointment (UC-SCL-006) — the Appointments-tab row "Delete" → confirmation
 * modal (CNF-001 "Are you sure…") → DELETE /api/scalers/{no}/appointments/{id}. DOM in ScalerAppointmentsPage.
 * The happy path seeds a scaler, deletes its (only, intrinsic) appointment via the UI, and proves removal by
 * an API read-back (0 appointments) + the empty-list message (folds in legacy S03). The cancel path opens the
 * confirm on the anchor scaler READ-ONLY and clicks Cancel — no DELETE fires (spy === 0), nothing mutates.
 *
 * Reuses the Appointments-tab open steps from scalerAppointment.steps.ts:
 *   "I open the scaler Appointments tab" (seeded scaler) / "I open the Appointments tab for the sample scaler".
 */

Given('a scaler with an appointment to delete', async ({ seedScaler, world }) => {
  world.scalerLicenceNo = await seedScaler(appointmentDeleteSeedClientNumber);
});

When('I click Delete on the appointment row', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.clickRowDelete();
});

Then('I am asked to confirm the appointment deletion', async ({ scalerAppointmentsPage }) => {
  await expect(scalerAppointmentsPage.deleteConfirmModal).toContainText(deleteConfirmMessage);
});

When('I confirm the appointment deletion', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.confirmDelete();
});

When('I cancel the appointment deletion', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.cancelDelete();
});

Then('the appointment is removed', async ({ page, world }) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${world.scalerLicenceNo}/appointments`);
      if (!res.ok()) return null;
      return ((await res.json()) as unknown[]).length;
    })
    .toBe(0);
});

Then('the appointment list shows no appointments', async ({ scalerAppointmentsPage }) => {
  await expect(scalerAppointmentsPage.emptyMessage()).toBeVisible();
});

Then('no appointment delete request is sent', async ({ removeAppointmentCalls }) => {
  expect(removeAppointmentCalls()).toBe(0);
});

// Positive spy assertion (PR #46 B2) — the happy path fires EXACTLY one delete DELETE.
Then('one appointment delete request is sent', async ({ removeAppointmentCalls }) => {
  expect(removeAppointmentCalls()).toBe(1);
});

Then('the appointment delete confirmation is dismissed', async ({ scalerAppointmentsPage }) => {
  await expect(scalerAppointmentsPage.deleteConfirmModal).toBeHidden();
});
