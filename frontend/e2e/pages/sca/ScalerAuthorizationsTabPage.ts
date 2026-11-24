import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scaler view's "Authorizations" tab (UC-SCA tabs, Tier 3).
 * New app: `pages/View/Scaler/components/tabs/AuthorizationsTab.tsx`, reached at
 * `/scalers/view/{scalerLicenceNo}?tab=authorizations` (slug 'authorizations' = index 2 in the Scaler tab
 * strip, mapped by useTabRouting). Backed by GET /api/scalers/{lic}/authorizations (lazy — the query only
 * fires once the tab is active).
 *
 * DISPLAY + NAVIGATION only (no writes). It renders (when the scaler loads):
 *  - an "Add Authorization" button -> navigate('/scaler-authorizations/create?scalerLicenceNo={lic}')
 *    (PREFILLS the licence on the create form),
 *  - a #scaler-authorizations-status-filter (All/Active/Cancelled/Expired; default All),
 *  - a table (aria-label "Scaler authorizations") whose Authorization # cell is a RouterLink to
 *    /scaler-authorizations/view/{id}, OR an EmptySection when the status filter excludes every row.
 * Read-only: opening a scaler never mutates it -> parallel-safe, no cleanup.
 */
export class ScalerAuthorizationsTabPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly statusFilter: Locator;
  readonly table: Locator;
  readonly emptyForStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.getByRole('button', { name: 'Add Authorization' });
    this.statusFilter = page.locator('#scaler-authorizations-status-filter');
    this.table = page.getByRole('table', { name: 'Scaler authorizations' });
    // The status-filtered empty section — its description is unambiguous (the "no scaler licence" guard uses
    // the same title but a different description).
    this.emptyForStatus = page.getByText('This scaler does not have any authorizations for the selected status.');
  }

  /** Log in (mock IDIR) then client-side navigate straight to the scaler's Authorizations tab. */
  async open(scalerLicenceNo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scalers/view/${encodeURIComponent(scalerLicenceNo)}?tab=authorizations`,
    );
    // The Add button renders in every loaded state (rows, empty, skeleton) — a stable ready gate. 30s to
    // absorb cold summary/tombstone queries under parallel load.
    await expect(this.addButton).toBeVisible({ timeout: 30000 });
  }

  /** The Authorization # cell rendered as a RouterLink (scoped by its text = the authorization id). */
  authorizationLink(authorizationId: string): Locator {
    return this.table.getByRole('link', { name: authorizationId, exact: true });
  }

  async setStatus(label: 'All' | 'Active' | 'Cancelled' | 'Expired'): Promise<void> {
    await this.statusFilter.selectOption({ label });
  }

  async clickAddAuthorization(): Promise<void> {
    await this.addButton.click();
  }
}
