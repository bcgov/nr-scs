import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the re-grounded Mark Site Designation Search screen — legacy `.markSiteDesignationSearch`
 * (P066) + `.markSiteDesignationSearchResults` (P067). Like the sibling QRY search screens, the new app
 * (`/mark-site-designations`, pages/Queries/MarkSiteDesignations) collapses the two legacy screens into ONE
 * page (form + results together), so there is NO "Back" button. The search is driven entirely by the
 * `timberMark` URL param, so searching from the form and arriving via a `?timberMark=` link (the Scale Site
 * MSD tab) take the identical path.
 *
 * All DOM selectors live here; steps call these methods. The screen is READ-ONLY (searches never mutate),
 * so pinned real records are shared safely in parallel — no seed, no cleanup.
 *
 * New-app re-groundings vs the legacy spec (see coverage.md / defects.md):
 *  - single-page layout (no Back button);
 *  - legacy "Result List: 0 records" empty table → a "No results" empty state (TableResource);
 *  - the % / _ wildcard guard and the required check are CLIENT-side (the legacy app rejected them as
 *    server-side field errors), and the wildcard guard also blocks a hand-crafted `?timberMark=` URL;
 *  - MSD # links / Create MSD button are not per-role gated (single-role mock auth).
 */
export class MarkSiteDesignationSearchPage {
  readonly page: Page;
  readonly timberMarkInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly createMsdButton: Locator;
  readonly results: Locator;
  readonly resultsTotal: Locator;
  readonly noResults: Locator;
  readonly initialEmptyState: Locator;
  readonly serverErrorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.timberMarkInput = page.locator('#timberMark');
    // Only one Search / Reset button on this page (no embedded client-picker modal, unlike ScaleSiteSearch).
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.results = page.locator('.mark-site-designation-search-results');
    this.createMsdButton = page.getByRole('button', { name: 'Create MSD' });
    this.resultsTotal = this.results.locator('.table-resource__total');
    this.noResults = this.results.getByText('No results', { exact: true });
    // The pre-search TableResource empty state (rendered until a search runs, and again after Reset).
    this.initialEmptyState = this.results.getByText('Nothing to show yet!', { exact: true });
    // The page-level "Search failed" InlineNotification (server-error branch).
    this.serverErrorBanner = page.locator('.mark-site-designation-notification');
    // No field-error locator here: nothing asserts one on this page, and the shared
    // `fieldError(page, id)` helper in pages/common/carbonHelpers.ts covers it if a scenario ever needs it.
  }

  /** Log in (mock IDIR) then client-side navigate to the search page (in-memory session survives). */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/mark-site-designations');
    await expect(this.timberMarkInput).toBeVisible({ timeout: 30000 });
    await expect(this.searchButton).toBeVisible({ timeout: 30000 });
  }

  /**
   * Arrive with a `?timberMark=` query already set — the exact path the Scale Site MSD tab link uses. The
   * param drives the query, so this exercises the auto-search-from-URL behaviour (no form interaction).
   */
  async gotoWithTimberMark(timberMark: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/mark-site-designations?timberMark=${encodeURIComponent(timberMark)}`,
    );
    await expect(this.timberMarkInput).toBeVisible({ timeout: 30000 });
  }

  async search(timberMark: string): Promise<void> {
    await this.timberMarkInput.fill(timberMark);
    await this.searchButton.click();
  }

  /** Click Search without entering a value (drives the required-field guard). */
  async clickSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** A results-table Timber Mark cell (proves a matching row rendered). */
  timberMarkCell(mark: string): Locator {
    return this.results.locator('.table-resource__cell-content--timberMark', { hasText: mark });
  }

  /** The first MSD # cell rendered as a RouterLink (→ the MSD view). */
  firstMsdLink(): Locator {
    return this.results.locator('.table-resource__cell-content--haulingMarkAuthorizationId a').first();
  }

  columnHeader(name: string): Locator {
    return this.results.getByRole('columnheader', { name, exact: true });
  }

  /** A validation/error message rendered on the page (Carbon invalidText, or the notification body). */
  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
