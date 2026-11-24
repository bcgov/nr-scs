import { type Locator, type Page, expect } from '@playwright/test';

import type { DetailCheckScaleCreateData } from '../../fixtures/chk/chk-test-data';
import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';
import { fieldError as checkScaleFieldError } from '../common/carbonHelpers';
import {
  CHECK_SCALE_OUTCOME_FIELD_IDS,
  CHECK_SCALE_SELECT_FIELDS,
} from './checkScaleDetailShared';

/**
 * Page Object for the DETAIL Check Scale — Create screen (route: /check-scales/create).
 *
 * This is a two-step, single-page flow (nr-scs/frontend/src/pages/Create/CheckScale):
 *  - STEP 1 (legacy P075): a Return Type radio group + the DDN/DDV table (check + original). "Next"
 *    POSTs /api/check-scales/validate to resolve the pair against HBS.
 *  - STEP 2 (legacy P076): on a valid pair the page swaps to a preview showing HBS-derived read-only
 *    fields + the editable outcome fields (Check Scale Type, Followed Good Practices, Original within
 *    Standard, comment, net values). "Save Record" POSTs /api/check-scales/create, then the app
 *    navigates to /check-scales/view/{id} (legacy P078).
 *
 * Selectors use the stable element ids on DdnDdvTable (#ddn-check/#ddv-check/#ddn-orig/#ddv-orig) and
 * CheckScaleForm (#check-scale-type, #followed-good-practices, #original-within-standard, #orig-net,
 * #check-net, #check-scaler-comment), falling back to role queries for the Next/Save buttons.
 */

/** Step-1 DDN/DDV field label -> id. */
const STEP1_FIELD_IDS: Record<string, string> = {
  'Check Scale DDN': '#ddn-check',
  'Check Scale DDV': '#ddv-check',
  'Original Scale DDN': '#ddn-orig',
  'Original Scale DDV': '#ddv-orig',
};

// Step-2 outcome fields (ids + which are selects) are shared with the Edit screen — see
// checkScaleDetailShared.ts (CHECK_SCALE_OUTCOME_FIELD_IDS / CHECK_SCALE_SELECT_FIELDS).

export class CheckScaleCreatePage {
  readonly page: Page;
  readonly nextButton: Locator;
  readonly saveButton: Locator;
  /** The form-level "Please fix the errors below." / "Request failed" notification. */
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.saveButton = page.getByRole('button', { name: 'Save Record' });
    this.errorBanner = page.locator('.cds--inline-notification--error');
  }

  /**
   * Log in (mock auth is in-memory) then CLIENT-SIDE navigate to the create route — a full page.goto
   * would reload the app and drop the session. Lands on step 1 (the DDN/DDV form).
   */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/check-scales/create');
    await expect(this.page.getByRole('heading', { name: 'Check Scale - Create' })).toBeVisible();
    await expect(this.nextButton).toBeVisible();
  }

  // ---- step 1: DDN/DDV ----

  /** Carbon hides the real radio <input> behind a styled span; check by accessible name with force. */
  async setReturnType(label: DetailCheckScaleCreateData['returnType']): Promise<void> {
    await this.page.getByRole('radio', { name: label, exact: true }).check({ force: true });
  }

  /** Fill step 1 from the given data (Return Type + the four DDN/DDV fields). */
  async fillStep1(data: DetailCheckScaleCreateData): Promise<void> {
    await this.setReturnType(data.returnType);
    await this.page.locator('#ddn-check').fill(data.checkDdn);
    await this.page.locator('#ddv-check').fill(data.checkDdv);
    await this.page.locator('#ddn-orig').fill(data.originalDdn);
    await this.page.locator('#ddv-orig').fill(data.originalDdv);
  }

  /** Enter an explicit check/original DDN+DDV pair (validation slices drive specific values). */
  async enterDdnPair(checkDdn: string, checkDdv: string, originalDdn: string, originalDdv: string): Promise<void> {
    await this.setReturnType('Log Tally');
    await this.page.locator('#ddn-check').fill(checkDdn);
    await this.page.locator('#ddv-check').fill(checkDdv);
    await this.page.locator('#ddn-orig').fill(originalDdn);
    await this.page.locator('#ddv-orig').fill(originalDdv);
  }

  /** One step-1 DDN/DDV control, by its screen label. */
  step1Field(label: string): Locator {
    const id = STEP1_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Check Scale step-1 field: "${label}".`);
    return this.page.locator(id);
  }

  /** Set a single step-1 DDN/DDV field by label, leaving the rest of the pair as entered. */
  async setStep1Field(label: string, value: string): Promise<void> {
    await this.step1Field(label).fill(value);
  }

  /**
   * Type a step-1 DDN/DDV field one keystroke at a time, the way a user does.
   *
   * `fillStep1`/`enterDdnPair`/`setStep1Field` use `fill()`, which assigns the value directly and so
   * IGNORES the control's `maxlength` — fine everywhere else, useless for proving the legacy length
   * cap (DDN 13, DDV 9). This types instead, so the browser enforces the cap and the field's
   * resulting value is the evidence.
   */
  async typeStep1Field(label: string, value: string): Promise<void> {
    const field = this.step1Field(label);
    await field.click();
    await field.pressSequentially(value);
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /** True once step 2 (the preview + outcome fields) is showing. */
  async expectOnStep2(): Promise<void> {
    await expect(this.saveButton).toBeVisible();
  }

  /** Assert we are still on step 1 (the DDN/DDV form) — used by the client-block negative cases. */
  async expectOnStep1(): Promise<void> {
    await expect(this.nextButton).toBeVisible();
    await expect(this.saveButton).toHaveCount(0);
  }

  // ---- step 2: outcome fields ----

  /** Fill all step-2 outcome fields from the given data (assumes we are on step 2). */
  async fillStep2(data: DetailCheckScaleCreateData): Promise<void> {
    await this.page.selectOption('#check-scale-type', data.checkScaleType);
    await this.page.selectOption('#followed-good-practices', data.followedGoodPractices);
    await this.page.selectOption('#original-within-standard', data.originalWithinStandard);
    if (data.comment) await this.page.locator('#check-scaler-comment').fill(data.comment);
    await this.page.locator('#orig-net').fill(data.originalNetValue);
    await this.page.locator('#check-net').fill(data.checkNetValue);
  }

  /** Set one step-2 outcome field (select or text) by label; '' clears a select. */
  async setStep2Field(label: string, value: string): Promise<void> {
    const id = CHECK_SCALE_OUTCOME_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Check Scale outcome field: "${label}".`);
    if (CHECK_SCALE_SELECT_FIELDS.has(label)) await this.page.selectOption(id, value);
    else await this.page.locator(id).fill(value);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  // ---- field-scoped error access (keeps DOM knowledge in the page object) ----

  /**
   * The Carbon requirement/error text rendered under a specific field — scoped to that field's
   * form-item so a short message (e.g. "Required.") is unambiguous. Works for both step-1 (DDN/DDV)
   * and step-2 fields.
   */
  fieldError(label: string): Locator {
    const id = STEP1_FIELD_IDS[label] ?? CHECK_SCALE_OUTCOME_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Check Scale field: "${label}".`);
    return checkScaleFieldError(this.page, id);
  }
}
