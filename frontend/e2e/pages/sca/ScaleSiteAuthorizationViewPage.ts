import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the read-only Scale Site Authorization VIEW screen
 * (route /scale-site-authorizations/view/{id}, GET /api/scale-site-authorizations/{id}). Renders a
 * read-only Scale Site section (resolved via searchScaleSites) + Authorization fields + read-only
 * Conditions, and three actions: Edit Record, Delete, and a Create Letter / View Letter toggle.
 *
 * Delete branches (handleDelete): letterExists → a blocking window.alert (cannot delete, cancel instead);
 * else window.confirm "Are you sure you want to delete this record?" → DELETE → navigate
 * /scale-sites/view/{scaleSiteIdNmbr}?tab=authorizations. Also used by UC-SCA-008 (delete).
 */

export const VIEW_FIELD_ID = {
  scaleSiteNumber: '#scale-site-number',
  scaleSiteName: '#scale-site-name',
  authorizationNumber: '#authorization-number',
  status: '#status',
  effectiveDate: '#effective-date',
  expiryDate: '#expiry-date',
  expectedVolume: '#expected-volume',
  cancellationDate: '#cancellation-date',
  cancellationReason: '#cancellation-reason',
} as const;

export class ScaleSiteAuthorizationViewPage {
  readonly page: Page;
  readonly statusField: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // #status is on the authorization record itself (not the async-loaded Scale Site block), so it is the
    // reliable readiness gate for the loaded record.
    this.statusField = page.locator('#status');
    this.deleteButton = page.getByRole('button', { name: 'Delete' });
  }

  /** Log in (mock IDIR) then client-side navigate to the view route so the in-memory session survives. */
  async goto(scaleSiteAuthorizationId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-site-authorizations/view/${encodeURIComponent(scaleSiteAuthorizationId)}`,
    );
  }

  /** Wait web-first for the read-only record to have loaded (the status field is present). */
  async waitReady(): Promise<void> {
    await expect(this.statusField).toBeVisible({ timeout: 30000 });
  }

  async expectFieldValue(field: keyof typeof VIEW_FIELD_ID, value: string): Promise<void> {
    await expect(this.page.locator(VIEW_FIELD_ID[field])).toHaveValue(value);
  }

  /** Click Delete and ACCEPT the confirm; resolves the confirm message. (Letterless record → DELETE + nav.) */
  async confirmDelete(): Promise<string> {
    // Arm the dialog wait BEFORE the click so capturing the message never depends on the handler having run
    // by the time we read it (the confirm blocks the page, but the promise makes the ordering explicit).
    const message = this.page.waitForEvent('dialog').then(async (dialog) => {
      const msg = dialog.message();
      await dialog.accept();
      return msg;
    });
    await this.deleteButton.click();
    return message;
  }

  /** Click Delete and DISMISS the confirm; resolves the confirm message. (No DELETE, stay on view.) */
  async cancelDelete(): Promise<string> {
    const message = this.page.waitForEvent('dialog').then(async (dialog) => {
      const msg = dialog.message();
      await dialog.dismiss();
      return msg;
    });
    await this.deleteButton.click();
    return message;
  }
}
