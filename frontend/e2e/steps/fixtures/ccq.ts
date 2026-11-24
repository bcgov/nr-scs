import { test as base } from 'playwright-bdd';

import { buildInspectionQuestionBody, type InspectionQuestionBody } from '../../fixtures/admin/maintenance/ccq-test-data';
import { QuestionsPage } from '../../pages/admin/maintenance/QuestionsPage';
import { unmarkQuestionUsedViaDb } from '../admin/maintenance/ccq/questionDbSeed';
import { TemplatesPage } from '../../pages/admin/maintenance/TemplatesPage';
import { buildTemplateBody, type TemplateBody } from '../../fixtures/admin/maintenance/template-test-data';

type QuestionMutationCounts = { create: number; update: number };

export type CcqFixtures = {
  // Maintain Inspection Question (UC-CCQ-001).
  questionsPage: QuestionsPage;
  createdQuestionIds: Array<{ id: string; usedAnswerCode?: string }>;
  seedQuestion: (label?: string) => Promise<{ id: string; body: InspectionQuestionBody }>;
  questionMutationCounts: QuestionMutationCounts;
  createQuestionCalls: () => number;
  updateQuestionCalls: () => number;
  // Maintain Templates (UC-CCQ-003) — Scale Authorization Templates; bespoke React-Query modal CRUD
  // (single PK), shared MaintenanceListPage + ConfirmDeleteModal.
  templatesPage: TemplatesPage;
  createdTemplateIds: string[];
  seedTemplate: (label?: string, classCode?: string, conditionIds?: number[]) => Promise<{ id: string; body: TemplateBody }>;
  templateMutationCounts: { create: number; update: number };
  createTemplateCalls: () => number;
  updateTemplateCalls: () => number;
};

export const ccqTest = base.extend<CcqFixtures>({
  questionsPage: async ({ page }, use) => {
    await use(new QuestionsPage(page));
  },

  // Cleanup FAILS LOUD (same convention as createdCheckScaleIds). A question marked "used" via
  // markQuestionUsedViaDb must be unmarked FIRST (the app's own DELETE 400s while questionUsed=true) —
  // usedAnswerCode records which INSPECTION_RESPONSE link row to remove before calling the API.
  createdQuestionIds: async ({ request }, use) => {
    const ids: Array<{ id: string; usedAnswerCode?: string }> = [];
    await use(ids);
    const residue: string[] = [];
    for (const { id, usedAnswerCode } of ids) {
      if (usedAnswerCode) unmarkQuestionUsedViaDb(id, usedAnswerCode);
      let status: number;
      try {
        const res = await request.delete(`/api/inspection-questions/${id}`);
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
        `[cleanup] left DB residue — these inspection questions were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  // Seed a fresh, VIEWABLE inspection via the API (real inspector GUID => resolvable => passes the
  // read-back INNER JOINs) and register it for cleanup; returns its id. Fetches create-init first to
  // learn the applicable question ids, so the exact question set is never hard-coded. Read/delete
  // scenarios seed their own record this way rather than reusing a pre-existing extract row (none of
  // which are viewable — their inspector_euser_id is absent from scs_user_info_vw).
  seedQuestion: async ({ request, createdQuestionIds }, use) => {
    await use(async (label = 'seed') => {
      const body = buildInspectionQuestionBody(label);
      const res = await request.post('/api/inspection-questions', { data: body });
      if (!res.ok()) {
        throw new Error(`[seed] question create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { inspectionQuestionId: number }).inspectionQuestionId);
      createdQuestionIds.push({ id }); // register for teardown the moment the id is known
      return { id, body };
    });
  },

  // Single transparent spy over the inspection-question mutations. Auto so it is armed before any step
  // navigates. '**/api/inspection-questions**' matches both the collection and by-id paths but no other
  // endpoint (confirmed against root.yaml — the only two paths under /inspection-questions).
  questionMutationCounts: [
    async ({ page }, use) => {
      const counts: QuestionMutationCounts = { create: 0, update: 0 };
      await page.route('**/api/inspection-questions**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/inspection-questions')) counts.create += 1;
        else if (method === 'PUT' && /\/inspection-questions\/\d+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createQuestionCalls: async ({ questionMutationCounts }, use) => {
    await use(() => questionMutationCounts.create);
  },
  updateQuestionCalls: async ({ questionMutationCounts }, use) => {
    await use(() => questionMutationCounts.update);
  },

  templatesPage: async ({ page }, use) => {
    await use(new TemplatesPage(page));
  },

  createdTemplateIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    const residue: string[] = [];
    for (const id of ids) {
      let status: number;
      try {
        const res = await request.delete(`/api/scale-auth-templates/${encodeURIComponent(id)}`);
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
        `[cleanup] left DB residue — these scale-auth templates were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedTemplate: async ({ request, createdTemplateIds }, use) => {
    // `conditionIds` seeds the template ALREADY BOUND — needed by the unbind and delete-cascade
    // scenarios, which have to start from a template that has bindings to remove.
    await use(async (label = 'seed', classCode = 'MSD', conditionIds = []) => {
      const body = buildTemplateBody(label, classCode);
      const res = await request.post('/api/scale-auth-templates', {
        data: {
          scaleAuthTemplateName: body.scaleAuthTemplateName,
          scaleConditionClassCode: body.scaleConditionClassCode,
          orgUnitNo: body.orgUnitNo,
          conditions: conditionIds.map((id) => ({
            scaleConditionClassCode: body.scaleConditionClassCode,
            scaleAuthConditionId: id,
          })),
        },
        timeout: 30_000,
      });
      if (!res.ok()) {
        throw new Error(`[seed] template create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { scaleAuthTemplateId: number }).scaleAuthTemplateId);
      createdTemplateIds.push(id); // register for teardown the moment the id is known
      return { id, body };
    });
  },

  // Single transparent spy over the scale-auth-template mutations. POST ending /scale-auth-templates =
  // create; PUT /scale-auth-templates/{id} = update. Lets a negative step PROVE the write outcome.
  templateMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/scale-auth-templates**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/scale-auth-templates')) counts.create += 1;
        else if (method === 'PUT' && /\/scale-auth-templates\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createTemplateCalls: async ({ templateMutationCounts }, use) => {
    await use(() => templateMutationCounts.create);
  },
  updateTemplateCalls: async ({ templateMutationCounts }, use) => {
    await use(() => templateMutationCounts.update);
  },

});
