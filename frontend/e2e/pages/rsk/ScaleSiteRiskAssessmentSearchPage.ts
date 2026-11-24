import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the Scale Site Risk Assessment search screen (route `/scale-site-risk-assessments`,
 * pages/Queries/ScaleSiteRiskAssessments). The scale-site twin of ScalerRiskAssessmentSearchPage — a
 * DIFFERENT page/branch/endpoint (UC-QRY-007 is a multi-subject UC). Like the other query pages, the new
 * app renders the filter form and the results table together on ONE page — there is no legacy two-screen
 * search -> results -> Back flow.
 *
 * SCOPING NOTE: the "Site Owner (Client / Loc)" filter embeds a `ClientLocSearch`, which renders its OWN
 * "Search" button (class `scs__input-search-button`) and a client-picker modal that portals a second set
 * of inputs (and, when open, its own `#primary-sort`/`#secondary-sort`) to document.body. So a bare
 * `getByRole('button', {name:'Search'})` / `#primary-sort` is ambiguous. The main Search/Reset buttons are
 * therefore scoped to the page's own action row (`.form-actions`), sort Selects to the page's own form
 * (`.scale-site-risk-assessment-form`), and results locators to the results column
 * (`.scale-site-risk-assessment-results`).
 *
 * Read-only entry point — searches never mutate, so pinned real records are shared safely in parallel.
 */
export class ScaleSiteRiskAssessmentSearchPage {
  readonly page: Page;
  // The only field addressed directly (goto readiness); every other filter is reached through `fill()`
  // via the id maps below, so no per-field Locators are kept.
  readonly assessmentIdInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  // The page's own filter form — scopes the widget locators so the ClientLocSearch picker modal's portaled
  // duplicates (a second `#ownerClientNumber`, `#primary-sort`, …) can never match.
  readonly form: Locator;
  readonly results: Locator;
  readonly resultsTotal: Locator;
  readonly noResults: Locator;
  // Assessment ID cells in DOM (render) order — the read-order for sort assertions.
  readonly assessmentIdCells: Locator;
  // MSG-001 filter-accordion heading, rendered on page load.
  readonly searchParamsHeading: Locator;

  // Text-input filters, keyed by their feature-facing label.
  private static readonly TEXT_FIELD_ID: Record<string, string> = {
    'assessment id': 'riskQuestionnaireId',
    'scale site #': 'scaleSiteIdNmbr',
    'scale site name': 'siteName',
  };
  // Select filters, keyed by their feature-facing label (chosen by visible option label).
  private static readonly SELECT_FIELD_ID: Record<string, string> = {
    level: 'riskTypeCode',
    complete: 'completeInd',
  };

  constructor(page: Page) {
    this.page = page;
    const actions = page.locator('.form-actions');
    this.form = page.locator('.scale-site-risk-assessment-form');
    this.results = page.locator('.scale-site-risk-assessment-results');
    this.assessmentIdInput = page.locator('#riskQuestionnaireId');
    this.searchButton = actions.getByRole('button', { name: 'Search' });
    this.resetButton = actions.getByRole('button', { name: 'Reset' });
    this.resultsTotal = this.results.locator('.table-resource__total');
    this.noResults = this.results.getByText('No results', { exact: true });
    this.assessmentIdCells = this.results.locator('.table-resource__cell-content--riskQuestionnaireId');
    this.searchParamsHeading = page.getByRole('heading', { name: 'Choose your search parameters.' });
  }

  /** The InlineNotification carrying an error `title` (scoped to this page's notification container so it
   *  never matches a shell-level banner). Covers both "Search failed" and "Could not load dropdown options". */
  errorNotification(title: string): Locator {
    return this.page.locator('.scale-site-risk-assessment-notification', { hasText: title });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/scale-site-risk-assessments');
    await expect(this.assessmentIdInput).toBeVisible({ timeout: 30000 });
    await expect(this.searchButton).toBeVisible({ timeout: 30000 });
  }

  /** Fill a text filter, or select a dropdown filter, by its feature-facing label. */
  async fill(fieldLabel: string, value: string): Promise<void> {
    const key = fieldLabel.toLowerCase();
    const textId = ScaleSiteRiskAssessmentSearchPage.TEXT_FIELD_ID[key];
    if (textId) {
      await this.page.locator(`#${textId}`).fill(value);
      return;
    }
    const selectId = ScaleSiteRiskAssessmentSearchPage.SELECT_FIELD_ID[key];
    if (selectId) {
      // Carbon Select renders the LOV description as the option label; selectOption auto-waits for the
      // select to be enabled (it is disabled until its LOV finishes loading).
      await this.page.locator(`#${selectId}`).selectOption({ label: value });
      return;
    }
    throw new Error(
      `Unknown scale-site-risk-assessment-search field "${fieldLabel}" (expected one of ` +
        `${[...Object.keys(ScaleSiteRiskAssessmentSearchPage.TEXT_FIELD_ID), ...Object.keys(ScaleSiteRiskAssessmentSearchPage.SELECT_FIELD_ID)].join(', ')}).`,
    );
  }

  async clickSearch(): Promise<void> {
    await this.searchButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** Reg / Dist filter via the `DistrictSelect` widget (`#orgUnitNo`, a native Select). Choose by the
   *  visible LOV label; the option value is the region/district code and `doSearch` sends `Number(orgUnitNo)`. */
  async selectDistrict(label: string): Promise<void> {
    await this.form.locator('#orgUnitNo').selectOption({ label });
  }

  /** Site Owner (Client / Loc) filter via the `ClientLocSearch` widget's Client # box (`#ownerClientNumber`).
   *  Scoped to the form so the picker modal's portaled duplicate can never match. `doSearch` sends both
   *  `ownerClientNumber` and `ownerClientLocnCode`; typing only the client number sends the number alone. */
  async fillOwnerClientNumber(value: string): Promise<void> {
    await this.form.locator('#ownerClientNumber').fill(value);
  }

  /** Site Type filter via the `ActiveMultiSelect` widget (`#method-types`, a Carbon FilterableMultiSelect).
   *  Open the listbox, toggle the option by its visible description, then dismiss with Escape (safe here —
   *  the risk page is NOT inside a Carbon Modal). `doSearch` sends `methodTypes` as an array of item codes. */
  async selectSiteType(label: string): Promise<void> {
    const multiselect = this.page.locator('#method-types');
    await multiselect.getByTitle('Open').click();
    await multiselect.getByRole('option', { name: label, exact: true }).click();
    await this.page.keyboard.press('Escape');
    // Fail LOUD (and auto-wait) if the selection did not register: the "Clear all selected items" control
    // only appears once ≥1 item is selected. Without this, a dropped selection silently degrades the search
    // to unfiltered — and since the unfiltered result set still contains anchor 1861, both feature
    // assertions would pass on a no-op. Same guard as ConditionsPage.addSiteType.
    await expect(multiselect.getByTitle('Clear all selected items')).toBeVisible();
  }

  /** Client-side navigate AWAY to another route (history.pushState, no reload) so the in-memory
   *  usePersistentState store survives, then assert this page's form is gone. A full `goto()` would reload
   *  the SPA and drop both the mock session AND the store — the whole point of the restore test. */
  async navigateAway(): Promise<void> {
    await clientSideNavigate(this.page, '/welcome');
    await expect(this.assessmentIdInput).toBeHidden({ timeout: 30000 });
  }

  /** Client-side navigate BACK to the list (no reload) and assert the form re-rendered from the store. */
  async returnToList(): Promise<void> {
    await clientSideNavigate(this.page, '/scale-site-risk-assessments');
    await expect(this.assessmentIdInput).toBeVisible({ timeout: 30000 });
  }

  /** Choose the Primary and Secondary sort options (by visible label) before searching. The SortOptions
   *  form renders `#primary-sort` / `#secondary-sort` Selects whose option labels are the SORT_OPTIONS
   *  labels (Assessment ID, Level, Site Name, …); selecting them updates the same formData `doSearch` reads.
   *  Scoped to the page's own form for consistency with the other query page objects (the page renders a
   *  single SortOptions block, so the ids are unique today; the scope keeps that assumption explicit). */
  async setSort(primaryLabel: string, secondaryLabel: string): Promise<void> {
    // Reuse the single `this.form` scope (defined in the constructor) — the ClientLocSearch picker modal
    // portals its own `#primary-sort`/`#secondary-sort` to <body>, so a bare id is ambiguous. Sharing the
    // one locator keeps a form-class rename from silently leaving only this helper broken.
    await this.form.locator('#primary-sort').selectOption({ label: primaryLabel });
    await this.form.locator('#secondary-sort').selectOption({ label: secondaryLabel });
  }

  /** Rendered Assessment IDs in row order (trimmed) — snapshot for a sort-order assertion. */
  async assessmentIdOrder(): Promise<string[]> {
    return (await this.assessmentIdCells.allTextContents()).map((t) => t.trim());
  }

  /** Fault injection (same page.route + route.fulfill pattern as steps/chk/verify.steps.ts): force the
   *  SEARCH endpoint to 500 so the "Search failed" notification path is exercised. Register after load. */
  async failSearchWith500(): Promise<void> {
    await this.page.route('**/api/scale-site-risk-assessments/search*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'Simulated search failure.' }),
      }),
    );
  }

  /** Fault injection: force the static-LOV endpoint (the Level dropdown loads through it) to 500 so the
   *  "Could not load dropdown options" notification path is exercised. Register BEFORE navigating, since
   *  the LOVs fetch on mount. */
  async failDropdownOptionsWith500(): Promise<void> {
    await this.page.route('**/api/static-lov*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'INTERNAL_SERVER_ERROR', message: 'Simulated LOV failure.' }),
      }),
    );
  }

  /** The results-table Assessment ID cell link for an id (scoped to the results column). */
  assessmentLink(id: string): Locator {
    return this.results.getByRole('link', { name: id, exact: true });
  }

  /** A results-table cell by column key containing text (scoped to the results column). */
  cell(key: string, text: string): Locator {
    return this.results.locator(`.table-resource__cell-content--${key}`, { hasText: text });
  }

  columnHeader(name: string): Locator {
    return this.results.getByRole('columnheader', { name, exact: true });
  }
}
