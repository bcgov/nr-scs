import { Given, When, Then, expect } from '../fixtures';
import {
  appointmentUpdateSeedClientNumber,
  updatedExpiryDate,
  cancellationReasonText,
  cancellationOutOfRangeDates,
} from '../../fixtures/scl/scaler-appointment-test-data';

/**
 * SCL steps for Update Scaler Appointment (UC-SCL-005) — the Appointments tab row "Edit" → the shared
 * "Scaler Appointment - Edit" modal (PUT /api/scalers/{no}/appointments/{id}). DOM in ScalerAppointmentsPage
 * (shared with add). Every slice SEEDS its own scaler+appointment and operates on it — the happy path edits
 * it IN PLACE (no new row); the validation slices open its edit modal and are blocked client-side (no PUT).
 * Seeding (not a real anchor's pre-existing appointment) keeps these robust to DB drift. The CORE validation
 * (required/date/PW-dist/duration) is identical to add mode and is covered by UC-SCL-004; UC-SCL-005 focuses
 * on the EDIT-ONLY cancellation rules (S07/S08) + one representative core check (S04) + Back (S11).
 */

// --- Given ---------------------------------------------------------------------------------------

Given('a scaler with an appointment exists to update', async ({ seedScaler, world }) => {
  world.scalerLicenceNo = await seedScaler(appointmentUpdateSeedClientNumber);
});

Given('I open the scaler appointment for editing', async ({ scalerAppointmentsPage, world }) => {
  expect(world.scalerLicenceNo, 'a prior step seeded a scaler').toBeTruthy();
  await scalerAppointmentsPage.gotoAppointments(world.scalerLicenceNo as string);
  await scalerAppointmentsPage.openEditModal();
});

// --- When: happy update --------------------------------------------------------------------------

When('I change the appointment expiry date and save', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.setExpiryDate(updatedExpiryDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

// --- When: validation negatives (client-side; no PUT) --------------------------------------------

// S04 — representative core check: clear a required field on the edit form.
When('I clear the appointment effective date and save', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.clearEffectiveDate();
  await scalerAppointmentsPage.clickSaveRecord();
});

// S07 — cancellation reason without a cancellation date (pair incomplete).
When('I enter a cancellation reason without a cancellation date and save', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.setCancellationReason(cancellationReasonText);
  await scalerAppointmentsPage.clickSaveRecord();
});

// S08 — a cancellation date before the appointment effective date (effective/expiry overridden to a known
// short window so only the range rule fires).
When('I enter a cancellation date outside the appointment window and save', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.setEffectiveDate(cancellationOutOfRangeDates.effectiveDate);
  await scalerAppointmentsPage.setExpiryDate(cancellationOutOfRangeDates.expiryDate);
  await scalerAppointmentsPage.setCancellationDate(cancellationOutOfRangeDates.cancellationDate);
  await scalerAppointmentsPage.setCancellationReason(cancellationReasonText);
  await scalerAppointmentsPage.clickSaveRecord();
});

// S11 — open the edit form then leave via Back.
When('I open the appointment edit form and click Back', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.clickBack();
});

// --- Then ----------------------------------------------------------------------------------------

Then('the appointment update is saved', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.expectModalClosed();
});

// The seeded scaler has a single appointment; read its expiry back after the in-place update.
Then('the appointment reads back with the new expiry date', async ({ page, world }) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${world.scalerLicenceNo}/appointments`);
      if (!res.ok()) return null;
      const rows = (await res.json()) as Array<{ expiryDate?: string }>;
      return rows[0]?.expiryDate ?? null;
    })
    .toBe(updatedExpiryDate);
});

Then('I should see the appointment update error {string}', async ({ scalerAppointmentsPage }, message) => {
  await expect(scalerAppointmentsPage.modal.getByText(message, { exact: true }).first()).toBeVisible();
});

Then('no appointment update request is sent', async ({ updateAppointmentCalls }) => {
  expect(updateAppointmentCalls()).toBe(0);
});

// Positive spy assertion (PR #46 B2) — the happy path fires EXACTLY one update PUT.
Then('one appointment update request is sent', async ({ updateAppointmentCalls }) => {
  expect(updateAppointmentCalls()).toBe(1);
});

Then('the appointment edit form is still open', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.expectModalOpen();
});

Then('the appointment edit form is closed', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.expectModalClosed();
});
