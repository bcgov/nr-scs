import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';
import { fieldError as checkScaleFieldError } from '../common/carbonHelpers';
import {
  CHECK_SCALE_OUTCOME_FIELD_IDS,
  CHECK_SCALE_SELECT_FIELDS,
} from './checkScaleDetailShared';

/**
 * Page Object for the DETAIL Check Scale — Edit screen (route: /check-scales/edit/{id}).
 *
 * The edit form (nr-scs/frontend/src/pages/Edit/CheckScale) loads the record via
 * GET /api/check-scales/search, renders CheckScaleForm in `edit` mode (the same six editable outcome
 * fields as the create step-2 preview), and on Save PUTs /api/check-scales/{id} then navigates to the
 * view screen. Reset reloads the saved values; Back navigates to the view without saving. Selectors +
 * the error locator are shared with the create page via checkScaleDetailShared.ts (reuse over dup).
 */
export class CheckScaleEditPage {
  readonly page: Page;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  /** The form-level "Please fix the errors below." / "Save failed" notification. */
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.saveButton = page.getByRole('button', { name: 'Save Record' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.errorBanner = page.locator('.cds--inline-notification--error');
  }

  private async navigate(id: string): Promise<void> {
    // Mock auth is in-memory: log in on /welcome, then CLIENT-SIDE navigate (a full goto reloads the
    // app and drops the session).
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/check-scales/edit/${id}`);
  }

  /** Open the edit form for an existing record; waits until the record has loaded (Save present). */
  async goto(id: string): Promise<void> {
    await this.navigate(id);
    await expect(this.page.getByRole('heading', { name: 'Check Scale - Edit' })).toBeVisible();
    await expect(this.saveButton).toBeVisible();
  }

  /** Open the edit route for a bad/missing id — the page renders its error state, not the form. */
  async gotoExpectingError(id: string): Promise<void> {
    await this.navigate(id);
  }

  field(label: string): Locator {
    const id = CHECK_SCALE_OUTCOME_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Check Scale edit field: "${label}".`);
    return this.page.locator(id);
  }

  /** Set an outcome field (select or text) by label; '' clears a select. */
  async setField(label: string, value: string): Promise<void> {
    const id = CHECK_SCALE_OUTCOME_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Check Scale edit field: "${label}".`);
    if (CHECK_SCALE_SELECT_FIELDS.has(label)) await this.page.selectOption(id, value);
    else await this.page.locator(id).fill(value);
  }

  /** Current value of an outcome field (works for both <select> and text/textarea). */
  async readField(label: string): Promise<string> {
    return this.field(label).inputValue();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
  }

  async back(): Promise<void> {
    await this.backButton.click();
  }

  fieldError(label: string): Locator {
    const id = CHECK_SCALE_OUTCOME_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Check Scale edit field: "${label}".`);
    return checkScaleFieldError(this.page, id);
  }
}
