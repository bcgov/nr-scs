import { type Locator, type Page, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scaler Authorization Letter Options screen (UC-RPT-007). Route
 * /scaler-authorizations/{letterId}/letter (pages/Letters/ScalerAuthorizationLetter → shared
 * LetterOptionsPage/ReportPage — the same form the MSD letter uses). Reached from the view's "Create Letter".
 *
 * SCOPE: drives the CLIENT-SIDE email/preview validation that ReportPage.handleSend runs BEFORE the generate
 * request. Letter *creation* (POST /{id}/letter → Jasper) is env-blocked (same as MSD — see defects.md), so
 * no generation is asserted; opening the sample record's options + submitting an invalid form mutates
 * nothing. Controls (shared ReportOutputOptions): #email-recipient, #preview-no radio, "Send / View Report",
 * and the .report-output-email-error message slot.
 */
export class ScalerAuthorizationLetterPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly previewNoRadioLabel: Locator;
  readonly sendButton: Locator;
  readonly emailError: Locator;
  readonly signatureBlockSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Scaler Authorization Letter Options' });
    this.emailInput = page.locator('#email-recipient');
    this.previewNoRadioLabel = page.locator('label[for="preview-no"]');
    this.sendButton = page.getByRole('button', { name: 'Send / View Report' });
    // ReportPage's inline email/preview validation slot (role="alert").
    this.emailError = page.locator('.report-output-email-error');
    // The letter's signature-block picker (Carbon Select → native <select>, empty option value=''). With
    // real data the default (unfiltered) signatory search returns blocks, so this auto-selects the first;
    // clearing it to '' makes LetterOptionsPage.handleSend raise "Signature block is required." before POST.
    this.signatureBlockSelect = page.locator('#signature-blocks-select');
  }

  /** The generic submit-error notification (ReportPage `error` prop → "Unable to submit report" + subtitle). */
  formError(text: string): Locator {
    return this.page.getByText(text, { exact: false });
  }

  async clearSignatureBlock(): Promise<void> {
    await this.signatureBlockSelect.selectOption('');
  }

  async open(letterId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scaler-authorizations/${encodeURIComponent(letterId)}/letter`);
    await expect(this.heading).toBeVisible({ timeout: 30000 });
  }

  async setEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
  }

  async setPreviewNo(): Promise<void> {
    await this.previewNoRadioLabel.click();
  }

  async clickSend(): Promise<void> {
    await this.sendButton.click();
  }
}
