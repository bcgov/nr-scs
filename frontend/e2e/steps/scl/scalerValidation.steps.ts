import { When, Then, Given, expect } from '../fixtures';
import { onScalerCreate } from './scalerRoutes';
import {
  validCore,
  validAppointment,
  validExam,
  negativeClientNumber,
  absentClientNumber,
  REQUIRED_CORE_FIELD,
} from '../../fixtures/scl/scaler-test-data';

/**
 * SCL validation steps for Create Scaler (UC-SCL-002 S02/S03/S04/S08 + the one-scaler-per-client rule).
 * Negatives PROVE no write: client-side cases assert the create spy === 0; the server-reject cases assert
 * the backend message + staying on the form. DOM lives in the page object.
 */

// S02 — blank ONE required core field; the others are valid and a valid Appointment is filled, so the only
// error is the named field's. `negativeClientNumber` is a real unconsumed client → never persists here
// (client-side blocks the POST), so it can't collide with any create test.
When('I try to save a scaler with the {string} field blank', async ({ scalerCreatePage }, label) => {
  const field = REQUIRED_CORE_FIELD[label];
  if (!field) throw new Error(`Unknown required core field label: "${label}"`);
  await scalerCreatePage.fillCore({ ...validCore(negativeClientNumber), [field.key]: '' });
  await scalerCreatePage.fillAppointment(validAppointment());
  await scalerCreatePage.clickSaveRecord();
});

// S03 — both sections filled (mutual-exclusion).
When('I try to save a scaler with both an appointment and an exam', async ({ scalerCreatePage }) => {
  await scalerCreatePage.fillCore(validCore(negativeClientNumber));
  await scalerCreatePage.fillAppointment(validAppointment());
  await scalerCreatePage.fillExam(validExam());
  await scalerCreatePage.clickSaveRecord();
});

// S04 — neither section filled.
When('I try to save a scaler with neither an appointment nor an exam', async ({ scalerCreatePage }) => {
  await scalerCreatePage.fillCore(validCore(negativeClientNumber));
  await scalerCreatePage.clickSaveRecord();
});

// S08 — a client number absent from the SCS client registry (server-reject).
When('I try to save a scaler for an unknown client', async ({ scalerCreatePage }) => {
  await scalerCreatePage.fillCore(validCore(absentClientNumber));
  await scalerCreatePage.fillAppointment(validAppointment());
  await scalerCreatePage.clickSaveRecord();
});

// One-scaler-per-client (SCLR_UK) — seed a scaler via API, then a UI create on the SAME client is
// server-rejected. Lives in the SERIAL create.feature (the seed generates a licence no).
Given('a scaler already exists for client {string}', async ({ seedScaler }, client) => {
  await seedScaler(client);
});

When('I try to create another scaler for client {string}', async ({ scalerCreatePage }, client) => {
  await scalerCreatePage.fillCore(validCore(client));
  await scalerCreatePage.fillAppointment(validAppointment());
  await scalerCreatePage.clickSaveRecord();
});

// EXACT match: the message renders as its own element (the notification subtitle and the field's
// invalidText), not concatenated with the "Please fix the errors below." title — so exact matching keeps
// "Effective Date is required." from being satisfied by "Appointment Effective Date is required." (the
// outline's "only the named field errors" claim depends on that).
Then('I should see the scaler error {string}', async ({ page }, message) => {
  await expect(page.getByText(message, { exact: true }).first()).toBeVisible();
});

Then('no scaler create request is sent', async ({ createScalerCalls }) => {
  expect(createScalerCalls()).toBe(0);
});

Then('I remain on the Create Scaler form', async ({ page }) => {
  await expect(page).toHaveURL(onScalerCreate);
});
