import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the new single-page Scaler Authorization CREATE screen
 * (route /scaler-authorizations/create). All DOM selectors live here; steps call these methods.
 *
 * Two stages on one route (mirrors MSD create): the always-visible basics (Authorized Scaler Licence #,
 * Effective/Expiry dates, Reg/Dist, District Wide?), and an advanced section (Job Functions, Special Forest
 * Products, Scale Sites [only when District Wide=No], shared AuthorizationConditionsSection classCode 'SCA')
 * revealed by "Add Conditions" once the basics validate. The ONLY write (POST /api/scaler-authorizations)
 * fires from "Save Record"; "Add Conditions" runs client-side validateBasics and never POSTs.
 *
 * Field ids (index.tsx): #authorized-scaler-licence, #effective-date, #expiry-date (DateInput), #district
 * (DistrictSelect), #district-wide, #job-functions (FilterableMultiSelect), #sfp-products. Scale Sites use
 * the shared ScaleSitesSection (#scale-site-number). On success the app navigates to
 * /scaler-authorizations/view/{id}.
 */

export type ScalerAuthBasics = {
  scalerLicenceNo: string;
  effectiveDate: string;
  expiryDate: string;
  regDist: string;
  districtWide: '' | 'Y' | 'N';
};

export const BASICS_FIELD_BY_LABEL: Record<string, keyof ScalerAuthBasics> = {
  'Licence #': 'scalerLicenceNo',
  'Effective Date': 'effectiveDate',
  'Expiry Date': 'expiryDate',
  'Reg / Dist': 'regDist',
  'District Wide?': 'districtWide',
};

export class ScalerAuthorizationCreatePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly licence: Locator;
  readonly addConditionsButton: Locator;
  readonly saveRecordButton: Locator;
  readonly jobFunctions: Locator;
  readonly scaleSiteInput: Locator;
  readonly scaleSiteAddButton: Locator;
  readonly scaleSitesHeading: Locator;
  readonly formErrorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Scaler Authorization - Create' });
    this.licence = page.locator('#authorized-scaler-licence');
    this.addConditionsButton = page.getByRole('button', { name: 'Add Conditions' });
    this.saveRecordButton = page.getByRole('button', { name: 'Save Record' });
    this.jobFunctions = page.locator('#job-functions');
    this.scaleSiteInput = page.locator('#scale-site-number');
    this.scaleSiteAddButton = page
      .locator('.scale-sites-section__button-group')
      .getByRole('button', { name: 'Add', exact: true });
    this.scaleSitesHeading = page.getByRole('heading', { name: 'Scale Sites' });
    this.formErrorBanner = page.locator('.cds--inline-notification--error');
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/scaler-authorizations/create');
    await expect(this.heading).toBeVisible();
  }

  /** Apply only the provided basics (a field left '' is not filled — the "missing" case). */
  async fillBasics(values: Partial<ScalerAuthBasics>): Promise<void> {
    if (values.scalerLicenceNo !== undefined && values.scalerLicenceNo !== '') {
      await this.licence.fill(values.scalerLicenceNo);
    }
    if (values.effectiveDate) await setDateField(this.page, '#effective-date', values.effectiveDate);
    if (values.expiryDate) await setDateField(this.page, '#expiry-date', values.expiryDate);
    if (values.regDist !== undefined && values.regDist !== '') {
      await this.page.selectOption('#district', values.regDist);
    }
    if (values.districtWide !== undefined && values.districtWide !== '') {
      await this.page.selectOption('#district-wide', values.districtWide);
    }
  }

  async clickAddConditions(): Promise<void> {
    await this.addConditionsButton.click();
  }

  async clickSaveRecord(): Promise<void> {
    await this.saveRecordButton.click();
  }

  /** Select a Job Function in the Carbon FilterableMultiSelect (open → click option → close). */
  async selectJobFunction(label: string): Promise<void> {
    await this.jobFunctions.getByRole('combobox').click();
    await this.page.getByRole('option', { name: new RegExp(label) }).click();
    await this.page.keyboard.press('Escape');
  }

  /** Add a scale site by number (ScaleSitesSection; renders only when District Wide = No). */
  async addScaleSite(id: string): Promise<void> {
    await this.scaleSiteInput.fill(id);
    await this.scaleSiteAddButton.click();
  }

  /** A validation/error message rendered on the page (Carbon invalidText, or the formError banner body). */
  errorMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /**
   * The created record's id, read from the post-save redirect (/scaler-authorizations/view/{id}).
   * Waits web-first for the navigation.
   */
  async createdId(): Promise<string> {
    await expect(this.page).toHaveURL(/\/scaler-authorizations\/view\/\d+/);
    const segs = new URL(this.page.url()).pathname.split('/').filter(Boolean);
    const id = segs[segs.length - 1];
    if (!id) throw new Error(`No scaler authorization id in view URL: ${this.page.url()}`);
    return id;
  }

  /**
   * Happy-path create: fill basics, reveal the advanced section, select a job function, optionally add a
   * scale site (District Wide=No), then Save. On success the app navigates to the view route.
   */
  async createRecord(values: Partial<ScalerAuthBasics>, jobFunction: string, scaleSiteId?: string): Promise<void> {
    await this.fillBasics(values);
    await this.clickAddConditions();
    await expect(this.jobFunctions).toBeVisible(); // advanced section revealed + LOVs loaded
    await this.selectJobFunction(jobFunction);
    if (scaleSiteId) {
      await this.addScaleSite(scaleSiteId);
      await expect(this.page.getByRole('cell', { name: scaleSiteId, exact: true })).toBeVisible();
    }
    await this.clickSaveRecord();
  }
}
