import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Page object for the View Scaler screen (route /scalers/view/{licenceNo}) and its "Scaler Record - Edit"
 * modal — the new app's Update Scaler surface (UC-SCL-003). There is NO separate update route: the Summary
 * tab's "Edit Record" button opens ScalerEditModal, which renders the shared ScalerForm in mode="edit"
 * (components/Form/ScalerForm) and saves with PUT /api/scalers/{licenceNo}. Appointment and Exam are
 * managed on their own tabs (sibling UCs SCL-004..009); on this edit form the Appointment/Exam sections
 * are "add new" (never prefilled).
 *
 * Edit-mode field ids (ScalerForm/index.tsx): #district (Reg/Dist), #licence-type-scaling /
 * #licence-type-waste (edit-only checkboxes), #effective-date, #expiry-date (edit-only),
 * #scaler-oath-taken; Appointment section #appointment, #province-wide, #appointment-effective-date;
 * Exam section #exam-upgrade, #completed-by. Client/Loc + Licence # are read-only display rows in edit
 * mode. All form selectors are scoped to the modal — the View page behind it and the delete-confirm modal
 * also live in the DOM.
 */
export class ScalerViewPage {
  readonly page: Page;
  readonly editRecordButton: Locator;
  readonly editModal: Locator;
  readonly saveRecordButton: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editRecordButton = page.getByRole('button', { name: 'Edit Record' });
    // The edit modal — a Carbon Modal with heading "Scaler Record - Edit". Scope every edit-form
    // interaction to it (the confirm-delete modal is a second dialog; the view tabs are behind it).
    this.editModal = page.locator('.cds--modal').filter({ hasText: 'Scaler Record - Edit' });
    this.saveRecordButton = this.editModal.getByRole('button', { name: 'Save Record' });
    this.resetButton = this.editModal.getByRole('button', { name: 'Reset' });
  }

  /** Log in (mock IDIR) then client-side navigate to the scaler view so the in-memory session survives. */
  async gotoView(licenceNo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/scalers/view/${licenceNo}`);
    // Readiness: the Summary tab's Edit Record button proves the scaler view loaded.
    await expect(this.editRecordButton).toBeVisible();
  }

  async openEditModal(): Promise<void> {
    await this.editRecordButton.click();
    // Readiness: the Reg/Dist select is unique to the loaded edit form.
    await expect(this.editModal.locator('#district')).toBeVisible();
  }

  // --- core-section setters/clearers (all modal-scoped) ---
  async setDistrict(orgUnitNo: string): Promise<void> {
    await this.editModal.locator('#district').selectOption(orgUnitNo);
  }
  async clearDistrict(): Promise<void> {
    await this.editModal.locator('#district').selectOption('');
  }
  async setOath(label: 'Yes' | 'No'): Promise<void> {
    await this.editModal.locator('#scaler-oath-taken').selectOption({ label });
  }
  async clearOath(): Promise<void> {
    await this.editModal.locator('#scaler-oath-taken').selectOption('');
  }
  /** The Oath select locator — Reset asserts (web-first) that it reverted to the persisted DB value. */
  oathSelect(): Locator {
    return this.editModal.locator('#scaler-oath-taken');
  }
  async setLicenceScaling(checked: boolean): Promise<void> {
    await this.setCheckbox('licence-type-scaling', checked);
  }
  async setLicenceWaste(checked: boolean): Promise<void> {
    await this.setCheckbox('licence-type-waste', checked);
  }
  async setEffectiveDate(value: string): Promise<void> {
    await this.setModalDate('#effective-date', value);
  }
  async clearEffectiveDate(): Promise<void> {
    await this.clearModalDate('#effective-date');
  }
  async setExpiryDate(value: string): Promise<void> {
    await this.setModalDate('#expiry-date', value);
  }
  async clearExpiryDate(): Promise<void> {
    await this.clearModalDate('#expiry-date');
  }

  // --- appointment / exam "add new" sections (used only to trip the both-sections rule) ---
  async fillAppointmentSection(appointmentLabel: string, provinceWide: 'Yes' | 'No', effectiveDate: string): Promise<void> {
    await this.editModal.locator('#appointment').selectOption({ label: appointmentLabel });
    await this.editModal.locator('#province-wide').selectOption({ label: provinceWide });
    await this.setModalDate('#appointment-effective-date', effectiveDate);
  }
  async fillExamSection(examLabel: string, completedBy: string): Promise<void> {
    await this.editModal.locator('#exam-upgrade').selectOption({ label: examLabel });
    await this.setModalDate('#completed-by', completedBy);
  }

  async clickSave(): Promise<void> {
    await this.saveRecordButton.click();
  }
  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** The edit modal closes on a successful save (ScalerEditModal.onSuccess → onClose). */
  async expectEditModalClosed(): Promise<void> {
    await expect(this.editModal).toBeHidden();
  }
  async expectEditModalOpen(): Promise<void> {
    await expect(this.editModal).toBeVisible();
  }

  // --- Address tab (read-only, S09) ---
  async openAddressTab(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Address' }).click();
  }
  /**
   * The Address tab's panel (the whole `role="tabpanel"`, identified by its "Contact Info" heading) — NOT
   * just the display table. Scoping the read-only assertion to the panel means it fails if the tab ever
   * gains an editable control, instead of tautologically passing against a table built only from text.
   */
  addressPanel(): Locator {
    return this.page.getByRole('tabpanel').filter({ hasText: 'Contact Info' });
  }

  /**
   * Set a Carbon checkbox to an explicit state. The styled `<label>` intercepts pointer events (so a
   * direct setChecked on the hidden input times out) — click the LABEL, and only when the state differs,
   * so this is idempotent (Carbon quirk; see the skill's Carbon notes).
   */
  private async setCheckbox(id: string, checked: boolean): Promise<void> {
    const input = this.editModal.locator(`#${id}`);
    if ((await input.isChecked()) !== checked) {
      await this.editModal.locator(`label[for="${id}"]`).click();
    }
  }

  /**
   * Commit a value into a modal Carbon DatePicker: click, type, blur (onBlur reads the typed value and
   * closes the flatpickr calendar). NB: NO Escape — a Carbon Modal closes on Escape, which would tear down
   * the whole edit form (the create-page helper can use Escape because it is not inside a modal).
   */
  private async setModalDate(id: string, value: string): Promise<void> {
    const input = this.editModal.locator(id);
    await input.click();
    await input.fill(value);
    await input.blur();
  }

  /** Clear a modal Carbon DatePicker — fill '' then blur so onBlur reports the empty value to the form. */
  private async clearModalDate(id: string): Promise<void> {
    const input = this.editModal.locator(id);
    await input.click();
    await input.fill('');
    await input.blur();
  }
}
