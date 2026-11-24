import { test as base } from 'playwright-bdd';

import { ScaleSiteInspectionCreatePage } from '../../pages/ins/ScaleSiteInspectionCreatePage';
import { ScaleSiteInspectionEditPage } from '../../pages/ins/ScaleSiteInspectionEditPage';
import { ScaleSiteInspectionViewPage } from '../../pages/ins/ScaleSiteInspectionViewPage';
import { ScaleSiteInspectionsTabPage } from '../../pages/ins/ScaleSiteInspectionsTabPage';
import { inspectionSeedHeader, inspectionHappyPathSite } from '../../fixtures/ins/ins-test-data';
import { daysAgo } from '../../fixtures/common/dates';

/** One question row as the EDIT read endpoint returns it (the only inspection read that carries ids). */
export type InspectionEditQuestion = {
  inspectionQuestionId: number;
  inspectionAnswerCode: string | null;
  commentsText: string | null;
  followUpRequiredInd: string | null;
  followUpActionText: string | null;
  followUpDueDate: string | null;
  followUpCompletedInd: string | null;
};

/** GET /api/scale-sites/inspection/{id}/edit — the read-back oracle for the edit suite. */
export type InspectionEditView = {
  inspectionId: number;
  scaleSiteIdNmbr: string;
  inspectionDate: string | null;
  inspector: string | null;
  siteOperatorPresentInd: string | null;
  comments: string | null;
  questionResponses: InspectionEditQuestion[];
};

/**
 * The single-record inspection endpoint, in ONE place. `PUT` (update) and `DELETE` share this exact
 * path while the edit READ hangs one segment below it, and the write spy's route glob has to agree with
 * both — so the path, its `/edit` sibling and the glob are derived here rather than retyped at each of
 * the five call sites below, where they could silently drift apart.
 */
const inspectionPath = (inspectionId: string): string =>
  `/api/scale-sites/inspection/${encodeURIComponent(inspectionId)}`;
const inspectionEditPath = (inspectionId: string): string => `${inspectionPath(inspectionId)}/edit`;

/**
 * Route glob for the single-record endpoint. Playwright's single `*` does NOT cross a `/`, so this
 * matches `/inspection/{id}` but deliberately NOT `/inspection/{id}/edit` — the edit READ must stay
 * un-intercepted or the spy would count reads as writes.
 */
const INSPECTION_RECORD_GLOB = '**/api/scale-sites/inspection/*';

export type InsFixtures = {
  inspectionCreatePage: ScaleSiteInspectionCreatePage;
  inspectionEditPage: ScaleSiteInspectionEditPage;
  inspectionViewPage: ScaleSiteInspectionViewPage;
  inspectionsTabPage: ScaleSiteInspectionsTabPage;
  createdInspectionIds: string[];
  seedInspection: (scaleSiteIdNmbr?: string) => Promise<string>;
  inspectionCreateCounts: { create: number };
  inspectionCreateCalls: () => number;
  /** Read the edit payload (the only inspection read carrying inspectionQuestionId) for read-backs. */
  readInspectionEdit: (inspectionId: string) => Promise<InspectionEditView>;
  /** Status of a raw detail GET — proves presence (200) or absence (404) after a delete. */
  inspectionDetailStatus: (inspectionId: string) => Promise<number>;
  /** Remove a record out-of-band, so a UI gesture can then hit a genuinely-missing row (404 path). */
  deleteInspectionViaApi: (inspectionId: string) => Promise<number>;
  inspectionWriteCounts: { update: number; delete: number };
  inspectionUpdateCalls: () => number;
  inspectionDeleteCalls: () => number;
};

export const insTest = base.extend<InsFixtures>({
  inspectionCreatePage: async ({ page }, use) => {
    await use(new ScaleSiteInspectionCreatePage(page));
  },
  inspectionEditPage: async ({ page }, use) => {
    await use(new ScaleSiteInspectionEditPage(page));
  },
  inspectionViewPage: async ({ page }, use) => {
    await use(new ScaleSiteInspectionViewPage(page));
  },
  inspectionsTabPage: async ({ page }, use) => {
    await use(new ScaleSiteInspectionsTabPage(page));
  },

  // Cleanup registry for site inspections created via API or UI. Every id is DELETEd via the app's own
  // endpoint on teardown (DELETE /api/scale-sites/inspection/{id}, cascades responses + scaling
  // methods), so the seeded DB is left as found and tests stay order-independent. Fails LOUD on residue:
  // a leaked row would surface a *viewable* inspection on a shared site and break the empty-list checks.
  createdInspectionIds: async ({ request }, use) => {
    const ids: string[] = [];
    await use(ids);
    const residue: string[] = [];
    for (const id of ids) {
      let status: number;
      try {
        const res = await request.delete(inspectionPath(id));
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
        `[cleanup] left DB residue — these site inspections were not removed and will pollute the ` +
          `seeded DB: ${residue.join(', ')}. Investigate the DELETE endpoint / DB state before re-running.`,
      );
    }
  },

  seedInspection: async ({ request, createdInspectionIds }, use) => {
    await use(async (scaleSiteIdNmbr: string = inspectionHappyPathSite.scaleSiteIdNmbr) => {
      const initRes = await request.get(
        `/api/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/create` +
          `?inspectionTypeCode=${inspectionSeedHeader.inspectionTypeCode}` +
          `&siteTypeCodes=${inspectionSeedHeader.siteTypeCodes.join('&siteTypeCodes=')}`,
      );
      if (!initRes.ok()) {
        throw new Error(`[seed] create-init failed: HTTP ${initRes.status()} — ${await initRes.text()}`);
      }
      const init = (await initRes.json()) as {
        questionResponses?: { inspectionQuestionId: number }[];
      };
      const questionResponses = (init.questionResponses ?? []).map((q) => ({
        inspectionQuestionId: q.inspectionQuestionId,
        inspectionAnswerCode: 'Y',
        followUpRequiredInd: 'N',
      }));
      const res = await request.post(
        `/api/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections`,
        {
          data: {
            inspectionTypeCode: inspectionSeedHeader.inspectionTypeCode,
            siteTypeCodes: inspectionSeedHeader.siteTypeCodes,
            inspectionDate: daysAgo(1),
            inspector: inspectionSeedHeader.inspector,
            siteOperatorPresentInd: inspectionSeedHeader.siteOperatorPresentInd,
            comments: inspectionSeedHeader.comments,
            questionResponses,
          },
        },
      );
      if (!res.ok()) {
        throw new Error(`[seed] inspection create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { inspectionId: number }).inspectionId);
      createdInspectionIds.push(id); // register for teardown the moment the id is known
      return id;
    });
  },

  // Transparent spy over the site-inspection CREATE endpoint. Auto so it is armed before any step
  // navigates/submits. Matches POST /api/scale-sites/{id}/inspections ONLY (the GET create-init ends in
  // /create; the GET list is the same path but a GET) so a client-validation negative can PROVE the
  // write never left the browser (count === 0) instead of inferring it from a missing redirect.
  inspectionCreateCounts: [
    async ({ page }, use) => {
      const counts = { create: 0 };
      await page.route('**/api/scale-sites/*/inspections', async (route) => {
        const req = route.request();
        if (req.method() === 'POST' && /\/scale-sites\/[^/]+\/inspections$/.test(new URL(req.url()).pathname)) {
          counts.create += 1;
        }
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  inspectionCreateCalls: async ({ inspectionCreateCounts }, use) => {
    await use(() => inspectionCreateCounts.create);
  },

  // --- read-backs (API, black-box) --------------------------------------------------------------
  //
  // The EDIT payload is the read-back oracle for the update suite because it is the only inspection
  // read that carries `inspectionQuestionId` per row — the DETAIL response returns questionText only,
  // and the real question library contains DUPLICATE texts (ids 401 and 641 are both "Site Active?"),
  // so a detail-based per-question assertion could match the wrong row. Verified by hand 2026-09-09.
  readInspectionEdit: async ({ request }, use) => {
    await use(async (inspectionId: string) => {
      const res = await request.get(inspectionEditPath(inspectionId));
      if (!res.ok()) {
        throw new Error(
          `[read-back] inspection edit read failed for ${inspectionId}: HTTP ${res.status()} — ${await res.text()}`,
        );
      }
      return (await res.json()) as InspectionEditView;
    });
  },

  inspectionDetailStatus: async ({ request }, use) => {
    await use(async (inspectionId: string) => {
      const res = await request.get(inspectionPath(inspectionId));
      return res.status();
    });
  },

  deleteInspectionViaApi: async ({ request }, use) => {
    await use(async (inspectionId: string) => {
      const res = await request.delete(inspectionPath(inspectionId));
      return res.status();
    });
  },

  // --- write spies over the single-record endpoint ----------------------------------------------
  //
  // PUT (update) and DELETE share the single-record path, so ONE route handler counts both, split by
  // verb (see INSPECTION_RECORD_GLOB above for why the `/edit` read is not intercepted). Auto so it is
  // armed before any step navigates. The GET of `/{id}` itself is left uncounted. This is what lets a
  // blocked Save PROVE the write never left the browser
  // (update === 0) and a Cancel PROVE no delete was issued (delete === 0), rather than inferring it
  // from a missing redirect.
  inspectionWriteCounts: [
    async ({ page }, use) => {
      const counts = { update: 0, delete: 0 };
      await page.route(INSPECTION_RECORD_GLOB, async (route) => {
        const method = route.request().method();
        if (method === 'PUT') {
          counts.update += 1;
        } else if (method === 'DELETE') {
          counts.delete += 1;
        }
        await route.continue();
      });
      await use(counts);
    },
    { auto: true },
  ],
  inspectionUpdateCalls: async ({ inspectionWriteCounts }, use) => {
    await use(() => inspectionWriteCounts.update);
  },
  inspectionDeleteCalls: async ({ inspectionWriteCounts }, use) => {
    await use(() => inspectionWriteCounts.delete);
  },
});
