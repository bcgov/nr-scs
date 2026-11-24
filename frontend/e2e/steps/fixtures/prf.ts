import { test as base } from 'playwright-bdd';

import { PerformanceRemarksTabPage } from '../../pages/prf/PerformanceRemarksTabPage';
import {
  prfAnchorScalerLicenceNo,
  happyActionRemark,
} from '../../fixtures/prf/performance-remark-test-data';

/** A performance remark created during a scenario, keyed for teardown via the app's DELETE endpoint. */
export interface CreatedRemark {
  scalerLicenceNo: string;
  id: string;
}

/** POST /api/scalers/{licence}/performance-remarks — the CREATE path only (not the /{id} PUT/DELETE). */
function isPerformanceRemarkCreatePost(url: string, method: string): boolean {
  return (
    method === 'POST' && /\/scalers\/[^/]+\/performance-remarks$/.test(new URL(url).pathname)
  );
}

/** PUT /api/scalers/{licence}/performance-remarks/{id} — the UPDATE path (the id-scoped edit, not CREATE). */
function isPerformanceRemarkUpdatePut(url: string, method: string): boolean {
  return (
    method === 'PUT' && /\/scalers\/[^/]+\/performance-remarks\/[^/]+$/.test(new URL(url).pathname)
  );
}

export type PrfFixtures = {
  performanceRemarksTabPage: PerformanceRemarksTabPage;
  /** Remarks created via API or UI — DELETEd through the app endpoint on teardown (fails loud on residue). */
  createdRemarks: CreatedRemark[];
  /** Seed a valid remark via the API (no UI); returns its id and registers it for cleanup. */
  seedPerformanceRemark: (scalerLicenceNo?: string) => Promise<string>;
  /** Transparent spy over the UI create POST + update PUT: create count, ids returned (any 2xx, registered
   *  for cleanup), and update count. */
  performanceRemarkCreateSpy: { count: number; createdIds: string[]; updateCount: number };
  /** Number of UI-driven create POSTs so far (prove-the-negative for client-blocked saves). */
  performanceRemarkCreateCalls: () => number;
  /** Number of UI-driven update PUTs so far (prove-the-negative for client-blocked edits; canary that the
   *  server-rejected edit DID leave the browser). */
  performanceRemarkUpdateCalls: () => number;
};

export const prfTest = base.extend<PrfFixtures>({
  performanceRemarksTabPage: async ({ page }, use) => {
    await use(new PerformanceRemarksTabPage(page));
  },

  // Cleanup registry. Performance remarks HAVE a real DELETE endpoint, so every created id is removed
  // through the app (DELETE /api/scalers/{licence}/performance-remarks/{id}) — no DB fallback needed.
  // Fails LOUD on residue: a leaked remark would surface as a phantom row on a shared scaler's tab and
  // break another scenario's id-scoped assertions.
  createdRemarks: async ({ request }, use) => {
    const remarks: CreatedRemark[] = [];
    await use(remarks);
    const residue: string[] = [];
    for (const { scalerLicenceNo, id } of remarks) {
      const res = await request.delete(
        `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks/${encodeURIComponent(id)}`,
      );
      // 404 = already gone (a delete scenario removed it) — not residue.
      if (!res.ok() && res.status() !== 404) residue.push(`${scalerLicenceNo}/${id} -> ${res.status()}`);
    }
    if (residue.length) throw new Error(`[cleanup] performance-remark residue: ${residue.join(', ')}`);
  },

  // Seed a valid remark via the API (bypassing the UI) for update/delete scenarios that need an existing
  // row to act on. Uses the Action happy-path values. Registers the id the moment it is known so teardown
  // runs even if the scenario later fails. `request` (APIRequestContext) is separate from page network, so
  // this POST does NOT trip the page create-spy below.
  seedPerformanceRemark: async ({ request, createdRemarks }, use) => {
    await use(async (scalerLicenceNo: string = prfAnchorScalerLicenceNo) => {
      const res = await request.post(
        `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks`,
        {
          data: {
            loggedTimestamp: happyActionRemark.dateOfIncident,
            scalerPerformanceActnCode: happyActionRemark.actionCode,
            scalerPerformanceOutcmCode: null,
            performanceRemarkDesc: happyActionRemark.description,
            outcomeDesc: null,
            suspendStartDate: null,
            suspendEndDate: null,
            checkScaleId: null,
          },
        },
      );
      if (!res.ok()) {
        throw new Error(
          `[seed] performance-remark create failed: HTTP ${res.status()} — ${await res.text()}`,
        );
      }
      const id = String(
        ((await res.json()) as { scalerPerformanceRemarkId: number }).scalerPerformanceRemarkId,
      );
      createdRemarks.push({ scalerLicenceNo, id });
      return id;
    });
  },

  // Spy over the UI create POST. Auto so it is armed before any step navigates/submits. Both halves are
  // ADDITIVE observers (page.on, NOT page.route) — deliberately: Playwright runs only ONE route handler per
  // request, and scl.ts registers a broad `**/api/scalers**` { auto } route that ALSO matches this create
  // POST. A counting page.route here would win-or-lose by mergeTests registration order (incidental), so a
  // reorder of index.ts could silently pin count at 0 and make every prove-the-negative pass vacuously.
  // page.on listeners never clobber each other or a route.continue(), so this observation is order-immune.
  // Two transparent halves that never alter the request/response:
  //   - a `request` listener that COUNTS the create POST and the update PUT separately (a client-blocked
  //     save/edit leaves its count at 0, which PROVES the write never left the browser; a server-rejected
  //     one leaves count >= 1, the canary that it DID);
  //   - a passive `response` listener that reads the 2xx body for the new id and registers it for cleanup AT
  //     THE MOMENT IT IS KNOWN — a UI-created row is a persisted row, so it must be torn down even if the
  //     scenario throws before its read-back/registration step.
  performanceRemarkCreateSpy: [
    async ({ page, createdRemarks }, use) => {
      const spy: { count: number; createdIds: string[]; updateCount: number } = {
        count: 0,
        createdIds: [],
        updateCount: 0,
      };
      const onRequest = (req: import('@playwright/test').Request) => {
        if (isPerformanceRemarkCreatePost(req.url(), req.method())) spy.count += 1;
        else if (isPerformanceRemarkUpdatePut(req.url(), req.method())) spy.updateCount += 1;
      };
      page.on('request', onRequest);
      // Playwright does NOT await `response` listeners, so each registration's async id read-back is a
      // detached promise. Collect them in `pending`, detach the handler with page.off, then drain with
      // Promise.allSettled at teardown — this runs BEFORE the createdRemarks DELETE loop (that fixture is a
      // dependency, so its teardown runs AFTER this one), guaranteeing every UI-created id is registered
      // before cleanup reads the registry. Without the drain, the failure path (POST 201 → redirect wait
      // times out → teardown) can leak a remark on 5828, silently falsifying the COUNT(*)=0 invariant the
      // fixture documents. Mirrors createdScalerCapture (scl.ts). page.off avoids a listener leak too.
      const pending: Promise<void>[] = [];
      const onResponse = (response: import('@playwright/test').Response) => {
        const req = response.request();
        if (!isPerformanceRemarkCreatePost(req.url(), req.method()) || !response.ok()) return;
        // Recover the scaler licence from the request path so cleanup can hit the right DELETE route.
        const match = new URL(req.url()).pathname.match(/\/scalers\/([^/]+)\/performance-remarks$/);
        const scalerLicenceNo = match ? decodeURIComponent(match[1]) : prfAnchorScalerLicenceNo;
        pending.push(
          (async () => {
            try {
              const body = (await response.json()) as { scalerPerformanceRemarkId?: number };
              if (body.scalerPerformanceRemarkId != null) {
                const id = String(body.scalerPerformanceRemarkId);
                spy.createdIds.push(id);
                if (!createdRemarks.some((r) => r.id === id)) createdRemarks.push({ scalerLicenceNo, id });
              }
            } catch {
              // non-JSON/undecodable body — leave createdIds empty; the read-back poll will fail loud.
            }
          })(),
        );
      };
      page.on('response', onResponse);
      await use(spy);
      page.off('request', onRequest);
      page.off('response', onResponse);
      await Promise.allSettled(pending);
    },
    { auto: true },
  ],
  performanceRemarkCreateCalls: async ({ performanceRemarkCreateSpy }, use) => {
    await use(() => performanceRemarkCreateSpy.count);
  },
  performanceRemarkUpdateCalls: async ({ performanceRemarkCreateSpy }, use) => {
    await use(() => performanceRemarkCreateSpy.updateCount);
  },
});
