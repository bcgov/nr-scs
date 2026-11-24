import { type Locator, type Page, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the nine REPORT PARAMETER screens under the Reports tab (UC-RPT-004/005/006/010/011/
 * 012/013/014/015). ONE page object rather than nine, because all nine are the SAME component tree —
 * `pages/Reports/<Name>` renders the shared `components/core/ReportPage` (title, parameter children, the
 * optional `SortOptions` block, `ReportOutputOptions`, and the Back/Send/Reset actions). Only the
 * *parameter children* differ per report, and those are reached generically by control id. Nine near-clone
 * page objects would triple the maintenance cost of any shared-component change for no extra coverage.
 *
 * The screen under test is selected by `open(<key>)` from the REPORT_SCREENS registry below, so the step
 * layer stays one generic vocabulary (`I open the "Scaler Register" report`) and each UC keeps its own
 * feature/coverage/defects files.
 *
 * SCOPE. What this page object drives, and where each part is asserted:
 *   1. the screen renders (title + its own parameter controls + output options),
 *   2. the CLIENT-side validation in `ReportPage.handleSend` and in the District Performance screens' own
 *      `validateDates`, each proving NO request left the browser,
 *   3. the REQUEST PAYLOAD the screen builds (captured in-flight by the `reportRequests` fixture) — the
 *      per-report parameter mapping, which a rendered document cannot show,
 *   4. REAL end-to-end generation: submit, let JasperServer render, and assert the downloaded file's bytes
 *      (see each UC's `generation.feature`). Report generation was environment-blocked (every
 *      `POST /api/reports/*` returned HTTP 500) until 2026-08-11; it now works locally, so the generation
 *      arms are real rather than stubbed. The remaining stubs cover only what real generation cannot reach
 *      (the `useReportDownload` fallback filename) and the injected-failure branch.
 *
 * Generation is SLOW (2-16s per render; province-wide can exceed 120s) and `ReportService` caps concurrent
 * renders at 3 — so generation scenarios always filter to one district and run with limited parallelism.
 *
 * Every screen is READ-ONLY: generating a report renders a document and persists nothing → no seed, no
 * cleanup, parallel-safe. (Contrast the MSD *letter* screen — see `MarkSiteDesignationLetterPage` — where
 * generating DOES persist a letter against the record.)
 */

export type ReportScreenSpec = {
  /** Route path under the SPA basename. The compliance report appends an inspection id. */
  route: string;
  /** The `PageTitle` <h1> text that proves the screen loaded. */
  heading: string;
  /** Final segment of `POST /api/reports/<endpoint>` — how a captured request is attributed to a screen. */
  endpoint: string;
  /** True when the screen renders the shared `SortOptions` block (primary/secondary sort selects). */
  hasSortOptions: boolean;
};

/**
 * The nine Reports-tab screens, keyed by the name the Gherkin uses. Routes/headings/endpoints read off
 * `routes/routePaths.tsx`, each `pages/Reports/<Name>/index.tsx`, and `services/reports.service.ts`.
 * NOTE the deliberate route/endpoint asymmetry on the Designated Marks Exception report: the ROUTE is
 * singular (`/reports/designated-mark-exception`) while the API path is plural
 * (`reports/designated-marks-exception`) — not a typo here.
 */
export const REPORT_SCREENS: Record<string, ReportScreenSpec> = {
  'Scaler Register': {
    route: '/reports/scaler-register',
    heading: 'Scaler Register Report',
    endpoint: 'scaler-register',
    hasSortOptions: true,
  },
  'Scale Site Register': {
    route: '/reports/scale-site-register',
    heading: 'Scale Site Register Report',
    endpoint: 'scale-site-register',
    hasSortOptions: true,
  },
  'Mark Site Designation': {
    route: '/reports/mark-site-designation',
    heading: 'Mark Site Designation Report',
    endpoint: 'mark-site-designation',
    hasSortOptions: false,
  },
  'Designated Marks Exception': {
    route: '/reports/designated-mark-exception',
    heading: 'Designated Marks Exception Report',
    endpoint: 'designated-marks-exception',
    hasSortOptions: false,
  },
  'Scaling Administration': {
    route: '/reports/scaling-administration',
    heading: 'Scaling Administration Report',
    endpoint: 'scaling-administration',
    hasSortOptions: false,
  },
  'Scaling Exception': {
    route: '/reports/scaling-exception',
    heading: 'Scaling Exception Report',
    endpoint: 'scaling-exception',
    hasSortOptions: true,
  },
  'District Check Scale Performance': {
    route: '/reports/district-check-scale-performance',
    heading: 'District Check Scale Performance',
    endpoint: 'district-check-scale-performance',
    hasSortOptions: false,
  },
  'District Site Inspection Performance': {
    route: '/reports/district-site-inspection-performance',
    heading: 'District Site Inspection Performance',
    endpoint: 'district-site-inspection-performance',
    hasSortOptions: false,
  },
  'Scale Site Compliance': {
    route: '/reports/scale-site-compliance',
    heading: 'Scale Site Compliance Report',
    endpoint: 'scale-site-compliance',
    hasSortOptions: false,
  },
};

export class ReportScreenPage {
  readonly page: Page;

  /** The screen `open()` last navigated to — lets later steps assert against its spec without repeating it. */
  private current: ReportScreenSpec | null = null;

  readonly emailInput: Locator;
  readonly previewYesRadioLabel: Locator;
  readonly previewNoRadioLabel: Locator;
  readonly fileFormatSelect: Locator;
  readonly sendButton: Locator;
  readonly resetButton: Locator;
  readonly emailError: Locator;
  readonly primarySortSelect: Locator;
  readonly secondarySortSelect: Locator;
  readonly regDistSelect: Locator;
  readonly successBanner: Locator;
  readonly errorBanner: Locator;
  readonly loadingBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email-recipient');
    // Carbon RadioButton visually hides the <input>; click its label (label[for=…]) instead.
    this.previewYesRadioLabel = page.locator('label[for="preview-yes"]');
    this.previewNoRadioLabel = page.locator('label[for="preview-no"]');
    this.fileFormatSelect = page.locator('#file-format');
    this.sendButton = page.getByRole('button', { name: 'Send / View Report' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.emailError = page.locator('.report-output-email-error');
    this.primarySortSelect = page.locator('#primary-sort');
    this.secondarySortSelect = page.locator('#secondary-sort');
    this.regDistSelect = page.locator('#reg-dist');
    this.successBanner = page.locator('.cds--inline-notification--success');
    this.errorBanner = page.locator('.cds--inline-notification--error');
    this.loadingBanner = page.locator('.cds--inline-notification--info');
  }

  /** The spec of the screen currently open; throws a clear message if a step ran before `open()`. */
  get spec(): ReportScreenSpec {
    if (!this.current) {
      throw new Error('No report screen is open — a step used the report page before "I open the … report".');
    }
    return this.current;
  }

  /**
   * Log in (mock IDIR) then CLIENT-SIDE navigate to a report screen — mock auth is in-memory, so a full
   * goto() would drop the session (see loginAsMockScsUser). `routeSuffix` carries the Scale Site
   * Compliance report's `/{inspectionId}`.
   */
  async open(key: string, routeSuffix = ''): Promise<void> {
    const spec = REPORT_SCREENS[key];
    if (!spec) {
      throw new Error(
        `Unknown report screen "${key}". Known: ${Object.keys(REPORT_SCREENS).join(', ')}.`,
      );
    }
    this.current = spec;

    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `${spec.route}${routeSuffix}`);
    await this.expectLoaded();
  }

  /**
   * Open the screen WITHOUT asserting the parameter form rendered — for the compliance report's
   * "invalid inspection" guard, which renders an error notification INSTEAD of the form.
   */
  async openExpectingNoForm(key: string, routeSuffix = ''): Promise<void> {
    const spec = REPORT_SCREENS[key];
    if (!spec) {
      throw new Error(`Unknown report screen "${key}".`);
    }
    this.current = spec;

    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `${spec.route}${routeSuffix}`);
    await expect(this.title()).toBeVisible({ timeout: 30000 });
  }

  /** The screen's `PageTitle` <h1>. */
  title(): Locator {
    return this.page.getByRole('heading', { level: 1, name: this.spec.heading });
  }

  /** Screen is loaded when its title AND the shared output options (always last) have painted. */
  async expectLoaded(): Promise<void> {
    await expect(this.title()).toBeVisible({ timeout: 30000 });
    await expect(this.emailInput).toBeVisible({ timeout: 30000 });
    await expect(this.sendButton).toBeVisible();
  }

  // ---------------------------------------------------------------- output options (shared by all nine)

  async setEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
  }

  async setPreviewNo(): Promise<void> {
    await this.previewNoRadioLabel.click();
  }

  async setPreviewYes(): Promise<void> {
    await this.previewYesRadioLabel.click();
  }

  async setFileFormat(label: string): Promise<void> {
    await this.fileFormatSelect.selectOption({ label });
  }

  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  // ------------------------------------------------------- parameter controls (generic, by control id)

  /** Select a Reg / Dist by its org-unit-code <option> value (RegDistSelect's value is the orgUnitCode). */
  async setRegDist(orgUnitCode: string): Promise<void> {
    await this.setRegDistById('reg-dist', orgUnitCode);
  }

  /**
   * Select a Reg / Dist on a screen that renders MORE THAN ONE of them under explicit ids — the Designated
   * Marks Exception report has both `mark-reg-dist` and `site-reg-dist`, so the default `#reg-dist` id does
   * not exist there.
   */
  async setRegDistById(controlId: string, orgUnitCode: string): Promise<void> {
    const select = this.page.locator(`#${controlId}`);
    // The options stream in from the region/district LOV; wait for the target before selecting so a
    // cold LOV fetch cannot race the selectOption into a "no such option" failure.
    await expect(select.locator(`option[value="${orgUnitCode}"]`)).toHaveCount(1, { timeout: 30000 });
    await select.selectOption(orgUnitCode);
  }

  /** Select any Carbon <Select> on the screen by its control id, choosing by visible option label. */
  async setSelectByLabel(controlId: string, label: string): Promise<void> {
    await this.page.locator(`#${controlId}`).selectOption({ label });
  }

  /** Select any Carbon <Select> on the screen by its control id, choosing by option value. */
  async setSelectByValue(controlId: string, value: string): Promise<void> {
    await this.page.locator(`#${controlId}`).selectOption(value);
  }

  /** Fill a plain Carbon TextInput parameter (e.g. Scale Site # on the Scale Site Register). */
  async setTextField(controlId: string, value: string): Promise<void> {
    await this.page.locator(`#${controlId}`).fill(value);
  }

  /**
   * Type a TextInput parameter one keystroke at a time, the way a user does.
   *
   * `setTextField` uses `fill()`, which assigns the value directly and so IGNORES the control's
   * `maxlength` — fine for every other field, useless for proving a length cap. This types instead, so
   * the browser enforces the cap and the field's resulting value is the evidence.
   */
  async typeTextField(controlId: string, value: string): Promise<void> {
    const field = this.page.locator(`#${controlId}`);
    await field.click();
    await field.pressSequentially(value);
  }

  /** Commit a Carbon DatePicker parameter (click, type, Escape to dismiss the overlay, blur to read). */
  async setDate(controlId: string, value: string): Promise<void> {
    await setDateField(this.page, `#${controlId}`, value);
  }

  async setPrimarySort(label: string): Promise<void> {
    await this.primarySortSelect.selectOption({ label });
  }

  async setSecondarySort(label: string): Promise<void> {
    await this.secondarySortSelect.selectOption({ label });
  }

  /**
   * Add values to a `MultiValueInput` pill field (Specific Timber Marks / Scale Site # on the Mark Site
   * Designation report; Designated Marks / Sites on the Designated Marks Exception report). The component
   * commits on Enter, on ',' and on blur — Enter is used here, and the resulting pill is awaited so the
   * next value cannot be typed into a field React has not yet cleared.
   */
  async addMultiValues(controlId: string, values: string[]): Promise<void> {
    const field = this.page.locator(`#${controlId}`);
    for (const value of values) {
      await field.fill(value);
      await field.press('Enter');
      await expect(this.multiValuePill(controlId, value)).toBeVisible();
    }
  }

  /** The committed pill for a value in a MultiValueInput (scoped to that field's shell). */
  multiValuePill(controlId: string, value: string): Locator {
    return this.multiValueRoot(controlId).locator('.multi-value-input__pill', { hasText: value });
  }

  /** Remove a committed pill via its own "Remove {value}" button. */
  async removeMultiValue(controlId: string, value: string): Promise<void> {
    await this.multiValueRoot(controlId)
      .getByRole('button', { name: `Remove ${value}` })
      .click();
    await expect(this.multiValuePill(controlId, value)).toHaveCount(0);
  }

  /**
   * A MultiValueInput's own `FormLabel`. Asserted because the Mark Site Designation report RELABELS this
   * field ("Specific Timber Marks" ↔ "Scale Site #") from the Timber Mark/Site selector.
   */
  multiValueLabel(controlId: string): Locator {
    return this.multiValueRoot(controlId).locator('.multi-value-input__label');
  }

  /**
   * The `MultiValueInput` wrapper that owns a given input id (label + shell + pills + field live inside it).
   * Matched on the WHOLE class token: a bare `contains(@class,'multi-value-input')` would also match the
   * inner `multi-value-input__shell`, which holds the pills but NOT the label — so it would silently scope
   * label lookups to a subtree that can never contain the label. The padded-token form excludes `__shell`
   * just as an exact-string match does, without breaking the day the root gains a second (e.g. state) class.
   */
  private multiValueRoot(controlId: string): Locator {
    return this.page
      .locator(`#${controlId}`)
      .locator(
        "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' multi-value-input ')]",
      );
  }

  /**
   * A `MultiValueInput`'s rendered invalid message — the "does not exist" lines the mark / site fields show
   * after the existence check. Not a Carbon input, so it is NOT `${id}-error-msg`: the component renders its
   * own `.multi-value-input__error` beneath the pills (scoped to the field's root, so the Designated Marks
   * Exception screen's two fields never read each other's message).
   */
  multiValueError(controlId: string): Locator {
    return this.multiValueRoot(controlId).locator('.multi-value-input__error');
  }

  /**
   * Any parameter control's rendered invalid message. Carbon derives the id the same way for every input
   * (`useNormalizedInputProps` → `${id}-error-msg` on a `.cds--form-requirement`), so one locator serves the
   * DatePickers and the plain text fields alike — the Scale Site # unknown-site message included.
   */
  fieldError(controlId: string): Locator {
    return this.page.locator(`#${controlId}-error-msg`);
  }

  /**
   * A DateInput's rendered invalid message — {@link fieldError} under the name the date steps read by.
   *
   * This is also where the CROSS-FIELD messages land. `validateReportDateRange` mirrors its `rangeError`
   * onto `toError`, and the screens render it only there — so an inverted window or an over-cap range shows
   * up as the To field's own requirement text. There is deliberately no form-level banner: an earlier version
   * of these screens had one, which printed the same sentence twice on the page.
   */
  dateFieldError(controlId: string): Locator {
    return this.fieldError(controlId);
  }

  /** Current value of any control on the screen — used by the Reset assertions. */
  async valueOf(controlId: string): Promise<string> {
    return this.page.locator(`#${controlId}`).inputValue();
  }
}
