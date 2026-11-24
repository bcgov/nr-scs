import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser, setModalDateField } from '../../common/authNav';

/**
 * Page Object for Maintain Appointment Types (route: /maintenance/appointment-types).
 *
 * Like CCQ's Maintain Questions this is a SINGLE route: a list plus an in-page Carbon `Modal` that
 * switches between create / edit / view mode (`AppointmentTypesAdminPage` + `AppointmentTypesModal`).
 * The create/edit form ids and the read-only view ids differ (see the two maps below).
 *
 * Modal-scoping note: UNLIKE QuestionsModal, BOTH the main modal AND the delete-confirm modal carry the
 * `scs__modal scs__modal--no-footer` classes, so they can't be told apart by class. They are
 * distinguished here by the delete-confirm's unique heading text ("Delete Appointment Type"): the main
 * modal is the `.cds--modal.scs__modal` that does NOT contain it; the confirm modal is the one that does.
 */

/** Visible label -> stable element id, create/edit form (AppointmentTypesModal.tsx). */
export const APPOINTMENT_FIELD_IDS: Record<string, string> = {
  'Appointment Type': '#appointment-code',
  'Acting?': '#appointment-acting',
  'Effective Date': '#appointment-effective-date',
  'Expiry Date': '#appointment-expiry-date',
  Description: '#appointment-description',
};

/** Visible label -> read-only view-mode element id. */
export const APPOINTMENT_VIEW_IDS: Record<string, string> = {
  'Appointment Type': '#view-appointment-code',
  'Acting?': '#view-appointment-acting',
  'Effective Date': '#view-appointment-effective-date',
  'Expiry Date': '#view-appointment-expiry-date',
  Description: '#view-appointment-description',
};

export class AppointmentTypesPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly addButton: Locator;

  readonly modal: Locator; // main create/edit/view modal (excludes the delete-confirm)
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator; // Delete button on the view modal

  readonly confirmDeleteModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Appointment Types' });
    this.addButton = page.getByRole('button', { name: 'Add Appointment Type', exact: true });
    this.errorBanner = page.locator('.cds--inline-notification--error');

    // Delete now uses the SHARED ConfirmDeleteModal (aligned in nr-scs PR #235) — a headingless Carbon
    // Modal whose only body text is "Are you sure you want to delete this record?" (NOT the old bespoke
    // "Delete Appointment Type" heading). Both this and the main modal carry `scs__modal`, so split them
    // by that confirm body text so neither locator ever matches two elements (a strict-mode violation).
    const deleteConfirmText = page.getByText('Are you sure you want to delete this record?');
    this.modal = page.locator('.cds--modal.scs__modal').filter({ hasNot: deleteConfirmText });
    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal').filter({ has: deleteConfirmText });

    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving\.\.\.$/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit Appointment', exact: true });
    // Carbon renders a danger-kind button's accessible name with a "danger " prefix (documented SCS quirk).
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    // The shared ConfirmDeleteModal's confirm button reads "OK" (danger-kind → accessible name
    // "danger OK"), not "Delete".
    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Log in as mock SCS_SYS_ADMIN and client-side navigate to the Appointment Types list. */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/appointment-types');
    await expect(this.heading).toBeVisible();
  }

  /** Open the create modal via "Add Appointment Type". */
  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Maintain Appointment Types - Create')).toBeVisible();
  }

  /**
   * Click an appointment type's code link in the list to open its View modal. The list paginates
   * client-side (10/page by default) and the `Z*` E2E fixture codes sort after the real ones, so a
   * seeded code can land off page 1 — bump the pager to 50/page so more rows fit, then walk to later
   * pages until the link appears (poll absorbs each re-render).
   */
  async openView(code: string): Promise<void> {
    await this.setItemsPerPage(50);
    const link = this.page.getByRole('button', { name: code, exact: true });
    await expect
      .poll(
        async () => {
          if ((await link.count()) > 0) return true;
          const nextPage = this.page.getByRole('button', { name: 'Next page' });
          if (await nextPage.isEnabled().catch(() => false)) await nextPage.click();
          return (await link.count()) > 0;
        },
        { timeout: 20_000, message: `appointment type ${code} not found in the list (any page)` },
      )
      .toBe(true);
    await link.click();
    await expect(this.modal.getByText('Appointment Type Detail')).toBeVisible();
  }

  /** Set the list pager to `n` items/page (Carbon options are [10, 25, 50]) so the whole (small) list
   *  fits on one page and no target row is stranded on a later page. WAITS for the pager first: while the
   *  list is loading, `TableResource` renders a skeleton with no pagination bar, so a `count()`-guarded
   *  select would silently no-op on a cold first run (leaving 10/page) and strand the newest row. */
  private async setItemsPerPage(n: number): Promise<void> {
    const perPage = this.page.getByLabel('Items per page:');
    await perPage.waitFor({ state: 'visible', timeout: 20_000 });
    await perPage.selectOption(String(n));
  }

  /** From the View modal, open Edit. */
  async openEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.modal.getByText('Maintain Appointment Types - Edit')).toBeVisible();
  }

  fieldId(label: string): string {
    const id = APPOINTMENT_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Appointment Type field: "${label}". Add it to APPOINTMENT_FIELD_IDS.`);
    return id;
  }

  /** Fill a simple text field (Appointment Type, Description) by visible label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.page.locator(this.fieldId(label)).fill(value);
  }

  /** Set the Acting? native <Select> by visible option text ('Yes' | 'No' | ''). */
  async selectActing(label: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Acting?'), { label });
  }

  /**
   * Set a Carbon flatpickr date field inside the modal via the shared authNav.setModalDateField (click→fill,
   * NEVER Escape — Carbon Modal captures Escape and closes the whole modal). This field needs the `dismiss`
   * variant: an OUTSIDE click on a stable neutral field (Description) closes the flatpickr overlay that would
   * otherwise sit over the modal and intercept the next click (e.g. Save) — a plain blur would leave it open.
   * (Description, not the modal header — `this.modal` can match two `.cds--modal-header`s when the closed
   * delete-modal shell is present → strict-mode violation.)
   */
  async setDate(label: 'Effective Date' | 'Expiry Date', value: string): Promise<void> {
    await setModalDateField(
      this.page.locator(this.fieldId(label)),
      value,
      this.page.locator('#appointment-description'),
    );
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

  /** Assert the read-only view shows `value` for the field with the given visible label. */
  async expectViewValue(label: string, value: string): Promise<void> {
    const id = APPOINTMENT_VIEW_IDS[label];
    if (!id) throw new Error(`Unknown Appointment Type view field: "${label}".`);
    await expect(this.page.locator(id)).toHaveValue(value);
  }

  /** True once the main Modal has fully closed. */
  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
