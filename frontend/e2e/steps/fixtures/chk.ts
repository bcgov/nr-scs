import { test as base } from 'playwright-bdd';

import { buildSummaryCheckScaleCreateBody, detailCheckScaleEditSeedBody } from '../../fixtures/chk/chk-test-data';
import { SummaryCheckScaleCreatePage } from '../../pages/chk/SummaryCheckScaleCreatePage';
import { SummaryCheckScaleUpdatePage } from '../../pages/chk/SummaryCheckScaleUpdatePage';
import { CheckScaleCreatePage } from '../../pages/chk/CheckScaleCreatePage';
import { CheckScaleEditPage } from '../../pages/chk/CheckScaleEditPage';
import { CheckScaleViewPage } from '../../pages/chk/CheckScaleViewPage';
import { CheckScaleListPage } from '../../pages/chk/CheckScaleListPage';
import { deleteCheckScalesViaDb, markCheckScaleLegacyViaDb } from '../chk/checkScaleDbCleanup';

type MutationCounts = { create: number; update: number; addSpg: number };
type DetailMutationCounts = { validate: number; create: number; update: number };

export type ChkFixtures = {
  createPage: SummaryCheckScaleCreatePage;
  updatePage: SummaryCheckScaleUpdatePage;
  createdCheckScaleIds: string[];
  seedCheckScale: (rows?: 1 | 2) => Promise<string>;
  scsMutationCounts: MutationCounts;
  createCalls: () => number;
  updateCalls: () => number;
  addSpgCalls: () => number;
  // DETAIL (HBCS) check scale create/update (UC-CHK-001/002) — separate screen + endpoints from the summary flow.
  checkScaleCreatePage: CheckScaleCreatePage;
  checkScaleEditPage: CheckScaleEditPage;
  checkScaleViewPage: CheckScaleViewPage;
  checkScaleListPage: CheckScaleListPage;
  createdDetailCheckScaleIds: string[];
  seedDetailCheckScaleForEdit: () => Promise<string>;
  /** A disposable LEGACY (LGCS) detail check scale — for probing the read-only-legacy rules safely. */
  seedLegacyDetailCheckScale: () => Promise<string>;
  detailMutationCounts: DetailMutationCounts;
  validateCalls: () => number;
  createDetailCalls: () => number;
  updateDetailCalls: () => number;
};

export const chkTest = base.extend<ChkFixtures>({
  createPage: async ({ page }, use) => {
    await use(new SummaryCheckScaleCreatePage(page));
  },

  updatePage: async ({ page }, use) => {
    await use(new SummaryCheckScaleUpdatePage(page));
  },

  createdCheckScaleIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    // Cleanup FAILS LOUD: at scale, a silently-leaked row poisons the shared seed and causes phantom
    // failures elsewhere. 404 is idempotent-OK (already gone — e.g. the delete-record scenario). Any
    // other non-OK status throws so the residue surfaces immediately. All ids are attempted first.
    const residue: string[] = [];
    for (const id of ids) {
      let status: number;
      try {
        const res = await request.delete(`/api/summary-check-scales/${id}`);
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
        `[cleanup] left DB residue — these summary check scales were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedCheckScale: async ({ request, createdCheckScaleIds }, use) => {
    await use(async (rows: 1 | 2 = 1) => {
      const res = await request.post('/api/summary-check-scales/create', {
        data: buildSummaryCheckScaleCreateBody(rows),
      });
      if (!res.ok()) {
        throw new Error(`[seed] create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { checkScaleId: number }).checkScaleId);
      createdCheckScaleIds.push(id); // register for teardown the moment the id is known
      return id;
    });
  },

  // Single transparent spy over ALL summary-check-scale mutations, classified by method+path. Auto so
  // it is armed before any step navigates/submits. One handler (not several overlapping page.route
  // globs) avoids Playwright's last-registered-handler-wins clobbering. route.continue() => positive
  // scenarios are unaffected.
  scsMutationCounts: [
    async ({ page }, use) => {
      const counts: MutationCounts = { create: 0, update: 0, addSpg: 0 };
      await page.route('**/api/summary-check-scales/**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/summary-check-scales/create')) counts.create += 1;
        else if (method === 'PUT' && /\/summary-check-scales\/\d+$/.test(path)) counts.update += 1;
        else if (method === 'POST' && /\/summary-check-scales\/\d+\/spg-rows$/.test(path)) counts.addSpg += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],

  createCalls: async ({ scsMutationCounts }, use) => {
    await use(() => scsMutationCounts.create);
  },
  updateCalls: async ({ scsMutationCounts }, use) => {
    await use(() => scsMutationCounts.update);
  },
  addSpgCalls: async ({ scsMutationCounts }, use) => {
    await use(() => scsMutationCounts.addSpg);
  },

  checkScaleCreatePage: async ({ page }, use) => {
    await use(new CheckScaleCreatePage(page));
  },

  checkScaleEditPage: async ({ page }, use) => {
    await use(new CheckScaleEditPage(page));
  },

  checkScaleViewPage: async ({ page }, use) => {
    await use(new CheckScaleViewPage(page));
  },

  checkScaleListPage: async ({ page }, use) => {
    await use(new CheckScaleListPage(page));
  },

  // Seed a fresh editable DETAIL check scale via the API (unused real HBS doc pair) and register it for
  // DB cleanup — every update/delete scenario creates its own record (no persistent editable record
  // exists in the real data); only the happy path then edits+saves it.
  seedDetailCheckScaleForEdit: async ({ request, createdDetailCheckScaleIds }, use) => {
    await use(async () => {
      const res = await request.post('/api/check-scales/create', { data: detailCheckScaleEditSeedBody });
      if (!res.ok()) throw new Error(`[seed] detail create failed: HTTP ${res.status()} — ${await res.text()}`);
      const id = String(((await res.json()) as { checkScaleId: number }).checkScaleId);
      createdDetailCheckScaleIds.push(id); // register for DB teardown the moment the id is known
      return id;
    });
  },

  // Seed a DISPOSABLE LEGACY (LGCS) detail check scale: create a normal HBCS record via the API, then
  // flip cksc_type at the DB (no API can produce LGCS — see markCheckScaleLegacyViaDb for why this must
  // not reuse the pinned real legacy record). Registered for the same DB teardown as any other seed.
  seedLegacyDetailCheckScale: async ({ seedDetailCheckScaleForEdit }, use) => {
    await use(async () => {
      const id = await seedDetailCheckScaleForEdit();
      markCheckScaleLegacyViaDb(id);
      return id;
    });
  },

  createdDetailCheckScaleIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    // Teardown goes through the DB, not `DELETE /api/check-scales/{id}` — that endpoint is the subject
    // under test here (UC-CHK-004) and is administrator-only, so cleanup must not lean on it. Remove the
    // rows at the DB (fails loud), then read back through the API to PROVE they are gone. A scenario
    // whose own delete already removed the row is fine: the DB delete is a no-op and the read-back
    // still passes.
    if (ids.length === 0) return;
    deleteCheckScalesViaDb(ids); // throws on sqlplus error
    const residue: string[] = [];
    for (const id of ids) {
      const res = await request.get(`/api/check-scales/search?checkScaleId=${id}`);
      const rows = res.ok() ? ((await res.json()) as unknown[]) : [];
      if (rows.length > 0) residue.push(id);
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] detail check scales still present after DB delete: ${residue.join(', ')}. ` +
          `Investigate the DB state before re-running.`,
      );
    }
  },

  // Single transparent spy over the DETAIL check-scale mutations, classified by path. Auto so it is
  // armed before any step navigates. Note '**/api/check-scales/**' does NOT match the summary flow's
  // '/api/summary-check-scales/...' (different path segment), so the two spies never overlap.
  detailMutationCounts: [
    async ({ page }, use) => {
      const counts: DetailMutationCounts = { validate: 0, create: 0, update: 0 };
      await page.route('**/api/check-scales/**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/check-scales/validate')) counts.validate += 1;
        else if (method === 'POST' && path.endsWith('/check-scales/create')) counts.create += 1;
        else if (method === 'PUT' && /\/check-scales\/\d+$/.test(path)) counts.update += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],

  validateCalls: async ({ detailMutationCounts }, use) => {
    await use(() => detailMutationCounts.validate);
  },
  createDetailCalls: async ({ detailMutationCounts }, use) => {
    await use(() => detailMutationCounts.create);
  },
  updateDetailCalls: async ({ detailMutationCounts }, use) => {
    await use(() => detailMutationCounts.update);
  },

});
