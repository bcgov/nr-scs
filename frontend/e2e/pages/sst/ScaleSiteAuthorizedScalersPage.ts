import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scale Site AUTHORIZED SCALERS tab (UC-SST-008) on the view page. In the new app the
 * tab is READ-ONLY plus a CLIENT-SIDE status filter (All/Active/Cancelled/Expired) — the assign/remove of
 * authorizations lives in the SCA domain (the "Add Authorization" button just routes to
 * /scaler-authorizations/create). It renders GET /scale-sites/{id}/authorized-scalers as a table
 * (aria-label "Authorized scalers") or a "No authorized scalers found" empty state. No writes -> no seed,
 * no cleanup, safe to share real sites read-only.
 */
export class ScaleSiteAuthorizedScalersPage {
  readonly page: Page;
  readonly tab: Locator;
  readonly table: Locator;
  readonly statusFilter: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tab = page.getByRole('tab', { name: 'Authorized Scalers' });
    this.table = page.getByRole('table', { name: 'Authorized scalers' });
    this.statusFilter = page.locator('#scale-site-authorized-scalers-status-filter');
    this.emptyState = page.getByText('No authorized scalers found');
  }

  /** Log in, navigate to the site view, and open the Authorized Scalers tab (lazy query loads on activate). */
  async openForSite(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}`);
    await expect(this.tab).toBeVisible({ timeout: 30_000 });
    await this.tab.click();
    await expect(this.statusFilter).toBeVisible();
  }

  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.selectOption(status);
  }

  columnHeader(name: string): Locator {
    return this.table.getByRole('columnheader', { name, exact: true });
  }

  dataRows(): Locator {
    return this.table.locator('tbody tr');
  }

  /** A Status-column cell with the given text (used to assert the filter kept only that status). */
  statusCell(status: string): Locator {
    return this.table.getByRole('cell', { name: status, exact: true });
  }
}
