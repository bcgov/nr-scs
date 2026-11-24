import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Exams / Upgrades (route: /maintenance/exam-upgrades).
 *
 * Single route: list + Carbon Modal (create/edit/view; `ExamUpgradesAdminPage` + `ExamUpgradesModal`) +
 * the shared ConfirmDeleteModal. Record key is COMPOSITE (Type class code + server-generated typeId).
 * The main modal and the ConfirmDeleteModal carry identical classes, so they are told apart by the
 * confirm modal's unique body text (as on the Signatories screen).
 */

/** Visible label -> create/edit form element id (ExamUpgradesModal.tsx). */
export const EXAM_UPGRADE_FIELD_IDS: Record<string, string> = {
  Type: '#exam-upgrade-type',
  'Licence Accredit?': '#exam-upgrade-licence-accredit',
  'Effective Date': '#exam-upgrade-effective-date',
  'Expiry Date': '#exam-upgrade-expiry-date',
  Description: '#exam-upgrade-description',
};

export class ExamUpgradesPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly addButton: Locator;

  readonly modal: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  readonly confirmDeleteModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Maintain Exams / Upgrades' });
    this.addButton = page.getByRole('button', { name: 'Add Exam / Upgrade', exact: true });
    this.errorBanner = page.locator('.cds--inline-notification--error');

    // The main modal and the shared ConfirmDeleteModal share identical classes; split them by the confirm
    // modal's unique body text so neither locator matches two modals at once.
    const deleteConfirmText = page.getByText('Are you sure you want to delete this record?');
    this.modal = page.locator('.cds--modal.scs__modal--lg').filter({ hasNot: deleteConfirmText });
    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal--lg').filter({ has: deleteConfirmText });

    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving\.\.\.$/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit Record', exact: true });
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/exam-upgrades');
    await expect(this.heading).toBeVisible();
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Maintain Exams / Upgrades - Create')).toBeVisible();
  }

  /** Click an exam/upgrade's # link in the list to open its View modal (by server-assigned typeId).
   *  Bumps the pager to 50/page first so the whole (small) list fits on one page and the seeded row —
   *  whose server-generated typeId sorts last — is reachable regardless of default paging. The pager wait
   *  doubles as a "list finished loading" signal, so a cold first run doesn't race the click. */
  async openView(typeId: string): Promise<void> {
    await this.setItemsPerPage(50);
    const link = this.page.getByRole('button', { name: typeId, exact: true });
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();
    await expect(this.modal.getByText('Exam / Upgrade Detail')).toBeVisible();
  }

  /** Bump the list pager to `n` items/page. WAITS for the pager first: it only renders once
   *  `TableResource` swaps its loading skeleton for real rows, so selecting before then would silently
   *  no-op (leaving 10/page) and could strand the newest row on a later page. */
  private async setItemsPerPage(n: number): Promise<void> {
    const perPage = this.page.getByLabel('Items per page:');
    await perPage.waitFor({ state: 'visible', timeout: 20_000 });
    await perPage.selectOption(String(n));
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.modal.getByText('Maintain Exams / Upgrades - Edit')).toBeVisible();
  }

  fieldId(label: string): string {
    const id = EXAM_UPGRADE_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Exam/Upgrade field: "${label}". Add it to EXAM_UPGRADE_FIELD_IDS.`);
    return id;
  }

  /** Fill the Description textarea by visible label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.page.locator(this.fieldId(label)).fill(value);
  }

  /** Select the Type native <Select> by its class-code option value (''-clears it). */
  async selectType(classCode: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Type'), classCode);
  }

  /** Select the Licence Accredit? native <Select> by option value ('Y' | 'N' | ''). */
  async selectLicenceAccredit(value: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Licence Accredit?'), value);
  }

  /**
   * Set a Carbon flatpickr date field, then dismiss the calendar via an outside click on the modal header
   * (the open calendar otherwise overlays and intercepts the Save click). NOT Escape — Carbon Modal
   * captures Escape globally and would close the whole modal.
   */
  async setDate(label: 'Effective Date' | 'Expiry Date', value: string): Promise<void> {
    const input = this.page.locator(this.fieldId(label));
    await input.click();
    await input.fill(value);
    await this.modal.locator('.cds--modal-header').click();
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

  async openDeleteConfirm(): Promise<void> {
    await this.deleteButton.click();
    await expect(this.confirmDeleteModal.getByText('Are you sure you want to delete this record?')).toBeVisible();
  }

  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
  }

  async cancelDelete(): Promise<void> {
    await this.cancelDeleteButton.click();
  }

  /** Read the server-assigned Exam / Upgrade # from the view after a create (forwarded to on success). */
  async readCreatedTypeId(): Promise<string> {
    const field = this.page.locator('#view-exam-upgrade-id');
    await expect(field).not.toHaveValue('', { timeout: 10_000 });
    return (await field.inputValue()).trim();
  }

  /** Assert a read-only view field's value. */
  async expectViewValue(id: string, value: string): Promise<void> {
    await expect(this.page.locator(id)).toHaveValue(value);
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
