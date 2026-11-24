import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the Scaler Authorization EDIT screen (route /scaler-authorizations/edit/{id}). Unlike
 * create there is no two-step reveal — the advanced section is always shown, plus Cancellation Date /
 * Reason fields. When the record has a letter (`letterExists`) every field except Expiry Date is disabled
 * and `validate()` short-circuits to require only Expiry Date (the letter-lock branch — deferred here, no
 * letterExists=true record obtainable). Save (Save Record) → PUT /api/scaler-authorizations/{id} →
 * navigate /scaler-authorizations/view/{id}; Reset restores the loaded snapshot.
 *
 * "Save Record" is clicked via the shared common step (steps/common/formActions.steps.ts).
 */
export class ScalerAuthorizationEditPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly licence: Locator;
  readonly expiryDate: Locator;
  readonly resetButton: Locator;
  readonly scaleSitesHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Scaler Authorization - Edit' });
    this.licence = page.locator('#authorized-scaler-licence');
    this.expiryDate = page.locator('#expiry-date');
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.scaleSitesHeading = page.getByRole('heading', { name: 'Scale Sites' });
  }

  /** Log in (mock IDIR) then client-side navigate to the edit route; wait for the record to have loaded. */
  async goto(scalerAuthorizationId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scaler-authorizations/edit/${encodeURIComponent(scalerAuthorizationId)}`);
    // Loaded when the licence field has been populated from the record (fieldset is disabled while loading).
    await expect(this.licence).not.toHaveValue('');
  }

  async setExpiryDate(value: string): Promise<void> {
    await setDateField(this.page, '#expiry-date', value);
  }

  async clearExpiryDate(): Promise<void> {
    await setDateField(this.page, '#expiry-date', '');
  }

  async setDistrictWide(value: 'Y' | 'N'): Promise<void> {
    await this.page.selectOption('#district-wide', value);
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  async expectExpiryValue(value: string): Promise<void> {
    await expect(this.expiryDate).toHaveValue(value);
  }
}
