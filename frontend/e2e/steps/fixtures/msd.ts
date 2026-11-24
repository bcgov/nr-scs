import { test as base } from 'playwright-bdd';

import { MarkSiteDesignationCreatePage } from '../../pages/msd/MarkSiteDesignationCreatePage';
import { MarkSiteDesignationEditPage } from '../../pages/msd/MarkSiteDesignationEditPage';
import { MarkSiteDesignationViewPage } from '../../pages/msd/MarkSiteDesignationViewPage';
import { ScaleSiteMsdTabPage } from '../../pages/msd/ScaleSiteMsdTabPage';
import { buildMsdCreateBody } from '../../fixtures/msd/msd-test-data';
import { deleteMarkSiteDesignationsViaDb } from '../msd/markSiteDesignationDbCleanup';

export type MsdFixtures = {
  markSiteDesignationCreatePage: MarkSiteDesignationCreatePage;
  markSiteDesignationEditPage: MarkSiteDesignationEditPage;
  markSiteDesignationViewPage: MarkSiteDesignationViewPage;
  scaleSiteMsdTabPage: ScaleSiteMsdTabPage;
  msdMutationCounts: { create: number; update: number; remove: number; search: number; letter: number };
  createMsdCalls: () => number;
  updateMsdCalls: () => number;
  removeMsdCalls: () => number;
  // Read-side counter over GET /api/mark-site-designations/search — lets the UC-QRY-005 (Queries > MSD)
  // client-validation negatives PROVE no search request fired (count === 0). Owned by this spy because it
  // already intercepts every /mark-site-designations** path (a second overlapping page.route would race it).
  searchMsdCalls: () => number;
  // Counter over POST /api/mark-site-designations/{id}/letter — lets the UC-RPT-009 letter-options
  // client-validation negatives PROVE no letter-generate request fired (count === 0). Same-route ownership.
  letterMsdCalls: () => number;
  seedMarkSiteDesignation: (districtWide: 'Y' | 'N', scaleSites?: string[]) => Promise<string>;
  createdMsdIds: string[];
  /**
   * Read the record's `letterExists` flag via GET /api/mark-site-designations/{id} — the black-box
   * persistence oracle for UC-RPT-009 generation: a letter WRITE flips it false→true. Independent of what
   * the UI renders.
   */
  readMsdLetterExists: (id: string) => Promise<boolean>;
  /**
   * Issue a letter out-of-band (POST /{id}/letter, Preview=Yes) so a scenario can reach the
   * letter-EXISTS state without driving the options UI (UC-RPT-009 S02 setup); returns the HTTP status on
   * success and THROWS with the server body on a non-2xx (as `readMsdLetterExists` does), so an S02-setup
   * failure names its cause — e.g. a JCRS/report-engine 500 — instead of a bare "HTTP 500". The inserted
   * `hauling_mark_auth_letter` row is torn down WITH its MSD — `createdMsdIds` DB cleanup deletes that child
   * table before the parent — so only a DISPOSABLE seeded id may be passed here.
   */
  issueMsdLetterViaApi: (
    id: string,
    scaleSignatoryBlockId: string,
    regDistOrgUnitCode: string,
  ) => Promise<number>;
};

export const msdTest = base.extend<MsdFixtures>({
  markSiteDesignationCreatePage: async ({ page }, use) => {
    await use(new MarkSiteDesignationCreatePage(page));
  },

  // Single transparent spy over the MSD mutation endpoints. Auto so it is armed before any step
  // navigates. The glob matches all /mark-site-designations* paths; a POST whose path ENDS in
  // /mark-site-designations is the collection create, and a PUT to /mark-site-designations/{id} is the
  // update — the lookup/search GETs and the /{id}/letter|renew|workbench POSTs are excluded. Lets a
  // client-validation negative PROVE the write never left the browser (count === 0).
  msdMutationCounts: [
    async ({ page }, use) => {
      const counts = { create: 0, update: 0, remove: 0, search: 0, letter: 0 };
      await page.route('**/api/mark-site-designations**', async (route) => {
        const req = route.request();
        const method = req.method();
        const path = new URL(req.url()).pathname;
        if (method === 'POST' && path.endsWith('/mark-site-designations')) counts.create += 1;
        else if (method === 'PUT' && /\/mark-site-designations\/\d+$/.test(path)) counts.update += 1;
        else if (method === 'POST' && path.endsWith('/workbench/remove')) counts.remove += 1;
        else if (method === 'GET' && path.endsWith('/mark-site-designations/search')) counts.search += 1;
        else if (method === 'POST' && /\/mark-site-designations\/\d+\/letter$/.test(path)) counts.letter += 1;
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  createMsdCalls: async ({ msdMutationCounts }, use) => {
    await use(() => msdMutationCounts.create);
  },
  updateMsdCalls: async ({ msdMutationCounts }, use) => {
    await use(() => msdMutationCounts.update);
  },
  removeMsdCalls: async ({ msdMutationCounts }, use) => {
    await use(() => msdMutationCounts.remove);
  },
  searchMsdCalls: async ({ msdMutationCounts }, use) => {
    await use(() => msdMutationCounts.search);
  },
  letterMsdCalls: async ({ msdMutationCounts }, use) => {
    await use(() => msdMutationCounts.letter);
  },

  markSiteDesignationEditPage: async ({ page }, use) => {
    await use(new MarkSiteDesignationEditPage(page));
  },

  markSiteDesignationViewPage: async ({ page }, use) => {
    await use(new MarkSiteDesignationViewPage(page));
  },

  scaleSiteMsdTabPage: async ({ page }, use) => {
    await use(new ScaleSiteMsdTabPage(page));
  },

  // Seed a fresh MSD via the API create (ES20R4 made creatable by msd-create-mark.sql) and register it
  // for DB cleanup; returns its id. RETRIES ONLY on HTTP 409: concurrent MSD creates intermittently
  // return a spurious 409 on the auto-attached mandatory-condition insert (UC-MSD-001 Bug #1, already
  // filed with a standalone repro). This retry hardens the *seed scaffolding* around that known bug —
  // it never wraps a behaviour under test, and the bug stays red-repro'd in UC-MSD-001, not masked here.
  seedMarkSiteDesignation: async ({ request, createdMsdIds }, use) => {
    await use(async (districtWide: 'Y' | 'N', scaleSites: string[] = []) => {
      const body = buildMsdCreateBody(districtWide, scaleSites);
      let last = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const res = await request.post('/api/mark-site-designations', { data: body });
        if (res.ok()) {
          const id = String(((await res.json()) as { haulingMarkAuthorizationId: number }).haulingMarkAuthorizationId);
          createdMsdIds.push(id); // register for DB teardown the moment the id is known
          return id;
        }
        last = `HTTP ${res.status()} — ${await res.text()}`;
        if (res.status() !== 409) break; // only the known intermittent concurrency 409 is retried
      }
      throw new Error(`[seed] MSD create failed: ${last}`);
    });
  },

  readMsdLetterExists: async ({ request }, use) => {
    await use(async (id: string) => {
      const res = await request.get(`/api/mark-site-designations/${encodeURIComponent(id)}`);
      if (!res.ok()) {
        throw new Error(`[read-back] MSD ${id} read failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      return Boolean(((await res.json()) as { letterExists?: boolean }).letterExists);
    });
  },

  issueMsdLetterViaApi: async ({ request }, use) => {
    await use(async (id: string, scaleSignatoryBlockId: string, regDistOrgUnitCode: string) => {
      const res = await request.post(`/api/mark-site-designations/${encodeURIComponent(id)}/letter`, {
        data: {
          regDist: regDistOrgUnitCode,
          scaleSignatoryBlockId: Number(scaleSignatoryBlockId),
          outputFormat: 'PDF',
          preview: true,
        },
      });
      if (!res.ok()) {
        throw new Error(
          `[seed-letter] MSD ${id} letter POST failed: HTTP ${res.status()} — ${await res.text()}`,
        );
      }
      return res.status();
    });
  },

  createdMsdIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    // No DELETE endpoint for MSDs — remove the rows at the DB (children-then-parent, fails loud), then
    // read back through the API to PROVE they are gone (don't trust the delete blindly).
    if (ids.length === 0) return;
    deleteMarkSiteDesignationsViaDb(ids); // throws on sqlplus error
    const residue: string[] = [];
    for (const id of ids) {
      const res = await request.get(`/api/mark-site-designations/${id}`);
      if (res.ok()) residue.push(id); // still fetchable => not deleted
    }
    if (residue.length > 0) {
      throw new Error(
        `[cleanup] mark site designations still present after DB delete: ${residue.join(', ')}. ` +
          `Investigate the DB state before re-running.`,
      );
    }
  },

});
