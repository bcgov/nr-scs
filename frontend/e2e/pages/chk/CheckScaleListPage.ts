import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the re-grounded DETAIL check-scale "list" — legacy `.scalerCheckScales` (P012) and
 * `.scaleSiteCheckScales` (P057). The new app has NO standalone list route; the list is the **Check
 * Scales tab** inside the Scaler View (`/scalers/view/{lic}?tab=check-scales`) and Scale Site View
 * (`/scale-sites/view/{site}?tab=check-scales`). Both tabs render the same
 * `CheckScaleSummaryTable`, whose Check Scale # cell is a router link to `/check-scales/view/{id}`
 * (components/core/CheckScaleSummaryTable). The scaler tab's role Filter is `#scaler-check-scales-filter`.
 *
 * Read-only entry point — opening a tab and clicking a row never mutates, so the shared seed records it
 * lists (905001, …) are safe to share across parallel tests.
 */
export class CheckScaleListPage {
  readonly page: Page;
  /** Scaler tab filter (by licence role): #scaler-check-scales-filter. */
  readonly scalerFilter: Locator;
  /** Scale-site tab filter (by check-scale type code): #scale-site-check-scales-filter. */
  readonly siteFilter: Locator;
  readonly emptyState: Locator;
  /** List surfaces. Statistics render on the SCALER tab only (UC-CHK-007); the SITE tab (UC-CHK-008) has
   *  no stats section. The summary table + Add button render on both. */
  readonly statsHeading: Locator;
  readonly statsTable: Locator;
  readonly addCheckScaleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scalerFilter = page.locator('#scaler-check-scales-filter');
    this.siteFilter = page.locator('#scale-site-check-scales-filter');
    this.emptyState = page.getByText('No check scales found', { exact: true });
    this.statsHeading = page.getByRole('heading', { name: 'Check Scale Statistics' });
    this.statsTable = page.getByLabel('Check scale statistics');
    this.addCheckScaleButton = page.getByRole('button', { name: 'Add Check Scale' });
  }

  /** A Check Scale Summary column header, by visible name (Carbon renders `<th>` = columnheader). */
  columnHeader(name: string): Locator {
    return this.page.getByRole('columnheader', { name, exact: true });
  }

  /**
   * Open a scaler's Check Scales tab (deep-linked via ?tab=check-scales) and wait for it to be ready.
   * The filter only renders once the tab's data query settles (the pending state shows a skeleton, not
   * the filter), so awaiting the filter = awaiting the list to be populated. Real scalers can carry many
   * check scales, so the view page is heavier than the old single-record mock — use a generous web-first
   * wait (no fixed sleep) so a slow settle doesn't flake.
   */
  async gotoScalerCheckScales(scalerLicenceNo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scalers/view/${scalerLicenceNo}?tab=check-scales`);
    await expect(this.page.getByRole('heading', { name: 'Scaler Record' })).toBeVisible({ timeout: 30000 });
    await expect(this.scalerFilter).toBeVisible({ timeout: 30000 });
  }

  /** Open a scale site's Check Scales tab and wait for its filter (which renders once the tab query
   *  settles) so a subsequent filter selection can't race the data load. */
  async gotoScaleSiteCheckScales(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scale-sites/view/${scaleSiteIdNmbr}?tab=check-scales`);
    await expect(this.page.getByRole('heading', { name: 'Scale Site Record' })).toBeVisible({ timeout: 30000 });
    await expect(this.siteFilter).toBeVisible({ timeout: 30000 });
  }

  /** The Check Scale # router link for a given id (the list-row hyperlink). */
  rowLink(id: string): Locator {
    return this.page.getByRole('link', { name: id, exact: true });
  }

  /** Set the scaler tab's role Filter (All / Primary / Secondary / Primary/Secondary / Check). */
  async setScalerFilter(value: string): Promise<void> {
    await expect(this.scalerFilter).toBeEnabled({ timeout: 30000 });
    await this.scalerFilter.selectOption(value);
  }

  /** Set the scale-site tab's type Filter by CHECK_SCALE_TYPE_CODE value (e.g. FST, SEC; '' = All).
   *  Wait for the option to exist (the type LOV loads async) before selecting, so it can't race. */
  async setSiteFilter(value: string): Promise<void> {
    await expect(this.siteFilter).toBeEnabled({ timeout: 30000 });
    await expect(this.siteFilter.locator(`option[value="${value}"]`)).toHaveCount(1, { timeout: 30000 });
    await this.siteFilter.selectOption(value);
  }

  /** Click a Check Scale # row link to open its view screen. */
  async openCheckScale(id: string): Promise<void> {
    const link = this.rowLink(id);
    await expect(link).toBeVisible();
    await link.click();
  }
}
