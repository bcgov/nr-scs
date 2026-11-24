import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for the Work Bench (route: /workbench) — UC-SCA-009 (scaler), UC-SCA-010 (scale-site),
 * UC-SCA-011 (mark-site designation).
 *
 * One page, three sections of EXPIRING authorizations. Each section is a `<section>` with an `<h4>` title
 * and a table whose "Authorization #" cell links to the record. Each data row carries a **Remove** button
 * (fires a `window.confirm` then `POST …/workbench/remove`) and an **Add** button (fires
 * `POST …/{id}/renew`, which clones the record and navigates to the new one). An empty section renders the
 * text "Zero records found" instead of the table.
 *
 * The three workbench lists are REAL-DATA + today-relative (a record shows iff `expiry_notification_ind='N'`
 * and `expiry_date ∈ (today, today+30]`), so scenarios that need a row SEED a disposable expiring record
 * (see fixtures/admin/workbench/*), and read-only assertions reconcile the UI against the live `/workbench`
 * API rather than hard-coding counts.
 */

export type WorkbenchSection = 'scaler' | 'scaleSite' | 'markSite';

const SECTION_TITLE: Record<WorkbenchSection, string> = {
  scaler: 'Expiring Scaler Authorizations',
  scaleSite: 'Expiring Scale Site Authorizations',
  markSite: 'Expiring Mark Site Designations',
};

/** The confirm-dialog text the Remove button raises (new-app wording; legacy said "delete this record"). */
export const REMOVE_CONFIRM_TEXT = 'Are you sure you want to remove this record from the list?';

export class WorkBenchPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly banner: Locator;

  /** Message of the last window.confirm the page raised (captured for assertions). */
  lastConfirmMessage: string | null = null;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Work Bench', exact: true });
    this.banner = page.locator('.workbench-page__banner');
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/workbench');
    await expect(this.heading).toBeVisible();
  }

  /** The `<section>` wrapper for one of the three expiring-authorization lists. */
  section(which: WorkbenchSection): Locator {
    return this.page
      .locator('.workbench-page__section')
      .filter({ has: this.page.getByRole('heading', { name: SECTION_TITLE[which], exact: true }) });
  }

  /** The table row in `which` section whose Authorization # link is `id`. */
  rowByAuthId(which: WorkbenchSection, id: string | number): Locator {
    return this.section(which)
      .locator('tr')
      .filter({ has: this.page.getByRole('link', { name: String(id), exact: true }) });
  }

  async expectRowPresent(which: WorkbenchSection, id: string | number): Promise<void> {
    await expect(this.rowByAuthId(which, id)).toBeVisible({ timeout: 15_000 });
  }

  async expectRowAbsent(which: WorkbenchSection, id: string | number): Promise<void> {
    await expect(this.rowByAuthId(which, id)).toHaveCount(0, { timeout: 15_000 });
  }

  /** The row's Remove button. Carbon renders a danger-kind button's accessible name with a "danger "
   *  prefix (documented SCS quirk), so it is "danger Remove", not "Remove". */
  removeButton(which: WorkbenchSection, id: string | number): Locator {
    return this.rowByAuthId(which, id).getByRole('button', { name: 'danger Remove', exact: true });
  }

  /** The row's Add (renew) button. */
  addButton(which: WorkbenchSection, id: string | number): Locator {
    return this.rowByAuthId(which, id).getByRole('button', { name: 'Add', exact: true });
  }

  /** Assert the section shows the empty-state text (no table). */
  async expectEmpty(which: WorkbenchSection): Promise<void> {
    await expect(this.section(which).getByText('Zero records found')).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Click Remove on a row and answer the confirm dialog. `accept=true` confirms (the remove POSTs);
   * `accept=false` cancels (no POST). The dialog handler is armed BEFORE the click and records the message.
   */
  async clickRemove(which: WorkbenchSection, id: string | number, accept: boolean): Promise<void> {
    this.lastConfirmMessage = null;
    this.page.once('dialog', async (dialog) => {
      this.lastConfirmMessage = dialog.message();
      await (accept ? dialog.accept() : dialog.dismiss());
    });
    await this.removeButton(which, id).click();
  }

  /** Click Add (renew) on a row. The page renews the record and navigates to the new authorization's view. */
  async clickAdd(which: WorkbenchSection, id: string | number): Promise<void> {
    await this.addButton(which, id).click();
  }

  /**
   * Wait until the URL is the renewed record's detail view (legacy S01 forwards to `.view*Authorization`
   * with the new id). Returns the new authorization id parsed from the URL.
   */
  async expectNavigatedToRenewedRecord(which: WorkbenchSection): Promise<string> {
    const re = RENEWED_VIEW_URL[which];
    await expect(this.page).toHaveURL(re, { timeout: 15_000 });
    const m = this.page.url().match(re);
    if (!m) throw new Error(`[verify] post-renew URL did not match the ${which} view route: ${this.page.url()}`);
    return m[1];
  }
}

/** section -> the detail-view URL the renew navigates to, capturing the new authorization id. */
export const RENEWED_VIEW_URL: Record<WorkbenchSection, RegExp> = {
  scaler: /\/scaler-authorizations\/view\/(\d+)/,
  scaleSite: /\/scale-site-authorizations\/view\/(\d+)/,
  markSite: /haulingMarkAuthorizationId=(\d+)/,
};
