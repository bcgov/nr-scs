import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the Scaler → Appointments tab and its "Scaler Appointment - Create" modal (UC-SCL-004).
 * The Appointments tab (AppointmentsTab.tsx) lists a scaler's appointments; "Add Appointment" opens the
 * modal (ScalerAppointmentForm) which saves with POST /api/scalers/{no}/appointments. Appointment/exam are
 * NOT on the scaler edit modal — they live here (sibling UCs).
 *
 * Modal field ids (ScalerAppointmentForm): #appointment-code (type Select), #appointment-province-wide
 * (Y/N Select), #appointment-org-unit-no (Reg/Dist select — DISABLED + auto-cleared when Province Wide =
 * Yes), #appointment-issued-date (Effective), #appointment-expiry-date (Expiry). Footer: Back (closes
 * without saving), Reset, Save Record. All form selectors are modal-scoped.
 */
export class ScalerAppointmentsPage {
  readonly page: Page;
  readonly appointmentsTab: Locator;
  readonly addButton: Locator;
  readonly editButton: Locator;
  readonly rowDeleteButton: Locator;
  readonly modal: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;
  readonly deleteConfirmModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.appointmentsTab = page.getByRole('tab', { name: 'Appointments' });
    this.addButton = page.getByRole('button', { name: 'Add Appointment' });
    // The per-row action buttons; first row. Edit is a plain ghost button (accessible name "Edit", exact so
    // it won't match "Edit Record"). Delete is a Carbon danger--ghost button whose accessible name is
    // "danger Delete" (the kind injects a visually-hidden "danger" prefix), so match the "Delete" substring
    // (NON-exact) — evaluated before the confirm modal opens, so it never matches "Confirm Delete".
    this.editButton = page.getByRole('button', { name: 'Edit', exact: true }).first();
    this.rowDeleteButton = page.getByRole('button', { name: 'Delete' }).first();
    // The shared create/edit modal (ScalerAppointmentForm), heading differs by mode. Matches EITHER so the
    // field setters work in both modes; the delete-confirm modal ("Are you sure…") is excluded.
    this.modal = page.locator('.cds--modal').filter({ hasText: /Scaler Appointment - (Create|Edit)/ });
    this.saveButton = this.modal.getByRole('button', { name: 'Save Record' });
    this.backButton = this.modal.getByRole('button', { name: 'Back' });
    // The delete-confirmation modal (CNF-001) with its Confirm Delete / Cancel actions. Several tabs each
    // render an identical delete-confirm modal in the DOM (Exams/Upgrades, Appointments, Performance
    // Remarks), so filter to the VISIBLE (open) one — only the active tab's modal is shown at a time.
    this.deleteConfirmModal = page
      .locator('.cds--modal')
      .filter({ hasText: 'Are you sure you want to delete this record?' })
      .filter({ visible: true });
    this.confirmDeleteButton = this.deleteConfirmModal.getByRole('button', { name: 'Confirm Delete' });
    this.cancelDeleteButton = this.deleteConfirmModal.getByRole('button', { name: 'Cancel' });
  }

  /** Log in (mock IDIR) then client-side navigate to the scaler view and open the Appointments tab. */
  async gotoAppointments(licenceNo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scalers/view/${licenceNo}`);
    await this.appointmentsTab.click();
    // Readiness: the Add Appointment button proves the tab + its LOVs loaded (it's disabled until then).
    await expect(this.addButton).toBeEnabled();
  }

  async openAddModal(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.locator('#appointment-code')).toBeVisible();
  }

  /** Open the first appointment row's edit modal ("Scaler Appointment - Edit"). */
  async openEditModal(): Promise<void> {
    await this.editButton.click();
    // Readiness: the cancellation-date field is EDIT-mode only, so it confirms the edit modal (not create).
    await expect(this.modal.locator('#appointment-cancellation-date')).toBeVisible();
  }

  // --- modal field setters (all scoped) ---
  async setAppointmentType(label: string): Promise<void> {
    await this.modal.locator('#appointment-code').selectOption({ label });
  }
  async setProvinceWide(value: 'Y' | 'N'): Promise<void> {
    await this.modal.locator('#appointment-province-wide').selectOption(value);
  }
  async setDistrict(orgUnitNo: string): Promise<void> {
    await this.modal.locator('#appointment-org-unit-no').selectOption(orgUnitNo);
  }
  async setEffectiveDate(value: string): Promise<void> {
    await this.setModalDate('#appointment-issued-date', value);
  }
  async clearEffectiveDate(): Promise<void> {
    const input = this.modal.locator('#appointment-issued-date');
    await input.click();
    await input.fill('');
    await input.blur();
  }
  async setExpiryDate(value: string): Promise<void> {
    await this.setModalDate('#appointment-expiry-date', value);
  }

  // --- edit-only cancellation fields ---
  async setCancellationDate(value: string): Promise<void> {
    await this.setModalDate('#appointment-cancellation-date', value);
  }
  async setCancellationReason(text: string): Promise<void> {
    await this.modal.locator('#appointment-cancellation-reason').fill(text);
  }

  async clickSaveRecord(): Promise<void> {
    await this.saveButton.click();
  }
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  // --- delete (first row) ---
  /** Click the first row's Delete button, opening the confirmation modal (CNF-001). */
  async clickRowDelete(): Promise<void> {
    await this.rowDeleteButton.click();
    await expect(this.deleteConfirmModal).toBeVisible();
  }
  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
  }
  async cancelDelete(): Promise<void> {
    await this.cancelDeleteButton.click();
  }
  /** The empty-state message shown when a scaler has no appointments (legacy S03). */
  emptyMessage(): Locator {
    return this.page.getByText('No appointments found for this scaler.');
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
  async expectModalOpen(): Promise<void> {
    await expect(this.modal).toBeVisible();
  }

  /**
   * Commit a value into a modal Carbon DatePicker: click, type, blur. NO Escape — a Carbon Modal closes on
   * Escape (see ScalerViewPage), which would tear down the whole form.
   */
  private async setModalDate(id: string, value: string): Promise<void> {
    const input = this.modal.locator(id);
    await input.click();
    await input.fill(value);
    await input.blur();
  }
}
