import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Scale Site view's ACTIVITY SUMMARY tab (UC-QRY-008). nr-scs
 * `pages/View/ScaleSite/components/tabs/ActivityTab`, route
 * `/scale-sites/view/:scaleSiteIdNmbr?tab=activity-summary`. Read-only: a 4-row Summary table
 * (Date of Last Return / Number of Samples / Sample Volume / Scaled Volume) sourced from
 * `GET /api/scale-sites/{id}/activity-summary`. Null metrics render as an em dash '—' (asText); a load
 * failure shows an "Activity summary unavailable." notification instead of the table.
 *
 * Re-grounds the legacy separate screen `.scaleSiteSummaryActivityView` (P052) at `/scaleSiteActivity.do`,
 * which was driven by a SESSION tombstone — here the site id is a path param, so there is no tombstone to
 * lose (the legacy S05 "tombstone missing" crash re-grounds to a clean 404 on the endpoint).
 */
export class ScaleSiteActivityTabPage {
  private readonly table: Locator;
  private readonly errorNotification: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByRole('table', { name: 'Scale site activity summary' });
    this.errorNotification = page.getByText('Activity summary unavailable.');
  }

  /** Log in, then client-side navigate straight to the site's Activity Summary tab; wait for the table. */
  async open(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=activity-summary`,
    );
    await expect(this.table).toBeVisible({ timeout: 30_000 });
  }

  /** The value cell (2nd column) of the summary row whose label cell reads `label`. */
  private valueCell(label: string): Locator {
    // Match the label `<td>` by its exact text (a table cell's accessible name doesn't resolve reliably
    // via getByRole({name}), so text is the robust anchor); the value is the row's other/last cell.
    // The `has:` filter must be a PAGE-rooted locator — a locator scoped to `this.table` fails to re-root
    // inside each `tr`. Each label is unique on the page, so page scope is safe.
    const labelCell = this.page.getByText(label, { exact: true });
    return this.table.locator('tr', { has: labelCell }).locator('td').last();
  }

  /** Assert the value rendered next to a given summary-row label. */
  async expectField(label: string, expected: string): Promise<void> {
    await expect(this.valueCell(label)).toHaveText(expected);
  }

  /**
   * Assert the tab settled WITHOUT the load-error notification (an empty roll-up is a valid, non-error
   * state). The query has exactly two mutually-exclusive terminal branches — the summary table or the
   * "Activity summary unavailable." notification — so wait for whichever one wins the race, then assert
   * it was not the error. Anchoring on that race rather than on the table is what makes this real: it does
   * NOT presuppose the happy path, so a load failure fails this assertion instead of being masked by a
   * prior table-visible wait (both `open()` and the field checks require the table). A bare `toHaveCount(0)`
   * would also pass mid-load — before either branch renders — so settle first, then check.
   */
  async expectNoError(): Promise<void> {
    await expect(this.table.or(this.errorNotification).first()).toBeVisible({ timeout: 30_000 });
    await expect(this.errorNotification).toHaveCount(0);
  }
}
