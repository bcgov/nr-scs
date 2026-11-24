import type { APIRequestContext } from '@playwright/test';

import { Then, expect } from '../../../fixtures';

/**
 * MNT read-back / state assertions for Maintain Valid Licence Attributes. The composite key
 * (gradingSystemCode, appointmentType) is chosen up front, so read-back needs no id discovery.
 */

type VlaDetail = {
  scaleGradingSystemCode: string;
  scalerAppointmentType: string;
  effectiveDate: string;
  expiryDate: string | null;
};

async function fetchByKey(request: APIRequestContext, grading: string, appt: string): Promise<VlaDetail | undefined> {
  const res = await request.get(`/api/valid-licence-attributes/${encodeURIComponent(grading)}/${encodeURIComponent(appt)}`);
  if (res.status() === 404) return undefined;
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as VlaDetail;
}

// Register the composite key for cleanup BEFORE any assertion — the key is known (we chose it), so no
// discovery is needed. Idempotent.
Then('the created licence attribute is registered for cleanup', async ({ world, createdVlaKeys }) => {
  const grading = world.vlaGradingSystemCode;
  const appt = world.vlaAppointmentType;
  if (!grading || !appt) throw new Error('[verify] no VLA key in world — enter a licence attribute first');
  if (!createdVlaKeys.some((k) => k.gradingSystemCode === grading && k.appointmentType === appt)) {
    createdVlaKeys.push({ gradingSystemCode: grading, appointmentType: appt });
  }
});

Then('the licence attribute should be shown in the view', async ({ vlaPage, world }) => {
  if (!world.vlaAppointmentType) throw new Error('[verify] no VLA appointment type in world');
  await vlaPage.expectViewValue('#view-vla-appointment-type', world.vlaAppointmentType);
});

Then('the saved licence attribute should match the submitted values', async ({ request, world }) => {
  const body = world.vlaBody;
  const grading = world.vlaGradingSystemCode;
  const appt = world.vlaAppointmentType;
  if (!body || !grading || !appt) throw new Error('[verify] missing VLA key/body in world');
  let detail: VlaDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchByKey(request, grading, appt);
        return detail?.effectiveDate;
      },
      { timeout: 10_000, message: `VLA ${grading}/${appt} did not reflect the submitted values after save` },
    )
    .toBe(body.effectiveDate);
  expect(detail!.expiryDate).toBe(body.expiryDate);
});

Then('no create-licence-attribute request should be sent', async ({ createVlaCalls }) => {
  expect(createVlaCalls()).toBe(0);
});

Then('I should see the delete-blocked warning', async ({ vlaPage }) => {
  await vlaPage.expectDeleteBlocked();
});

Then('the licence attribute should still exist', async ({ request, world }) => {
  const grading = world.vlaGradingSystemCode;
  const appt = world.vlaAppointmentType;
  if (!grading || !appt) throw new Error('[verify] no VLA key in world');
  expect(await fetchByKey(request, grading, appt), `expected VLA ${grading}/${appt} to still exist`).toBeTruthy();
});
