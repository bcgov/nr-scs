import { test as base } from 'playwright-bdd';

import { ScaleSiteRiskRatingTabPage } from '../../pages/rsk/ScaleSiteRiskRatingTabPage';
import { ScaleSiteRiskAssessmentFormPage } from '../../pages/rsk/ScaleSiteRiskAssessmentFormPage';
import { ScalerRiskRatingTabPage } from '../../pages/rsk/ScalerRiskRatingTabPage';
import { ScalerRiskAssessmentFormPage } from '../../pages/rsk/ScalerRiskAssessmentFormPage';
import { ScalerRiskAssessmentSearchPage } from '../../pages/rsk/ScalerRiskAssessmentSearchPage';
import { ScaleSiteRiskAssessmentSearchPage } from '../../pages/rsk/ScaleSiteRiskAssessmentSearchPage';
import { deleteRiskAssessmentsViaDb } from '../rsk/riskAssessmentDbCleanup';
import { riskHappyPathSite, inRangeAnswers, riskComments } from '../../fixtures/rsk/rsk-test-data';
import {
  scalerHappyPath,
  scalerInRangeAnswers,
  scalerRiskComments,
} from '../../fixtures/rsk/scaler-risk-complete-test-data';

/** POST /api/scale-sites/{id}/risk-assessments — the create path only (NOT the /create-init GET). */
function isScaleSiteRiskCreatePost(url: string, method: string): boolean {
  return method === 'POST' && /\/scale-sites\/[^/]+\/risk-assessments$/.test(new URL(url).pathname);
}

/** POST /api/scalers/{licence}/risk-assessments — the create path only (NOT the /create-init GET). */
function isScalerRiskCreatePost(url: string, method: string): boolean {
  return method === 'POST' && /\/scalers\/[^/]+\/risk-assessments$/.test(new URL(url).pathname);
}

// The RSK domain covers two distinct subjects that share this one fixtures file (one file per domain, per
// steps/fixtures/index.ts):
//   - Scale Site Risk Assessment (UC-RSK-007) — the create/edit/view flow, with seed + DB cleanup + a
//     create-spy (mutations, so prove-the-negative matters). Its fixtures are prefixed `scaleSiteRisk*`.
//   - Scaler Risk Assessment Search (UC-QRY-007) — a read-only parameter search; just a lazy page object.
export type RskFixtures = {
  // --- Scale Site Risk Assessment (UC-RSK-007) — create / edit / view flow ---
  scaleSiteRiskRatingTabPage: ScaleSiteRiskRatingTabPage;
  scaleSiteRiskFormPage: ScaleSiteRiskAssessmentFormPage;
  /** Ids of assessments created via API or UI — DELETEd at the DB on teardown (no endpoint exists). */
  createdScaleSiteRiskAssessmentIds: string[];
  /** Seed a completed, in-range assessment via the API; returns its id (registered for cleanup). */
  seedScaleSiteRiskAssessment: (scaleSiteIdNmbr?: string) => Promise<string>;
  /** Transparent spy over the UI create POST: count + the ids it returned (any 2xx). */
  scaleSiteRiskCreateSpy: { count: number; createdIds: string[] };
  /** Number of UI-driven create POSTs so far (prove-the-negative for client-blocked saves). */
  scaleSiteRiskCreateCalls: () => number;

  // --- Risk Assessment Search (UC-QRY-007) — read-only parameter search, one page object per subject ---
  // Lazy page-object fixtures; no seed/cleanup and no spy (the pages have no mutations and no client-side
  // rejection to prove-the-negative). Scaler and Scale Site are separate pages/branches/endpoints.
  scalerRiskAssessmentSearchPage: ScalerRiskAssessmentSearchPage;
  scaleSiteRiskAssessmentSearchPage: ScaleSiteRiskAssessmentSearchPage;

  // --- Scaler Risk Assessment (UC-RSK-006) — create / edit / view flow (twin of the scale-site block) ---
  scalerRiskRatingTabPage: ScalerRiskRatingTabPage;
  scalerRiskFormPage: ScalerRiskAssessmentFormPage;
  /** Ids of scaler assessments created via API or UI — DELETEd at the DB on teardown (no endpoint exists). */
  createdScalerRiskAssessmentIds: string[];
  /** Seed a completed, in-range scaler assessment via the API; returns its id (registered for cleanup). */
  seedScalerRiskAssessment: (scalerLicenceNo?: string) => Promise<string>;
  /** Transparent spy over the UI scaler-create POST: count + the ids it returned (any 2xx). */
  scalerRiskCreateSpy: { count: number; createdIds: string[] };
  /** Number of UI-driven scaler create POSTs so far (prove-the-negative for client-blocked saves). */
  scalerRiskCreateCalls: () => number;
};

export const rskTest = base.extend<RskFixtures>({
  scaleSiteRiskRatingTabPage: async ({ page }, use) => {
    await use(new ScaleSiteRiskRatingTabPage(page));
  },
  scaleSiteRiskFormPage: async ({ page }, use) => {
    await use(new ScaleSiteRiskAssessmentFormPage(page));
  },

  // Cleanup registry. Scale site risk assessments have NO delete/cancel endpoint, so every created id
  // is removed directly at the DB (children RISK_QUESTION_RESPONSE then parent RISK_QUESTIONNAIRE) —
  // the skill's sanctioned no-endpoint fallback. Also removes a row orphaned by the S05 divergence
  // (0 responses, 404s on read) because the delete is by id, not via a read path. Fails LOUD on residue:
  // a leaked row would surface a phantom assessment on a shared site's Risk Rating tab.
  createdScaleSiteRiskAssessmentIds: async ({}, use) => {
    const ids: string[] = [];
    await use(ids);
    if (ids.length === 0) return;
    // deleteRiskAssessmentsViaDb throws on any sqlplus error, so a failed teardown fails the run.
    deleteRiskAssessmentsViaDb(ids);
  },

  // Seed a completed assessment via the API (no UI). Uses the in-range answer set so the row is
  // visible to every read path (see fixtures/rsk/rsk-test-data.ts for the rating-range gate). Registers
  // the id the moment it is known so teardown runs even if the scenario later fails.
  seedScaleSiteRiskAssessment: async ({ request, createdScaleSiteRiskAssessmentIds }, use) => {
    await use(async (scaleSiteIdNmbr: string = riskHappyPathSite.scaleSiteIdNmbr) => {
      const res = await request.post(
        `/api/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/risk-assessments`,
        {
          data: {
            comments: riskComments.seed,
            responses: inRangeAnswers.map((a) => ({ questionId: a.questionId, answerId: a.answerId })),
          },
        },
      );
      if (!res.ok()) {
        throw new Error(`[seed] risk assessment create failed: HTTP ${res.status()} — ${await res.text()}`);
      }
      const id = String(((await res.json()) as { riskQuestionnaireId: number }).riskQuestionnaireId);
      createdScaleSiteRiskAssessmentIds.push(id);
      return id;
    });
  },

  // Spy over the UI create POST. Auto so it is armed before any step navigates/submits. Two transparent
  // halves that never alter the app's request/response:
  //   - a `route` handler that only COUNTS the create POST then `continue()`s it (a client-blocked save,
  //     S04, leaves count at 0, which PROVES the write never left the browser);
  //   - a passive `response` listener that reads the success body to grab the new id WITHOUT relying on the
  //     redirect (create redirects to the Risk Rating tab, which carries no id) or on reading the table
  //     (unsafe under parallel repeat-each on the same site). The capture is async, so read-back steps
  //     poll `createdIds` (see verify.steps.ts) rather than reading it synchronously after the click.
  scaleSiteRiskCreateSpy: [
    async ({ page }, use) => {
      const spy: { count: number; createdIds: string[] } = { count: 0, createdIds: [] };
      await page.route('**/api/scale-sites/*/risk-assessments', async (route) => {
        const req = route.request();
        if (isScaleSiteRiskCreatePost(req.url(), req.method())) spy.count += 1;
        await route.continue();
      });
      page.on('response', async (response) => {
        // Gate on any 2xx, not a hardcoded 201, so this stays in step with the seed helper's `res.ok()`
        // (the endpoint returns 201 today; a switch to 200 must not silently empty `createdIds`).
        const req = response.request();
        if (!isScaleSiteRiskCreatePost(req.url(), req.method()) || !response.ok()) return;
        try {
          const body = (await response.json()) as { riskQuestionnaireId?: number };
          if (body.riskQuestionnaireId != null) spy.createdIds.push(String(body.riskQuestionnaireId));
        } catch {
          // non-JSON/undecodable body — leave createdIds empty; the read-back poll will fail loud.
        }
      });
      await use(spy);
    },
    { auto: true },
  ],
  scaleSiteRiskCreateCalls: async ({ scaleSiteRiskCreateSpy }, use) => {
    await use(() => scaleSiteRiskCreateSpy.count);
  },

  scalerRiskAssessmentSearchPage: async ({ page }, use) => {
    await use(new ScalerRiskAssessmentSearchPage(page));
  },
  scaleSiteRiskAssessmentSearchPage: async ({ page }, use) => {
    await use(new ScaleSiteRiskAssessmentSearchPage(page));
  },

  // ---- Scaler Risk Assessment (UC-RSK-006) — twin of the scale-site create/edit/view fixtures ----
  scalerRiskRatingTabPage: async ({ page }, use) => {
    await use(new ScalerRiskRatingTabPage(page));
  },
  scalerRiskFormPage: async ({ page }, use) => {
    await use(new ScalerRiskAssessmentFormPage(page));
  },

  // Cleanup registry. Scaler risk assessments have NO delete/cancel endpoint, so every created id is
  // removed directly at the DB (children RISK_QUESTION_RESPONSE then parent RISK_QUESTIONNAIRE) — the
  // skill's sanctioned no-endpoint fallback, shared with the scale-site subject (delete is by id, subject
  // agnostic). Also removes a row orphaned by the edit-clears-all-answers divergence (0 responses, 404s on
  // read). Fails LOUD on residue: a leaked row would surface a phantom assessment on a shared scaler's tab.
  createdScalerRiskAssessmentIds: async ({}, use) => {
    const ids: string[] = [];
    await use(ids);
    if (ids.length === 0) return;
    deleteRiskAssessmentsViaDb(ids);
  },

  // Seed a completed scaler assessment via the API (no UI). Uses the in-range answer set so the row is
  // visible to every read path (see fixtures/rsk/scaler-risk-complete-test-data.ts for the rating-range
  // gate). Registers the id the moment it is known so teardown runs even if the scenario later fails.
  seedScalerRiskAssessment: async ({ request, createdScalerRiskAssessmentIds }, use) => {
    await use(async (scalerLicenceNo: string = scalerHappyPath.scalerLicenceNo) => {
      const res = await request.post(
        `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/risk-assessments`,
        {
          data: {
            comments: scalerRiskComments.seed,
            responses: scalerInRangeAnswers.map((a) => ({
              questionId: a.questionId,
              answerId: a.answerId,
            })),
          },
        },
      );
      if (!res.ok()) {
        throw new Error(
          `[seed] scaler risk assessment create failed: HTTP ${res.status()} — ${await res.text()}`,
        );
      }
      const id = String(((await res.json()) as { riskQuestionnaireId: number }).riskQuestionnaireId);
      createdScalerRiskAssessmentIds.push(id);
      return id;
    });
  },

  // Spy over the UI scaler-create POST — same two-half transparent shape as the scale-site spy (a `route`
  // that only COUNTS the create POST then continue()s it, plus a passive `response` listener that reads the
  // 2xx body for the new id). A client-blocked save (S02) leaves count at 0, PROVING the write never left
  // the browser; the passive id capture avoids relying on the create redirect (which carries no id).
  //
  // The listener registers each captured id for DB cleanup AT THE MOMENT IT IS KNOWN (not later, in a
  // verify step): a UI-created row is a persisted row, so it must be torn down even if the scenario never
  // reaches — or throws before — its read-back/registration step. Depending on `createdScalerRiskAssessmentIds`
  // here makes the spy the single owner of "observe a UI create -> ensure it's cleaned"; verify steps then
  // only READ `createdIds` to assert. (Teardown order: the registry fixture is set up before this spy and
  // torn down after it, so the ids captured during the test are still in the array when its DELETE runs.)
  scalerRiskCreateSpy: [
    async ({ page, createdScalerRiskAssessmentIds }, use) => {
      const spy: { count: number; createdIds: string[] } = { count: 0, createdIds: [] };
      await page.route('**/api/scalers/*/risk-assessments', async (route) => {
        const req = route.request();
        if (isScalerRiskCreatePost(req.url(), req.method())) spy.count += 1;
        await route.continue();
      });
      page.on('response', async (response) => {
        const req = response.request();
        if (!isScalerRiskCreatePost(req.url(), req.method()) || !response.ok()) return;
        try {
          const body = (await response.json()) as { riskQuestionnaireId?: number };
          if (body.riskQuestionnaireId != null) {
            const id = String(body.riskQuestionnaireId);
            spy.createdIds.push(id);
            // Register for teardown immediately (dedup — a scenario may also read it back), so cleanup
            // no longer hinges on a later step running to completion.
            if (!createdScalerRiskAssessmentIds.includes(id)) createdScalerRiskAssessmentIds.push(id);
          }
        } catch {
          // non-JSON/undecodable body — leave createdIds empty; the read-back poll will fail loud.
        }
      });
      await use(spy);
    },
    { auto: true },
  ],
  scalerRiskCreateCalls: async ({ scalerRiskCreateSpy }, use) => {
    await use(() => scalerRiskCreateSpy.count);
  },
});
