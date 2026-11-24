import { test as base } from 'playwright-bdd';

import { AppointmentTypesPage } from '../../pages/admin/maintenance/AppointmentTypesPage';
import { buildAppointmentTypeBody, type AppointmentTypeBody } from '../../fixtures/admin/maintenance/appointment-type-test-data';
import { SignatureBlocksPage } from '../../pages/admin/maintenance/SignatureBlocksPage';
import { buildSignatureBlockBody, type SignatureBlockBody } from '../../fixtures/admin/maintenance/signature-block-test-data';
import { ExamUpgradesPage } from '../../pages/admin/maintenance/ExamUpgradesPage';
import { buildExamUpgradeBody, type ExamUpgradeBody } from '../../fixtures/admin/maintenance/exam-upgrade-test-data';
import { ValidLicenceAttributesPage } from '../../pages/admin/maintenance/ValidLicenceAttributesPage';

export type MntFixtures = {
  // Maintain Appointment Types (UC-MNT-003).
  appointmentTypesPage: AppointmentTypesPage;
  createdAppointmentTypeCodes: string[];
  seedAppointmentType: (label?: string) => Promise<{ code: string; body: AppointmentTypeBody }>;
  appointmentTypeMutationCounts: { create: number; update: number };
  createAppointmentTypeCalls: () => number;
  updateAppointmentTypeCalls: () => number;
  // Maintain Signatories / Signature Blocks (UC-MNT-001).
  signatureBlocksPage: SignatureBlocksPage;
  createdSignatureBlockIds: string[];
  seedSignatureBlock: (label?: string) => Promise<{ id: string; body: SignatureBlockBody }>;
  signatureBlockMutationCounts: { create: number; update: number };
  createSignatoryCalls: () => number;
  updateSignatoryCalls: () => number;
  // Maintain Exams / Upgrades (UC-MNT-002) — composite-key modal CRUD.
  examUpgradesPage: ExamUpgradesPage;
  createdExamUpgradeKeys: Array<{ classCode: string; typeId: string }>;
  seedExamUpgrade: (label?: string) => Promise<{ classCode: string; typeId: string; body: ExamUpgradeBody }>;
  examUpgradeMutationCounts: { create: number; update: number };
  createExamUpgradeCalls: () => number;
  updateExamUpgradeCalls: () => number;
  // Maintain Valid Licence Attributes (UC-MNT-004) — composite-key modal CRUD.
  vlaPage: ValidLicenceAttributesPage;
  createdVlaKeys: Array<{ gradingSystemCode: string; appointmentType: string }>;
  vlaMutationCounts: { create: number; update: number };
  createVlaCalls: () => number;
};

export const mntTest = base.extend<MntFixtures>({
  createdAppointmentTypeCodes: async ({ request }, use) => {
    const codes: string[] = [];
    await use(codes);
    const residue: string[] = [];
    for (const code of codes) {
      let status: number;
      try {
        const res = await request.delete(`/api/appointment-types/${encodeURIComponent(code)}`);
        status = res.status();
        if (res.ok() || status === 404) continue;
      } catch (err) {
        residue.push(`${code} (delete threw: ${(err as Error).message})`);
        continue;
      }
      residue.push(`${code} -> HTTP ${status}`);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] left DB residue — these appointment types were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  appointmentTypesPage: async ({ page }, use) => {
    await use(new AppointmentTypesPage(page));
  },
  seedAppointmentType: async ({ request, createdAppointmentTypeCodes }, use) => {
    await use(async (label = 'seed') => {
      const body = buildAppointmentTypeBody(label);
      // 30s timeout (vs the default 15s here): the API seed proxies through the Vite dev server, which
      // can briefly starve under heavy parallel browser load — the create itself is <100ms.
      const res = await request.post('/api/appointment-types', { data: body, timeout: 30_000 });
      if (!res.ok()) {
        throw new Error(`[seed] appointment type create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      createdAppointmentTypeCodes.push(body.code); // register for teardown the moment the code is known
      return { code: body.code, body };
    });
  },

  // Single transparent spy over the appointment-type mutations. Auto so it is armed before any step
  // navigates. The glob matches the collection and by-code paths but no other endpoint; a POST ending in
  // /appointment-types is the create, a PUT to /appointment-types/{code} is the update. Lets a
  // client-validation negative PROVE the write never left the browser (count === 0).
  appointmentTypeMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/appointment-types**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/appointment-types')) counts.create += 1;
        else if (method === 'PUT' && /\/appointment-types\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createAppointmentTypeCalls: async ({ appointmentTypeMutationCounts }, use) => {
    await use(() => appointmentTypeMutationCounts.create);
  },
  updateAppointmentTypeCalls: async ({ appointmentTypeMutationCounts }, use) => {
    await use(() => appointmentTypeMutationCounts.update);
  },

  signatureBlocksPage: async ({ page }, use) => {
    await use(new SignatureBlocksPage(page));
  },

  createdSignatureBlockIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    const residue: string[] = [];
    for (const id of ids) {
      let status: number;
      try {
        const res = await request.delete(`/api/signature-blocks/${encodeURIComponent(id)}`);
        status = res.status();
        if (res.ok() || status === 404) continue;
      } catch (err) {
        residue.push(`${id} (delete threw: ${(err as Error).message})`);
        continue;
      }
      residue.push(`${id} -> HTTP ${status}`);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] left DB residue — these signature blocks were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedSignatureBlock: async ({ request, createdSignatureBlockIds }, use) => {
    await use(async (label = 'seed') => {
      const body = buildSignatureBlockBody(label);
      const res = await request.post('/api/signature-blocks', {
        data: {
          orgUnitNo: body.orgUnitNo,
          firstName: body.firstName,
          middleName: body.middleName.length > 0 ? body.middleName : null,
          lastName: body.lastName,
          signatureTitle: body.signatureTitle,
        },
        timeout: 30_000,
      });
      if (!res.ok()) {
        throw new Error(`[seed] signature block create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { scaleSignatoryBlockId: number }).scaleSignatoryBlockId);
      createdSignatureBlockIds.push(id); // register for teardown the moment the id is known
      return { id, body };
    });
  },

  // Single transparent spy over the signature-block mutations. Auto so it is armed before any step
  // navigates. POST ending /signature-blocks = create; PUT /signature-blocks/{id} = update.
  signatureBlockMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/signature-blocks**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/signature-blocks')) counts.create += 1;
        else if (method === 'PUT' && /\/signature-blocks\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createSignatoryCalls: async ({ signatureBlockMutationCounts }, use) => {
    await use(() => signatureBlockMutationCounts.create);
  },
  updateSignatoryCalls: async ({ signatureBlockMutationCounts }, use) => {
    await use(() => signatureBlockMutationCounts.update);
  },

  examUpgradesPage: async ({ page }, use) => {
    await use(new ExamUpgradesPage(page));
  },

  createdExamUpgradeKeys: async ({ request }, use) => {
    const keys: Array<{ classCode: string; typeId: string }> = [];
    await use(keys);
    const residue: string[] = [];
    for (const { classCode, typeId } of keys) {
      let status: number;
      try {
        const res = await request.delete(
          `/api/exam-upgrades/${encodeURIComponent(classCode)}/${encodeURIComponent(typeId)}`,
        );
        status = res.status();
        if (res.ok() || status === 404) continue;
      } catch (err) {
        residue.push(`${classCode}/${typeId} (delete threw: ${(err as Error).message})`);
        continue;
      }
      residue.push(`${classCode}/${typeId} -> HTTP ${status}`);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] left DB residue — these exam/upgrades were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedExamUpgrade: async ({ request, createdExamUpgradeKeys }, use) => {
    await use(async (label = 'seed') => {
      const body = buildExamUpgradeBody(label);
      const data = {
        scalerTrainingClassCode: body.classCode,
        licenceAccreditInd: body.licenceAccreditInd,
        description: body.description,
        effectiveDate: body.effectiveDate,
        expiryDate: body.expiryDate,
      };
      let last = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const res = await request.post('/api/exam-upgrades', { data, timeout: 30_000 });
        if (res.ok()) {
          const typeId = String(((await res.json()) as { scalerTrainingTypeId: string | number }).scalerTrainingTypeId);
          createdExamUpgradeKeys.push({ classCode: body.classCode, typeId });
          return { classCode: body.classCode, typeId, body };
        }
        last = `HTTP ${res.status()} — ${await res.text()}`;
        if (res.status() !== 409) break; // only the concurrency duplicate-key 409 is retryable
      }
      throw new Error(`[seed] exam/upgrade create failed: ${last}`);
    });
  },

  // Single transparent spy over the exam-upgrade mutations. POST ending /exam-upgrades = create;
  // PUT /exam-upgrades/{class}/{typeId} = update.
  examUpgradeMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/exam-upgrades**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/exam-upgrades')) counts.create += 1;
        else if (method === 'PUT' && /\/exam-upgrades\/[^/]+\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createExamUpgradeCalls: async ({ examUpgradeMutationCounts }, use) => {
    await use(() => examUpgradeMutationCounts.create);
  },
  updateExamUpgradeCalls: async ({ examUpgradeMutationCounts }, use) => {
    await use(() => examUpgradeMutationCounts.update);
  },

  vlaPage: async ({ page }, use) => {
    await use(new ValidLicenceAttributesPage(page));
  },

  createdVlaKeys: async ({ request }, use) => {
    const keys: Array<{ gradingSystemCode: string; appointmentType: string }> = [];
    await use(keys);
    const residue: string[] = [];
    for (const { gradingSystemCode, appointmentType } of keys) {
      let status: number;
      try {
        const res = await request.delete(
          `/api/valid-licence-attributes/${encodeURIComponent(gradingSystemCode)}/${encodeURIComponent(appointmentType)}`,
        );
        status = res.status();
        if (res.ok() || status === 404) continue;
      } catch (err) {
        residue.push(`${gradingSystemCode}/${appointmentType} (delete threw: ${(err as Error).message})`);
        continue;
      }
      residue.push(`${gradingSystemCode}/${appointmentType} -> HTTP ${status}`);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] left DB residue — these valid licence attributes were not removed and will pollute ` +
          `the seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  // Single transparent spy over the VLA mutations. POST ending /valid-licence-attributes = create;
  // PUT /valid-licence-attributes/{grading}/{appt} = update.
  vlaMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/valid-licence-attributes**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/valid-licence-attributes')) counts.create += 1;
        else if (method === 'PUT' && /\/valid-licence-attributes\/[^/]+\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createVlaCalls: async ({ vlaMutationCounts }, use) => {
    await use(() => vlaMutationCounts.create);
  },

});
