import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the Scale Site Authorization CREATE screen (route /scale-site-authorizations/create).
 * All DOM selectors live here; steps call these methods.
 *
 * Two stages on one route (mirrors the Scaler Authorization create form): the always-visible basics (Scale
 * Site #, Effective/Expiry dates, Expected Annual Scale Volume), and a Conditions section (Condition # add,
 * Template apply) revealed by "Add Conditions" once the basics validate. The ONLY write
 * (POST /api/scale-site-authorizations) fires from "Save Record"; "Add Conditions" runs client-side
 * validateBasics and never POSTs. On success the app navigates to /scale-site-authorizations/view/{id}.
 *
 * Field ids (pages/Create/ScaleSiteAuthorization/index.tsx): #scale-site-number (maxlength 4, uppercased),
 * #effective-date, #expiry-date (DateInput YYYY-MM-DD), #expected-annual-scale-volume (numeric text). The
 * conditions section (AuthorizationConditionsSection classCode 'SIA') has #condition-id + Add, #template-select
 * + Apply. "Add Conditions"/"Save Record" are clicked via the shared steps (steps/common/formActions.steps.ts).
 */

export type ScaleSiteAuthBasics = {
  scaleSiteNumber: string;
  effectiveDate: string;
  expiryDate: string;
  expectedVolume: string;
};

export const BASICS_FIELD_BY_LABEL: Record<string, keyof ScaleSiteAuthBasics> = {
  'Scale Site #': 'scaleSiteNumber',
  'Effective Date': 'effectiveDate',
  'Expiry Date': 'expiryDate',
  'Expected Annual Scale Volume': 'expectedVolume',
};

export class ScaleSiteAuthorizationCreatePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly scaleSiteNumber: Locator;
  readonly effectiveDate: Locator;
  readonly expiryDate: Locator;
  readonly expectedVolume: Locator;
  readonly addConditionsButton: Locator;
  readonly saveRecordButton: Locator;
  readonly resetButton: Locator;
  readonly conditionInput: Locator;
  readonly conditionAddButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Scale Site Authorization - Create' });
    this.scaleSiteNumber = page.locator('#scale-site-number');
    this.effectiveDate = page.locator('#effective-date');
    this.expiryDate = page.locator('#expiry-date');
    this.expectedVolume = page.locator('#expected-annual-scale-volume');
    this.addConditionsButton = page.getByRole('button', { name: 'Add Conditions' });
    this.saveRecordButton = page.getByRole('button', { name: 'Save Record' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.conditionInput = page.locator('#condition-id');
    // exact: true is load-bearing — a substring "Add" would also match the "Add Conditions" button above;
    // the conditions section's own add-by-number button is exactly "Add".
    this.conditionAddButton = page.getByRole('button', { name: 'Add', exact: true });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/scale-site-authorizations/create');
    await expect(this.heading).toBeVisible();
  }

  /** Apply only the provided basics (a field left '' is not filled — the "missing" case). */
  async fillBasics(values: Partial<ScaleSiteAuthBasics>): Promise<void> {
    if (values.scaleSiteNumber !== undefined && values.scaleSiteNumber !== '') {
      await this.scaleSiteNumber.fill(values.scaleSiteNumber);
    }
    if (values.effectiveDate) await setDateField(this.page, '#effective-date', values.effectiveDate);
    if (values.expiryDate) await setDateField(this.page, '#expiry-date', values.expiryDate);
    if (values.expectedVolume !== undefined && values.expectedVolume !== '') {
      await this.expectedVolume.fill(values.expectedVolume);
    }
  }

  async clickAddConditions(): Promise<void> {
    await this.addConditionsButton.click();
  }

  async clickSaveRecord(): Promise<void> {
    await this.saveRecordButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /**
   * Assert onReset fully cleared the form: all four basics blank AND the conditions section collapsed (Save
   * Record gone, Add Conditions back). A weaker "site # is empty" check would pass a regression that reset
   * only one field or left the section revealed.
   */
  async expectFormCleared(): Promise<void> {
    await expect(this.scaleSiteNumber).toHaveValue('');
    await expect(this.effectiveDate).toHaveValue('');
    await expect(this.expiryDate).toHaveValue('');
    await expect(this.expectedVolume).toHaveValue('');
    await expect(this.saveRecordButton).toBeHidden();
    await expect(this.addConditionsButton).toBeVisible();
  }

  /** Enter a condition number and click Add (conditions section must be revealed first). */
  async addConditionById(conditionId: string): Promise<void> {
    await this.conditionInput.fill(conditionId);
    await this.conditionAddButton.click();
  }

  /**
   * The created record's id, read from the post-save redirect (/scale-site-authorizations/view/{id}).
   * Waits web-first for the navigation.
   */
  async createdId(): Promise<string> {
    await expect(this.page).toHaveURL(/\/scale-site-authorizations\/view\/\d+/);
    const segs = new URL(this.page.url()).pathname.split('/').filter(Boolean);
    const id = segs[segs.length - 1];
    if (!id) throw new Error(`No scale site authorization id in view URL: ${this.page.url()}`);
    return id;
  }

  /** Happy-path create: fill basics, reveal the conditions section, optionally add a condition, then Save. */
  async createRecord(values: Partial<ScaleSiteAuthBasics>, conditionId?: string): Promise<void> {
    await this.fillBasics(values);
    await this.clickAddConditions();
    await expect(this.saveRecordButton).toBeVisible(); // conditions section revealed
    if (conditionId) {
      await this.addConditionById(conditionId);
      await expect(this.page.getByRole('cell', { name: conditionId, exact: true })).toBeVisible();
    }
    await this.clickSaveRecord();
  }
}
