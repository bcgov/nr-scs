import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The frontend's system-status probe. Source of truth is `services/systemStatus.service.ts`
 * (`${BackendApiConfig.BASE}/system-status`) — a glob, so a base-path change still matches; a rename
 * of the endpoint itself would not, which is what `assertSystemStatusStubServed` exists to catch.
 */
const SYSTEM_STATUS_ROUTE = '**/api/system-status';

/**
 * Every scaler read — the lever for the fault-injection scenarios.
 *
 * `**` and not `*`: the record view issues TWO reads, `/api/scalers/{licence}/summary` (the tab data)
 * and `/api/scalers/{licence}` (the audit detail, IDIR only). A single-segment glob matches the second
 * and misses the first, which is the one whose shape the malformed-response scenario corrupts.
 */
const SCALER_READ_ROUTE = '**/api/scalers/**';

/**
 * Locators for the SYSTEM CHROME a refused, lost or shut-out user lands on — the Not Authorized page,
 * the Not Found catch-all, and the "temporarily disabled" interstitial.
 *
 * These pages are the destinations the rest of the app forwards to, so they are the one place every
 * domain's failure path converges. That is why they are worth a suite of their own: each role suite
 * proves its own routes are refused, and none of them asks whether the place those refusals LAND is
 * usable, or whether it leaks anything.
 *
 * Navigation is counted rather than enumerated. The side nav renders each leaf as an icon plus a label
 * in a nested span, so `allInnerTexts()` comes back as a list of empty strings — a name-based assertion
 * silently matches nothing and passes. Counting is what actually distinguishes "no navigation offered"
 * (roleless: 0) from "the role's own navigation" (industry scaler: 3) and "everything" (administrator:
 * 31), which is the contrast these scenarios turn on.
 */
export class ChromeBoundaryPage {
  readonly page: Page;
  /** The Not Authorized card's title — an `EmptySection` div, NOT a heading, so not addressable by role. */
  readonly refusalTitle: Locator;
  /** The Not Found page's title, rendered through `PageTitle`. */
  readonly notFoundTitle: Locator;
  /** The disabled interstitial's message. */
  readonly disabledMessage: Locator;
  readonly backButton: Locator;
  readonly homeButton: Locator;
  /**
   * The way out offered to a user with no home to go to. Scoped to the page's own action row, because
   * the app header carries its own "Log out" inside the profile panel — an unscoped lookup would match
   * that instead and pass whether or not the page offers anything.
   */
  readonly logoutButton: Locator;
  /** `components/ErrorBoundary`'s fallback — deliberately plain markup, addressed by its alert role. */
  readonly crashFallback: Locator;
  /** The global 5xx toast raised by the Axios interceptor. */
  readonly serverErrorToast: Locator;

  /** Requests the system-status stub served — 0 is a real answer (the administrator never probes). */
  private systemStatusStubHits = 0;
  /** Requests each fault-injection stub served, so a drifted path fails loud rather than quietly. */
  private scalerStubHits = 0;

  constructor(page: Page) {
    this.page = page;
    this.refusalTitle = page.locator('.unauthorized__section .empty-section-title');
    this.notFoundTitle = page.getByText('Not Found', { exact: true });
    this.disabledMessage = page.getByText(/temporarily disabled/i);
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.homeButton = page.getByRole('button', { name: 'Go to home page', exact: true });
    this.logoutButton = page
      .locator('.unauthorized__actions')
      .getByRole('button', { name: /log out/i });
    this.crashFallback = page.getByRole('alert').filter({ hasText: 'Something went wrong' });
    this.serverErrorToast = page.getByText('Something went wrong', { exact: true });
  }

  /** Every navigable affordance in the side nav: leaf links plus the group toggles that reveal them. */
  async navAffordanceCount(): Promise<number> {
    const links = await this.page.locator('nav a').count();
    const groups = await this.page.locator('nav button').count();
    return links + groups;
  }

  /** True when the app shell mounted at all — the interstitial replaces it entirely. */
  async hasAppShell(): Promise<boolean> {
    return (await this.page.locator('nav').count()) > 0;
  }

  /**
   * Force the system-status probe the `Layout` guard reads to report the system as disabled.
   *
   * Stubbed rather than toggled because the backend's flag is a STARTUP PROPERTY —
   * `SystemStatusService` takes `@Value("${scs.app.enabled:true}")` into a final field at construction,
   * so nothing at runtime can change it. Restarting the backend mid-suite is not an option, and there is
   * no setting to flip.
   *
   * What that buys and what it does not: this drives the frontend `Layout` guard, which is the whole of
   * the interstitial's behaviour. The backend's own 503 (`SystemStatusFilter`) is NOT exercised — see
   * coverage.md CG-1.
   */
  async stubSystemDisabled(): Promise<void> {
    await this.page.route(SYSTEM_STATUS_ROUTE, (route) => {
      this.systemStatusStubHits += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ enabled: false }),
      });
    });
  }

  /**
   * Prove the stub above actually intercepted something, so a drifted endpoint path fails LOUD rather
   * than merely leaving the interstitial assertion to fail with an unrelated message.
   */
  async assertSystemStatusStubServed(): Promise<void> {
    await expect
      .poll(() => this.systemStatusStubHits, {
        message:
          `no request matched ${SYSTEM_STATUS_ROUTE}, so the system was never reported disabled — ` +
          'the frontend probe path has moved; re-ground it against services/systemStatus.service.ts',
      })
      .toBeGreaterThan(0);
  }

  /**
   * The administrator exemption, asserted at its actual mechanism.
   *
   * `Layout` gates the status query on `enabled: isLoggedIn && !isSystemAdministrator(user)`, so an
   * administrator never issues the probe at all — the exemption is decided from the role, before the
   * status is ever read. Stubbing "disabled" therefore cannot influence that path, which is precisely
   * why the scenario needs this instead: without it, "an administrator reaches the app while the
   * system is disabled" passes identically when the system is enabled, and proves nothing.
   *
   * Safe to read without polling: the query fires in the same render that mounts the shell, which the
   * preceding step has already awaited.
   */
  async assertSystemStatusNeverProbed(): Promise<void> {
    expect(
      this.systemStatusStubHits,
      'an administrator must be exempted WITHOUT consulting system status — a request to ' +
        `${SYSTEM_STATUS_ROUTE} means the gate now runs for administrators too, and the exemption ` +
        'has become dependent on whatever that endpoint answers',
    ).toBe(0);
  }

  /**
   * Answer every scaler detail read with 401.
   *
   * This is the session-expiry lever. Mock auth never expires, so the only way into that path is to
   * make an authenticated call answer 401 — which is exactly what an expired or revoked token produces
   * in the real system. The interceptor's precondition is that the request carried an `Authorization`
   * header, and every SCS service call does (`jsonHeaders(token)`), so a stubbed 401 exercises the same
   * branch a real expiry would.
   */
  async stubUnauthorizedScalerRead(): Promise<void> {
    await this.page.route(SCALER_READ_ROUTE, (route) => {
      this.scalerStubHits += 1;
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'stubbed expiry' }),
      });
    });
  }

  /** Answer the welcome read with 401 — the loop-prevention branch's own case. */
  async stubUnauthorizedWelcomeRead(): Promise<void> {
    await this.page.route('**/api/welcome*', (route) => {
      this.scalerStubHits += 1;
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHORIZED', message: 'stubbed expiry' }),
      });
    });
  }

  /** Answer every scaler detail read with 500 — the global-toast branch. */
  async stubServerErrorScalerRead(): Promise<void> {
    await this.page.route(SCALER_READ_ROUTE, (route) => {
      this.scalerStubHits += 1;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'stubbed' }),
      });
    });
  }

  /**
   * Answer the scaler detail read with a WELL-FORMED HTTP 200 whose BODY has the wrong shape, so the
   * page throws while rendering it.
   *
   * The only fault-injection lever this app offers. `coverage.md` CG-3 recorded that triggering a
   * render crash "needs a fault-injection hook the app does not have" — true of a deliberate hook, but
   * a malformed response is one: `formatLicenceTypes` is handed `licenceTypes` and calls `.map` on it
   * after a length check, so a string passes the check and throws on the call.
   *
   * **This is implementation-coupled by necessity, and that is stated where it can be seen** — see the
   * scenario's own comment. If the app hardens that path the injection stops crashing anything, and the
   * scenario fails with a message saying so rather than quietly asserting nothing.
   */
  async stubMalformedScalerRead(): Promise<void> {
    await this.page.route(SCALER_READ_ROUTE, (route) => {
      this.scalerStubHits += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        // `licenceTypes` must be an array of objects; a bare string survives the `.length` guard in
        // `formatLicenceTypes` and then fails on `.map`, throwing during render.
        body: JSON.stringify({ scalerLicenceNo: '001B', licenceTypes: 'WA' }),
      });
    });
  }

  /** Prove a fault-injection stub actually intercepted, so a drifted route fails with a clear cause. */
  async assertFaultStubServed(): Promise<void> {
    await expect
      .poll(() => this.scalerStubHits, {
        message:
          'no request matched the injected route, so the app was never given the faulty response — ' +
          'the read path has moved; re-ground the stub against the service that fetches it',
      })
      .toBeGreaterThan(0);
  }

  /** True when the document body rendered nothing meaningful — the white-screen this all guards against. */
  async bodyIsBlank(): Promise<boolean> {
    return this.page.evaluate(() => (document.body.innerText ?? '').trim().length === 0);
  }
}
