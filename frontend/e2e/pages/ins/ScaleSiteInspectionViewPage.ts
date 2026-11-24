import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';
import { escapeRegExp } from '../common/urlMatch';
import { SCREEN_READY_TIMEOUT_MS } from '../common/readiness';

/**
 * Page object for the read-only Site Inspection VIEW screen
 * (nr-scs `pages/View/ScaleSiteInspection`, route `/scale-sites/:id/inspections/view/:inspectionId`).
 * Renders the ScaleSiteInspectionDetails (mode="view") + ScaleSiteInspectionQuestions (mode="view")
 * with Back / Edit Record / Delete actions. All display fields are read-only TextInputs with stable ids.
 */
export class ScaleSiteInspectionViewPage {
  constructor(private readonly page: Page) {}

  private field(id: string): Locator {
    return this.page.locator(`#${id}`);
  }
  private get questionTables(): Locator {
    return this.page.locator('.scale-site-inspection-questions__question-table');
  }
  private get editButton(): Locator {
    return this.page.getByRole('button', { name: 'Edit Record' });
  }
  private get deleteButton(): Locator {
    return this.page.getByRole('button', { name: 'Delete' });
  }

  async open(scaleSiteIdNmbr: string, inspectionId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await this.navigateTo(scaleSiteIdNmbr, inspectionId);
  }

  /** Client-side hop to another inspection WITHOUT re-authenticating (used by the recovery path). */
  async navigateTo(scaleSiteIdNmbr: string, inspectionId: string): Promise<void> {
    await clientSideNavigate(
      this.page,
      `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/view/${encodeURIComponent(inspectionId)}`,
    );
  }

  /** Wait for the loaded view (the Inspection # display carries the id). */
  async expectLoaded(inspectionId: string): Promise<void> {
    // Data-gated on the detail query — shared generous bound (see pages/common/readiness.ts).
    await expect(this.field('inspection-id')).toHaveValue(inspectionId, {
      timeout: SCREEN_READY_TIMEOUT_MS,
    });
  }

  async fieldValue(id: string): Promise<string> {
    return this.field(id).inputValue();
  }

  async expectScaleSiteNumber(value: string): Promise<void> {
    await expect(this.field('inspection-scale-site-number')).toHaveValue(value);
  }

  async expectInspector(value: string): Promise<void> {
    await expect(this.field('inspector')).toHaveValue(value);
  }

  async expectSiteOperatorPresent(description: string): Promise<void> {
    await expect(this.field('site-operator-present')).toHaveValue(description);
  }

  async expectInspectionType(description: string): Promise<void> {
    await expect(this.field('inspection-type-description')).toHaveValue(description);
  }

  async expectSiteName(value: string): Promise<void> {
    await expect(this.field('inspection-scale-site-name')).toHaveValue(value);
  }

  async expectComments(value: string): Promise<void> {
    await expect(this.field('inspection-comments')).toHaveValue(value);
  }

  async questionCount(): Promise<number> {
    return this.questionTables.count();
  }

  /** At least one question response table is rendered (the seeded inspection answered ≥1 question). */
  async expectHasQuestions(): Promise<void> {
    await expect(this.questionTables.first()).toBeVisible();
    expect(await this.questionCount(), 'expected ≥1 question response table').toBeGreaterThan(0);
  }

  /**
   * Proves BR-INS-002-01 (the view is entirely read-only): within the view content there are NO
   * dropdowns and NO editable text inputs/areas — every field carries the `readonly` attribute.
   * Buttons (Back / Edit / Delete) are not inputs, so they don't count as editable controls.
   */
  async expectAllFieldsReadOnly(): Promise<void> {
    const editable = this.page.locator(
      '.scale-site-inspection-view__content input:not([readonly]), ' +
        '.scale-site-inspection-view__content textarea:not([readonly]), ' +
        '.scale-site-inspection-view__content select',
    );
    await expect(editable).toHaveCount(0);
  }

  async expectActionsVisible(): Promise<void> {
    await expect(this.backButton).toBeVisible();
    await expect(this.editButton).toBeVisible();
    await expect(this.deleteButton).toBeVisible();
  }

  private get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back' });
  }

  /** Click Back; the app client-side navigates to the scale site's Inspections tab. */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  /** After Back, the scale site view is shown on the inspections tab (Add Inspection is present). */
  async expectReturnedToInspectionsTab(scaleSiteIdNmbr: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(`/scale-sites/view/${escapeRegExp(scaleSiteIdNmbr)}\\?tab=inspections$`),
    );
    // The tab re-paints after its own queries resolve (and, on the delete path, after a list refetch),
    // so this is a data-gated readiness gate and takes the shared generous bound.
    await expect(this.page.getByRole('button', { name: 'Add Inspection' })).toBeVisible({
      timeout: SCREEN_READY_TIMEOUT_MS,
    });
  }

  /** No delete-failure banner is shown (the view loaded cleanly). */
  async expectNoErrorBanner(): Promise<void> {
    await expect(this.page.getByText('Could not load inspection')).toHaveCount(0);
    await expect(this.page.locator('.cds--inline-notification--error')).toHaveCount(0);
  }

  /** The not-found path renders the "Could not load inspection" empty section. */
  async expectNotFound(): Promise<void> {
    await expect(this.page.getByText('Could not load inspection')).toBeVisible();
  }

  // ---- Edit Record hop -------------------------------------------------------------------------

  /** Click "Edit Record" — the app client-side navigates to this inspection's edit route. */
  async clickEditRecord(): Promise<void> {
    await this.editButton.click();
  }

  // ---- Delete + its confirm modal --------------------------------------------------------------
  //
  // Delete is a two-step gesture: the danger Button only OPENS a Carbon <Modal danger>; the record is
  // removed by the modal's primary action. A test that clicks only "Delete" proves nothing — which is
  // exactly the "hidden danger button" trap the role-probe suites hit — so the modal is modelled
  // explicitly here and every delete step goes through it.

  private get deleteConfirmModal(): Locator {
    return this.page.locator('.cds--modal.is-visible');
  }
  private get confirmDeleteButton(): Locator {
    // Carbon prefixes a danger modal's primary-action accessible name with "danger " in some releases,
    // so match on the visible text rather than an exact accessible name.
    return this.deleteConfirmModal.getByRole('button', { name: /Confirm Delete/ });
  }
  private get cancelDeleteButton(): Locator {
    return this.deleteConfirmModal.getByRole('button', { name: /^Cancel$/ });
  }

  /** Click the danger Delete button — this only OPENS the confirm modal, it deletes nothing. */
  async clickDelete(): Promise<void> {
    await this.deleteButton.click();
  }

  /** The confirmation prompt is shown with its heading and both actions. */
  async expectDeleteConfirmModal(): Promise<void> {
    await expect(this.deleteConfirmModal).toBeVisible();
    await expect(
      this.page.getByText('Are you sure you want to delete this record?'),
    ).toBeVisible();
    await expect(this.confirmDeleteButton).toBeVisible();
    await expect(this.cancelDeleteButton).toBeVisible();
  }

  /** Confirm the deletion (the only gesture that actually issues the DELETE). */
  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
  }

  /** Dismiss the prompt without deleting. */
  async cancelDelete(): Promise<void> {
    await this.cancelDeleteButton.click();
  }

  /** The prompt is gone (Cancel closed it, or a successful delete navigated away). */
  async expectDeleteConfirmModalClosed(): Promise<void> {
    await expect(this.deleteConfirmModal).toHaveCount(0);
  }

  /** A failed delete surfaces the "Delete failed" inline error and keeps the actor on the view. */
  async expectDeleteFailedBanner(): Promise<void> {
    await expect(this.page.getByText('Delete failed')).toBeVisible();
  }
}
