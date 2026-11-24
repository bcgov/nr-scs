import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * SCS E2E — Playwright + BDD config.
 *
 * Architecture: the `.feature` files under `features/` are the executable spec; `bddgen test`
 * compiles them into native Playwright tests (in the generated `testDir` below) using the step
 * definitions under `steps/`. Everything downstream — reporters, tracing, parallelism, fixtures,
 * page objects — is stock Playwright, unchanged by BDD.
 *
 * HOW TO RUN: from `nr-scs/frontend/` (the npm package root — this suite has no package.json of its
 * own; its deps and scripts live there), run `npm run test:e2e`; the `pretest:e2e` hook runs `bddgen
 * test` first. Every e2e script passes `--config e2e/playwright.config.ts`, and BOTH Playwright and
 * playwright-bdd resolve relative paths against THIS file's directory rather than the cwd — so
 * `features/`, `steps/`, `test-results/` and `playwright-report/` all stay under `e2e/` no matter
 * where the command is invoked from.
 *
 * Runs against an ALREADY-RUNNING local system (we do NOT start servers here, because the app is a
 * two-process stack — Vite frontend on :3000 + Spring backend on :8080 — plus a Docker Oracle DB,
 * each with its own env. Bring them up per e2e/README.md, then run the tests).
 *
 * Timeout / artifact standards follow the TEA `playwright-config` guardrails.
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

/**
 * Generated specs that run in the one-at-a-time `chromium-serial` project instead of the parallel one.
 * Selected by path so scheduling never needs a tag edit in a `.feature`. Two reasons a file lands here:
 *
 *  - LOAD: the per-role `gui-access` sweeps walk every tab of a record waiting for each panel to finish
 *    loading, firing a burst of searches per tab. Files run in path order, so in a parallel run all four
 *    workers reached `security/` together and ran these sweeps at once, starving the backend — panels sat on
 *    skeletons past their 30s wait, and light neighbours (URL probes, `page.goto`) timed out. Baseline
 *    2026-09-30: 9 such failures, every one green when re-run alone at workers=1.
 *  - SHARED ROW: `system.feature` and `current-news-round-trip.feature` both write the single `WMSG`
 *    welcome-message row. `@mode:serial` only orders scenarios WITHIN a file, so the two files could
 *    interleave and each `wmsgGuard` could restore the other's temporary value. One lane = never together.
 *
 * `@mode:serial` alone cannot express either: it never stops a DIFFERENT file running concurrently.
 */
const SERIAL_LANE = [
  /[\\/]security[\\/][^\\/]+[\\/]gui-access\.feature\.spec\.js$/,
  /[\\/]uc-sys-002-system-setting[\\/]system\.feature\.spec\.js$/,
  /[\\/]security[\\/]welcome[\\/]current-news-round-trip\.feature\.spec\.js$/,
];

/**
 * Every feature file that CREATES a scale site, which run one at a time in `chromium-scale-sites`.
 *
 * The DB trigger `SCS_SCST_BR_IU_TRG` gives each new site the LOWEST FREE id. Teardown deletes a scenario's
 * site and then reads that id back to prove it is gone — but if another worker creates a site in between, it
 * is handed the just-freed id, the read-back finds it, and teardown throws "scale sites still present after DB
 * delete" (seen 2026-09-30 on SST-005 "An incomplete coordinate…", site 1003, when the SST files ran
 * together). `@mode:serial` only orders scenarios within one file; this lane orders the files against each
 * other. No other area creates scale sites (checked 2026-09-30: all creators live in steps/sst/ create,
 * update and contacts, used only by these six files) — add any new creator here.
 */
const SCALE_SITE_LANE = [
  /[\\/]uc-sst-00[456]-[^\\/]+[\\/](create|update|contacts|validation)\.feature\.spec\.js$/,
];

/**
 * Every feature file that CREATES (and so, in teardown, DELETES) a scaler, which run one at a time in
 * `chromium-scalers`.
 *
 * Concurrent scaler deletes DEADLOCK in Oracle. 2026-10-01 (6 workers): three SCL files tore down their
 * scalers within 4 s of each other; the alert log recorded two ORA-00060 deadlocks, both sessions running
 * `DELETE FROM SCALER WHERE SCALER_LICENCE_NO = :B1`, contending on rows in the child tables
 * SCALER_LICENCE_ATTRIBUTE and WEIGH_SLIP. Two deletes answered 500, the third outlived the 15 s request
 * timeout, and all three scenarios failed teardown. Deletes that did not overlap a minute earlier were fine.
 * The DB is immutable, so the fix is scheduling. This lane also closes the SCL-002 UI-create vs seed race on
 * the non-atomic licence-number generator (SCL-002 Bug #1).
 *
 * Only the files that seed or create a scaler: the rest of `scl/` reads the pinned `anchorScalerLicenceNo`
 * ("the sample scaler") and stays parallel. Checked 2026-10-01 — all creators live in steps/scl/ (seedScaler,
 * the create form) — add any new creator here.
 */
const SCALER_LANE = [
  /[\\/]uc-scl-00[2-9]-[^\\/]+[\\/](create|update|add|delete|record)\.feature\.spec\.js$/,
];

/**
 * The `admin/` area (maintenance + workbench) — create/edit-heavy screens that sort first, so they run first.
 * It gets its own project, listed BEFORE the lane, purely to control WHEN the lane starts (see the note on
 * `chromium-serial`). Run 4 (2026-09-30): with the lane starting at t=0, its heavy `gui-access` sweeps
 * overlapped this area, and six CCQ-001/CCQ-003 scenarios timed out waiting for a list or LOV to arrive.
 */
const ADMIN_AREA = /[\\/]features[\\/]admin[\\/]/;

// Compile features/*.feature + steps/*.ts into generated Playwright tests; returns their dir.
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.ts',
});

/**
 * Browser settings shared by every test project. The viewport is taller than devices['Desktop Chrome']'s own
 * 1280x720 default (and must come AFTER the spread, which sets its own viewport and would otherwise win the
 * merge): at 720px, a Carbon Modal's footer buttons (e.g. Maintain Questions' Save Record) sit close enough
 * to the bottom edge that a coordinate-based click lands on the modal's own outer wrapper instead of the
 * button (confirmed via document.elementFromPoint at the button's center) — not an app bug, just an
 * unrealistically short viewport for an 8+ field form. 900px matches a realistic admin desktop.
 */
const CHROMIUM_USE = {
  ...devices['Desktop Chrome'],
  viewport: { width: 1280, height: 900 },
};

export default defineConfig({
  testDir,
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Cap local parallelism: the backend's JDBC pool is small (maxActive=10 in the WAR's context.xml), and each
  // worker loads the SPA and fires API calls, so too many workers exhaust it — DB endpoints then 500 and
  // unrelated tests fail. The default was 4 until 2026-10-01; it is 6 now that the tests which fought over a
  // shared resource run in the one-at-a-time lanes below (6 is what the 2026-10-01 full runs settled on; an
  // 8-worker run was abandoned). Six leaves less headroom on the pool than four did, so if DB endpoints start
  // answering 500 under load, lower this first. The host is the other ceiling: 16 GB RAM and Oracle Free's 2 CPUs.
  // Override with PW_WORKERS=<n> (e.g. 1 for a fully-serial run); CI already runs serial.
  //
  // ── REPORT GENERATION IS SPLIT OUT OF THIS RUN ────────────────────────────────────────────────────────
  // `npm run test:e2e` runs `--grep-invert @generation`, so the default run performs ZERO real report renders: the
  // report screens' requests are stubbed by default (steps/fixtures/rpt.ts) and only `@generation` scenarios
  // opt into the real engine. That is not a nicety — a real render takes 2–16s (province-wide can exceed
  // 120s) and `ReportService` allows only THREE concurrently, making a fourth caller wait 20s and then 503.
  // With those renders in the parallel run they starved each other and unrelated scenarios.
  //   npm run test:e2e            → everything except @generation, 6 workers
  //   npm run test:e2e:generation → the 14 @generation scenarios, workers=1 (IN SEQUENCE — required, not advisory)
  //   npm run test:e2e:all        → both, one after the other
  workers: process.env.CI ? 1 : Number(process.env.PW_WORKERS ?? 6),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      // Runs ONCE before the suite (chromium depends on it): asserts the pinned real-data anchors still
      // resolve, so a stale/re-extracted DB fails fast with one clear "re-ground the fixtures" message
      // rather than dozens of confusing mid-suite failures. See preflight/anchors.setup.ts.
      name: 'setup',
      testDir: './preflight',
      testMatch: /.*\.setup\.ts$/,
    },
    {
      // The admin area first: every worker starts here. Everything after `setup` shares CHROMIUM_USE.
      name: 'chromium-admin',
      dependencies: ['setup'],
      testMatch: ADMIN_AREA,
      testIgnore: SERIAL_LANE,
      use: CHROMIUM_USE,
    },
    {
      // At most ONE of these tests runs at a time, ALONGSIDE the parallel projects in the same run (one
      // report). No dependency on the others, so a red elsewhere never skips this lane.
      //
      // WHERE it sits in this list decides WHEN it starts. The dispatcher queues jobs in project order and
      // hands each free worker the first queued job whose project is under its `workers` cap:
      //  - listed LAST (2026-09-30 run 2): the lane started only after every other job was handed out, then ran
      //    one-at-a-time at the end with three workers idle (~+19 min);
      //  - listed FIRST (run 4): it started at t=0 and its sweeps overlapped `admin/`, where six CCQ scenarios
      //    then flaked (a one-run correlation, not a proven cause);
      //  - HERE, between `chromium-admin` and `chromium`: every worker takes admin jobs; once those are handed
      //    out, one worker takes the lane and the others skip the capped lane to `chromium`. The lane runs from
      //    roughly minute 6 to minute 25 — clear of `admin/` before it and `sst/` (last in path order) after.
      // See SERIAL_LANE above for what's in it.
      name: 'chromium-serial',
      dependencies: ['setup'],
      testMatch: SERIAL_LANE,
      workers: 1,
      use: CHROMIUM_USE,
    },
    {
      // A second one-at-a-time lane, for a DIFFERENT shared resource (the scale-site id pool — see
      // SCALE_SITE_LANE). Separate from `chromium-serial` so the two lanes can run at the same time as each
      // other; each is serial only within itself. Listed before `chromium` for the same reason as the lane
      // above: it starts once the admin jobs are handed out instead of queueing behind every other test.
      name: 'chromium-scale-sites',
      dependencies: ['setup'],
      testMatch: SCALE_SITE_LANE,
      workers: 1,
      use: CHROMIUM_USE,
    },
    {
      // A third one-at-a-time lane, for scaler create/delete (see SCALER_LANE: concurrent scaler deletes
      // deadlock). Independent of the other lanes; listed before `chromium` for the same reason they are.
      name: 'chromium-scalers',
      dependencies: ['setup'],
      testMatch: SCALER_LANE,
      workers: 1,
      use: CHROMIUM_USE,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: [...SERIAL_LANE, ...SCALE_SITE_LANE, ...SCALER_LANE, ADMIN_AREA],
      use: CHROMIUM_USE,
    },
  ],
});
