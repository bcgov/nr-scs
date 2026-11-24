import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';
import { fillScaleSiteFields, type ScaleSiteFormInput } from './scaleSiteFormFields';

/**
 * Page object for the Scale Site UPDATE flow — the `ScaleSiteEditModal` opened from the Summary tab's
 * "Edit Record" button on the view page (route /scale-sites/view/{id}). The modal renders the SAME
 * `ScaleSiteForm` as create (same field ids), so EVERY locator here is scoped to the modal dialog: the
 * summary tab behind it also has a read-only `#site-location-description`, so an unscoped id would be
 * ambiguous. Save → PUT /api/scale-sites/{id}; on success the modal closes and the summary query is
 * invalidated. Client-side validation blocks the PUT (inline errors, modal stays open); a server reject
 * shows a "Save failed." banner inside the modal.
 */
export class ScaleSiteEditPage {
  readonly page: Page;
  readonly editRecordButton: Locator;
  readonly modal: Locator;
  readonly siteName: Locator;
  readonly ownerClient: Locator;
  readonly ownerLoc: Locator;
  readonly timberBrand: Locator;
  readonly siteLocation: Locator;
  readonly saveRecordButton: Locator;
  readonly resetButton: Locator;
  readonly closeButton: Locator;

  /** The id of the site currently open in the modal (set by openForSite). */
  scaleSiteId = '';
  /** The site name the modal was pre-filled with — the comparand for reset / close-without-save. */
  originalSiteName = '';

  constructor(page: Page) {
    this.page = page;
    this.editRecordButton = page.getByRole('button', { name: 'Edit Record' });
    this.modal = page.getByRole('dialog', { name: 'Scale Site - Edit' });
    this.siteName = this.modal.locator('#scale-site-name');
    this.ownerClient = this.modal.locator('#client');
    this.ownerLoc = this.modal.locator('#loc');
    this.timberBrand = this.modal.locator('#timber-brand');
    this.siteLocation = this.modal.locator('#site-location-description');
    this.saveRecordButton = this.modal.getByRole('button', { name: 'Save Record' });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset' });
    this.closeButton = this.modal.getByRole('button', { name: 'Close' });
  }

  /** Log in, client-side navigate to the site view, and open the edit modal from the Summary tab. */
  async openForSite(scaleSiteIdNmbr: string): Promise<void> {
    this.scaleSiteId = scaleSiteIdNmbr;
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}`);
    await expect(this.editRecordButton).toBeVisible({ timeout: 30_000 });
    await this.editRecordButton.click();
    await expect(this.modal).toBeVisible();
    await expect(this.siteName).toBeVisible();
    this.originalSiteName = (await this.siteName.inputValue()) ?? '';
  }

  /** Apply only the provided fields (shared fill helper, scoped to the modal); omitted fields keep values. */
  async fill(values: ScaleSiteFormInput): Promise<void> {
    await fillScaleSiteFields(this.modal, values);
  }

  async clickSave(): Promise<void> {
    await this.saveRecordButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  async clickClose(): Promise<void> {
    await this.closeButton.click();
  }

  /** Save and wait for the successful-update signal: the modal closes (onSuccess → onClose). */
  async saveExpectingSuccess(): Promise<void> {
    await this.clickSave();
    await expect(this.modal).toBeHidden();
  }
}
