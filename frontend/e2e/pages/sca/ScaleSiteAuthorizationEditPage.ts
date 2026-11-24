import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the Scale Site Authorization EDIT screen (route /scale-site-authorizations/edit/{id}).
 * The basics are always shown (no two-step reveal), plus Cancellation Date / Reason. When the record has a
 * letter (`letterExists`) every editable field except cancellation is disabled and validate() short-circuits
 * — the letter-lock branch is deferred here (no letterExists=true record obtainable; letters are env-blocked).
 * Save (shared "I click Save Record") → PUT /api/scale-site-authorizations/{id} → navigate
 * /scale-site-authorizations/view/{id}; Reset restores the loaded snapshot.
 */
export class ScaleSiteAuthorizationEditPage {
  readonly page: Page;
  readonly scaleSiteNumber: Locator;
  readonly expiryDate: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.scaleSiteNumber = page.locator('#scale-site-number');
    this.expiryDate = page.locator('#expiry-date');
    this.resetButton = page.getByRole('button', { name: 'Reset' });
  }

  /** Log in (mock IDIR) then client-side navigate to the edit route; wait for the record to have loaded. */
  async goto(scaleSiteAuthorizationId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-site-authorizations/edit/${encodeURIComponent(scaleSiteAuthorizationId)}`,
    );
    // Loaded when the scale-site-number field has been populated from the record (disabled while loading).
    await expect(this.scaleSiteNumber).not.toHaveValue('');
  }

  async setExpiryDate(value: string): Promise<void> {
    await setDateField(this.page, '#expiry-date', value);
  }

  async clearExpiryDate(): Promise<void> {
    await setDateField(this.page, '#expiry-date', '');
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  async expectExpiryValue(value: string): Promise<void> {
    await expect(this.expiryDate).toHaveValue(value);
  }
}
