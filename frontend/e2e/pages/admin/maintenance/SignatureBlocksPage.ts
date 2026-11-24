import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Signatories / Signature Blocks (route: /maintenance/signatories).
 *
 * Single route: a list plus an in-page Carbon `Modal` (create/edit/view; `SignatureBlocksAdminPage` +
 * `SignatureBlocksModal`). Delete uses the SHARED `ConfirmDeleteModal` component. The main modal carries
 * `scs__modal--lg`; the confirm modal is `scs__modal--no-footer` WITHOUT `--lg`, so the two are told
 * apart by that class rather than by heading text.
 */

/** Visible label -> create/edit form element id (SignatureBlocksModal.tsx). */
export const SIGNATORY_FIELD_IDS: Record<string, string> = {
  'First Name': '#block-first-name',
  'Middle Name': '#block-middle-name',
  'Last Name': '#block-last-name',
  Position: '#block-position',
  'Reg / Dist': '#block-regdist',
};

export class SignatureBlocksPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly addButton: Locator;

  readonly modal: Locator; // main create/edit/view modal
  readonly saveButton: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator; // Delete on the view modal

  readonly confirmDeleteModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Maintain Signatories' });
    this.addButton = page.getByRole('button', { name: 'Add Signatory', exact: true });
    this.errorBanner = page.locator('.cds--inline-notification--error');

    // The main modal AND the shared ConfirmDeleteModal carry IDENTICAL classes
    // (scs__modal--lg scs__modal--no-footer), so they can't be told apart by class. Distinguish by the
    // confirm modal's unique body text so neither locator matches two modals at once.
    const deleteConfirmText = page.getByText('Are you sure you want to delete this record?');
    this.modal = page.locator('.cds--modal.scs__modal--lg').filter({ hasNot: deleteConfirmText });
    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal--lg').filter({ has: deleteConfirmText });

    this.saveButton = this.modal.getByRole('button', { name: /^Save Record$|^Saving\.\.\.$/ });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.editButton = this.modal.getByRole('button', { name: 'Edit Signatory', exact: true });
    // danger-kind button accessible name carries a "danger " prefix (documented Carbon/SCS quirk).
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/signature-blocks');
    await expect(this.heading).toBeVisible();
  }

  async openCreate(): Promise<void> {
    await this.addButton.click();
    await expect(this.modal.getByText('Signature Block - Create')).toBeVisible();
  }

  /**
   * Click a signatory's Block # link in the list to open its View modal. The whole signatory list is
   * small (≤ a dozen real rows plus at most a handful of concurrent per-scenario seeds), so bumping the
   * pager to 50/page puts every row on ONE page — the target is then deterministically present with no
   * paging at all.
   *
   * Cold-start ordering matters: while the list is loading, `TableResource` renders a skeleton with NO
   * pagination bar, so `setItemsPerPage` waits for the pager to appear before selecting. Without that
   * wait it silently no-op'd on the first (cold-cache) run, the list stayed at 10/page, and the newest
   * block — whose server-generated id sorts LAST — was stranded on a later page while the old
   * forward-only page-walk raced ("signatory NNNN not found in the list (any page)"). See PR review
   * (parallel-safety) + first-run flake.
   */
  async openView(blockId: string): Promise<void> {
    await this.setItemsPerPage(50);
    const link = this.page.getByRole('button', { name: blockId, exact: true });
    await expect(link).toBeVisible({ timeout: 20_000 });
    await link.click();
    await expect(this.modal.getByText('Signature Block Details')).toBeVisible();
  }

  /** Bump the list pager to `n` items/page (Carbon options are [10, 25, 50]) so the whole small list
   *  fits on one page. WAITS for the pager first: it only renders once `TableResource` swaps its loading
   *  skeleton for real rows, so selecting before then would be a silent no-op (leaving 10/page). */
  private async setItemsPerPage(n: number): Promise<void> {
    const perPage = this.page.getByLabel('Items per page:');
    await perPage.waitFor({ state: 'visible', timeout: 20_000 });
    await perPage.selectOption(String(n));
  }

  async openEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.modal.getByText('Signature Block - Edit')).toBeVisible();
  }

  fieldId(label: string): string {
    const id = SIGNATORY_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Signatory field: "${label}". Add it to SIGNATORY_FIELD_IDS.`);
    return id;
  }

  /** Fill a simple text field (names, Position) by visible label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.page.locator(this.fieldId(label)).fill(value);
  }

  /** Select the Reg / Dist native <Select> by its org-unit-code option value (''-clears it). */
  async selectRegDist(orgUnitCode: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Reg / Dist'), orgUnitCode);
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

  /** Assert the read-only view shows `value` for a given view field id. */
  async expectViewValue(id: string, value: string): Promise<void> {
    await expect(this.page.locator(id)).toHaveValue(value);
  }

  /**
   * Read the server-assigned Block # from the view modal after a create (the app forwards to the view on
   * success). Waits for the field to be populated — the backend search doesn't filter by last name, so
   * this is how the just-created id is discovered for read-back + cleanup.
   */
  async readCreatedBlockId(): Promise<string> {
    const field = this.page.locator('#view-block-id');
    await expect(field).not.toHaveValue('', { timeout: 10_000 });
    return (await field.inputValue()).trim();
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
