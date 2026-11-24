import { test as base } from 'playwright-bdd';

import { MarkSiteDesignationLetterPage } from '../../pages/rpt/MarkSiteDesignationLetterPage';
import { ReportScreenPage } from '../../pages/rpt/ReportScreenPage';

/**
 * RPT domain fixtures (reports + letters): the MSD Letter Options screen (UC-RPT-009) and the nine
 * Reports-tab parameter screens (UC-RPT-004/005/006/010/011/012/013/014/015).
 *
 * `letterMsdCalls` (the letter-generate spy) is owned by the MSD-domain fixtures, because that spy already
 * intercepts every `/mark-site-designations**` path — a second overlapping `page.route` would race it.
 * By the same rule, `reportRequests` below is the SINGLE owner of the report-endpoint glob: it both
 * RECORDS every report POST and optionally FULFILLS it, so no second handler ever has to be registered
 * for the report endpoints (Playwright's last-registered handler wins, which is exactly the clobbering
 * the CHK fixtures warn about).
 */

/** One captured report request: which report screen fired it, and the JSON payload it carried. */
export type CapturedReportRequest = {
  /** Final path segment of `/api/reports/<endpoint>` — e.g. `scaler-register`. */
  endpoint: string;
  /** The parsed request body (the payload the screen's `useMemo` built). */
  body: Record<string, unknown>;
};

/**
 * Spy + optional stub over the report endpoints.
 *
 * STUBBED BY DEFAULT — real rendering is OPT-IN. This is the important thing to understand about this file.
 *
 * Report generation is slow and rationed: a district-filtered render takes 2-16s, province-wide can exceed
 * 120s, and `ReportService` allows only THREE concurrent renders (a fourth caller waits 20s, then 503s).
 * Meanwhile ~41 scenarios submit a report purely to assert the REQUEST PAYLOAD — they never look at the
 * response. While generation was environment-blocked (every POST 500'd instantly) that cost nothing; once the
 * engine started working each of those scenarios silently began triggering a real render, 31 of them
 * province-wide, which starved the engine for everything else running alongside.
 *
 * So the default is now a stubbed 200 + tiny PDF: instant, no render, no contention, and no dependence on the
 * report engine even being up. The payload assertions are unaffected because the request is recorded BEFORE
 * the route is fulfilled.
 *
 * `useRealEngine()` opts a scenario into the genuine path. Only the `@generation` scenarios do that (the
 * download step calls it), and those are the deliberately small set that proves each Jasper template actually
 * renders — run in sequence, never in parallel. See the README's "Report generation" section.
 *
 * Two further overrides exist for arms the real engine cannot produce:
 *   • `stubPdf(undefined)` — suppress `Content-Disposition` so `useReportDownload`'s `.pdf`/`.xls` FALLBACK
 *     filename branch is reachable. The real backend always sends that header.
 *   • `failWith500()` — force the failure that used to arrive free from the environment, keeping the
 *     "Unable to submit report" branch covered.
 * Both use the same `route.fulfill` fault/stub-injection pattern as
 * `pages/rsk/ScalerRiskAssessmentSearchPage.failSearchWith500()` and `steps/chk/verify.steps.ts`.
 */
export type ReportRequestSpy = {
  /** Every report POST seen this scenario, in order. */
  calls: CapturedReportRequest[];
  /** Calls for one endpoint segment (e.g. `scaler-register`). */
  callsFor: (endpoint: string) => CapturedReportRequest[];
  /**
   * Stub the Jasper response for subsequent report POSTs with a tiny PDF body and an optional
   * `Content-Disposition` filename. Requests are still recorded before being fulfilled.
   */
  stubPdf: (filename?: string) => void;
  /**
   * Fault injection: fail subsequent report POSTs with an HTTP 500, so the screens' own
   * "Unable to submit report" branch is reachable. Needed since the local report engine started working —
   * that branch used to be covered by the environment's own Jasper 500s, with nothing faked.
   */
  failWith500: () => void;
  /**
   * Opt this scenario into the REAL report engine, so the request reaches JasperServer and renders a genuine
   * document. Only the `@generation` scenarios use this — see the file docstring for why it is opt-in.
   */
  useRealEngine: () => void;
};

export type RptFixtures = {
  markSiteDesignationLetterPage: MarkSiteDesignationLetterPage;
  reportScreenPage: ReportScreenPage;
  reportRequests: ReportRequestSpy;
  reportGenerationTimeout: void;
};

/** Minimal but structurally valid single-page PDF — enough for a Blob + a browser download. */
const STUB_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj',
  'trailer<</Root 1 0 R>>',
  '%%EOF',
].join('\n');

export const rptTest = base.extend<RptFixtures>({
  markSiteDesignationLetterPage: async ({ page }, use) => {
    await use(new MarkSiteDesignationLetterPage(page));
  },

  reportScreenPage: async ({ page }, use) => {
    await use(new ReportScreenPage(page));
  },

  /**
   * Real report GENERATION is slow — measured 2–16s of JasperServer render time per report (Scaler Register
   * is the slowest at ~16s even filtered to one district; province-wide exceeds 120s, which is why the
   * generation scenarios always filter). On top of that, `ReportService` caps concurrent renders at 3 and
   * makes a fourth caller wait up to 20s before rejecting it with a 503 — so under parallel workers a
   * generation scenario can legitimately spend a while queued before its render even starts.
   *
   * The suite-wide 60s test timeout is right for every other scenario and too tight for that, so rather
   * than raising it globally this auto fixture grants a longer budget to scenarios tagged `@generation`.
   */
  reportGenerationTimeout: [
    async ({}, use, testInfo) => {
      if (testInfo.tags.includes('@generation')) {
        testInfo.setTimeout(180_000);
      }
      await use();
    },
    { auto: true },
  ],

  // Auto so the spy is armed before any step navigates — a payload assertion must never depend on the
  // handler being registered by an earlier step.
  reportRequests: [
    async ({ page }, use) => {
      const calls: CapturedReportRequest[] = [];
      let stubFilename: string | null | undefined;
      // Stubbed by default; `useRealEngine()` flips this. See the file docstring.
      let realEngine = false;
      let failing = false;

      await page.route('**/api/reports/**', async (route) => {
        const request = route.request();

        if (request.method() !== 'POST') {
          await route.continue();
          return;
        }

        const path = new URL(request.url()).pathname;
        const endpoint = path.split('/').filter(Boolean).pop() ?? '';

        let body: Record<string, unknown> = {};
        try {
          body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
        } catch {
          // A non-JSON body would itself be a defect; record the call with an empty body so the
          // scenario fails on the payload assertion (with the real diff) rather than on a parse throw.
          body = {};
        }
        calls.push({ endpoint, body });

        if (failing) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Simulated report generation failure.',
            }),
          });
          return;
        }

        if (realEngine) {
          await route.continue(); // reaches the real backend and really renders the report
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/pdf',
          headers: stubFilename
            ? { 'content-disposition': `attachment; filename="${stubFilename}"` }
            : {},
          body: STUB_PDF,
        });
      });

      const spy: ReportRequestSpy = {
        calls,
        callsFor: (endpoint: string) => calls.filter((call) => call.endpoint === endpoint),
        stubPdf: (filename?: string) => {
          stubFilename = filename;
        },
        failWith500: () => {
          failing = true;
        },
        useRealEngine: () => {
          realEngine = true;
        },
      };

      await use(spy);
    },
    { auto: true },
  ],
});
