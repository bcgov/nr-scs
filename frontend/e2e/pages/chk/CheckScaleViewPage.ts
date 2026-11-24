import { type Locator, type Page, expect } from '@playwright/test';

import { CHECK_SCALE_VIEW_FIELD_IDS } from './checkScaleDetailShared';
import { clientSideNavigate, loginAsMockScsUser } from '../common/authNav';

/**
 * Page Object for the DETAIL Check Scale — View screen (route: /check-scales/view/{id}).
 *
 * The screen renders `CheckScaleForm mode="view"` (all fields read-only) + a Check Scale Summary table
 * (Original / Check / Difference / Variance %) + the Species Product Grade Summary + the action row
 * (Back, Edit Record, Create Letter, Add Check Scale, Delete). Edit Record and Delete are DISABLED for a
 * legacy (LGCS) record; there is NO per-element permission gating in the new app, so every button always
 * renders (the legacy STA-002/005/006 hidden states have no equivalent — see coverage.md).
 *
 * Used by UC-CHK-003 (the View UC) and UC-CHK-002 S04 (legacy Edit-disabled). `goto`, `editButton`, and
 * `deleteButton` keep their original shape so the UC-CHK-002 step keeps working.
 */
export class CheckScaleViewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly checkScaleIdText: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly createLetterButton: Locator;
  readonly addCheckScaleButton: Locator;
  readonly deleteButton: Locator;
  /** The "Check Scale Summary" (Totals) table — scoped by its stable class. */
  readonly summaryTable: Locator;
  /** The Species Product Grade Summary table — scoped by its unique "Species Grade" column header. */
  readonly speciesTable: Locator;
  readonly errorMessage: Locator;
  /** The Carbon delete-confirmation <Modal> and its heading + Confirm/Cancel buttons (UC-CHK-004). */
  readonly deleteModal: Locator;
  readonly deleteModalHeading: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;
  /** The "Delete failed" banner the view raises when the DELETE call is refused (index.tsx:224-230). */
  readonly deleteFailedBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Check Scale', exact: true });
    this.checkScaleIdText = page.locator('.view-check-scale__check-scale-id');
    // Action-row buttons — scoped to the view's form-actions row so "Add Check Scale" can't collide with
    // the list-tab button and "Delete" can't collide with the confirm modal's "Confirm Delete".
    const actions = page.locator('.form-actions');
    this.backButton = actions.getByRole('button', { name: 'Back', exact: true });
    this.editButton = actions.getByRole('button', { name: 'Edit Record' });
    this.createLetterButton = actions.getByRole('button', { name: 'Create Letter' });
    this.addCheckScaleButton = actions.getByRole('button', { name: 'Add Check Scale' });
    // Carbon renders a danger-kind button's accessible name as "danger Delete" (documented SCS quirk),
    // not "Delete" — match the danger-prefixed name.
    this.deleteButton = actions.getByRole('button', { name: 'danger Delete', exact: true });
    this.summaryTable = page.locator('.view-check-scale__summary-table');
    this.speciesTable = page.locator('table', {
      has: page.getByRole('columnheader', { name: 'Species Grade' }),
    });
    this.errorMessage = page.getByText('Could not retrieve check scale data.');
    // Delete confirmation is a Carbon <Modal> (View/CheckScale index.tsx:299-311): same heading as the
    // legacy window.confirm, with "Confirm Delete" (danger primary) / "Cancel" (secondary). Scoped to the
    // modal so its buttons never collide with the action-row Delete/Back. `.cds--modal` stays
    // visibility:hidden until open, so toBeVisible()/toBeHidden() reflect the open state.
    this.deleteModal = page
      .locator('.cds--modal')
      .filter({ hasText: 'Are you sure you want to delete this record?' });
    this.deleteModalHeading = this.deleteModal.getByText('Are you sure you want to delete this record?');
    // The failure surface: a Carbon InlineNotification titled "Delete failed", rendered on the view (NOT
    // in the modal — the handler closes the modal first), carrying the server's message as its subtitle.
    this.deleteFailedBanner = page.getByText('Delete failed', { exact: true });
    // Not exact: Carbon renders a danger primary's accessible name as "danger Confirm Delete".
    this.confirmDeleteButton = this.deleteModal.getByRole('button', { name: 'Confirm Delete' });
    this.cancelDeleteButton = this.deleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Log in and client-side navigate to the view screen, asserting it loaded. */
  /**
   * Open a check scale and wait until its record has LOADED, not just until the heading shows.
   *
   * The view renders the "Check Scale" heading above three skeletons while its single GET is in flight
   * (`pages/View/CheckScale/index.tsx`, the `isLoading` branch), so the heading alone does not mean the data
   * arrived. The check-scale ID only renders once it has. Waiting on the heading alone raced UC-CHK-004's
   * "server refuses" scenario under load (2026-10-01, 6 workers): its next step deletes the record
   * out-of-band, and a GET still in flight came back 404 and flipped the view to the "Error" page before
   * the Delete button ever rendered.
   */
  async goto(id: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/check-scales/view/${id}`);
    await expect(this.heading).toBeVisible();
    await expect(this.checkScaleIdText, `check scale ${id} must finish loading`).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Navigate to a view route WITHOUT asserting the success heading — for the not-found path (S06), which
   * renders an "Error" page instead of the "Check Scale" heading. The caller asserts the error.
   */
  async gotoExpectingError(id: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `/check-scales/view/${id}`);
  }

  /** A read-only field's control, resolved by its visible label. Throws on an unknown label. */
  field(label: string): Locator {
    const id = CHECK_SCALE_VIEW_FIELD_IDS[label];
    if (!id) {
      throw new Error(`Unknown Check Scale view field: "${label}". Add it to CHECK_SCALE_VIEW_FIELD_IDS.`);
    }
    return this.page.locator(id);
  }

  /** A row-label cell of the Check Scale Summary table (e.g. "Original:", "Variance %:"). */
  summaryRowLabel(label: string): Locator {
    return this.summaryTable.getByText(label, { exact: true });
  }

  /** Body (data) rows of the Species Product Grade Summary table. */
  speciesRows(): Locator {
    return this.speciesTable.locator('tbody tr');
  }

  /** Open the delete confirmation modal (click the action-row Delete button). */
  async openDeleteModal(): Promise<void> {
    await this.deleteButton.click();
    await expect(this.deleteModalHeading).toBeVisible();
  }

  /**
   * Confirm deletion and WAIT FOR THE DELETE CALL TO COMPLETE.
   *
   * Awaiting the response is what makes a following read-back meaningful: the click only *starts* the
   * request, so returning early left every caller racing an in-flight DELETE. (That race is exactly what
   * made the old S01 read as a product defect — the read-back fired ~40ms after the click, while the
   * DELETE itself had not yet returned its 204. Callers still poll, per the suite's read-back rule; this
   * removes the guaranteed part of the race rather than relying on the poll to absorb it.)
   *
   * Returns the DELETE's HTTP status so a caller can distinguish "refused" from "removed" without
   * reaching into the network layer itself.
   */
  async confirmDelete(): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => /\/api\/check-scales\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'DELETE',
      ),
      this.confirmDeleteButton.click(),
    ]);
    return response.status();
  }

  /** Cancel deletion — closes the modal, performs no delete. */
  async cancelDelete(): Promise<void> {
    await this.cancelDeleteButton.click();
    await expect(this.deleteModalHeading).toBeHidden();
  }
}
