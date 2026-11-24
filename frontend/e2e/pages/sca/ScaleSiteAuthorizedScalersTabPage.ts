import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scale Site view's "Authorized Scalers" tab (UC-SCA tabs, Tier 3).
 * New app: `pages/View/ScaleSite/components/tabs/AuthorizedScalersTab.tsx`, reached at
 * `/scale-sites/view/{scaleSiteIdNmbr}?tab=authorized-scalers` (slug 'authorized-scalers' = index 4 in the
 * Scale Site tab strip). Backed by GET /api/scale-sites/{id}/authorized-scalers (lazy).
 *
 * DISPLAY + NAVIGATION only. It renders (when the site loads):
 *  - an "Add Authorization" button -> navigate('/scaler-authorizations/create') (NO licence prefill — unlike
 *    the Scaler view's Authorizations tab),
 *  - a #scale-site-authorized-scalers-status-filter (All/Active/Cancelled/Expired; default All),
 *  - a table (aria-label "Authorized scalers") whose Authorization # cell links to
 *    /scaler-authorizations/view/{id} and whose Licence # cell links to /scalers/view/{lic}, OR an
 *    EmptySection when the status filter excludes every row.
 * A freshly-seeded authorization does NOT appear here (this view reads a different linkage), so scenarios run
 * against pre-existing data and assert the first row's links by HREF PATTERN (robust to row reordering).
 * Read-only: opening a site never mutates it -> parallel-safe, no cleanup.
 */
export class ScaleSiteAuthorizedScalersTabPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;
  readonly emptyForStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.getByRole('button', { name: 'Add Authorization' });
    this.statusFilter = page.locator('#scale-site-authorized-scalers-status-filter');
    this.table = page.getByRole('table', { name: 'Authorized scalers' });
    this.emptyForStatus = page.getByText('This scale site does not have any authorized scalers for the selected status.');
  }

  async open(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=authorized-scalers`,
    );
    // The Scale Site view shows a skeleton until summary + tombstone + two LOV queries all resolve; under
    // parallel load that can exceed the default expect timeout, so give the ready gate the same 30s the
    // suite's other heavy views use.
    await expect(this.addButton).toBeVisible({ timeout: 30000 });
  }

  /** The first data row (Authorization # is link 0, Licence # is link 1 — both RouterLinks). */
  private firstRow(): Locator {
    return this.table.locator('tbody tr').first();
  }

  /** The first row's Authorization # link (→ /scaler-authorizations/view/{id}). */
  firstRowAuthorizationLink(): Locator {
    return this.firstRow().locator('a').nth(0);
  }

  /** The first row's Licence # link (→ /scalers/view/{lic}). */
  firstRowLicenceLink(): Locator {
    return this.firstRow().locator('a').nth(1);
  }

  async setStatus(label: 'All' | 'Active' | 'Cancelled' | 'Expired'): Promise<void> {
    await this.statusFilter.selectOption({ label });
  }

  async clickAddAuthorization(): Promise<void> {
    await this.addButton.click();
  }
}
