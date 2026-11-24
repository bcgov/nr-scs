import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the re-grounded Scaler Search screen — legacy `.scalerSearch` (P005) +
 * `.scalerSearchResults` (P006). Like Client Search, the new app (`/scalers`, pages/Queries/Scalers)
 * collapses the two legacy screens into ONE page (form + results together), so there is NO "Back"
 * button. One extra new-app behaviour differs from the legacy spec and is logged as a divergence:
 *  - a single-result search does NOT auto-forward to the scaler summary (it lists the 1 row).
 * The "OR enter check scale #" branch matches legacy: it looks the number up first, opens
 * /check-scales/view/{id} on a match, and otherwise shows a field error on the form.
 *
 * SCOPING NOTE: the "Scaler (Client / Loc)" field embeds a `ClientLocSearch`, which renders its own
 * "Search"/"Reset" buttons AND a (hidden) client-search picker modal that ALSO contains the text
 * "Choose your search parameters." and a Table. So generic `getByRole('button', {name:'Search'})` /
 * `getByText('Choose your search parameters.')` are AMBIGUOUS here. Every locator below is therefore
 * scoped to the scaler page's own regions — the action row `.scaler-search__actions` and the results
 * column `.scaler-search-results` — or to an id unique to this form (`#scalerLicenceNo`).
 *
 * Read-only entry point — searches never mutate, so pinned real records are shared safely in parallel.
 */
export class ScalerSearchPage {
  readonly page: Page;
  readonly licenceInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly checkScaleAccordionHeader: Locator;
  readonly checkScaleInput: Locator;
  readonly checkScaleError: Locator;
  readonly createScalerButton: Locator;
  readonly results: Locator;
  readonly resultsTotal: Locator;
  readonly noResults: Locator;
  readonly clientLocLabel: Locator;
  readonly clientInput: Locator;
  readonly clientLocInput: Locator;

  private static readonly FIELD_ID: Record<string, string> = {
    licence: 'scalerLicenceNo',
    'last name': 'clientName',
    'first name': 'legalFirstName',
  };

  constructor(page: Page) {
    this.page = page;
    const actions = page.locator('.scaler-search__actions');
    this.results = page.locator('.scaler-search-results');
    this.licenceInput = page.locator('#scalerLicenceNo');
    this.searchButton = actions.getByRole('button', { name: 'Search' });
    this.resetButton = actions.getByRole('button', { name: 'Reset' });
    // The check-scale accordion + Create Scaler button exist ONLY on the standalone scaler page.
    this.checkScaleAccordionHeader = page.getByRole('button', { name: /OR enter check scale/ });
    this.checkScaleInput = page.locator('#checkScaleIdDisplay');
    // Carbon renders a TextInput's invalidText as `#<id>-error-msg`.
    this.checkScaleError = page.locator('#checkScaleIdDisplay-error-msg');
    this.createScalerButton = this.results.getByRole('button', { name: 'Create Scaler' });
    this.resultsTotal = this.results.locator('.table-resource__total');
    this.noResults = this.results.getByText('No results', { exact: true });
    // The "Scaler (Client / Loc)" field (`ClientLocSearch`, index.tsx:363). Scope to the field's own
    // column: the embedded client-picker modal portals a SECOND `#clientNumber` to document.body, so a
    // bare `#clientNumber` is ambiguous — `.scaler-search__client-loc` excludes the portaled modal.
    const clientLoc = page.locator('.scaler-search__client-loc');
    this.clientLocLabel = clientLoc.locator('.client-loc-label');
    this.clientInput = clientLoc.locator('#clientNumber');
    this.clientLocInput = clientLoc.locator('#clientLocnCode');
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/scalers');
    // #scalerLicenceNo is unique to this form (the embedded client picker modal has no such field).
    await expect(this.licenceInput).toBeVisible({ timeout: 30000 });
    await expect(this.searchButton).toBeVisible({ timeout: 30000 });
  }

  private fieldInput(fieldLabel: string): Locator {
    const id = ScalerSearchPage.FIELD_ID[fieldLabel];
    if (!id) throw new Error(`Unknown scaler-search field "${fieldLabel}" (expected one of ${Object.keys(ScalerSearchPage.FIELD_ID).join(', ')}).`);
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

  /** Open the "OR enter check scale #" accordion (switches to check-scale search mode); wait for its input. */
  async enterCheckScaleMode(): Promise<void> {
    await this.checkScaleAccordionHeader.click();
    await expect(this.checkScaleInput).toBeVisible();
  }

  async fillCheckScale(value: string): Promise<void> {
    await this.checkScaleInput.fill(value);
  }

  /** The results-table Licence # cell link for a licence (scoped to the scaler results column). */
  licenceLink(licence: string): Locator {
    return this.results.getByRole('link', { name: licence, exact: true });
  }

  /** A scaler results-table cell by column key containing text (scoped to the scaler results column). */
  cell(key: string, text: string): Locator {
    return this.results.locator(`.table-resource__cell-content--${key}`, { hasText: text });
  }

  columnHeader(name: string): Locator {
    return this.results.getByRole('columnheader', { name, exact: true });
  }

  /**
   * Assert the "Scaler (Client / Loc)" field is rendered with the given label and an EDITABLE client-#
   * input. The Loc half is read-only by design (`locReadOnly`), populated via the client picker — asserted
   * too so the field's real shape is pinned, not just its presence.
   */
  async expectClientLocFieldEditable(label: string): Promise<void> {
    await expect(this.clientLocLabel).toHaveText(label);
    await expect(this.clientInput).toBeVisible();
    await expect(this.clientInput).toBeEditable();
    await expect(this.clientLocInput).not.toBeEditable();
  }
}
