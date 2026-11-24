import { type Locator, type Page, expect } from '@playwright/test';

import type { SummaryCheckScaleCreateData } from '../../fixtures/chk/chk-test-data';
import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';
import {
  SPG_NUMERIC_IDS,
  SUMMARY_CHECK_SCALE_FIELD_IDS,
} from './summaryCheckScaleShared';

/**
 * Page Object for the Summary Check Scale — Create screen (route: /summary-check-scales/create).
 *
 * Selectors use the stable element ids defined on the shared SummaryCheckScaleForm / SpgRowFields
 * components (nr-scs/frontend/src/components/Form/SummaryCheckScaleForm), falling back to role/label
 * queries for controls without a convenient id (the Save button).
 *
 * Field-ordering rules mirrored from the app's view-model:
 *  - Return Type must be set before the SPG Product enables (Product enables for SFP once a species
 *    is chosen); changing Species resets Product/Grade.
 *  - Carbon DateInput is a flatpickr with allowInput + dateFormat Y-m-d; its onBlur commits the typed
 *    value, so we fill then blur (and Escape to dismiss the calendar overlay).
 */
export class SummaryCheckScaleCreatePage {
  readonly page: Page;
  readonly saveButton: Locator;
  /** The form-level "Please fix the errors below." notification (shown after a failed save). */
  readonly errorBanner: Locator;
  /** The Back button — only rendered when the page arrived with a scaler tombstone in route state. */
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.getByRole('button', { name: 'Save Record' });
    this.errorBanner = page.locator('.cds--inline-notification--error');
    this.backButton = page.getByRole('button', { name: 'Back' });
  }

  async goto(): Promise<void> {
    // Mock auth (VITE_MOCK_USER=true) is IN-MEMORY only: MockAuthProvider starts logged out and
    // login() just sets React state (no persistence). ProtectedRoute redirects a logged-out user
    // to /welcome. So we must (1) land on the public welcome page, (2) click the mock login, then
    // (3) navigate to the protected route CLIENT-SIDE — a full page.goto() would reload the app and
    // drop the in-memory session, bouncing us back to /welcome.
    await loginAsMockScsUser(this.page);
    await this.openRoute({});
  }

  /**
   * Open the create form as if reached from a scaler context: the Back button renders only when
   * route state carries a scaler tombstone (`scalerName`), and Back navigates to `backTo`. React
   * Router reads location.state from `history.state.usr`, so we seed it there before firing popstate.
   */
  async gotoWithBackContext(scalerName: string, backTo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await this.openRoute({ scalerName, backTo });
  }

  /** Client-side navigate to the create route (shared mock-auth dance), then wait for the form. */
  private async openRoute(state: { scalerName?: string; backTo?: string }): Promise<void> {
    await clientSideNavigate(this.page, '/summary-check-scales/create', state);
    await expect(this.page.getByRole('heading', { name: 'Summary Check Scale - Create' })).toBeVisible();
  }

  async setReturnType(label: SummaryCheckScaleCreateData['returnType']): Promise<void> {
    // Carbon hides the real radio <input> behind a styled span and the page has a sticky header, so
    // a normal click on the input is intercepted. The input is functional — check it directly by its
    // accessible name with force to bypass the overlay actionability check.
    await this.page.getByRole('radio', { name: label, exact: true }).check({ force: true });
  }

  private async setDate(id: string, value: string): Promise<void> {
    const input = this.page.locator(id);
    await input.click();
    await input.fill(value);
    // Commit (onBlur reads the typed value) and dismiss the flatpickr overlay.
    await this.page.keyboard.press('Escape');
    await input.blur();
  }

  async fillHeader(data: SummaryCheckScaleCreateData): Promise<void> {
    await this.setReturnType(data.returnType);
    await this.page.selectOption('#check-scale-type', data.checkScaleType);
    await this.page.locator('#check-scaler-licence').fill(data.checkScalerLicence);
    await this.page.locator('#original-scaler-licence').fill(data.originalScalerLicence);

    // XOR: fill exactly one of load arrival / weigh slip.
    if (data.loadArrivalNumber) await this.page.locator('#load-arrival-number').fill(data.loadArrivalNumber);
    if (data.weighSlipNumber) await this.page.locator('#weigh-slip-number').fill(data.weighSlipNumber);

    await this.page.locator('#timber-mark').fill(data.timberMark);
    await this.page.locator('#scale-site-number').fill(data.scaleSiteNumber);
    await this.page.selectOption('#followed-good-practices', data.followedGoodPractices);
    await this.page.selectOption('#original-within-standard', data.originalWithinStandard);
    await this.page.selectOption('#check-replaces-original', data.checkReplacesOriginal);

    // Partial Load only renders for Special Forest Product.
    if (data.returnType === 'Special Forest Product') {
      await this.page.selectOption('#partial-load', data.partialLoad);
    }

    await this.setDate('#original-date-of-scale', data.originalDateOfScale);
    await this.setDate('#check-date-of-scale', data.checkDateOfScale);
    await this.page.locator('#original-scale-return').fill(data.originalScaleReturn);
    await this.page.locator('#check-scale-return').fill(data.checkScaleReturn);
  }

  async fillSpgRow(data: SummaryCheckScaleCreateData): Promise<void> {
    const spg = data.spgRow;
    // Species first — it gates (and resets) Product/Grade.
    await this.page.selectOption('#species', spg.species);
    if (spg.product) await this.page.selectOption('#product', spg.product);
    if (spg.grade) await this.page.selectOption('#grade', spg.grade);
    await this.page.locator('#original-pieces').fill(spg.originalPieces);
    await this.page.locator('#check-pieces').fill(spg.checkPieces);
    await this.page.locator('#original-net-volume').fill(spg.originalNetVolume);
    await this.page.locator('#check-net-volume').fill(spg.checkNetVolume);
    await this.page.locator('#original-net-value').fill(spg.originalNetValue);
    await this.page.locator('#check-net-value').fill(spg.checkNetValue);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  // --- generic field access (keeps DOM selectors in the page object, so steps stay declarative) ---
  // Field-id map + SPG numeric ids are shared with the Update page (summaryCheckScaleShared.ts).

  /** Locator for a field by its visible label (throws on an unknown label — a test-authoring bug). */
  field(label: string): Locator {
    const id = SUMMARY_CHECK_SCALE_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown SCS create field: "${label}". Add it to SUMMARY_CHECK_SCALE_FIELD_IDS.`);
    return this.page.locator(id);
  }

  /** Type a value into a text field by label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.field(label).fill(value);
  }

  /** Choose an option in a Carbon <Select> (native select) by label; '' clears it. */
  async selectField(label: string, value: string): Promise<void> {
    const id = SUMMARY_CHECK_SCALE_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown SCS create field: "${label}". Add it to SUMMARY_CHECK_SCALE_FIELD_IDS.`);
    await this.page.selectOption(id, value);
  }

  /** Clear all six SPG numeric fields (leaves Species/Product/Grade selections intact). */
  async clearSpgNumericFields(): Promise<void> {
    for (const id of SPG_NUMERIC_IDS) await this.page.locator(id).fill('');
  }
}
