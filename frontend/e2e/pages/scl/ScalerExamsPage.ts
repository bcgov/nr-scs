import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setModalDateField } from '../common/authNav';

/**
 * Page object for the Scaler → Exams / Upgrades tab and its create/edit modal (UC-SCL-007 / UC-SCL-008).
 * The tab (ExamUpgradesTab.tsx) lists a scaler's training rows; "Add Exam / Upgrade" opens the create modal
 * (POST /api/scalers/{no}/exams), and a row's "Edit" reopens the SAME modal with heading "…- Edit" (type
 * Select disabled, only the completion date editable → PUT .../exams/{typeId}).
 *
 * Create- and edit-mode selectors scope to their respective modal heading so they never cross; the list
 * table is scoped to THIS tab's panel so a sibling tab's table can't be mistaken for it.
 */
export class ScalerExamsPage {
  readonly page: Page;
  readonly examsTab: Locator;
  readonly addButton: Locator;
  readonly panel: Locator;
  readonly filter: Locator;
  readonly table: Locator;
  readonly modal: Locator;
  readonly typeSelect: Locator;
  readonly completionDateInput: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;
  // Delete-confirm modal (UC-SCL-009) + its actions.
  readonly deleteConfirmModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;
  // Edit-mode (UC-SCL-008): the SAME modal switches its heading to "…- Edit", so these scope to that heading
  // — never "- Create" (substring filters don't cross). The type Select is disabled; only the date is editable.
  readonly editModal: Locator;
  readonly editCompletionDateInput: Locator;
  readonly editSaveButton: Locator;
  readonly editBackButton: Locator;
  readonly editResetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.examsTab = page.getByRole('tab', { name: 'Exams / Upgrades' });
    this.addButton = page.getByRole('button', { name: 'Add Exam / Upgrade' });
    // The Exams/Upgrades tab panel. All scaler tabs share `.scs__tab-view__panel` and render at once, so
    // disambiguate by the exam-only Filter Select id — the table + rows then resolve to THIS tab.
    this.panel = page
      .locator('.scs__tab-view__panel')
      .filter({ has: page.locator('#exam-class-code-filter') });
    this.filter = page.locator('#exam-class-code-filter');
    this.table = this.panel.getByRole('table');
    // The create modal, scoped by its heading. Closed Carbon modals stay in the DOM (hidden), so
    // expectModalClosed asserts toBeHidden.
    this.modal = page.locator('.cds--modal').filter({ hasText: 'Exams / Upgrades - Create' });
    this.typeSelect = this.modal.locator('#exam-training-type');
    this.completionDateInput = this.modal.locator('#exam-completion-date');
    this.saveButton = this.modal.getByRole('button', { name: 'Save Record' });
    this.backButton = this.modal.getByRole('button', { name: 'Back' });
    // Per-row Edit/Delete are built row-scoped in openEditForRow/deleteRow (via rowByText), so no page-level
    // .first() locators are kept here — a bare .first() would silently target the wrong row.
    // Delete-confirm modal (CNF-001). Exams/Upgrades, Appointments and Performance Remarks each render an
    // identical one in the DOM, so filter to the VISIBLE (open) one — only the active tab's modal shows.
    this.deleteConfirmModal = page
      .locator('.cds--modal')
      .filter({ hasText: 'Are you sure you want to delete this record?' })
      .filter({ visible: true });
    this.confirmDeleteButton = this.deleteConfirmModal.getByRole('button', { name: 'Confirm Delete' });
    this.cancelDeleteButton = this.deleteConfirmModal.getByRole('button', { name: 'Cancel' });
    // Edit modal (UC-SCL-008) — distinct from this.modal by heading; footer + date input scoped to it.
    this.editModal = page.locator('.cds--modal').filter({ hasText: 'Exams / Upgrades - Edit' });
    this.editCompletionDateInput = this.editModal.locator('#exam-completion-date');
    this.editSaveButton = this.editModal.getByRole('button', { name: 'Save Record' });
    this.editBackButton = this.editModal.getByRole('button', { name: 'Back' });
    this.editResetButton = this.editModal.getByRole('button', { name: 'Reset' });
  }

  /** Log in (mock IDIR) then client-side navigate to the scaler view and open the Exams / Upgrades tab. */
  async gotoExams(licenceNo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scalers/view/${licenceNo}`);
    await this.examsTab.click();
    // Readiness: Add Exam / Upgrade proves the tab + its LOVs loaded (it's disabled until then).
    await expect(this.addButton).toBeEnabled();
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.typeSelect).toBeVisible();
  }

  async selectType(label: string): Promise<void> {
    await this.typeSelect.selectOption({ label });
  }

  /** Commit a value into the CREATE modal's "Completed By" DatePicker (modal-safe: blur-commit, no Escape). */
  async setCompletionDate(value: string): Promise<void> {
    await setModalDateField(this.completionDateInput, value);
  }

  async saveRecord(): Promise<void> {
    await this.saveButton.click();
  }

  async back(): Promise<void> {
    await this.backButton.click();
  }

  // --- edit mode (UC-SCL-008) -----------------------------------------------------------------------
  /** Open the edit modal for the row matching a cell text: click its ghost "Edit" (exact), await "…- Edit". */
  async openEditForRow(rowText: string): Promise<void> {
    await this.rowByText(rowText).getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(this.editModal).toBeVisible();
  }

  /** Change the edit modal's completion date (same modal-safe recipe as create). */
  async setEditCompletionDate(value: string): Promise<void> {
    await setModalDateField(this.editCompletionDateInput, value);
  }

  /** Clear the edit modal's completion date (focus → clear → blur), so a save persists null. */
  async clearCompletionDate(): Promise<void> {
    await setModalDateField(this.editCompletionDateInput, '');
  }

  /** The current value of the edit modal's completion-date input (Y-m-d, or '' when cleared). */
  async editCompletionDateValue(): Promise<string> {
    return this.editCompletionDateInput.inputValue();
  }

  async saveEdit(): Promise<void> {
    await this.editSaveButton.click();
  }

  async backEdit(): Promise<void> {
    await this.editBackButton.click();
  }

  /** Revert the edit form to the originally-loaded record (resetEditorForm — no request). */
  async resetEdit(): Promise<void> {
    await this.editResetButton.click();
  }

  async expectEditModalOpen(): Promise<void> {
    await expect(this.editModal).toBeVisible();
  }
  async expectEditModalClosed(): Promise<void> {
    await expect(this.editModal).toBeHidden();
  }

  // --- delete (UC-SCL-009) --------------------------------------------------------------------------
  /** Click a row's Delete (danger--ghost "danger Delete", matched non-exact), opening the confirm modal. */
  async deleteRow(rowText: string): Promise<void> {
    await this.rowByText(rowText).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteConfirmModal).toBeVisible();
  }
  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
  }
  async cancelDelete(): Promise<void> {
    await this.cancelDeleteButton.click();
  }
  async expectDeleteConfirmOpen(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
  }
  async expectDeleteConfirmClosed(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeHidden();
  }

  /** Select a class filter by its option label ("All" / "Exam" / "Upgrade"). Filters the list client-side. */
  async selectFilter(label: string): Promise<void> {
    await this.filter.selectOption({ label });
  }

  // --- list helpers ---------------------------------------------------------------------------------
  /** All data rows currently rendered in the list (0 when the empty-state is shown instead of the table). */
  dataRows(): Locator {
    return this.table.locator('tbody tr');
  }

  /** A list row identified by any cell text — e.g. its Type-column training-type description. */
  rowByText(text: string): Locator {
    return this.table.locator('tbody tr').filter({ hasText: text });
  }

  /** The Completion Date cell (3rd column: Type / Description / Completion Date / Actions) of a named row. */
  completionDateCell(text: string): Locator {
    return this.rowByText(text).locator('td').nth(2);
  }

  /** The empty-state message shown when a scaler has no training rows. */
  emptyMessage(): Locator {
    return this.page.getByText('No exams / upgrades found for this scaler.');
  }

  /** The create-modal error text (exact) — used for both the client required error and a surfaced server error. */
  errorText(message: string): Locator {
    return this.modal.getByText(message, { exact: true }).first();
  }

  async expectModalOpen(): Promise<void> {
    await expect(this.modal).toBeVisible();
  }
  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
