/**
 * Cross-domain readiness bound for "this screen has finished loading its data".
 *
 * Why it exists. Many SCS screens render a Carbon `SkeletonText` — not the form — until their
 * React Query calls resolve, so the field a test waits on genuinely does not exist in the DOM yet.
 * The suite's default `expect.timeout` is 10s (`playwright.config.ts`), which is ample for an
 * assertion about an element that is already painted, but too tight for one that is still waiting on
 * one-or-more API round trips: under `fullyParallel` load several workers each drive the local Vite
 * dev server and backend at once, and a slow run can push those first paints past 10s. That surfaces
 * as an "element(s) not found" timeout in whichever scenario happened to be unlucky — a load-dependent
 * flake, not a product bug and not a data problem.
 *
 * So: use this bound for the FIRST assertion that proves a data-gated screen has painted (the
 * readiness gate), and leave the default 10s for every assertion after it. It is still a bounded,
 * web-first wait — it resolves as soon as the element appears and never sleeps for a fixed period.
 *
 * Precedent: `loginAsMockScsUser` in `authNav.ts` already hardens the landing page's first paint for
 * exactly this reason. This constant generalises that fix so each screen's gate doesn't invent its own
 * magic number.
 */
export const SCREEN_READY_TIMEOUT_MS = 30_000;
