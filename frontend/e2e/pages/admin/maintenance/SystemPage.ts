import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Configure System Setting (route: /maintenance/system) — UC-SYS-002.
 *
 * A single-setting form (no list / create / delete): one "Current News" textarea (#current-news) bound to
 * the `WMSG` welcome-message setting, plus Back / Reset / Save Record. Save is DISABLED until the text is
 * changed (`currentNews === initialNews`); Reset restores the loaded value client-side; Back navigates to
 * /welcome. There is no client-side required/length validation — those are enforced (as generic 500s) by
 * the DB, see defects.md.
 */
export class SystemPage {
  readonly page: Page;

  readonly newsField: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly successBanner: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newsField = page.locator('#current-news');
    this.saveButton = page.getByRole('button', { name: 'Save Record', exact: true });
    this.resetButton = page.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.successBanner = page.locator('.cds--inline-notification--success');
    this.errorBanner = page.locator('.cds--inline-notification--error');
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/system');
    await expect(this.newsField).toBeVisible();
    // Wait for the WMSG value to LOAD into the textarea before any edit. The page's effect resets both
    // currentNews and initialNews when the GET resolves, so an edit made before that lands is silently
    // overwritten (and Save stays disabled). WMSG is always non-blank (the backend now rejects blank), so
    // a non-empty value is a reliable "loaded" signal.
    await expect(this.newsField).not.toHaveValue('', { timeout: 10_000 });
  }

  /** Overwrite the Current News textarea with `value` (clears first). */
  async setNews(value: string): Promise<void> {
    await this.newsField.fill(value);
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

  async currentNews(): Promise<string> {
    return this.newsField.inputValue();
  }

  async expectNewsValue(value: string): Promise<void> {
    await expect(this.newsField).toHaveValue(value);
  }

  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  async expectSaveEnabled(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
  }

  async expectSuccessBanner(): Promise<void> {
    await expect(this.successBanner.first()).toBeVisible({ timeout: 10_000 });
  }

  /** Assert a specific, meaningful message is shown (used by the @discovered-divergence tests — the app
   *  shows a generic 500 instead, so this fails honestly). */
  async expectMessage(pattern: RegExp): Promise<void> {
    await expect(this.page.getByText(pattern).first()).toBeVisible({ timeout: 10_000 });
  }
}
