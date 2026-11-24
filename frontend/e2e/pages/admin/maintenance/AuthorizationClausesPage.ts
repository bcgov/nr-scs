import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Authorization Clauses (route: /maintenance/authorization-clauses).
 *
 * Single route: list + Carbon Modal (create/edit/view; `AuthorizationClausesAdminPage` +
 * `AuthorizationClausesModal`) + the shared ConfirmDeleteModal. Record key is COMPOSITE
 * (scaleMethodTypeCode + server-generated scaleMethodAuthClauseId). The main modal and the
 * ConfirmDeleteModal carry identical classes, so they are told apart by the confirm modal's unique body
 * text (as on the Exam/Upgrades screen).
 */

/** Visible label -> create/edit form element id (AuthorizationClausesModal.tsx). */
export const AUTH_CLAUSE_FIELD_IDS: Record<string, string> = {
  'Scale Method': '#clause-type',
  'Effective Date': '#clause-effective-date',
  'Expiry Date': '#clause-expiry-date',
  Clause: '#clause-text',
};

export class AuthorizationClausesPage {
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
    this.heading = page.getByRole('heading', { name: 'Maintain Authorization Clauses' });
    this.addButton = page.getByRole('button', { name: 'Add Authorization Clause', exact: true });
    this.errorBanner = page.locator('.cds--inline-notification--error');

    // The page's main modal carries its entity class (`authz-clauses__modal`) while the shared
    // ConfirmDeleteModal carries `scs__modal--lg` — disjoint classes, so each locator matches exactly one
    // modal even when both are open at once (view + delete-confirm).
    this.modal = page.locator('.cds--modal.authz-clauses__modal');
    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal--lg');

    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving\.\.\.$/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit Clause', exact: true });
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/authorization-clauses');
    await expect(this.heading).toBeVisible();
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Maintain Authorization Clauses - Create')).toBeVisible();
  }

  /** Click a clause's # link in the list to open its View modal (by server-assigned clause id). */
  async openView(clauseId: string): Promise<void> {
    await this.page.getByRole('button', { name: clauseId, exact: true }).click();
    await expect(this.modal.getByText('Authorization Clause Detail')).toBeVisible();
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.modal.getByText('Maintain Authorization Clauses - Edit')).toBeVisible();
  }

  fieldId(label: string): string {
    const id = AUTH_CLAUSE_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Authorization Clause field: "${label}". Add it to AUTH_CLAUSE_FIELD_IDS.`);
    return id;
  }

  /** Fill the Clause textarea by visible label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.page.locator(this.fieldId(label)).fill(value);
  }

  /** Select the Scale Method native <Select> by its method-code option value (''-clears it). */
  async selectScaleMethod(code: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Scale Method'), code);
  }

  /**
   * Set a Carbon date-picker field, then dismiss the calendar via an outside click on the modal header
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

  /** Read the server-assigned Clause # from the view (forwarded to on create success). */
  async readCreatedClauseId(): Promise<string> {
    const field = this.page.locator('#view-clause-id');
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
