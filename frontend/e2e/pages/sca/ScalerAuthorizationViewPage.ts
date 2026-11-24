import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the read-only Scaler Authorization VIEW screen
 * (route /scaler-authorizations/view/{id}, GET /api/scaler-authorizations/{id}). Renders a read-only
 * "Authorized Scaler" tombstone + authorization fields, Job Functions / Special Forest Products / Scale
 * Sites tables (Scale Sites only when NOT district-wide), a read-only AuthorizationConditionsSection, and
 * three actions: Edit Record, Delete, and a Create Letter / View Letter toggle keyed on letterExists.
 *
 * Delete branches (handleDelete): letterExists → a blocking window.alert (cannot delete, cancel instead);
 * else window.confirm → DELETE → navigate /scalers/view/{licence}?tab=authorizations.
 * Also used by UC-SCA-004 (delete).
 */

/** The exact blocking alert shown when Delete is pressed on a letter-issued authorization (STA/ERR). */
export const DELETE_LETTER_BLOCK_ALERT =
  'The current record has a Scaler Authorization Designation Letter associated to it and cannot be deleted.\n' +
  'You can cancel this Authorization by setting a cancellation date and reason for this Scaler Authorization.';

export const VIEW_FIELD_ID = {
  authorizedScalerLicence: '#authorized-scaler-licence',
  authorizationNumber: '#authorization-number',
  effectiveDate: '#effective-date',
  expiryDate: '#expiry-date',
  regDist: '#reg-dist',
  districtWide: '#district-wide',
  status: '#status',
} as const;

export class ScalerAuthorizationViewPage {
  readonly page: Page;
  readonly licenceField: Locator;
  readonly editRecordButton: Locator;
  readonly deleteButton: Locator;
  readonly createLetterButton: Locator;
  readonly viewLetterButton: Locator;
  readonly jobFunctionsTable: Locator;
  readonly scaleSitesTable: Locator;
  readonly scaleSitesHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.licenceField = page.locator('#authorized-scaler-licence');
    this.editRecordButton = page.getByRole('button', { name: 'Edit Record' });
    // Carbon `danger` button exposes a "danger "-prefixed accessible name — substring match is unambiguous.
    this.deleteButton = page.getByRole('button', { name: 'Delete' });
    this.createLetterButton = page.getByRole('button', { name: 'Create Letter' });
    this.viewLetterButton = page.getByRole('button', { name: 'View Letter' });
    this.jobFunctionsTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Job Function', exact: true }) });
    this.scaleSitesTable = page
      .getByRole('table')
      .filter({ has: page.getByRole('columnheader', { name: 'Site #', exact: true }) });
    this.scaleSitesHeading = page.getByRole('heading', { name: 'Scale Sites' });
  }

  /** Log in (mock IDIR) then client-side navigate to the view route so the in-memory session survives. */
  async goto(scalerAuthorizationId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scaler-authorizations/view/${encodeURIComponent(scalerAuthorizationId)}`);
  }

  /** Wait web-first for the read-only record to have loaded (the licence field is present). */
  async waitReady(): Promise<void> {
    await expect(this.licenceField).toBeVisible();
  }

  async expectFieldValue(field: keyof typeof VIEW_FIELD_ID, value: string): Promise<void> {
    await expect(this.page.locator(VIEW_FIELD_ID[field])).toHaveValue(value);
  }

  /** A Job Functions table cell (e.g. the LOV label "Piece Scale"). */
  jobFunctionCell(text: string): Locator {
    return this.jobFunctionsTable.getByRole('cell', { name: text, exact: true });
  }

  /** A Scale Sites table cell (e.g. the site id). */
  scaleSiteCell(text: string): Locator {
    return this.scaleSitesTable.getByRole('cell', { name: text, exact: true });
  }

  async clickEditRecord(): Promise<void> {
    await this.editRecordButton.click();
  }

  async clickCreateLetter(): Promise<void> {
    await this.createLetterButton.click();
  }

  /** Click Delete and ACCEPT the confirm; returns the confirm message. (Letterless record → DELETE + nav.) */
  async confirmDelete(): Promise<string | undefined> {
    let message: string | undefined;
    this.page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.accept();
    });
    await this.deleteButton.click();
    return message;
  }

  /** Click Delete and DISMISS the confirm; returns the confirm message. (No DELETE, stay on view.) */
  async cancelDelete(): Promise<string | undefined> {
    let message: string | undefined;
    this.page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.dismiss();
    });
    await this.deleteButton.click();
    return message;
  }

  /** Click Delete on a letter-issued record → a blocking window.alert; returns its message. */
  async deleteExpectingLetterAlert(): Promise<string | undefined> {
    let message: string | undefined;
    this.page.once('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.accept();
    });
    await this.deleteButton.click();
    return message;
  }
}
