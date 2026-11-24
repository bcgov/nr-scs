import { type Locator, type Page, expect } from '@playwright/test';

import type { SpgRowData } from '../../fixtures/chk/chk-test-data';
import { clientSideNavigate, loginAsMockScsUser, setDateField } from '../common/authNav';
import {
  DATE_FIELD_LABELS,
  SELECT_FIELD_LABELS,
  fieldId,
} from './summaryCheckScaleShared';

/**
 * Page Object for the Summary Check Scale — Update screen (route: /summary-check-scales/:id/edit).
 *
 * Shares the header + SPG field ids and the login/date helpers with the Create page via
 * summaryCheckScaleShared.ts (both screens render the same form components). Adds the update-only
 * surface: the action row (Reset / Save Record / Delete Record / Create Letter / Back), the SPG
 * add-row + per-row delete, and the Carbon confirmation Modal.
 *
 * Mock-auth gotcha (see loginAsMockScsUser): a full page.goto() to the protected edit route bounces
 * to /welcome, so we log in then navigate CLIENT-SIDE (history.pushState + popstate) so the in-memory
 * session survives.
 */
export class SummaryCheckScaleUpdatePage {
  readonly page: Page;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly deleteRecordButton: Locator;
  readonly createLetterButton: Locator;
  readonly backButton: Locator;
  readonly addButton: Locator;
  /** The form-level "Please fix the errors below." / "Action failed" error notification. */
  readonly errorBanner: Locator;
  /** Per-row trash buttons in the SPG summary table (iconDescription "Delete row"). */
  readonly rowDeleteButtons: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.getByRole('button', { name: 'Save Record' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    // danger--tertiary; matched by visible text (Carbon may prefix the accessible name with "danger").
    this.deleteRecordButton = page.getByRole('button', { name: /Delete Record/ });
    this.createLetterButton = page.getByRole('button', { name: 'Create Letter' });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.addButton = page.getByRole('button', { name: /^Add$/ });
    this.errorBanner = page.locator('.cds--inline-notification--error');
    this.rowDeleteButtons = page.getByRole('button', { name: /Delete row/ });
  }

  /** Log in, then client-side navigate to the edit route for a specific record. */
  async goto(checkScaleId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await this.openRoute(checkScaleId, {});
  }

  /** Open the edit form as if reached from a scaler context (seeds route state so Back renders). */
  async gotoWithBackContext(checkScaleId: string, scalerName: string, backTo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await this.openRoute(checkScaleId, { scalerName, backTo });
  }

  private async openRoute(
    checkScaleId: string,
    state: { scalerName?: string; backTo?: string },
  ): Promise<void> {
    await clientSideNavigate(this.page, `/summary-check-scales/${checkScaleId}/edit`, state);
    await expect(this.page.getByRole('heading', { name: 'Summary Check Scale - Update' })).toBeVisible();
    // The heading also renders in the loading-skeleton branch, so wait for the loaded form itself
    // (the action row's Save button only renders once the record has hydrated) before asserting on
    // the SPG table / fields — otherwise a one-shot count() can race the skeleton.
    await expect(this.saveButton).toBeVisible();
  }

  // --- header + SPG field editing (delegates DOM to the shared field map) ---

  /** Set any header/SPG field by visible label, dispatching to select / date / text as appropriate. */
  async setField(label: string, value: string): Promise<void> {
    const id = fieldId(label);
    if (DATE_FIELD_LABELS.has(label)) {
      await setDateField(this.page, id, value);
    } else if (SELECT_FIELD_LABELS.has(label)) {
      await this.page.selectOption(id, value);
    } else {
      await this.page.locator(id).fill(value);
    }
  }

  /**
   * Clear a text/date field to blank (dropdowns cannot be blanked — their empty option is disabled).
   * Routes through setField so a date field's flatpickr onBlur commits the empty value to state.
   */
  async clearField(label: string): Promise<void> {
    if (SELECT_FIELD_LABELS.has(label)) {
      throw new Error(`Cannot blank the "${label}" dropdown via the UI (its empty option is disabled).`);
    }
    await this.setField(label, '');
  }

  field(label: string): Locator {
    return this.page.locator(fieldId(label));
  }

  async commentValue(): Promise<string> {
    return this.field('Check Scaler Comment').inputValue();
  }

  /** Fill the "Add Species Product Grade" row (species first — it gates/resets Product+Grade). */
  async fillSpgAddRow(row: SpgRowData): Promise<void> {
    await this.page.selectOption(fieldId('Species'), row.species);
    if (row.product) await this.page.selectOption(fieldId('Product'), row.product);
    if (row.grade) await this.page.selectOption(fieldId('Grade'), row.grade);
    await this.page.locator(fieldId('Original Pieces')).fill(row.originalPieces);
    await this.page.locator(fieldId('Check Scale Pieces')).fill(row.checkPieces);
    await this.page.locator(fieldId('Original Net Volume')).fill(row.originalNetVolume);
    await this.page.locator(fieldId('Check Scale Net Volume')).fill(row.checkNetVolume);
    await this.page.locator(fieldId('Original Net Value')).fill(row.originalNetValue);
    await this.page.locator(fieldId('Check Scale Net Value')).fill(row.checkNetValue);
  }

  // --- actions ---

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /** Click the trash icon on the SPG row at the given index, then confirm the modal. */
  async deleteSpgRow(index: number): Promise<void> {
    await this.rowDeleteButtons.nth(index).click();
    await this.confirmModal();
  }

  /** Click "Delete Record", then confirm the modal. */
  async deleteRecord(): Promise<void> {
    await this.deleteRecordButton.click();
    await this.confirmModal();
  }

  /**
   * Confirm the Carbon danger Modal. Its primary button is a danger Button, so Carbon surfaces the
   * accessible name as "danger Delete" (not "Delete") — match by substring, scoped to the dialog so it
   * can't collide with the page's "Delete Record" / per-row "Delete row" buttons.
   */
  private async confirmModal(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Delete/ }).click();
  }
}
