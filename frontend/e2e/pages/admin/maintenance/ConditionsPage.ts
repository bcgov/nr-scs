import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Conditions (route: /maintenance/conditions).
 *
 * Single route: list + Carbon Modal (create/edit/view; `ConditionsAdminPage` + `ConditionsModal`) + the
 * shared ConfirmDeleteModal. Record key is COMPOSITE (scaleConditionClassCode + server-generated
 * scaleAuthConditionId). The main modal carries its entity class `conditions__modal`; the ConfirmDeleteModal
 * carries `scs__modal--lg` — disjoint classes, so each locator matches exactly one modal.
 *
 * The Conditions list is large (~159 rows). To reach a specific row deterministically under
 * `fullyParallel`, `narrowToClass()` applies the class filter (server-side reload to that class only) AND
 * sets the page size to 50 — so a whole class (MSD ≈ 16 real + seeds) fits on one page regardless of sort.
 */

/** Visible label -> create/edit form element id (ConditionsModal.tsx). */
export const CONDITION_FIELD_IDS: Record<string, string> = {
  Type: '#condition-type',
  Title: '#condition-title',
  'Mandatory?': '#condition-mandatory',
  'Sort Order': '#condition-sort-order',
  'Effective Date': '#condition-effective-date',
  'Expiry Date': '#condition-expiry-date',
  'Condition Text': '#condition-text',
  'Site Type': '#condition-site-types',
};

export class ConditionsPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly addButton: Locator;
  readonly filterSelect: Locator;

  readonly modal: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  readonly confirmDeleteModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Maintain Conditions' });
    this.addButton = page.getByRole('button', { name: 'Add Condition', exact: true });
    this.filterSelect = page.locator('#condition-filter');

    this.modal = page.locator('.cds--modal.conditions__modal');
    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal--lg');

    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving\.\.\.$/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit Condition', exact: true });
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/conditions');
    await expect(this.heading).toBeVisible();
  }

  /** Filter the list to one class (server-side reload) and enlarge the page to fit the whole class. */
  async narrowToClass(classCode: string): Promise<void> {
    await this.filterSelect.selectOption(classCode);
    await this.page.getByLabel('Items per page:').selectOption('50');
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Maintain Conditions - Create')).toBeVisible();
  }

  /** Filter to `classCode`, enlarge the page, then click the condition's # link to open its View modal. */
  async openViewInClass(classCode: string, id: string): Promise<void> {
    await this.narrowToClass(classCode);
    await this.page.getByRole('button', { name: id, exact: true }).click();
    await expect(this.modal.getByText('Maintain Conditions - Details')).toBeVisible();
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.modal.getByText('Maintain Conditions - Edit')).toBeVisible();
  }

  fieldId(label: string): string {
    const id = CONDITION_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Condition field: "${label}". Add it to CONDITION_FIELD_IDS.`);
    return id;
  }

  /** Fill a TextInput/TextArea field (Title, Sort Order, Condition Text) by visible label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.page.locator(this.fieldId(label)).fill(value);
  }

  /** Select the Type native <Select> by class-code option value (''-clears it). */
  async selectType(classCode: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Type'), classCode);
  }

  /** Select the Mandatory? native <Select> by option value ('Y' | 'N' | ''). */
  async selectMandatory(value: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Mandatory?'), value);
  }

  /**
   * Add one Site Type to the Carbon FilterableMultiSelect by its LOV description (e.g. "Piece Scale").
   * Closes the dropdown via an outside click on the always-present Sort Order field — NOT Escape, which
   * Carbon's Modal captures globally to close the whole modal.
   */
  async addSiteType(optionText: string): Promise<void> {
    const container = this.page.locator(this.fieldId('Site Type'));
    await container.getByTitle('Open').click();
    await container.getByRole('option', { name: optionText, exact: true }).click();
    await this.page.locator(this.fieldId('Sort Order')).click();
    // Fail LOUD (and auto-wait) if the selection did not register: the "Clear all selected items" control
    // only appears once ≥1 item is selected. A silent miss here would otherwise surface later as a
    // confusing "Site Type is required." on save.
    await expect(container.getByTitle('Clear all selected items')).toBeVisible();
  }

  /** Deselect every Site Type currently selected (drives the "Site Type required" rule). */
  async clearSiteTypes(): Promise<void> {
    const container = this.page.locator(this.fieldId('Site Type'));
    const clearAll = container.getByTitle('Clear all selected items');
    await expect(clearAll).toBeVisible();
    await clearAll.click();
  }

  /**
   * Set a Carbon date-picker field, then dismiss the calendar via an outside click on the modal header.
   * NOT Escape — Carbon Modal captures Escape globally and would close the whole modal.
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

  /** Delete happy path: open the ConfirmDeleteModal, then confirm. */
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

  /**
   * Click Delete on a record WITH dependents: `requestDelete` runs `checkDependents`, sets `deleteBlocked`,
   * and the view swaps the Delete button for a "Cannot delete" warning — no confirm dialog appears.
   */
  async clickDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  /** Read the server-assigned Condition # from the view (forwarded to on create success). */
  async readCreatedConditionId(): Promise<string> {
    const field = this.page.locator('#view-condition-id');
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
