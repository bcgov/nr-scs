import { test as base } from 'playwright-bdd';

import { WorkBenchPage } from '../../pages/admin/workbench/WorkBenchPage';
import { ScalerAuthorizationCreatePage } from '../../pages/sca/ScalerAuthorizationCreatePage';
import { ScalerAuthorizationViewPage } from '../../pages/sca/ScalerAuthorizationViewPage';
import { ScalerAuthorizationEditPage } from '../../pages/sca/ScalerAuthorizationEditPage';
import { ScalerAuthorizationLetterPage } from '../../pages/sca/ScalerAuthorizationLetterPage';
import { ScalerAuthorizationsTabPage } from '../../pages/sca/ScalerAuthorizationsTabPage';
import { ScaleSiteAuthorizedScalersTabPage } from '../../pages/sca/ScaleSiteAuthorizedScalersTabPage';
import { ScaleSiteAuthorizationCreatePage } from '../../pages/sca/ScaleSiteAuthorizationCreatePage';
import { ScaleSiteAuthorizationViewPage } from '../../pages/sca/ScaleSiteAuthorizationViewPage';
import { ScaleSiteAuthorizationEditPage } from '../../pages/sca/ScaleSiteAuthorizationEditPage';
import {
  buildMsdWorkbenchBody,
  buildScaleSiteAuthWorkbenchBody,
  buildScalerAuthWorkbenchBody,
} from '../../fixtures/admin/workbench/workbench-test-data';
import { buildScalerAuthCreateBody, buildScaleSiteAuthCreateBody } from '../../fixtures/sca/sca-test-data';
import { deleteMarkSiteDesignationsViaDb } from '../msd/markSiteDesignationDbCleanup';

export type ScaFixtures = {
  // Work Bench (UC-SCA-009/010/011) — one page, three shared expiring-authorization lists.
  workBenchPage: WorkBenchPage;
  createdScalerAuthIds: string[];
  createdScaleSiteAuthIds: string[];
  createdWorkbenchMsdIds: string[];
  seedExpiringScalerAuth: () => Promise<string>;
  seedExpiringScaleSiteAuth: () => Promise<string>;
  seedExpiringMsd: () => Promise<string>;
  workbenchMutationCounts: {
    renew: number; remove: number; create: number; delete: number; update: number; letter: number;
    scaleSiteCreate: number; scaleSiteUpdate: number; scaleSiteDelete: number;
  };
  renewCalls: () => number;
  removeFromWorkbenchCalls: () => number;
  workbenchRenewCloneCapture: void;
  // Scaler Authorization CRUD (UC-SCA-001..004).
  scalerAuthorizationCreatePage: ScalerAuthorizationCreatePage;
  scalerAuthorizationViewPage: ScalerAuthorizationViewPage;
  scalerAuthorizationEditPage: ScalerAuthorizationEditPage;
  scalerAuthorizationLetterPage: ScalerAuthorizationLetterPage;
  scalerAuthorizationsTabPage: ScalerAuthorizationsTabPage;
  scaleSiteAuthorizedScalersTabPage: ScaleSiteAuthorizedScalersTabPage;
  scalerAuthCreateCalls: () => number;
  scalerAuthDeleteCalls: () => number;
  scalerAuthUpdateCalls: () => number;
  scalerAuthLetterCalls: () => number;
  seedScalerAuthorization: (districtWide?: 'Y' | 'N', scaleSites?: string[]) => Promise<string>;
  // Scale Site Authorization CRUD (UC-SCA-005..008). Reuses the existing createdScaleSiteAuthIds cleanup
  // registry (DELETE /api/scale-site-authorizations/{id}) and the workbenchMutationCounts route spy.
  scaleSiteAuthorizationCreatePage: ScaleSiteAuthorizationCreatePage;
  scaleSiteAuthorizationViewPage: ScaleSiteAuthorizationViewPage;
  scaleSiteAuthorizationEditPage: ScaleSiteAuthorizationEditPage;
  scaleSiteAuthCreateCalls: () => number;
  scaleSiteAuthUpdateCalls: () => number;
  scaleSiteAuthDeleteCalls: () => number;
  seedScaleSiteAuthorization: (
    conditions?: { scaleAuthConditionId: number; scaleConditionClassCode: string }[],
  ) => Promise<string>;
};

export const scaTest = base.extend<ScaFixtures>({
  workBenchPage: async ({ page }, use) => {
    await use(new WorkBenchPage(page));
  },

  scalerAuthorizationCreatePage: async ({ page }, use) => {
    await use(new ScalerAuthorizationCreatePage(page));
  },

  scalerAuthorizationViewPage: async ({ page }, use) => {
    await use(new ScalerAuthorizationViewPage(page));
  },

  scalerAuthorizationEditPage: async ({ page }, use) => {
    await use(new ScalerAuthorizationEditPage(page));
  },

  scalerAuthorizationLetterPage: async ({ page }, use) => {
    await use(new ScalerAuthorizationLetterPage(page));
  },

  scalerAuthorizationsTabPage: async ({ page }, use) => {
    await use(new ScalerAuthorizationsTabPage(page));
  },

  scaleSiteAuthorizedScalersTabPage: async ({ page }, use) => {
    await use(new ScaleSiteAuthorizedScalersTabPage(page));
  },

  scalerAuthCreateCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.create);
  },

  scalerAuthDeleteCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.delete);
  },

  scalerAuthUpdateCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.update);
  },

  scalerAuthLetterCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.letter);
  },

  // ── Scale Site Authorization CRUD (UC-SCA-005..008) ──────────────────────────────────────────────
  scaleSiteAuthorizationCreatePage: async ({ page }, use) => {
    await use(new ScaleSiteAuthorizationCreatePage(page));
  },
  scaleSiteAuthorizationViewPage: async ({ page }, use) => {
    await use(new ScaleSiteAuthorizationViewPage(page));
  },
  scaleSiteAuthorizationEditPage: async ({ page }, use) => {
    await use(new ScaleSiteAuthorizationEditPage(page));
  },
  scaleSiteAuthCreateCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.scaleSiteCreate);
  },
  scaleSiteAuthUpdateCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.scaleSiteUpdate);
  },
  scaleSiteAuthDeleteCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.scaleSiteDelete);
  },

  // API-seed a Scale Site Authorization (POST) and register it for DELETE cleanup; returns its id.
  // Used by the UC-SCA-006/007/008 edit/view/delete scenarios (independent + self-cleaning). Reuses the
  // existing createdScaleSiteAuthIds registry (DELETE /api/scale-site-authorizations/{id}).
  seedScaleSiteAuthorization: async ({ request, createdScaleSiteAuthIds }, use) => {
    await use(async (conditions = []) => {
      const res = await request.post('/api/scale-site-authorizations', {
        data: buildScaleSiteAuthCreateBody(conditions),
        timeout: 30_000,
      });
      if (!res.ok()) {
        throw new Error(`[seed] scale-site auth create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { scaleSiteAuthorizationId: number }).scaleSiteAuthorizationId);
      createdScaleSiteAuthIds.push(id);
      return id;
    });
  },

  // Seed a Scaler Authorization via the API create and register it for DELETE cleanup; returns its id.
  // Used by the UC-SCA-002/003/004 view/edit/delete scenarios (independent + self-cleaning).
  seedScalerAuthorization: async ({ request, createdScalerAuthIds }, use) => {
    await use(async (districtWide: 'Y' | 'N' = 'Y', scaleSites: string[] = []) => {
      const res = await request.post('/api/scaler-authorizations', {
        data: buildScalerAuthCreateBody(districtWide, scaleSites),
        timeout: 30_000,
      });
      if (!res.ok()) throw new Error(`[seed] scaler auth create failed: HTTP ${res.status()} — ${await res.text()}`);
      const id = String(((await res.json()) as { scalerAuthorizationId: number }).scalerAuthorizationId);
      createdScalerAuthIds.push(id);
      return id;
    });
  },

  // Scaler + scale-site authorizations delete via the app's DELETE endpoint (404 = idempotent OK).
  createdScalerAuthIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    const residue: string[] = [];
    for (const id of ids) {
      try {
        const res = await request.delete(`/api/scaler-authorizations/${encodeURIComponent(id)}`);
        if (res.ok() || res.status() === 404) continue;
        residue.push(`${id} -> HTTP ${res.status()}`);
      } catch (err) {
        residue.push(`${id} (delete threw: ${(err as Error).message})`);
      }
    }
    if (residue.length > 0) {
      throw new Error(`[cleanup] left scaler-authorization residue: ${residue.join(', ')}.`);
    }
  },

  createdScaleSiteAuthIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    const residue: string[] = [];
    for (const id of ids) {
      try {
        const res = await request.delete(`/api/scale-site-authorizations/${encodeURIComponent(id)}`);
        if (res.ok() || res.status() === 404) continue;
        residue.push(`${id} -> HTTP ${res.status()}`);
      } catch (err) {
        residue.push(`${id} (delete threw: ${(err as Error).message})`);
      }
    }
    if (residue.length > 0) {
      throw new Error(`[cleanup] left scale-site-authorization residue: ${residue.join(', ')}.`);
    }
  },

  // MSD has no DELETE endpoint — remove at the DB (children-then-parent, fails loud).
  createdWorkbenchMsdIds: async ({}, use) => {
    const ids: string[] = [];
    await use(ids);
    if (ids.length > 0) deleteMarkSiteDesignationsViaDb(ids);
  },

  seedExpiringScalerAuth: async ({ request, createdScalerAuthIds }, use) => {
    await use(async () => {
      const res = await request.post('/api/scaler-authorizations', { data: buildScalerAuthWorkbenchBody(), timeout: 30_000 });
      if (!res.ok()) throw new Error(`[seed] scaler auth create failed: HTTP ${res.status()} — ${await res.text()}`);
      const id = String(((await res.json()) as { scalerAuthorizationId: number }).scalerAuthorizationId);
      createdScalerAuthIds.push(id);
      return id;
    });
  },

  seedExpiringScaleSiteAuth: async ({ request, createdScaleSiteAuthIds }, use) => {
    await use(async () => {
      const res = await request.post('/api/scale-site-authorizations', { data: buildScaleSiteAuthWorkbenchBody(), timeout: 30_000 });
      if (!res.ok()) throw new Error(`[seed] scale-site auth create failed: HTTP ${res.status()} — ${await res.text()}`);
      const id = String(((await res.json()) as { scaleSiteAuthorizationId: number }).scaleSiteAuthorizationId);
      createdScaleSiteAuthIds.push(id);
      return id;
    });
  },

  seedExpiringMsd: async ({ request, createdWorkbenchMsdIds }, use) => {
    await use(async () => {
      const res = await request.post('/api/mark-site-designations', { data: buildMsdWorkbenchBody(), timeout: 30_000 });
      if (!res.ok()) throw new Error(`[seed] MSD create failed: HTTP ${res.status()} — ${await res.text()}`);
      const id = String(((await res.json()) as { haulingMarkAuthorizationId: number }).haulingMarkAuthorizationId);
      createdWorkbenchMsdIds.push(id);
      return id;
    });
  },

  // Transparent spy over the workbench renew + workbench/remove endpoints (all three entities). Auto so it
  // is armed before any step navigates. Lets a Cancel scenario PROVE no remove POST was sent.
  //
  // CRITICAL: this is the ONLY broad `**/api/**` glob in the suite — it matches every API request. Across
  // the merged domain tests it is one of the last auto fixtures set up, so Playwright runs it early (routes
  // run in reverse registration order). It therefore MUST end with route.fallback(), not route.continue():
  // continue() would terminate the routing chain here and shadow every more-specific count spy (the QRY
  // inspection-lookup + clients/search spies, …), silently pinning their counters at 0 and making
  // count-based prove-the-negative assertions vacuous. fallback() defers to the next matching handler (the
  // specific spy, which counts then continues to the network); when none matches — e.g. a bare /renew POST —
  // fallback() still hits the network, so behaviour is unchanged.
  workbenchMutationCounts: [
    async ({ page }, use) => {
      const counts = {
        renew: 0, remove: 0, create: 0, delete: 0, update: 0, letter: 0,
        scaleSiteCreate: 0, scaleSiteUpdate: 0, scaleSiteDelete: 0,
      };
      await page.route('**/api/**', async (route) => {
        const req = route.request();
        const path = new URL(req.url()).pathname;
        if (req.method() === 'POST' && path.endsWith('/renew')) counts.renew += 1;
        else if (req.method() === 'POST' && path.endsWith('/workbench/remove')) counts.remove += 1;
        // Order matters: the letter POST (…/scaler-authorizations/{id}/letter) must be matched BEFORE the
        // bare-collection create (…/scaler-authorizations) — the create check uses endsWith and would
        // otherwise never fire for letter (different suffix), but keep letter first for clarity/robustness.
        else if (req.method() === 'POST' && /\/scaler-authorizations\/\d+\/letter$/.test(path)) counts.letter += 1;
        else if (req.method() === 'POST' && path.endsWith('/scaler-authorizations')) counts.create += 1;
        else if (req.method() === 'DELETE' && /\/scaler-authorizations\/\d+$/.test(path)) counts.delete += 1;
        else if (req.method() === 'PUT' && /\/scaler-authorizations\/\d+$/.test(path)) counts.update += 1;
        // Scale Site Authorization mutations (distinct path segment 'scale-site-authorizations' — does not
        // collide with the 'scaler-authorizations' checks above).
        else if (req.method() === 'POST' && path.endsWith('/scale-site-authorizations')) counts.scaleSiteCreate += 1;
        else if (req.method() === 'DELETE' && /\/scale-site-authorizations\/\d+$/.test(path)) counts.scaleSiteDelete += 1;
        else if (req.method() === 'PUT' && /\/scale-site-authorizations\/\d+$/.test(path)) counts.scaleSiteUpdate += 1;
        await route.fallback();
      });
      await use(counts);
    },
    { auto: true },
  ],
  renewCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.renew);
  },
  removeFromWorkbenchCalls: async ({ workbenchMutationCounts }, use) => {
    await use(() => workbenchMutationCounts.remove);
  },

  workbenchRenewCloneCapture: [
    async ({ page, createdScalerAuthIds, createdScaleSiteAuthIds, createdWorkbenchMsdIds }, use) => {
      const onResponse = (resp: import('@playwright/test').Response) => {
        void (async () => {
          try {
            if (resp.request().method() !== 'POST') return;
            const path = new URL(resp.url()).pathname;
            if (!path.endsWith('/renew') || !resp.ok()) return;
            const body = (await resp.json().catch(() => null)) as { newAuthorizationId?: number } | null;
            if (body?.newAuthorizationId == null) return;
            const id = String(body.newAuthorizationId);
            const reg = path.includes('/scaler-authorizations/')
              ? createdScalerAuthIds
              : path.includes('/scale-site-authorizations/')
                ? createdScaleSiteAuthIds
                : path.includes('/mark-site-designations/')
                  ? createdWorkbenchMsdIds
                  : null;
            if (reg && !reg.includes(id)) reg.push(id);
          } catch {
            /* passive observer — never fail the test from here */
          }
        })();
      };
      page.on('response', onResponse);
      await use(undefined);
      page.off('response', onResponse);
    },
    { auto: true },
  ],

});
