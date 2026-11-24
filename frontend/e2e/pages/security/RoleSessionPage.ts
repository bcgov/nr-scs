import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Page Object for driving the app AS A GIVEN ROLE — the entry point every SEC-8 role-scoping scenario
 * starts from, and the piece that makes role testing possible at all.
 *
 * **Why this does not use `loginAsMockScsUser`.** That helper clicks the Landing page's IDIR button,
 * which mints the DEFAULT mock user (`SCS_SYS_ADMIN`, no client) — the only thing every other suite
 * needs. A role-scoping suite has to choose the role and the forest client BEFORE the app boots,
 * because `MockAuthProvider` derives the user (and therefore every permission check, every nav item,
 * and the `X-Mock-Roles`/`X-Mock-Client` headers the backend reads) from that state at mount.
 *
 * So the session is seeded straight into `localStorage` under `scs.mock.state` — the same key
 * `MockAuthProvider` persists to and restores from — via `addInitScript`, which runs before any page
 * script on every navigation in the context. Two consequences worth knowing:
 *  - `page.goto()` deep-links work, unlike the in-memory login the older page objects had to work
 *    around with `clientSideNavigate`. That is what makes the URL-path level of this suite possible:
 *    a denied route can be entered by address bar, which is how a real user would probe one.
 *  - the seed is per-browser-context, and Playwright gives each scenario its own, so roles never leak
 *    between scenarios.
 *
 * This mirrors the developer-facing mock picker (`MockRoleClientPicker`) rather than inventing a
 * parallel mechanism: same storage key, same shape, same header bridge. Driving the picker UI instead
 * was rejected — it cannot set the role before first paint, so the app would boot as an administrator
 * and the very first render (the one the nav assertions read) would be the wrong user's.
 */
export class RoleSessionPage {
  readonly page: Page;
  readonly sideNav: Locator;
  readonly unauthorizedHeading: Locator;
  readonly accessDeniedMessage: Locator;

  /** The key `MockAuthProvider` persists the dev mock session under. */
  private static readonly MOCK_STATE_KEY = 'scs.mock.state';

  constructor(page: Page) {
    this.page = page;
    this.sideNav = page.locator('nav');
    // The refusal page renders its title through `EmptySection`, which paints a plain div — not a
    // heading — so it is matched by its own section class rather than by role.
    this.unauthorizedHeading = page.locator('.unauthorized__section .empty-section-title');
    // The shared 403 card the scaler / scale-site view pages render via `isForbiddenError` when the
    // record belongs to another forest client (SEC-7 Task 6 review refinement).
    this.accessDeniedMessage = page.getByText('You do not have access to this record.');
  }

  /**
   * Seed the mock session for every subsequent navigation in this context. Call BEFORE the first
   * `visit`. `clientNumbers` empty means an internal (unscoped) user — for a client-scoped role like
   * `SCS_INDUSTRY_SCALER` that deliberately yields a user holding no permissions at all, which is
   * itself a case worth asserting.
   *
   * `idpProvider` defaults to `BCEIDBUSINESS`, which is what every role suite before the audit
   * affordance was written against. That default is deliberate and unchanged: the IdP is invisible to
   * `RolePermissions`, `permissions.ts` and `navigation.ts` — they read `roles`, never the provider —
   * so no existing scenario's subject changes. It matters to exactly one thing in the app, and that is
   * why the parameter exists: `WhoDidIt` gates on `user.idpProvider === 'IDIR'`, so the audit popup
   * renders for nobody in a BCeID-seeded session. Pass `'IDIR'` to drive an internal user as the IdP
   * they really arrive through (`features/security/audit-affordance/`).
   */
  async signInAs(
    roles: string[],
    clientNumbers: string[] = [],
    idpProvider: 'IDIR' | 'BCEIDBUSINESS' = 'BCEIDBUSINESS',
  ): Promise<void> {
    await this.page.addInitScript(
      ([key, r, c, provider]) => {
        window.localStorage.setItem(
          key as string,
          JSON.stringify({
            // The IdP the session arrives through. Only its PRESENCE makes the mock "logged in", so for
            // most suites the value is immaterial — but naming a real provider keeps the seeded session
            // shaped like the one it stands in for, and `WhoDidIt` reads it.
            provider,
            roles: r,
            client: (c as string[]).length ? { clientNumbers: c } : undefined,
          }),
        );
      },
      [RoleSessionPage.MOCK_STATE_KEY, roles, clientNumbers, idpProvider] as const,
    );
  }

  /**
   * Open a route by URL and wait for the SPA to settle. Deliberately a full `goto` — entering a route
   * by address bar is precisely the URL-level threat the role gate has to hold against, and a
   * client-side push would skip the reload that a real deep link performs.
   *
   * **`settle: false` skips the `networkidle` wait**, for pages whose readiness has a better signal than
   * "the network went quiet". A heavy record view fires many queries at once, and under a full-suite run
   * (four workers against one backend) `networkidle` can outlast the test timeout — a red that says
   * nothing about the property under test. Where a scenario waits on a specific element anyway, that
   * element IS the readiness signal, and the idle wait is redundant cost with a flake attached.
   *
   * Default `true`, so every scenario written before this option behaves exactly as it did.
   */
  async visit(path: string, { settle = true }: { settle?: boolean } = {}): Promise<void> {
    await this.page.goto(path);
    if (settle) {
      await this.page.waitForLoadState('networkidle');
    }
  }

  /** The path actually landed on — a denied route redirects, so this is the URL-level assertion. */
  landedPath(): string {
    return new URL(this.page.url()).pathname;
  }

  /**
   * Block until `ProtectedRoute` has finished deciding. It refuses a route from inside a `useEffect`,
   * so the redirect lands AFTER the network settles — reading the URL any earlier catches the
   * pre-redirect path and reports a denied route as reachable. While deciding it renders one of three
   * placeholders in place of the page; their absence is the signal that the decision is committed.
   *
   * This is the difference between a suite that proves routes are gated and one that passes or fails
   * on machine speed: without it the deny assertions were flaky, and flaky in the dangerous direction.
   */
  async waitForRouteDecision(): Promise<void> {
    await expect(
      this.page.getByText(/^(Loading session\.\.\.|Redirecting)/),
      'the route guard never settled — the app is still deciding whether this role may be here',
    ).toHaveCount(0, { timeout: 15_000 });
  }

  /** Wait for the refusal redirect to actually land, then confirm the refusal page rendered. */
  async expectRefused(): Promise<void> {
    await this.page.waitForURL('**/unauthorized', { timeout: 15_000 });
    await expect(this.unauthorizedHeading).toHaveText('Unauthorized Access');
  }

  /** A top-level side-nav group (Queries, Reports, Create, Administration) — rendered as a button. */
  navGroup(name: string): Locator {
    return this.sideNav.getByRole('button', { name, exact: true });
  }

  /** A leaf link inside the side nav. Only rendered once its group is expanded. */
  navLink(name: string): Locator {
    return this.sideNav.getByRole('link', { name, exact: true });
  }

  /**
   * A leaf link scoped to the group that owns it.
   *
   * Required wherever a leaf NAME is not unique across the nav: the side nav keeps every group's
   * children in the DOM at once (collapsed ones are hidden by CSS, not unmounted), so `navLink` alone is
   * ambiguous for `Mark Site Designation`, which is a leaf of BOTH Create and Reports. The unscoped
   * lookup then matches two nodes and the assertion fails on ambiguity rather than on access — same class
   * of trap as the portaled duplicate `#clientNumber` the search page objects already scope around.
   *
   * Scoped to the group's own `<li>`, so a nested group (Administration → Maintenance) is addressed by
   * naming its immediate parent.
   */
  navLinkIn(group: string, name: string): Locator {
    return this.sideNav
      .locator('li')
      .filter({ has: this.page.getByRole('button', { name: group, exact: true }) })
      .getByRole('link', { name, exact: true });
  }

  /** Expand a nav group so its leaves render, if it is not already open. */
  async openNavGroup(name: string): Promise<void> {
    const group = this.navGroup(name);
    await expect(group).toBeVisible();
    if ((await group.getAttribute('aria-expanded')) !== 'true') {
      await group.click();
    }
  }

  /** A tab on an entity record (the Scaler Record's Summary / Address / … strip). */
  tab(name: string): Locator {
    return this.page.getByRole('tab', { name, exact: true });
  }

  /** Any visible button by exact name — used for the write controls the role must not be offered. */
  button(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }
}
