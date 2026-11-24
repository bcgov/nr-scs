import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scale Site SOFTWARE tab (UC-SST-007) on the view page (/scale-sites/view/{id}).
 * The tab is READ-ONLY in the new app — the controller exposes only GET /scale-sites/{id}/software (no
 * create/update/delete), so the legacy "maintain" is a display-only list here. It renders either a table
 * (aria-label "Scale site software") of scaling programs used to submit returns, or a "No software found"
 * empty state. No writes, no seed, no cleanup — safe to share real sites read-only.
 */
export class ScaleSiteSoftwarePage {
  readonly page: Page;
  readonly softwareTab: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.softwareTab = page.getByRole('tab', { name: 'Software' });
    this.table = page.getByRole('table', { name: 'Scale site software' });
    this.emptyState = page.getByText('No software found');
  }

  /** Log in, navigate to the site view, and open the Software tab (its query is lazy — loads on activate). */
  async openForSite(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}`);
    await expect(this.softwareTab).toBeVisible({ timeout: 30_000 });
    await this.softwareTab.click();
  }

  columnHeader(name: string): Locator {
    return this.table.getByRole('columnheader', { name, exact: true });
  }

  /** Data rows in the software table body (excludes the header row). */
  dataRows(): Locator {
    return this.table.locator('tbody tr');
  }
}
