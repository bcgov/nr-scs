import type { APIRequestContext } from '@playwright/test';

import { Then, expect } from '../../../fixtures';

/**
 * MNT read-back / state assertions for Maintain Signatories. Success -> API read-back by the
 * server-assigned id; client-side rejection -> zero mutation calls; delete -> record absent (polled).
 * Endpoints: GET /api/signature-blocks?lastName=<x> (search), GET /api/signature-blocks/{id} (by id).
 */

type SignatoryDetail = {
  scaleSignatoryBlockId: number;
  orgUnitNo: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  signatureTitle: string;
};

async function fetchById(request: APIRequestContext, id: string): Promise<SignatoryDetail | undefined> {
  const res = await request.get(`/api/signature-blocks/${encodeURIComponent(id)}`);
  if (res.status() === 404) return undefined;
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as SignatoryDetail;
}

// Capture the server-assigned id from the view (the app forwards to it on create success), set it in
// world, and register it for cleanup — BEFORE any assertion that might fail. The backend search does not
// filter by last name, so the view's Block # field is the reliable source of the new id.
Then('the created signatory is registered for cleanup', async ({ signatureBlocksPage, world, createdSignatureBlockIds }) => {
  const id = await signatureBlocksPage.readCreatedBlockId();
  world.signatoryId = id;
  if (!createdSignatureBlockIds.includes(id)) createdSignatureBlockIds.push(id);
});

Then('the signatory should be shown in the view', async ({ signatureBlocksPage, world }) => {
  const body = world.signatureBlockBody;
  if (!body) throw new Error('[verify] no signatureBlockBody in world');
  // buildFullName renders "Last, First" (no middle here).
  await signatureBlocksPage.expectViewValue('#view-block-name', `${body.lastName}, ${body.firstName}`);
});

Then('the signatory view should show the seeded values', async ({ signatureBlocksPage, world }) => {
  const body = world.signatureBlockBody;
  if (!body) throw new Error('[verify] no signatureBlockBody in world — seed one first');
  await signatureBlocksPage.expectViewValue('#view-block-name', `${body.lastName}, ${body.firstName}`);
  await signatureBlocksPage.expectViewValue('#view-block-position', body.signatureTitle);
});

Then('the saved signatory should match the submitted values', async ({ request, world }) => {
  const body = world.signatureBlockBody;
  if (!body || !world.signatoryId) throw new Error('[verify] no signatureBlockBody / signatoryId in world');
  // POLL: the save is UI-triggered (async); poll on the Position (mutated on edit) until it settles.
  let detail: SignatoryDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchById(request, world.signatoryId!);
        return detail?.signatureTitle;
      },
      { timeout: 10_000, message: `signatory ${world.signatoryId} did not reflect the submitted values after save` },
    )
    .toBe(body.signatureTitle);
  expect(detail!.firstName).toBe(body.firstName);
  expect(detail!.lastName).toBe(body.lastName);
  expect(detail!.orgUnitNo).toBe(body.orgUnitNo);
});

Then('no create-signatory request should be sent', async ({ createSignatoryCalls }) => {
  expect(createSignatoryCalls()).toBe(0);
});

Then('no update-signatory request should be sent', async ({ updateSignatoryCalls }) => {
  expect(updateSignatoryCalls()).toBe(0);
});

Then('the signatory should no longer exist', async ({ request, world }) => {
  if (!world.signatoryId) throw new Error('[verify] no signatory id in world');
  await expect
    .poll(async () => ((await fetchById(request, world.signatoryId!)) ? 1 : 0), {
      timeout: 10_000,
      message: `deleted signatory ${world.signatoryId} still resolves on read-back`,
    })
    .toBe(0);
});

Then('the signatory should still exist', async ({ request, world }) => {
  if (!world.signatoryId) throw new Error('[verify] no signatory id in world');
  expect(await fetchById(request, world.signatoryId), `expected signatory ${world.signatoryId} to still exist`).toBeTruthy();
});
