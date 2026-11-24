import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Valid Licence Attributes (route: /maintenance/valid-licence-attributes).
 *
 * Built on the generic MaintenanceListPage + MaintenanceFormModal + useMaintenanceCrud stack. The main
 * modal is `scs__modal scs__modal--no-footer` (NO `--lg`); the shared ConfirmDeleteModal has `--lg`, so
 * the main modal is the no-footer modal WITHOUT `--lg`. Record key is composite
 * (grading system code + appointment type). Delete-blocked records hide the Delete button and show a
 * "Cannot delete" warning (client-side pre-check) instead of erroring.
 */

const DELETE_BLOCKED_MESSAGE =
  'The current record has been associated to a Scaler and cannot be deleted.';

export class ValidLicenceAttributesPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly addButton: Locator;

  readonly modal: Locator;
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;

  readonly gradingSystemSelect: Locator;
  readonly appointmentTypeSelect: Locator;

  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Maintain Valid Licence Attributes' });
    this.addButton = page.getByRole('button', { name: 'Add Attribute', exact: true });
    this.errorBanner = page.locator('.cds--inline-notification--error');

    // Main modal = the no-footer modal WITHOUT --lg (the ConfirmDeleteModal carries --lg).
    this.modal = page.locator('.cds--modal.scs__modal--no-footer:not(.scs__modal--lg)');
    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving\.\.\.$/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit', exact: true });
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.gradingSystemSelect = page.locator('#vla-grading-system');
    this.appointmentTypeSelect = page.locator('#vla-appointment-type');
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/valid-licence-attributes');
    await expect(this.heading).toBeVisible();
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Maintain Valid Licence Attributes - Create')).toBeVisible();
  }

  /**
   * Open an existing record's read-only view from the list. The list link is the grading-system NAME
   * (shared across appointment types), so the unique row is located by the appointment-type CELL plus
   * the grading-system name, then its link is clicked.
   *
   * Bump the pager to 50/page first: the whole VLA list is small (the C/I × A/C/F/O combos plus NA rows),
   * so 50/page puts every row on ONE page and the target is reachable regardless of default sort — the
   * old code assumed the row sat on page 1. `setItemsPerPage` also waits for the pager to render, which
   * is the reliable "list finished loading" signal (on a cold first run the large cross-product query is
   * slow, and the previous plain 10s visibility wait could expire before the row appeared).
   */
  async openView(gradingSystemName: string, appointmentType: string): Promise<void> {
    await this.setItemsPerPage(50);
    const row = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell', { name: appointmentType, exact: true }) })
      .filter({ hasText: gradingSystemName });
    const link = row.getByRole('button', { name: gradingSystemName, exact: true });
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();
    await expect(this.modal.getByText('Maintain Valid Licence Attributes - Details')).toBeVisible();
  }

  /** Bump the list pager to `n` items/page so the whole (small) list fits on one page. WAITS for the
   *  pager first: it only renders once `TableResource` swaps its loading skeleton for real rows, so
   *  selecting before then would be a silent no-op (leaving 10/page) and could strand the target row. */
  private async setItemsPerPage(n: number): Promise<void> {
    const perPage = this.page.getByLabel('Items per page:');
    await perPage.waitFor({ state: 'visible', timeout: 20_000 });
    await perPage.selectOption(String(n));
  }

  /** Select the Grading System Code create-mode <Select> by value ('' clears it). */
  async selectGradingSystem(code: string): Promise<void> {
    await this.gradingSystemSelect.selectOption(code);
  }

  /** Select the Appointment Type create-mode <Select> by value ('' clears it). */
  async selectAppointmentType(code: string): Promise<void> {
    await this.appointmentTypeSelect.selectOption(code);
  }

  /** Set a Carbon flatpickr date field, dismissing the calendar via an outside header click. */
  async setDate(which: 'effective' | 'expiry', value: string): Promise<void> {
    const input = this.page.locator(which === 'effective' ? '#vla-effective-date' : '#vla-expiry-date');
    await input.click();
    await input.fill(value);
    await this.modal.locator('.cds--modal-header').click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  /** Click Delete in the view — triggers the dependent-records pre-check (`requestDelete`). For a
   *  dependent-having record this flips to the "Cannot delete" warning and hides the button. */
  async requestDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  async reset(): Promise<void> {
    await this.resetButton.click();
  }

  /** Assert the read-only view shows `value` for a given view field id. */
  async expectViewValue(id: string, value: string): Promise<void> {
    await expect(this.page.locator(id)).toHaveValue(value);
  }

  /** S09: the view shows the "Cannot delete" warning and the Delete button is not rendered. */
  async expectDeleteBlocked(): Promise<void> {
    await expect(this.modal.getByText(DELETE_BLOCKED_MESSAGE)).toBeVisible();
    await expect(this.deleteButton).toHaveCount(0);
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
