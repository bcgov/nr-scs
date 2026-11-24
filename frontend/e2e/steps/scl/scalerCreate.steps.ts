import { Given, When, Then, expect } from '../fixtures';
import {
  validCore,
  validAppointment,
  validExam,
  appointmentClientNumber,
  examClientNumber,
} from '../../fixtures/scl/scaler-test-data';

/**
 * SCL-domain steps for the Create Scaler screen (UC-SCL-002). DOM lives in the page object; these read
 * as reusable domain language. Success is PROVEN by a full API read-back of the persisted record (client
 * + licence type + the chosen appointment/exam), never inferred from the redirect. Each happy path owns a
 * DISTINCT client, so the two run in parallel safely.
 */

Given('I am on the Create Scaler form', async ({ scalerCreatePage }) => {
  await scalerCreatePage.goto();
});

When('I create a scaler with an appointment', async ({ scalerCreatePage, world }) => {
  world.scalerClient = appointmentClientNumber;
  await scalerCreatePage.createWithAppointment(validCore(appointmentClientNumber), validAppointment());
});

When('I create a scaler with an exam', async ({ scalerCreatePage, world }) => {
  world.scalerClient = examClientNumber;
  await scalerCreatePage.createWithExam(validCore(examClientNumber), validExam());
});

Then('the scaler is created', async ({ scalerCreatePage, world }) => {
  // Cleanup registration is handled the instant the create RESPONSE arrives (createdScalerCapture fixture),
  // so an interrupted redirect wait can't leak the scaler. Here we only capture the licence no (from the
  // redirect URL) for the read-back assertions.
  world.scalerLicenceNo = await scalerCreatePage.createdLicenceNo();
});

// Full API read-back of the persisted record (not the redirect). UI-triggered write => bounded poll.
Then('the created scaler reads back with its client and a Scaling licence', async ({ page, world }) => {
  const no = world.scalerLicenceNo;
  expect(no, 'world.scalerLicenceNo set by "the scaler is created"').toBeTruthy();
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${no}`);
      if (!res.ok()) return null;
      const body = (await res.json()) as { clientNumber?: string; licenceTypes?: string[] };
      return `${body.clientNumber}|${(body.licenceTypes ?? []).includes('SCS')}`;
    })
    .toBe(`${world.scalerClient}|true`);
});

Then('the created scaler has an appointment', async ({ page, world }) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${world.scalerLicenceNo}`);
      if (!res.ok()) return false;
      return Boolean(((await res.json()) as { appointment?: unknown }).appointment);
    })
    .toBe(true);
});

Then('the created scaler has an exam', async ({ page, world }) => {
  await expect
    .poll(async () => {
      const res = await page.request.get(`/api/scalers/${world.scalerLicenceNo}`);
      if (!res.ok()) return false;
      return Boolean(((await res.json()) as { exam?: unknown }).exam);
    })
    .toBe(true);
});
