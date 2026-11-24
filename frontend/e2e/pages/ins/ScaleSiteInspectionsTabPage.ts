import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';
import { expectInspectionCreateScreenReady } from './ScaleSiteInspectionCreatePage';
import { SCREEN_READY_TIMEOUT_MS } from '../common/readiness';

/**
 * Page object for the Scale Site view's INSPECTIONS tab (nr-scs
 * `pages/View/ScaleSite/components/tabs/InspectionsTab`, route `/scale-sites/view/:id?tab=inspections`).
 * This is the entry point of the create flow (basic-flow steps 2-3: open site → Inspections → Add
 * Inspection). The tab lists a site's *viewable* inspections and renders the Add Inspection button.
 */
export class ScaleSiteInspectionsTabPage {
  constructor(private readonly page: Page) {}

  private get addInspectionButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Inspection' });
  }

  async open(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=inspections`,
    );
    // Data-gated on the scale-site + inspections queries — shared generous bound.
    await expect(this.addInspectionButton).toBeVisible({ timeout: SCREEN_READY_TIMEOUT_MS });
  }

  /**
   * The empty-list state (site has no *viewable* inspections).
   *
   * Takes the shared generous bound because THIS is the real data-gated assertion for the tab: the tab
   * renders the "Add Inspection" action in every state — loading, error, empty and populated — so
   * `open()`'s wait on that button can return while the inspections query is still in flight. The
   * list's own outcome (this empty state, or a row) is what actually proves the query settled.
   */
  async expectEmptyList(): Promise<void> {
    await expect(this.page.getByText('No inspections found')).toBeVisible({
      timeout: SCREEN_READY_TIMEOUT_MS,
    });
  }

  /** The empty list is the no-error state — the "Could not load inspections" error is NOT shown. */
  async expectNoLoadError(): Promise<void> {
    await expect(this.page.getByText('Could not load inspections')).toHaveCount(0);
  }

  async expectAddInspectionVisible(): Promise<void> {
    await expect(this.addInspectionButton).toBeVisible();
  }

  /** The Inspection # cell renders a RouterLink whose text is the inspection id. */
  private inspectionLink(inspectionId: string): Locator {
    return this.page.getByRole('link', { name: inspectionId, exact: true });
  }
  /** The table row that carries a given inspection's link (scoped by id — parallel-safe vs a count). */
  private inspectionRow(inspectionId: string): Locator {
    return this.page.locator('tr', { has: this.inspectionLink(inspectionId) });
  }

  /**
   * Assert a specific inspection is listed with its columns rendered (Inspection Type, Site Type,
   * Inspector #). Scoped to the row carrying that inspection id, so it is robust to other viewable rows
   * a parallel scenario might add on the same site.
   */
  async expectInspectionListed(
    inspectionId: string,
    columns: { type: string; siteType: string; inspector: string },
  ): Promise<void> {
    const row = this.inspectionRow(inspectionId);
    // Data-gated (see expectEmptyList): the row appears only once the inspections query resolves.
    await expect(row).toBeVisible({ timeout: SCREEN_READY_TIMEOUT_MS });
    await expect(row).toContainText(columns.type);
    await expect(row).toContainText(columns.siteType);
    await expect(row).toContainText(columns.inspector);
  }

  /**
   * The inspections query has SETTLED — the tab is showing the table, the empty state, or the load
   * error, rather than its loading skeleton (`InspectionsTab` renders a bare `SkeletonText` while
   * `isPending`). Needed because the tab paints "Add Inspection" in every state, so that button's
   * presence does not tell a caller the list has loaded.
   */
  private async expectListSettled(): Promise<void> {
    const settled = this.page
      .getByRole('table', { name: 'Scale site inspections' })
      .or(this.page.getByText('No inspections found'))
      .or(this.page.getByText('Could not load inspections'));
    await expect(settled.first()).toBeVisible({ timeout: SCREEN_READY_TIMEOUT_MS });
  }

  /**
   * A specific inspection is NOT listed — the delete read-back at the GUI level. Scoped to that id's
   * row (not a row count), so it stays true while a parallel scenario holds other rows on the same site.
   *
   * Waits for the list to SETTLE first: `toHaveCount(0)` is trivially true while the tab is still
   * showing its loading skeleton, so asserting it straight away would be a false pass that reports
   * "the row is gone" about a list that had not rendered yet.
   */
  async expectInspectionNotListed(inspectionId: string): Promise<void> {
    await this.expectListSettled();
    await expect(this.inspectionRow(inspectionId)).toHaveCount(0);
  }

  /** Click an inspection's Inspection # link (the row-link → detail hop). */
  async openInspection(inspectionId: string): Promise<void> {
    await this.inspectionLink(inspectionId).click();
  }

  /** Click Add Inspection and confirm it lands on the create screen (Stage 1). */
  async clickAddInspection(): Promise<void> {
    await this.addInspectionButton.click();
    // Reuses the create screen's own readiness wait (and its generous bound) instead of re-inlining the
    // selector with the default 10s timeout, which flaked under parallel load.
    await expectInspectionCreateScreenReady(this.page);
  }
}
