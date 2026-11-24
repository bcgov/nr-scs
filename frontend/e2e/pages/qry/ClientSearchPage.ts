import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the re-grounded Client Search screen — legacy `.clientSearch` (P003) +
 * `.clientSearchResults` (P004). The new app collapses that legacy TWO-screen flow (search page →
 * results page, with a "Back" button) into a SINGLE page (`/client`, pages/Queries/Client): the search
 * form and the results table render together, so there is NO "Back" button (its slices are logged as a
 * coverage gap — no new-app equivalent).
 *
 * Read-only entry point: a client search never mutates, so the real records it returns (00001003,
 * 00000001, …) are safe to share across parallel tests, and no cleanup is needed.
 *
 * Selectors: SCS exposes stable form-field ids (clientNumber / clientLocnCode / companyName / lastName /
 * firstName), which are the legitimate, resilient handles here. Results assertions use the
 * TableResource cell class `.table-resource__cell-content--{key}` and the "Result List: N records" total.
 */
export class ClientSearchPage {
  readonly page: Page;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  /** The "Result List: N records" count line (TableResource.__total) — legacy CNT-001 text, preserved. */
  readonly resultsTotal: Locator;
  /** The "No results" empty state shown when a search matches zero clients (re-grounds "Result List: 0 records"). */
  readonly noResults: Locator;

  /** Map a human field label (used in Gherkin) to the app's stable input id. */
  private static readonly FIELD_ID: Record<string, string> = {
    'client number': 'clientNumber',
    'location code': 'clientLocnCode',
    'company name': 'companyName',
    'last name': 'lastName',
    'first name': 'firstName',
  };

  constructor(page: Page) {
    this.page = page;
    // `exact: true`: the form now sits inside a Carbon Accordion whose heading button is named
    // "Choose your search parameters." — a non-exact name match for "Search" would also match that
    // heading (case-insensitive substring "…search…") and violate strict mode. Exact names hit only
    // the real submit/reset buttons.
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.resetButton = page.getByRole('button', { name: 'Reset', exact: true });
    this.resultsTotal = page.locator('.table-resource__total');
    this.noResults = page.getByText('No results', { exact: true });
  }

  /** Log in (mock auth) and client-side navigate to the standalone Client Search route; wait until ready. */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/client');
    // The Search button proves the form has painted; the section heading disambiguates the screen.
    await expect(this.page.getByText('Choose your search parameters.')).toBeVisible({ timeout: 30000 });
    await expect(this.searchButton).toBeVisible({ timeout: 30000 });
  }

  private fieldInput(fieldLabel: string): Locator {
    const id = ClientSearchPage.FIELD_ID[fieldLabel];
    if (!id) throw new Error(`Unknown client-search field "${fieldLabel}" (expected one of ${Object.keys(ClientSearchPage.FIELD_ID).join(', ')}).`);
    return this.page.locator(`#${id}`);
  }

  /** Type a value into a named search field. */
  async fill(fieldLabel: string, value: string): Promise<void> {
    await this.fieldInput(fieldLabel).fill(value);
  }

  async clickSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** The results-table "client" cell for a given "{num} / {loc}" value (its presence proves the row rendered). */
  clientCell(client: string): Locator {
    return this.page.locator('.table-resource__cell-content--client', { hasText: client });
  }

  /** A results-table cell by column key (client|companyName|lastName|firstName|city|…) containing text. */
  cell(key: string, text: string): Locator {
    return this.page.locator(`.table-resource__cell-content--${key}`, { hasText: text });
  }

  /** A results-table column header by visible name (Carbon renders `<th>` = columnheader). */
  columnHeader(name: string): Locator {
    return this.page.getByRole('columnheader', { name, exact: true });
  }
}
