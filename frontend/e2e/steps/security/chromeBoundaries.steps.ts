import { Given, When, Then, expect } from '../fixtures';

import { INDUSTRY_SCALER_ROLE, SYS_ADMIN_ROLE, indClientNumber } from '../../fixtures/security/cross-cutting-test-data';

/**
 * SEC-11 — the system chrome a refused, lost or shut-out user lands on.
 *
 * Every role suite proves its own routes are refused. None of them asks what the DESTINATION of those
 * refusals is like: whether it leaks navigation the user cannot use, whether the way out works, or
 * whether an unknown URL behaves the same way. Those are properties of the chrome, shared by every
 * domain, so they belong here rather than being repeated eleven times.
 *
 * The identity that matters most is the one with NO recognised role. It is not hypothetical: a
 * client-scoped role provisioned without a forest client resolves to exactly this — deliberate
 * fail-closed behaviour for a misprovisioned external (BCeID) account, and the population the Not
 * Authorized page's own javadoc says its Back button exists for.
 */

Given('I am signed in with no recognised role', async ({ roleSession }) => {
  // Explicitly no roles rather than an absent session: an absent one is not signed in at all, and would
  // be bounced to the landing page by a different branch of the guard.
  await roleSession.signInAs([]);
});

Given('I am signed in as an industry scaler with a forest client', async ({ roleSession }) => {
  await roleSession.signInAs([INDUSTRY_SCALER_ROLE], [indClientNumber]);
});

Given('I am signed in as a system administrator for the chrome pages', async ({ roleSession }) => {
  await roleSession.signInAs([SYS_ADMIN_ROLE]);
});

Given('the system reports itself disabled', async ({ chromeBoundary }) => {
  await chromeBoundary.stubSystemDisabled();
});

When('I open the chrome route {string}', async ({ roleSession }, path) => {
  await roleSession.visit(path);
  await roleSession.waitForRouteDecision();
});

When('I follow the way out of the refusal page', async ({ chromeBoundary, roleSession }) => {
  await chromeBoundary.homeButton.click();
  await roleSession.waitForRouteDecision();
});

Then('the refusal page should be shown', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.refusalTitle,
    'a refused route must land on the Not Authorized page, which is the destination every ' +
      'ProtectedRoute denial forwards to',
  ).toHaveText('Unauthorized Access');
});

Then('the not-found page should be shown', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.notFoundTitle,
    'an unmatched route must fall through to the Not Found catch-all',
  ).toBeVisible();
});

Then('no navigation should be offered', async ({ chromeBoundary }) => {
  expect(
    await chromeBoundary.navAffordanceCount(),
    'a user with no recognised role must be offered no way into the app from the chrome pages — ' +
      'every nav entry would lead straight back to a refusal',
  ).toBe(0);
});

/**
 * The contrast, and the reason the assertion above is not vacuous: the SAME page offers a full nav to
 * an administrator (31 affordances at authoring time) and the role's own subset to an industry scaler
 * (3). Counted rather than named, because the side nav renders labels into nested spans and a
 * name-based lookup matches nothing — silently passing.
 *
 * Asserted as "more than none" rather than a pinned count: the exact number tracks the nav tree and
 * would go stale on any menu change, which is a different suite's business.
 */
Then('navigation should be offered', async ({ chromeBoundary }) => {
  expect(
    await chromeBoundary.navAffordanceCount(),
    'the same chrome page must offer navigation to a role that has some — otherwise the roleless ' +
      'assertion proves only that the page renders no nav for anyone',
  ).toBeGreaterThan(0);
});

Then('I should reach the home page', async ({ roleSession }) => {
  expect(
    roleSession.landedPath(),
    'the escape hatch must actually escape',
  ).toBe('/welcome');
});

/**
 * Written fix-AGNOSTIC while defects.md D1 was open, and kept that way now it is fixed.
 *
 * The defect: the page offered "Go to home page" to a user who has no home — `/welcome` needs
 * `WELCOME_READ`, so the guard bounced them straight back with nothing to explain why.
 *
 * It passes if EITHER resolution holds: the control is not offered to a user who cannot use it (which
 * is what shipped), or it leads somewhere other than this page. Keeping it broad means it still guards
 * the actual property — no silent loop — rather than the particular shape of today's fix, which the
 * scenario below pins separately.
 */
Then('the way out should not lead back to the refusal page', async ({ chromeBoundary, roleSession }) => {
  if (!(await chromeBoundary.homeButton.isVisible())) {
    return; // resolved by not offering a way out that cannot work
  }
  await chromeBoundary.homeButton.click();
  await roleSession.waitForRouteDecision();
  expect(
    roleSession.landedPath(),
    'following the refusal page\'s own way out must not return the user to the refusal page',
  ).not.toBe('/unauthorized');
});

Then('the refusal page should offer a way to log out', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.logoutButton,
    'a user with no welcome access is refused every route including /welcome, so signing in as ' +
      'someone else is the only action that can change their situation — the page must offer it',
  ).toBeVisible();
});

Then('the refusal page should not offer a way out it cannot honour', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.homeButton,
    '"Go to home page" must not be offered to a user the welcome route will refuse',
  ).toBeHidden();
  await expect(
    chromeBoundary.backButton,
    'Back leaves the application entirely when the refusal page is the first entry in history, so it ' +
      'is withheld from the same user',
  ).toBeHidden();
});

Then('the refusal page should offer the ordinary way out', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.homeButton,
    'a user refused only THIS page still has a home to return to, so the ordinary controls stay',
  ).toBeVisible();
  await expect(chromeBoundary.backButton).toBeVisible();
  await expect(
    chromeBoundary.logoutButton,
    'and they are not pushed towards logging out, which would be the wrong remedy for them',
  ).toBeHidden();
});

Then('the disabled interstitial should be shown', async ({ chromeBoundary }) => {
  await chromeBoundary.assertSystemStatusStubServed();
  await expect(
    chromeBoundary.disabledMessage,
    'a non-administrator must be shown the temporarily-disabled interstitial when the system is off',
  ).toBeVisible();
});

Then('the application shell should not be mounted', async ({ chromeBoundary }) => {
  expect(
    await chromeBoundary.hasAppShell(),
    'the interstitial REPLACES the app shell — a side nav rendered behind it would be a way back in',
  ).toBe(false);
});

Then('the application should load normally', async ({ chromeBoundary }) => {
  expect(
    await chromeBoundary.hasAppShell(),
    'an administrator must still reach the app while the system is disabled — otherwise nobody can ' +
      're-enable it',
  ).toBe(true);
});

Then('the system status should never have been consulted', async ({ chromeBoundary }) => {
  await chromeBoundary.assertSystemStatusNeverProbed();
});

// ---------------------------------------------------------------------------------------------------
// The error and session-expiry destinations (coverage.md CG-2/CG-3/CG-4, closed 2026-09-04).
//
// All three were recorded as "not drivable". Two of them were: what was missing was a lever, not a
// scenario, and there are two.
//
//   401 / session expiry  — mock auth never expires, but the interceptor branches on the RESPONSE, not
//                           on any clock. A stubbed 401 on an authenticated call enters the same branch
//                           a real expiry would, because every SCS call carries `jsonHeaders(token)`.
//   render crash          — the app has no fault-injection hook, but a malformed 200 is one: a response
//                           whose SHAPE is wrong makes the page throw while rendering it.
//
// The third, `/error`, is reachable by address bar and asserted here — but see the feature file: the
// page's error-carrying branch is unreachable for a structural reason worth knowing.

Given('the session has expired', async ({ chromeBoundary }) => {
  await chromeBoundary.stubUnauthorizedScalerRead();
});

Given('the session has expired and the welcome read is the one that notices', async ({ chromeBoundary }) => {
  await chromeBoundary.stubUnauthorizedWelcomeRead();
});

Given('the server fails on the record read', async ({ chromeBoundary }) => {
  await chromeBoundary.stubServerErrorScalerRead();
});

Given('the server answers the record read with the wrong shape', async ({ chromeBoundary }) => {
  await chromeBoundary.stubMalformedScalerRead();
});

/**
 * Open a record page WITHOUT the usual settle wait.
 *
 * `roleSession.visit` waits for `networkidle`, which cannot be reached in one of the three scenarios
 * that use this step: on a 401 the Axios interceptor calls `window.location.replace('/welcome')`, and
 * that replacement ABORTS the navigation still in flight (`net::ERR_ABORTED`). The abort is the
 * behaviour under test, not a failure, so it is tolerated here and every assertion is left to the Then
 * — each of which waits on its own outcome.
 */
When('I open a record that needs the server', async ({ page }) => {
  await page.goto('/scalers/view/001B').catch((error: unknown) => {
    if (!/ERR_ABORTED|frame was detached/i.test(String(error))) {
      throw error;
    }
  });
});

/**
 * Polled rather than `waitForURL`: the redirect ABORTS the navigation it interrupts, and
 * `waitForURL` surfaces that abort as an error of its own before the replacement lands. Reading the
 * settled path is the assertion — where the user ended up — and it is indifferent to how many
 * navigations were cancelled getting there.
 */
Then('I should be returned to the welcome page to sign in again', async ({ chromeBoundary, roleSession }) => {
  await chromeBoundary.assertFaultStubServed();
  await expect
    .poll(() => roleSession.landedPath(), {
      timeout: 20_000,
      message:
        'an authenticated 401 must return the user to the welcome page to sign in again — ' +
        'services/APIs.ts signs out and replaces the location, so a user whose token expired mid-' +
        'session is not left on a screen that will never load',
    })
    .toBe('/welcome');
});

/**
 * The loop-prevention branch, and the reason it exists: the interceptor's redirect target IS `/welcome`,
 * so a 401 raised BY the welcome page would redirect to the page that just raised it, forever. The
 * guard is `!isAlreadyOnWelcome`, and this asserts it holds.
 */
Then('I should be left on the welcome page rather than redirected in a loop', async ({ chromeBoundary, roleSession }) => {
  await chromeBoundary.assertFaultStubServed();
  expect(
    roleSession.landedPath(),
    'a 401 raised by the welcome page must not trigger the redirect TO the welcome page — that is an ' +
      'infinite reload, which is what the interceptor\'s isAlreadyOnWelcome guard prevents',
  ).toBe('/welcome');
});

Then('a server error should be reported to the user', async ({ chromeBoundary }) => {
  await chromeBoundary.assertFaultStubServed();
  await expect(
    chromeBoundary.serverErrorToast.first(),
    'a 5xx must surface through the global handler rather than being swallowed by whichever page ' +
      'happened to make the call — that consistency is the whole point of the interceptor',
  ).toBeVisible({ timeout: 20_000 });
});

/**
 * Containment, asserted at the fallback rather than at the absence of a crash.
 *
 * If the app ever hardens the malformed-shape path, this scenario stops injecting a fault and fails —
 * which is the correct outcome: the ErrorBoundary would then be untested again, and the message says so
 * rather than leaving a scenario that quietly asserts nothing.
 */
Then('the crash should be contained instead of blanking the app', async ({ chromeBoundary }) => {
  await chromeBoundary.assertFaultStubServed();
  await expect(
    chromeBoundary.crashFallback,
    'a component that throws while rendering must be caught by the app-level ErrorBoundary. If this ' +
      'is red because the page rendered NORMALLY, the injected payload no longer crashes it — ' +
      're-ground the injection (or retire this scenario), because the ErrorBoundary is untested ' +
      'either way. Known debt F5',
  ).toBeVisible({ timeout: 20_000 });
  expect(
    await chromeBoundary.bodyIsBlank(),
    'the fallback must actually render something — an uncaught error leaves a blank document, which is ' +
      'the failure this boundary exists to prevent',
  ).toBe(false);
});

/**
 * The behaviour that actually ships.
 *
 * The `@discovered-divergence` step that asserted SEC-4's spec ("the global error page should render its
 * generic message") was removed with its scenario on request — see `defects.md` D2, which carries both
 * verbatim for restoration.
 *
 * `/error` is the suite's most STABLE crash lever — it needs no stubbing and no knowledge of any
 * payload shape, because the page throws on its own every time. That makes it the better of the two
 * ErrorBoundary probes (the malformed-response one is implementation-coupled by necessity), and it
 * doubles as the proof that the divergence above is contained rather than catastrophic: a user who
 * reaches this route gets a fallback with a way forward, not a blank document.
 */
Then('the crash fallback should be shown instead', async ({ chromeBoundary }) => {
  await expect(
    chromeBoundary.crashFallback,
    'visiting /error must at least be CONTAINED — the page throws, so the app-level ErrorBoundary is ' +
      'the only thing between a user who follows that URL and a blank screen',
  ).toBeVisible({ timeout: 20_000 });
  expect(
    await chromeBoundary.bodyIsBlank(),
    'the fallback must render something — an uncaught throw leaves a blank document',
  ).toBe(false);
});
