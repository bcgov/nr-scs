import { test as base } from 'playwright-bdd';

import { AuthorizationClausesPage } from '../../pages/admin/maintenance/AuthorizationClausesPage';
import { buildAuthClauseBody, type AuthClauseBody } from '../../fixtures/admin/maintenance/authorization-clause-test-data';
import { ConditionsPage } from '../../pages/admin/maintenance/ConditionsPage';
import { buildConditionBody, type ConditionBody } from '../../fixtures/admin/maintenance/condition-test-data';

export type SscFixtures = {
  // Maintain Authorization Clauses (UC-SSC-001) — composite-key modal CRUD.
  authorizationClausesPage: AuthorizationClausesPage;
  createdAuthClauseKeys: Array<{ methodCode: string; clauseId: string }>;
  seedAuthClause: (label?: string) => Promise<{ methodCode: string; clauseId: string; body: AuthClauseBody }>;
  authClauseMutationCounts: { create: number; update: number };
  createAuthClauseCalls: () => number;
  updateAuthClauseCalls: () => number;
  // Maintain Conditions (UC-SSC-002) — composite-key modal CRUD.
  conditionsPage: ConditionsPage;
  createdConditionKeys: Array<{ classCode: string; id: string }>;
  seedCondition: (label?: string, classCode?: string) => Promise<{ classCode: string; id: string; body: ConditionBody }>;
  conditionMutationCounts: { create: number; update: number };
  createConditionCalls: () => number;
  updateConditionCalls: () => number;
};

export const sscTest = base.extend<SscFixtures>({
  authorizationClausesPage: async ({ page }, use) => {
    await use(new AuthorizationClausesPage(page));
  },

  createdAuthClauseKeys: async ({ request }, use) => {
    const keys: Array<{ methodCode: string; clauseId: string }> = [];
    await use(keys);
    const residue: string[] = [];
    for (const { methodCode, clauseId } of keys) {
      let status: number;
      try {
        const res = await request.delete(
          `/api/auth-clauses/${encodeURIComponent(methodCode)}/${encodeURIComponent(clauseId)}`,
        );
        status = res.status();
        if (res.ok() || status === 404) continue;
      } catch (err) {
        residue.push(`${methodCode}/${clauseId} (delete threw: ${(err as Error).message})`);
        continue;
      }
      residue.push(`${methodCode}/${clauseId} -> HTTP ${status}`);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] left DB residue — these authorization clauses were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedAuthClause: async ({ request, createdAuthClauseKeys }, use) => {
    await use(async (label = 'seed') => {
      const body = buildAuthClauseBody(label);
      const res = await request.post('/api/auth-clauses', {
        data: {
          scaleMethodTypeCode: body.scaleMethodTypeCode,
          scalerAuthorizationClause: body.scalerAuthorizationClause,
          effectiveDate: body.effectiveDate,
          expiryDate: body.expiryDate,
        },
        timeout: 30_000,
      });
      if (!res.ok()) {
        throw new Error(`[seed] authorization clause create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const clauseId = String(((await res.json()) as { scaleMethodAuthClauseId: number }).scaleMethodAuthClauseId);
      createdAuthClauseKeys.push({ methodCode: body.scaleMethodTypeCode, clauseId });
      return { methodCode: body.scaleMethodTypeCode, clauseId, body };
    });
  },

  // Single transparent spy over the auth-clause mutations. POST ending /auth-clauses = create;
  // PUT /auth-clauses/{method}/{id} = update.
  authClauseMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/auth-clauses**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/auth-clauses')) counts.create += 1;
        else if (method === 'PUT' && /\/auth-clauses\/[^/]+\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createAuthClauseCalls: async ({ authClauseMutationCounts }, use) => {
    await use(() => authClauseMutationCounts.create);
  },
  updateAuthClauseCalls: async ({ authClauseMutationCounts }, use) => {
    await use(() => authClauseMutationCounts.update);
  },

  conditionsPage: async ({ page }, use) => {
    await use(new ConditionsPage(page));
  },

  createdConditionKeys: async ({ request }, use) => {
    const keys: Array<{ classCode: string; id: string }> = [];
    await use(keys);
    const residue: string[] = [];
    for (const { classCode, id } of keys) {
      let status: number;
      try {
        const res = await request.delete(`/api/conditions/${encodeURIComponent(classCode)}/${encodeURIComponent(id)}`);
        status = res.status();
        if (res.ok() || status === 404) continue;
      } catch (err) {
        residue.push(`${classCode}/${id} (delete threw: ${(err as Error).message})`);
        continue;
      }
      residue.push(`${classCode}/${id} -> HTTP ${status}`);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] left DB residue — these conditions were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedCondition: async ({ request, createdConditionKeys }, use) => {
    await use(async (label = 'seed', classCode = 'MSD') => {
      const body = buildConditionBody(label, classCode);
      const res = await request.post('/api/conditions', {
        data: {
          scaleConditionClassCode: body.classCode,
          scaleAuthConditionTitle: body.title,
          scaleAuthConditionDesc: body.desc,
          ministryStandardInd: body.ministryStandardInd,
          sortOrderNo: Number(body.sortOrderNo),
          effectiveDate: body.effectiveDate,
          expiryDate: body.expiryDate,
          siteMethodTypeCodes: body.siteMethodTypeCodes,
        },
        timeout: 30_000,
      });
      if (!res.ok()) {
        throw new Error(`[seed] condition create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { scaleAuthConditionId: number }).scaleAuthConditionId);
      createdConditionKeys.push({ classCode: body.classCode, id });
      return { classCode: body.classCode, id, body };
    });
  },

  // Single transparent spy over the condition mutations. POST ending /conditions = create;
  // PUT /conditions/{class}/{id} = update.
  conditionMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0 };
      await page.route('**/api/conditions**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/conditions')) counts.create += 1;
        else if (method === 'PUT' && /\/conditions\/[^/]+\/[^/]+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createConditionCalls: async ({ conditionMutationCounts }, use) => {
    await use(() => conditionMutationCounts.create);
  },
  updateConditionCalls: async ({ conditionMutationCounts }, use) => {
    await use(() => conditionMutationCounts.update);
  },

});
