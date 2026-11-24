import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the Scale Site CONTACTS tab (UC-SST-006) on the view page (/scale-sites/view/{id}).
 * The tab lists the Site Owner, a Primary Site Contact section ("Add Primary Contact", disabled once a
 * primary exists) and an Additional Site Contacts section ("Add Site Contact"). Add/Edit/View each
 * REPLACE the tab content inline (not a modal); Delete uses a confirm modal. Writes:
 *   POST   /scale-sites/{id}/contacts           (create — clientContactId set manually or via Search)
 *   PUT    /scale-sites/{id}/contacts/{cc}       (update — clientContactId read-only)
 *   DELETE /scale-sites/{id}/contacts/{cc}       (delete — confirm modal)
 * Client-side `validateContactForm` blocks create/update writes (inline errors, no request). Form field
 * ids (ScaleSiteContactForm): #contact-client-contact-id, #contact-site-info-access-ind (Y/N),
 * #contact-effective-date / #contact-expiry-date (Carbon flatpickr), #contact-role-description.
 */

export type ContactFormInput = {
  clientContactId?: string;
  siteAccess?: 'Y' | 'N';
  effectiveDate?: string;
  expiryDate?: string;
  role?: string;
};

export class ScaleSiteContactsPage {
  readonly page: Page;
  readonly contactsTab: Locator;
  readonly addSiteContactButton: Locator;
  readonly addPrimaryContactButton: Locator;
  readonly clientContactId: Locator;
  readonly siteAccess: Locator;
  readonly role: Locator;
  readonly saveRecordButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly deleteConfirmModal: Locator;
  readonly confirmDeleteButton: Locator;

  scaleSiteId = '';

  constructor(page: Page) {
    this.page = page;
    this.contactsTab = page.getByRole('tab', { name: 'Contacts' });
    this.addSiteContactButton = page.getByRole('button', { name: 'Add Site Contact' });
    this.addPrimaryContactButton = page.getByRole('button', { name: 'Add Primary Contact' });
    this.clientContactId = page.locator('#contact-client-contact-id');
    this.siteAccess = page.locator('#contact-site-info-access-ind');
    this.role = page.locator('#contact-role-description');
    this.saveRecordButton = page.getByRole('button', { name: 'Save Record' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.backButton = page.getByRole('button', { name: 'Back' });
    this.deleteConfirmModal = page.getByRole('dialog', { name: 'Are you sure you want to remove this contact?' });
    this.confirmDeleteButton = page.getByRole('button', { name: 'Confirm Delete' });
  }

  /** Log in, navigate to the site view, open the Contacts tab, and wait for the list to render. */
  async openForSite(scaleSiteIdNmbr: string): Promise<void> {
    this.scaleSiteId = scaleSiteIdNmbr;
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}`);
    await expect(this.contactsTab).toBeVisible({ timeout: 30_000 });
    await this.contactsTab.click();
    await expect(this.addSiteContactButton).toBeVisible();
  }

  async clickAddSiteContact(): Promise<void> {
    await this.addSiteContactButton.click();
    await expect(this.role).toBeVisible();
  }

  async clickAddPrimaryContact(): Promise<void> {
    await this.addPrimaryContactButton.click();
    await expect(this.role).toBeVisible();
  }

  /** Fill only the provided create/edit-form fields. */
  async fillContactForm(values: ContactFormInput): Promise<void> {
    if (values.clientContactId !== undefined) await this.clientContactId.fill(values.clientContactId);
    if (values.siteAccess !== undefined) await this.siteAccess.selectOption(values.siteAccess);
    if (values.effectiveDate !== undefined) await setDateField(this.page, '#contact-effective-date', values.effectiveDate);
    if (values.expiryDate !== undefined) await setDateField(this.page, '#contact-expiry-date', values.expiryDate);
    if (values.role !== undefined) await this.role.fill(values.role);
  }

  async clickSave(): Promise<void> {
    await this.saveRecordButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** Save the create/edit form and wait for the inline form to close (back to the contacts list). */
  async saveExpectingReturnToList(): Promise<void> {
    await this.clickSave();
    await expect(this.role).toBeHidden();
    await expect(this.addSiteContactButton).toBeVisible();
  }

  /**
   * A contacts-list data row scoped by its Contact Name cell (stable across role edits).
   *
   * `.filter({ has })`, NOT `getByRole('row', { has })` — `has` is not a getByRole option, and Playwright
   * ignores options it does not know, so that form silently returned EVERY row (header included).
   */
  contactRow(contactName: string): Locator {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByText(contactName, { exact: true }) });
  }

  async openEdit(contactName: string): Promise<void> {
    await this.contactRow(contactName).getByRole('button', { name: 'Edit' }).click();
    await expect(this.role).toBeVisible();
  }

  async openView(contactName: string): Promise<void> {
    await this.page.getByRole('button', { name: contactName, exact: true }).click();
    // exact: true — the View panel heading is exactly "Site Contact"; without it the name substring-matches
    // the Edit/Create panels' "Scale Site Contact" / "Scale Site Contact - Create" headings.
    await expect(this.page.getByRole('heading', { name: 'Site Contact', exact: true })).toBeVisible();
  }

  async deleteContact(contactName: string): Promise<void> {
    await this.contactRow(contactName).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteConfirmModal).toBeVisible();
    await this.confirmDeleteButton.click();
    await expect(this.deleteConfirmModal).toBeHidden();
  }
}
