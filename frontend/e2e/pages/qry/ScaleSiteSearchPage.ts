import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the re-grounded Scale Site Search screen — legacy `.scaleSiteSearch` (P043) +
 * `.scaleSiteSearchResults` (P044). Like Client/Scaler Search, the new app (`/scale-sites`,
 * pages/Queries/ScaleSites) collapses the two legacy screens into ONE page (form + results together),
 * so there is NO "Back" button. Two new-app behaviours differ from the legacy spec and are logged as
 * divergences (see defects.md):
 *  - a single-result search does NOT auto-forward to the scale site view (it lists the 1 row);
 *  - the "OR enter inspection #" branch validates a non-numeric id CLIENT-SIDE (the legacy app rejected
 *    it as a server-side field error) and, for a valid-but-unknown id, navigates nowhere and shows the
 *    backend not-found message in a notification.
 *
 * SCOPING NOTE (mirrors ScalerSearchPage): the "Site Owner (Client / Loc)" field embeds a
 * `ClientLocSearch`, which renders its OWN "Search"/"Reset" buttons AND a (hidden) client-picker modal
 * that ALSO portals a second `#ownerClientNumber`/`#ownerClientLocnCode` to document.body and contains
 * the text "Choose your search parameters." + a Table. So generic `getByRole('button',{name:'Search'})`
 * is AMBIGUOUS here. Every locator below is therefore scoped to the page's own regions — the action row
 * `.scale-site-search__actions`, the results column `.scale-site-search-results`, and the client-loc
 * column `.scale-site-search__client-loc` — or to an id unique to this form (`#scaleSiteIdNmbr`).
 *
 * Read-only entry point (parameter search) — searches never mutate, so pinned real records are shared
 * safely in parallel. The inspection-# happy path seeds its own record (see fixtures.ts).
 */
export class ScaleSiteSearchPage {
  readonly page: Page;
  readonly siteIdInput: Locator;
  readonly siteNameInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly inspectionAccordionHeader: Locator;
  readonly inspectionInput: Locator;
  readonly createScaleSiteButton: Locator;
  readonly results: Locator;
  readonly resultsTotal: Locator;
  readonly noResults: Locator;
  readonly notification: Locator;
  readonly clientLocLabel: Locator;
  readonly clientInput: Locator;
  readonly clientLocInput: Locator;

  private static readonly FIELD_ID: Record<string, string> = {
    'scale site #': 'scaleSiteIdNmbr',
    'scale site name': 'siteName',
  };

  constructor(page: Page) {
    this.page = page;
    const actions = page.locator('.scale-site-search__actions');
    this.results = page.locator('.scale-site-search-results');
    this.siteIdInput = page.locator('#scaleSiteIdNmbr');
    this.siteNameInput = page.locator('#siteName');
    this.searchButton = actions.getByRole('button', { name: 'Search' });
    this.resetButton = actions.getByRole('button', { name: 'Reset' });
    // The inspection accordion exists ONLY on the standalone scale-site page (not the modal picker).
    this.inspectionAccordionHeader = page.getByRole('button', { name: /OR enter inspection/ });
    this.inspectionInput = page.locator('#inspectionId');
    this.createScaleSiteButton = this.results.getByRole('button', { name: 'Create Scale Site' });
    this.resultsTotal = this.results.locator('.table-resource__total');
    this.noResults = this.results.getByText('No results', { exact: true });
    // The page-level "Search failed" InlineNotification (the inspection-# not-found path surfaces here).
    this.notification = page.locator('.scale-site-search__notification');
    // The "Site Owner (Client / Loc)" field (`ClientLocSearch`). Scope to the field's own column: the
    // embedded client-picker modal portals a SECOND `#ownerClientNumber` to document.body, so a bare id
    // is ambiguous — `.scale-site-search__client-loc` excludes the portaled modal.
    const clientLoc = page.locator('.scale-site-search__client-loc');
    this.clientLocLabel = clientLoc.locator('.client-loc-label');
    this.clientInput = clientLoc.locator('#ownerClientNumber');
    this.clientLocInput = clientLoc.locator('#ownerClientLocnCode');
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/scale-sites');
    // #scaleSiteIdNmbr is unique to this form (the embedded client picker modal has no such field).
    await expect(this.siteIdInput).toBeVisible({ timeout: 30000 });
    await expect(this.searchButton).toBeVisible({ timeout: 30000 });
  }

  private fieldInput(fieldLabel: string): Locator {
    const id = ScaleSiteSearchPage.FIELD_ID[fieldLabel];
    if (!id) {
      throw new Error(
        `Unknown scale-site-search field "${fieldLabel}" (expected one of ${Object.keys(ScaleSiteSearchPage.FIELD_ID).join(', ')}).`,
      );
    }
    return this.page.locator(`#${id}`);
  }

  async fill(fieldLabel: string, value: string): Promise<void> {
    await this.fieldInput(fieldLabel).fill(value);
  }

  async clickSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** Open the "OR enter inspection #" accordion (switches to inspection search mode); wait for its input. */
  async enterInspectionMode(): Promise<void> {
    await this.inspectionAccordionHeader.click();
    await expect(this.inspectionInput).toBeVisible();
  }

  async fillInspection(value: string): Promise<void> {
    await this.inspectionInput.fill(value);
  }

  /** The results-table Scale Site # cell link for an id (scoped to the results column). */
  scaleSiteLink(id: string): Locator {
    return this.results.getByRole('link', { name: id, exact: true });
  }

  /** A results-table cell by column key containing text (scoped to the results column). */
  cell(key: string, text: string): Locator {
    return this.results.locator(`.table-resource__cell-content--${key}`, { hasText: text });
  }

  columnHeader(name: string): Locator {
    return this.results.getByRole('columnheader', { name, exact: true });
  }

  /**
   * Assert the "Site Owner (Client / Loc)" field is rendered with the given label and EDITABLE client-#
   * AND loc inputs. Unlike the Scaler search (whose loc half is read-only via `locReadOnly`), the
   * scale-site page renders BOTH halves editable — the ClientLocSearch here is passed no `locReadOnly`
   * prop (pages/Queries/ScaleSites/index.tsx:305/343), so the loc input defaults to editable. Both are
   * asserted so the field's real shape is pinned, not just its presence.
   */
  async expectClientLocFieldEditable(label: string): Promise<void> {
    await expect(this.clientLocLabel).toHaveText(label);
    await expect(this.clientInput).toBeVisible();
    await expect(this.clientInput).toBeEditable();
    await expect(this.clientLocInput).toBeEditable();
  }
}
