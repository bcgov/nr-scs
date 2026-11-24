import type { APIRequestContext } from '@playwright/test';

import { Then, expect } from '../../../fixtures';

/**
 * MNT read-back / state assertions for Maintain Exam Upgrades. Read-back is by the COMPOSITE key
 * GET /api/exam-upgrades/{classCode}/{typeId}; the server-assigned typeId is read from the view.
 */

type ExamUpgradeDetail = {
  scalerTrainingClassCode: string;
  scalerTrainingTypeId: string;
  licenceAccreditInd: string;
  description: string;
  effectiveDate: string;
  expiryDate: string | null;
};

async function fetchByKey(request: APIRequestContext, classCode: string, typeId: string): Promise<ExamUpgradeDetail | undefined> {
  const res = await request.get(`/api/exam-upgrades/${encodeURIComponent(classCode)}/${encodeURIComponent(typeId)}`);
  if (res.status() === 404) return undefined;
  if (!res.ok()) throw new Error(`[verify] read-back failed: HTTP ${res.status()} — ${await res.text()}`);
  return (await res.json()) as ExamUpgradeDetail;
}

// Capture the server-assigned typeId from the view (forwarded to on create success), set it in world,
// and register the composite key for cleanup — BEFORE any assertion that might fail.
Then('the created exam upgrade is registered for cleanup', async ({ examUpgradesPage, world, createdExamUpgradeKeys }) => {
  const typeId = await examUpgradesPage.readCreatedTypeId();
  const classCode = world.examUpgradeClassCode;
  if (!classCode) throw new Error('[verify] no examUpgradeClassCode in world — enter an exam/upgrade first');
  world.examUpgradeTypeId = typeId;
  if (!createdExamUpgradeKeys.some((k) => k.classCode === classCode && k.typeId === typeId)) {
    createdExamUpgradeKeys.push({ classCode, typeId });
  }
});

Then('the exam upgrade should be shown in the view', async ({ examUpgradesPage, world }) => {
  const body = world.examUpgradeBody;
  if (!body) throw new Error('[verify] no examUpgradeBody in world');
  await examUpgradesPage.expectViewValue('#view-exam-upgrade-description', body.description);
});

Then('the exam upgrade view should show the seeded values', async ({ examUpgradesPage, world }) => {
  const body = world.examUpgradeBody;
  if (!body) throw new Error('[verify] no examUpgradeBody in world — seed one first');
  await examUpgradesPage.expectViewValue('#view-exam-upgrade-description', body.description);
  await examUpgradesPage.expectViewValue('#view-exam-upgrade-licence-accredit', body.licenceAccreditInd === 'Y' ? 'Yes' : 'No');
  await examUpgradesPage.expectViewValue('#view-exam-upgrade-effective-date', body.effectiveDate);
  await examUpgradesPage.expectViewValue('#view-exam-upgrade-expiry-date', body.expiryDate);
});

Then('the saved exam upgrade should match the submitted values', async ({ request, world }) => {
  const body = world.examUpgradeBody;
  const classCode = world.examUpgradeClassCode;
  const typeId = world.examUpgradeTypeId;
  if (!body || !classCode || !typeId) throw new Error('[verify] missing examUpgrade key/body in world');
  let detail: ExamUpgradeDetail | undefined;
  await expect
    .poll(
      async () => {
        detail = await fetchByKey(request, classCode, typeId);
        return detail?.description;
      },
      { timeout: 10_000, message: `exam/upgrade ${classCode}/${typeId} did not reflect the submitted values after save` },
    )
    .toBe(body.description);
  expect(detail!.licenceAccreditInd).toBe(body.licenceAccreditInd);
  expect(detail!.effectiveDate).toBe(body.effectiveDate);
  expect(detail!.expiryDate).toBe(body.expiryDate);
});

Then('no create-exam-upgrade request should be sent', async ({ createExamUpgradeCalls }) => {
  expect(createExamUpgradeCalls()).toBe(0);
});

Then('no update-exam-upgrade request should be sent', async ({ updateExamUpgradeCalls }) => {
  expect(updateExamUpgradeCalls()).toBe(0);
});

Then('the exam upgrade should no longer exist', async ({ request, world }) => {
  const { examUpgradeClassCode: classCode, examUpgradeTypeId: typeId } = world;
  if (!classCode || !typeId) throw new Error('[verify] no exam/upgrade key in world');
  await expect
    .poll(async () => ((await fetchByKey(request, classCode, typeId)) ? 1 : 0), {
      timeout: 10_000,
      message: `deleted exam/upgrade ${classCode}/${typeId} still resolves on read-back`,
    })
    .toBe(0);
});

Then('the exam upgrade should still exist', async ({ request, world }) => {
  const { examUpgradeClassCode: classCode, examUpgradeTypeId: typeId } = world;
  if (!classCode || !typeId) throw new Error('[verify] no exam/upgrade key in world');
  expect(await fetchByKey(request, classCode, typeId), `expected exam/upgrade ${classCode}/${typeId} to still exist`).toBeTruthy();
});
