import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scale Site view's MSD tab (UC-MSD-005 — "Maintain Scale Site MSD Tab").
 * New app: `pages/View/ScaleSite/components/tabs/MsdTab.tsx`, reached at
 * `/scale-sites/view/:scaleSiteIdNmbr?tab=msd` (the tab slug 'msd' is index 5 in the tab strip, mapped by
 * useTabRouting). Backed by GET /api/scale-sites/{id}/mark-site-designations (view SCS_MSD_VW).
 *
 * The tab is a DISPLAY + NAVIGATION screen — no writes. It renders (when the record loads):
 *  - an always-present "Add Mark Site Designation" button -> navigate('/mark-site-designations/create'),
 *  - an <h4>"MSD - Timber Marks" heading,
 *  - either a table of timber-mark RouterLinks (-> /mark-site-designations?timberMark={mark}) OR, when the
 *    site has no designated marks, an EmptySection "No mark site designations found".
 * The new app does NOT gate the links/button by role (legacy S05/S06), so those slices are not-applicable /
 * blocked (see coverage.md). Read-only: opening a site never mutates it -> parallel-safe, no cleanup.
 */
export class ScaleSiteMsdTabPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'MSD - Timber Marks' });
    this.addButton = page.getByRole('button', { name: 'Add Mark Site Designation' });
    // The site-has-no-marks EmptySection — assert the description (the title "No mark site designations
    // found" is also shown for the no-scale-site-id guard, so the description is the unambiguous marker).
    this.emptyState = page.getByText('This scale site does not have any mark site designations.');
  }

  /** Log in (mock IDIR) then client-side navigate straight to the site's MSD tab (?tab=msd activates it). */
  async open(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=msd`,
    );
    // The Add button renders in every loaded state (marks, empty, even the skeleton) — a stable ready gate.
    await expect(this.addButton).toBeVisible();
  }

  /** A timber-mark cell rendered as a RouterLink (scoped by its text = the mark code). */
  markLink(timberMark: string): Locator {
    return this.page.getByRole('link', { name: timberMark, exact: true });
  }

  /** Click the "Add Mark Site Designation" entry point (S04 -> MSD create flow). */
  async clickAddMarkSiteDesignation(): Promise<void> {
    await this.addButton.click();
  }

  /** Click a timber-mark link (S03 -> the MSD designation list for that mark). */
  async clickMarkLink(timberMark: string): Promise<void> {
    await this.markLink(timberMark).click();
  }
}
