import { Given, When, Then, expect } from '../fixtures';
import { anchorScalerLicenceNo } from '../../fixtures/scl/scaler-edit-test-data';
import {
  appointmentSeedClientNumber,
  addAppointmentTypeLabel,
  addAppointmentGrading,
  appointmentDistrictOrgUnitNo,
  appointmentEffectiveDate,
  expiryBeforeEffectiveDates,
  durationExceededDates,
  REQUIRED_APPOINTMENT_FIELD,
} from '../../fixtures/scl/scaler-appointment-test-data';

/**
 * SCL steps for Add Scaler Appointment (UC-SCL-004) — the Appointments tab + "Scaler Appointment - Create"
 * modal. DOM lives in ScalerAppointmentsPage. Happy paths seed a parent scaler, add an appointment (type
 * 'Acting - Interior' A/I — distinct from the seed's intrinsic A/C so the read-back finds the added one by
 * grading), and prove it with an API read-back; the added appointment is torn down before the scaler.
 * Validation slices open the anchor scaler's Add modal READ-ONLY — blocked client-side (no POST fires).
 */

// --- Given ---------------------------------------------------------------------------------------

Given('a scaler exists to add appointments to', async ({ seedScaler, world }) => {
  world.scalerLicenceNo = await seedScaler(appointmentSeedClientNumber);
});

Given('I open the scaler Appointments tab', async ({ scalerAppointmentsPage, world }) => {
  expect(world.scalerLicenceNo, 'a prior step seeded a scaler').toBeTruthy();
  await scalerAppointmentsPage.gotoAppointments(world.scalerLicenceNo as string);
});

Given('I open the Appointments tab for the sample scaler', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.gotoAppointments(anchorScalerLicenceNo);
});

// --- When: happy-path adds -----------------------------------------------------------------------

When('I add a province-wide appointment', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.openAddModal();
  await scalerAppointmentsPage.setAppointmentType(addAppointmentTypeLabel);
  await scalerAppointmentsPage.setProvinceWide('Y');
  await scalerAppointmentsPage.setEffectiveDate(appointmentEffectiveDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

When('I add a district-specific appointment', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.openAddModal();
  await scalerAppointmentsPage.setAppointmentType(addAppointmentTypeLabel);
  await scalerAppointmentsPage.setProvinceWide('N');
  await scalerAppointmentsPage.setDistrict(appointmentDistrictOrgUnitNo);
  await scalerAppointmentsPage.setEffectiveDate(appointmentEffectiveDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

// --- When: validation negatives (client-side; no POST) -------------------------------------------

// S03 — omit one required field; fill the rest validly, so ONLY the omitted field errors.
When('I try to add an appointment with the {string} field omitted', async ({ scalerAppointmentsPage }, label) => {
  const field = REQUIRED_APPOINTMENT_FIELD[label];
  if (!field) throw new Error(`Unknown required appointment field label: "${label}"`);
  await scalerAppointmentsPage.openAddModal();
  if (field.omit !== 'appointment') await scalerAppointmentsPage.setAppointmentType(addAppointmentTypeLabel);
  if (field.omit !== 'provinceWide') await scalerAppointmentsPage.setProvinceWide('Y');
  if (field.omit !== 'effectiveDate') await scalerAppointmentsPage.setEffectiveDate(appointmentEffectiveDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

When('I try to add an appointment with an expiry before the effective date', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.openAddModal();
  await scalerAppointmentsPage.setAppointmentType(addAppointmentTypeLabel);
  await scalerAppointmentsPage.setProvinceWide('Y');
  await scalerAppointmentsPage.setEffectiveDate(expiryBeforeEffectiveDates.effectiveDate);
  await scalerAppointmentsPage.setExpiryDate(expiryBeforeEffectiveDates.expiryDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

// S06 — an Acting (type A) appointment whose period exceeds the 1-year cap.
When('I try to add an appointment exceeding the maximum period', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.openAddModal();
  await scalerAppointmentsPage.setAppointmentType(addAppointmentTypeLabel);
  await scalerAppointmentsPage.setProvinceWide('Y');
  await scalerAppointmentsPage.setEffectiveDate(durationExceededDates.effectiveDate);
  await scalerAppointmentsPage.setExpiryDate(durationExceededDates.expiryDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

// S07 — Province Wide? = No with no Reg/Dist selected.
When('I try to add a non-province-wide appointment without a district', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.openAddModal();
  await scalerAppointmentsPage.setAppointmentType(addAppointmentTypeLabel);
  await scalerAppointmentsPage.setProvinceWide('N');
  await scalerAppointmentsPage.setEffectiveDate(appointmentEffectiveDate);
  await scalerAppointmentsPage.clickSaveRecord();
});

// S09 — open the Add form then leave via Back (no save).
When('I open the add-appointment form and click Back', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.openAddModal();
  await scalerAppointmentsPage.clickBack();
});

// --- Then ----------------------------------------------------------------------------------------

Then('the appointment is added', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.expectModalClosed();
});

// Read-back finds the ADDED appointment by its distinct grading ('I'); the seed's intrinsic one is A/C.
Then('the added appointment reads back as province-wide', async ({ page, world }) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${world.scalerLicenceNo}/appointments`);
      if (!res.ok()) return null;
      const added = ((await res.json()) as Array<{ scaleGradingSystemCode?: string; provinceWideInd?: string }>).find(
        (a) => a.scaleGradingSystemCode === addAppointmentGrading,
      );
      return added ? `${added.provinceWideInd}` : null;
    })
    .toBe('Y');
});

Then('the added appointment reads back as district-specific for {string}', async ({ page, world }, orgUnitNo) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${world.scalerLicenceNo}/appointments`);
      if (!res.ok()) return null;
      const added = ((await res.json()) as Array<{ scaleGradingSystemCode?: string; provinceWideInd?: string; orgUnitNo?: number }>).find(
        (a) => a.scaleGradingSystemCode === addAppointmentGrading,
      );
      return added ? `${added.provinceWideInd}|${added.orgUnitNo}` : null;
    })
    .toBe(`N|${orgUnitNo}`);
});

Then('I should see the appointment error {string}', async ({ scalerAppointmentsPage }, message) => {
  await expect(scalerAppointmentsPage.modal.getByText(message, { exact: true }).first()).toBeVisible();
});

Then('no appointment request is sent', async ({ createAppointmentCalls }) => {
  expect(createAppointmentCalls()).toBe(0);
});

// Positive spy assertion (PR #46 B2) — the happy path fires EXACTLY one create POST. Guards against a dead
// spy: if the counter never increments, this fails loud instead of the negatives passing vacuously.
Then('one appointment create request is sent', async ({ createAppointmentCalls }) => {
  expect(createAppointmentCalls()).toBe(1);
});

Then('the add-appointment form is still open', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.expectModalOpen();
});

Then('the add-appointment form is closed', async ({ scalerAppointmentsPage }) => {
  await scalerAppointmentsPage.expectModalClosed();
});
