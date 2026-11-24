import { type Locator, type Page, expect } from '@playwright/test';

import { XSS_WITNESS } from '../../fixtures/security/welcome-test-data';

/** The frontend's welcome-summary read. A glob, so a base-path change still matches. */
const WELCOME_ROUTE = '**/api/welcome*';

// The witness `window` property is imported rather than restated: the payloads that SET it live in the
// fixture, and a second copy of the name here would let a rename disarm every scenario while leaving
// them all green. Watched on `window` rather than sniffed from console output because a console listener
// also fires for React's own warnings, and "did anything log" is not the question.

/**
 * The welcome / landing page an authorized user lands on (Epic SEC story SEC-1 / UC-SYS-004).
 *
 * **What makes this page worth its own suite** rather than a row in a role ledger: the eleven role
 * suites all assert `/welcome` is *reachable* and stop at the URL. Nothing asks what it renders. And one
 * of the things it renders is administrator-authored HTML — `Current News`, maintained through
 * `/maintenance/system` (UC-SYS-002) and injected here with `dangerouslySetInnerHTML` after a single
 * `DOMPurify.sanitize` call. The backend does not sanitize (`WelcomeService` passes the stored value
 * through untouched), so that one client-side call is the whole of the defence, on a value one role can
 * set and every role reads.
 *
 * The grid is label/value **sibling divs**, not rows — `welcome-grid__label` followed immediately by
 * `welcome-grid__value` — so a value is addressed as the first following sibling of its label. Reading
 * `.welcome-grid__value` by index instead would silently re-point at a different field the moment a row
 * is added.
 */
export class WelcomePage {
  readonly page: Page;
  readonly grid: Locator;
  /** The sanitized Current News container. Absent (not empty) when the value is blank or errored. */
  readonly news: Locator;
  readonly newsUnavailable: Locator;

  /** Requests served for the welcome summary — proves a stub actually intercepted. */
  private welcomeStubHits = 0;

  constructor(page: Page) {
    this.page = page;
    this.grid = page.locator('.welcome-grid');
    this.news = page.locator('.welcome-grid__news');
    this.newsUnavailable = page.getByText('Current news is unavailable.', { exact: true });
  }

  /**
   * The value rendered beside one grid label (`'Organization:'`, `'Roles:'`, …).
   *
   * While the query is in flight `valueOrFallback` renders `'Loading...'`, which would otherwise be
   * read as the field's value — so the read waits that out rather than racing it.
   */
  async fieldValue(label: string): Promise<string> {
    const value = this.grid
      .locator('.welcome-grid__label', { hasText: label })
      .locator('xpath=following-sibling::div[1]');
    await expect(
      value,
      `the welcome grid must render a value cell beside "${label}"`,
    ).toHaveCount(1);
    await expect(
      value,
      `"${label}" was still loading — a value read mid-flight is the placeholder, not the field`,
    ).not.toHaveText('Loading...', { timeout: 15_000 });
    return (await value.innerText()).trim();
  }

  /** Block until the summary has resolved, so a field read is reading the answer. */
  async waitForSummary(): Promise<void> {
    await expect(this.grid, 'the welcome grid must render for an authorized user').toBeVisible({
      timeout: 30_000,
    });
    await expect(
      this.grid.getByText('Loading...', { exact: true }),
      'the welcome summary must resolve before its fields are judged',
    ).toHaveCount(0, { timeout: 30_000 });
  }

  /**
   * Arm the XSS witness BEFORE the page loads.
   *
   * The witness has to be installed by an init script, not evaluated afterwards: an injected payload
   * executes as the news is inserted, which happens during the first render. Anything that ran before
   * this object could ask about it would already have run.
   */
  async armXssWitness(): Promise<void> {
    await this.page.addInitScript((name) => {
      (window as unknown as Record<string, unknown>)[name as string] = false;
    }, XSS_WITNESS);
  }

  /** True if any injected payload executed. */
  async xssFired(): Promise<boolean> {
    return this.page.evaluate(
      (name) => Boolean((window as unknown as Record<string, unknown>)[name as string]),
      XSS_WITNESS,
    );
  }

  /** The news container's visible text, so a scenario can prove the sanitizer did not simply blank it. */
  async newsText(): Promise<string> {
    if ((await this.news.count()) === 0) {
      return '';
    }
    return (await this.news.innerText()).trim();
  }

  /** Tags still present inside the news container, lower-cased — `[]` when it renders no elements. */
  async newsTagNames(): Promise<string[]> {
    if ((await this.news.count()) === 0) {
      return [];
    }
    return this.news.evaluate((el) =>
      Array.from(el.querySelectorAll('*')).map((n) => n.tagName.toLowerCase()),
    );
  }

  /** Every attribute name surviving on any element inside the news container, lower-cased. */
  async newsAttributeNames(): Promise<string[]> {
    if ((await this.news.count()) === 0) {
      return [];
    }
    return this.news.evaluate((el) =>
      Array.from(el.querySelectorAll('*')).flatMap((n) =>
        Array.from(n.attributes).map((a) => a.name.toLowerCase()),
      ),
    );
  }

  /**
   * Make the welcome summary read fail, to drive the page's own error arm.
   *
   * Stubbed rather than induced: the endpoint is healthy, and the branch under test
   * (`welcomeQuery.isError`) is a property of the page, not of the backend. A 500 is used because that
   * is what the page would actually meet — a 401 is intercepted globally and signs the user out
   * instead — that path is `../../features/security/chrome-boundaries/error-containment.feature`'s.
   */
  async stubWelcomeError(): Promise<void> {
    await this.page.route(WELCOME_ROUTE, (route) => {
      this.welcomeStubHits += 1;
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'stubbed' }),
      });
    });
  }

  /** Serve a chosen Current News value without writing to the shared setting row. */
  async stubCurrentNews(currentNews: string): Promise<void> {
    await this.page.route(WELCOME_ROUTE, (route) => {
      this.welcomeStubHits += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          applicationVersion: '0.0.0',
          applicationEnvironment: 'LOCAL',
          serverName: 'nr-scs-local',
          currentNews,
        }),
      });
    });
  }

  /**
   * Prove a stub above actually intercepted something, so a drifted endpoint path fails LOUD instead of
   * leaving the real response in place and the assertion to fail for an unrelated reason.
   */
  async assertWelcomeStubServed(): Promise<void> {
    await expect
      .poll(() => this.welcomeStubHits, {
        message:
          `no request matched ${WELCOME_ROUTE}, so the welcome summary was never influenced — the ` +
          'frontend read path has moved; re-ground it against services/welcome.service.ts',
      })
      .toBeGreaterThan(0);
  }
}
