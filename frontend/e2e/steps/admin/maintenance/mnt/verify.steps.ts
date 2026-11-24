import { Then, expect } from '../../../fixtures';

/**
 * MNT read-back and state assertions for Maintain Appointment Types. Prove-the-negative per direction:
 * success -> full API read-back by code; client-side rejection -> zero mutation calls; delete -> record
 * absent (polled). The read-back endpoint is GET /api/appointment-types?code=<code> (returns an array;
 * we match the exact code — there is no GET-by-id).
 */

type AppointmentTypeDetail = {
  code: string;
  description: string;
  actingInd: string;
  effectiveDate: string;
  expiryDate: string;
};

async function fetchByCode(
  request: { get: (url: string) => Promise<{ ok(): boolean; status(): number; text(): Promise<string>; json(): Promise<unknown> }> },
  code: string,
): Promise<AppointmentTypeDetail | undefined> {
  const res = await request.get(`/api/appointment-types?code=${encodeURIComponent(code)}`);
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  const rows = (await res.json()) as AppointmentTypeDetail[];
  return rows.find((r) => r.code === code);
}

// Register the code this scenario created for cleanup BEFORE any assertion that might fail — teardown
// must run even though a later assertion could throw. Idempotent: the code is a known literal (we
// generated it), so no discovery is needed.
Then('the created appointment type is registered for cleanup', async ({ world, createdAppointmentTypeCodes }) => {
  const code = world.appointmentTypeBody?.code;
  if (!code) throw new Error('[verify] no appointmentTypeBody in world — enter an appointment type first');
  if (!createdAppointmentTypeCodes.includes(code)) createdAppointmentTypeCodes.push(code);
});

Then('the appointment type should be shown in the view', async ({ appointmentTypesPage, world }) => {
  const code = world.appointmentTypeBody?.code;
  if (!code) throw new Error('[verify] no appointmentTypeBody in world');
  await appointmentTypesPage.expectViewValue('Appointment Type', code);
});

Then('the appointment type view should show the seeded values', async ({ appointmentTypesPage, world }) => {
  const body = world.appointmentTypeBody;
  if (!body) throw new Error('[verify] no appointmentTypeBody in world — seed one first');
  await appointmentTypesPage.expectViewValue('Appointment Type', body.code);
  await appointmentTypesPage.expectViewValue('Description', body.description);
  await appointmentTypesPage.expectViewValue('Acting?', body.actingInd === 'Y' ? 'Yes' : 'No');
  await appointmentTypesPage.expectViewValue('Effective Date', body.effectiveDate);
  await appointmentTypesPage.expectViewValue('Expiry Date', body.expiryDate);
});

Then('the saved appointment type should match the submitted values', async ({ request, world }) => {
  const body = world.appointmentTypeBody;
  if (!body) throw new Error('[verify] no appointmentTypeBody in world');
  // POLL: the save is UI-triggered (async), so a single-shot GET can race the create/update commit and
  // read stale state. Poll on the description (the mutated field) until it settles, then assert the rest.
  let detail: AppointmentTypeDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchByCode(request, body.code);
        return detail?.description;
      },
      { timeout: 10_000, message: `appointment type ${body.code} did not reflect the submitted values after save` },
    )
    .toBe(body.description);
  expect(detail!.actingInd).toBe(body.actingInd);
  expect(detail!.effectiveDate).toBe(body.effectiveDate);
  expect(detail!.expiryDate).toBe(body.expiryDate);
});

Then('no create-appointment-type request should be sent', async ({ createAppointmentTypeCalls }) => {
  expect(createAppointmentTypeCalls()).toBe(0);
});

Then('no update-appointment-type request should be sent', async ({ updateAppointmentTypeCalls }) => {
  expect(updateAppointmentTypeCalls()).toBe(0);
});

Then('the appointment type should no longer exist', async ({ request, world }) => {
  const code = world.appointmentTypeCode;
  if (!code) throw new Error('[verify] no appointment type code in world');
  // POLL: the UI delete mutation is async, so a single-shot GET can race the commit and still see the row.
  await expect
    .poll(async () => (await fetchByCode(request, code)) ? 1 : 0, {
      timeout: 10_000,
      message: `deleted appointment type ${code} still resolves on read-back`,
    })
    .toBe(0);
});

Then('the appointment type should still exist', async ({ request, world }) => {
  const code = world.appointmentTypeCode;
  if (!code) throw new Error('[verify] no appointment type code in world');
  expect(await fetchByCode(request, code), `expected appointment type ${code} to still exist`).toBeTruthy();
});
