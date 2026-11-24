import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Templates (route: /maintenance/templates) — UC-CCQ-003, Scale Authorization
 * Templates.
 *
 * Single route: a list (shared `MaintenanceListPage`) + a bespoke Carbon Modal that switches between
 * create / edit / view (`TemplatesAdminPage` + `TemplatesModal`) + the shared `ConfirmDeleteModal`.
 * The record key is a single server-generated PK (`scaleAuthTemplateId`); a template also carries a Type
 * (`scaleConditionClassCode`) that the list can be filtered by.
 *
 * Modal disambiguation: the main modal carries its own class `templates__modal`; the ConfirmDeleteModal
 * carries `scs__modal--lg` (which the main modal ALSO has), so the confirm modal is located by
 * `scs__modal--lg` filtered to the one containing the delete-confirm body text — disjoint from the main.
 *
 * List reachability: templates paginate (10/page). To reach a seeded row deterministically under
 * `fullyParallel`, `narrowToClass()` filters to one Type (client refetch to that class) AND sets the page
 * size to 50 — so a whole class fits on one page regardless of sort. Rows link by Template NAME (the list
 * renders the name as the open button), so seeded names are globally unique.
 */

/** Visible label -> create/edit form element id (TemplatesModal.tsx). */
export const TEMPLATE_FIELD_IDS: Record<string, string> = {
  'Template Name': '#tmpl-name',
  Type: '#tmpl-type',
  'Reg / Dist': '#tmpl-reg-dist',
};

export class TemplatesPage {
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

  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Maintain Templates' });
    this.addButton = page.getByRole('button', { name: 'Add Template', exact: true });
    this.filterSelect = page.locator('#filter-type');
    // Page-scoped by design: the save error is rendered as MaintenanceListPage's `bannerNotification`
    // (an InlineNotification ABOVE the panel), NOT inside the bespoke TemplatesModal — so it must not be
    // modal-scoped. `.first()` (see expectErrorBanner) tolerates the theoretical second error banner (the
    // list-load error), which only appears on a load failure — never in the save-rejection scenarios.
    this.errorBanner = page.locator('.cds--inline-notification--error');

    this.modal = page.locator('.cds--modal.templates__modal');
    // The main modal also carries scs__modal--lg, so pick the confirm modal by its unique body text.
    const deleteConfirmText = page.getByText('Are you sure you want to delete this record?');
    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal--lg').filter({ has: deleteConfirmText });

    // Save button text is "Save Record" / "Saving…" (ellipsis char) — match either.
    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit Template', exact: true });
    // Carbon renders a danger-kind button's accessible name with a "danger " prefix (documented SCS quirk).
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/templates');
    await expect(this.heading).toBeVisible();
  }

  /** Filter the list to one Type (client refetch) and enlarge the page so the whole class fits on one page. */
  async narrowToClass(classCode: string): Promise<void> {
    await this.filterSelect.selectOption(classCode);
    await this.page.getByLabel('Items per page:').selectOption('50');
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Template - Create')).toBeVisible();
  }

  /** Filter to `classCode`, enlarge the page, then click the template's NAME link to open its View modal. */
  async openViewByName(classCode: string, name: string): Promise<void> {
    await this.narrowToClass(classCode);
    const link = this.page.getByRole('button', { name, exact: true });
    await expect(link).toBeVisible({ timeout: 15_000 });
    await link.click();
    await expect(this.modal.getByText('Template Details')).toBeVisible();
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.modal.getByText('Template - Edit')).toBeVisible();
  }

  fieldId(label: string): string {
    const id = TEMPLATE_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Template field: "${label}". Add it to TEMPLATE_FIELD_IDS.`);
    return id;
  }

  /** Fill the Template Name TextInput. */
  async fillName(value: string): Promise<void> {
    await this.page.locator(this.fieldId('Template Name')).fill(value);
  }

  /** Select the Type native <Select> by class-code option value (''-clears it). Create mode only. */
  async selectType(classCode: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Type'), classCode);
  }

  /** Select the Reg / Dist native <Select> by org-unit-code option value (''-clears it). */
  async selectRegDist(orgUnitCode: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Reg / Dist'), orgUnitCode);
  }

  /**
   * Check the create-modal conditions checkbox for a given condition #. Requires a Type to be selected
   * first (the conditions table only renders once a Type is chosen and its conditions have loaded).
   */
  async bindCondition(conditionNo: number | string): Promise<void> {
    const checkbox = this.modal.getByLabel(`Select condition ${conditionNo}`, { exact: true });
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    await checkbox.check();
  }

  /** Untick an already-bound condition (edit mode seeds the table with the record's bindings checked). */
  async unbindCondition(conditionNo: number | string): Promise<void> {
    const checkbox = this.modal.getByLabel(`Select condition ${conditionNo}`, { exact: true });
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    await checkbox.uncheck();
  }

  /** Assert a condition's checkbox state — the edit form must open reflecting what is actually bound. */
  async expectConditionChecked(conditionNo: number | string, checked: boolean): Promise<void> {
    const checkbox = this.modal.getByLabel(`Select condition ${conditionNo}`, { exact: true });
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    if (checked) await expect(checkbox).toBeChecked();
    else await expect(checkbox).not.toBeChecked();
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

  /** True once the Save button is disabled (the app gates required fields by disabling Save). */
  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  async expectSaveEnabled(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
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

  /** Read the server-assigned Template # from the view (forwarded to on create success). */
  async readCreatedTemplateId(): Promise<string> {
    const field = this.page.locator('#view-template-id');
    await expect(field).not.toHaveValue('', { timeout: 10_000 });
    return (await field.inputValue()).trim();
  }

  /** Assert a read-only view field's value. */
  async expectViewValue(id: string, value: string): Promise<void> {
    await expect(this.page.locator(id)).toHaveValue(value);
  }

  async expectErrorBanner(): Promise<void> {
    await expect(this.errorBanner.first()).toBeVisible({ timeout: 10_000 });
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
