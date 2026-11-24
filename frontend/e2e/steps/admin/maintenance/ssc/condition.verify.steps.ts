import type { APIRequestContext } from '@playwright/test';

import { CLASS_LABEL, DELETE_BLOCKED_SNIPPET } from '../../../../fixtures/admin/maintenance/condition-test-data';
import { Then, expect } from '../../../fixtures';

/**
 * SSC read-back / state assertions for Maintain Conditions. Read-back is by the COMPOSITE key
 * GET /api/conditions/{classCode}/{id}; the server-assigned id is read from the view.
 */

type ConditionDetail = {
  scaleConditionClassCode: string;
  scaleAuthConditionId: number;
  scaleAuthConditionTitle: string;
  scaleAuthConditionDesc: string;
  ministryStandardInd: string;
  sortOrderNo: number;
  effectiveDate: string;
  expiryDate: string | null;
  siteMethodTypeCodes: string[] | null;
};

async function fetchByKey(request: APIRequestContext, classCode: string, id: string): Promise<ConditionDetail | undefined> {
  const res = await request.get(`/api/conditions/${encodeURIComponent(classCode)}/${encodeURIComponent(id)}`);
  if (res.status() === 404) return undefined;
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as ConditionDetail;
}

// Capture the server-assigned id from the view (forwarded to on create success), set it in world, and
// register the composite key for cleanup — BEFORE any assertion that might fail.
Then('the created condition is registered for cleanup', async ({ conditionsPage, world, createdConditionKeys }) => {
  const id = await conditionsPage.readCreatedConditionId();
  const classCode = world.conditionClassCode;
  if (!classCode) throw new Error('[verify] no conditionClassCode in world — enter a condition first');
  world.conditionId = id;
  if (!createdConditionKeys.some((k) => k.classCode === classCode && k.id === id)) {
    createdConditionKeys.push({ classCode, id });
  }
});

Then('the condition should be shown in the view', async ({ conditionsPage, world }) => {
  const body = world.conditionBody;
  if (!body) throw new Error('[verify] no conditionBody in world');
  await conditionsPage.expectViewValue('#view-condition-title', body.title);
});

Then('the condition view should show the seeded values', async ({ conditionsPage, world }) => {
  const body = world.conditionBody;
  if (!body) throw new Error('[verify] no conditionBody in world — seed one first');
  await conditionsPage.expectViewValue('#view-condition-title', body.title);
  await conditionsPage.expectViewValue('#view-condition-type', CLASS_LABEL[body.classCode] ?? body.classCode);
  await conditionsPage.expectViewValue('#view-condition-mandatory', body.ministryStandardInd === 'Y' ? 'Yes' : 'No');
  await conditionsPage.expectViewValue('#view-condition-sort', body.sortOrderNo);
  await conditionsPage.expectViewValue('#view-condition-effective', body.effectiveDate);
  await conditionsPage.expectViewValue('#view-condition-expiry', body.expiryDate);
  await conditionsPage.expectViewValue('#view-condition-text', body.desc);
});

Then('the saved condition should match the submitted values', async ({ request, world }) => {
  const body = world.conditionBody;
  const classCode = world.conditionClassCode;
  const id = world.conditionId;
  if (!body || !classCode || !id) throw new Error('[verify] missing condition key/body in world');
  let detail: ConditionDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchByKey(request, classCode, id);
        return detail?.scaleAuthConditionTitle;
      },
      { timeout: 10_000, message: `condition ${classCode}/${id} did not reflect the submitted values after save` },
    )
    .toBe(body.title);
  expect(detail!.scaleAuthConditionDesc).toBe(body.desc);
  expect(detail!.ministryStandardInd).toBe(body.ministryStandardInd);
  expect(String(detail!.sortOrderNo)).toBe(body.sortOrderNo);
  expect(detail!.effectiveDate).toBe(body.effectiveDate);
  expect(detail!.expiryDate).toBe(body.expiryDate);
  expect(detail!.siteMethodTypeCodes ?? []).toEqual(body.siteMethodTypeCodes);
});

Then('no create-condition request should be sent', async ({ createConditionCalls }) => {
  expect(createConditionCalls()).toBe(0);
});

Then('no update-condition request should be sent', async ({ updateConditionCalls }) => {
  expect(updateConditionCalls()).toBe(0);
});

Then('the condition should no longer exist', async ({ request, world }) => {
  const { conditionClassCode: classCode, conditionId: id } = world;
  if (!classCode || !id) throw new Error('[verify] no condition key in world');
  await expect
    .poll(async () => ((await fetchByKey(request, classCode, id)) ? 1 : 0), {
      timeout: 10_000,
      message: `deleted condition ${classCode}/${id} still resolves on read-back`,
    })
    .toBe(0);
});

Then('the condition should still exist', async ({ request, world }) => {
  const { conditionClassCode: classCode, conditionId: id } = world;
  if (!classCode || !id) throw new Error('[verify] no condition key in world');
  expect(await fetchByKey(request, classCode, id), `expected condition ${classCode}/${id} to still exist`).toBeTruthy();
});

Then('the condition delete should be blocked with a dependents warning', async ({ page }) => {
  await expect(page.getByText(new RegExp(DELETE_BLOCKED_SNIPPET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeVisible();
});
