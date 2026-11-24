import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';

/**
 * Page object for the Scaler view's PERFORMANCE REMARKS tab
 * (`nr-scs pages/View/Scaler/components/tabs/PerformanceRemarks/*`, route
 * `/scalers/view/:scalerLicenceNo?tab=performance-remarks`) — the UC-PRF-001/002/003 surface.
 *
 * Interaction model (re-grounded from the legacy Struts screens): there is NO separate create/edit/detail
 * route. The tab is an in-panel state machine (`formState: 'view' | 'create' | 'edit' | 'detail'`) that
 * swaps the whole panel on the same URL. So "open the create form" = click "Add Performance Remark" and the
 * list panel is replaced by the form panel; there is no navigation and no modal for create/edit/detail.
 * DELETE is the one exception — a Carbon `Modal` confirm dialog.
 *
 * Field ids (all stable, from PerformanceRemarksForm.tsx): #performance-remark-issue-number (read-only),
 * #performance-remark-logged-timestamp (Date of Incident, Carbon DatePicker), #performance-remark-issue-type
 * (Select ACTION/OUTCOME), #performance-remark-action-code / #performance-remark-outcome-code (the one shown
 * depends on Issue Type), #performance-remark-description, #performance-remark-outcome-description,
 * #performance-remark-suspend-start-date, #performance-remark-suspend-end-date, #performance-remark-check-scale-id.
 */
export class PerformanceRemarksTabPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly saveButton: Locator;
  readonly backButton: Locator;
  readonly resetButton: Locator;
  /** The delete-confirm Carbon Modal, scoped by its heading (a second dialog can coexist in the DOM). */
  readonly deleteModal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.getByRole('button', { name: 'Add Performance Remark' });
    // Panel-scope the create/edit form controls. Every Scaler tab renders its own `.scs__tab-view__panel`
    // (PerformanceRemarksAction.tsx) and they co-exist in the DOM — the same reason the delete-modal below
    // is scoped to `is-visible` — while sibling tabs (Summary, Exams/Upgrades) carry their OWN "Save
    // Record"/"Back"/"Reset". Page-scoped role lookups resolve uniquely only while no sibling panel exposes a
    // same-named button; a future visible-but-inactive tab would flip these into strict-mode violations. So
    // scope to the PRF form panel, pinned by its unique Date-of-Incident input (present only on the
    // create/edit form — not the list or read-only detail panel). Mirrors the sibling SCL tab page objects.
    const formPanel = page
      .locator('.scs__tab-view__panel')
      .filter({ has: page.locator('#performance-remark-logged-timestamp') });
    this.saveButton = formPanel.getByRole('button', { name: 'Save Record' });
    this.backButton = formPanel.getByRole('button', { name: 'Back' });
    this.resetButton = formPanel.getByRole('button', { name: 'Reset' });
    // Sibling Scaler tabs (Appointments, Exams/Upgrades) each render their OWN delete-confirm Modal with the
    // SAME heading, all present in the DOM — only the OPEN one carries Carbon's `is-visible`. Scope to that so
    // the locator resolves to exactly the Performance Remarks modal.
    this.deleteModal = page
      .locator('.cds--modal.is-visible')
      .filter({ hasText: 'Are you sure you want to delete this record?' });
  }

  // --- navigation -----------------------------------------------------------------------------------

  /** Log in (mock IDIR) then client-side navigate to the scaler's Performance Remarks tab. */
  async open(scalerLicenceNo: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await this.navigateToTab(scalerLicenceNo);
    // Readiness: the tab's create trigger renders once the panel (and its remarks query) has resolved.
    // A client-side nav issued right after login can occasionally be missed if it races app hydration
    // (observed once in a repeat-each stress run — the app shell renders but the scaler view doesn't). A
    // reload would drop the in-memory mock session, so re-issue the SPA navigation once instead. Generous
    // timeout because the scaler view + remarks query is slower under heavy parallel load.
    try {
      await expect(this.addButton).toBeVisible({ timeout: 20_000 });
    } catch {
      await this.navigateToTab(scalerLicenceNo);
      await expect(this.addButton).toBeVisible({ timeout: 20_000 });
    }
  }

  private async navigateToTab(scalerLicenceNo: string): Promise<void> {
    await clientSideNavigate(
      this.page,
      `/scalers/view/${encodeURIComponent(scalerLicenceNo)}?tab=performance-remarks`,
    );
  }

  /** The empty-list state for a scaler with no remarks. */
  async expectEmptyList(): Promise<void> {
    await expect(
      this.page.getByText('No performance remarks found for this scaler.'),
    ).toBeVisible();
  }

  /** Open the create form panel (Add Performance Remark). */
  async clickAdd(): Promise<void> {
    await this.addButton.click();
    // Readiness: the Date of Incident input is unique to the loaded create/edit form.
    await expect(this.page.locator('#performance-remark-logged-timestamp')).toBeVisible();
  }

  // --- form field setters (create + edit share the same form) ---------------------------------------

  async setDateOfIncident(value: string): Promise<void> {
    await setDateField(this.page, '#performance-remark-logged-timestamp', value);
  }

  /** Choose the Issue Type discriminator; the app then shows only the matching Action/Outcome select. */
  async setIssueType(type: 'Action' | 'Outcome'): Promise<void> {
    await this.page
      .locator('#performance-remark-issue-type')
      .selectOption(type === 'Action' ? 'ACTION' : 'OUTCOME');
  }

  async setActionCode(code: string): Promise<void> {
    await this.page.locator('#performance-remark-action-code').selectOption(code);
  }

  async setOutcomeCode(code: string): Promise<void> {
    await this.page.locator('#performance-remark-outcome-code').selectOption(code);
  }

  async setDescription(text: string): Promise<void> {
    await this.page.locator('#performance-remark-description').fill(text);
  }

  async setSuspendStart(value: string): Promise<void> {
    await setDateField(this.page, '#performance-remark-suspend-start-date', value);
  }

  async setSuspendEnd(value: string): Promise<void> {
    await setDateField(this.page, '#performance-remark-suspend-end-date', value);
  }

  async setCheckScaleId(value: string): Promise<void> {
    await this.page.locator('#performance-remark-check-scale-id').fill(value);
  }

  // --- form actions ---------------------------------------------------------------------------------

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }

  /** After a successful save/back, the form panel closes and the list's Add button is shown again. */
  async expectOnList(): Promise<void> {
    await expect(this.addButton).toBeVisible();
  }

  /** True while the create/edit form panel is shown (Date of Incident input present). */
  async expectOnForm(): Promise<void> {
    await expect(this.page.locator('#performance-remark-logged-timestamp')).toBeVisible();
  }

  /** After Reset on the create form, the form returns to its empty-create defaults
   *  (createEmptyPerformanceRemarkFormValues). Assert every field "I enter a valid performance remark"
   *  populated is cleared: Date + Description blank, the Action code emptied, and Issue Type back to its
   *  'ACTION' default — so "cleared" means the whole entered form is gone, not just two of its fields. */
  async expectFormCleared(): Promise<void> {
    await expect(this.page.locator('#performance-remark-logged-timestamp')).toHaveValue('');
    await expect(this.page.locator('#performance-remark-description')).toHaveValue('');
    await expect(this.page.locator('#performance-remark-action-code')).toHaveValue('');
    await expect(this.page.locator('#performance-remark-issue-type')).toHaveValue('ACTION');
  }

  /** The form-level save-failure banner (server rejection surfaces here, not inline). */
  get saveErrorBanner(): Locator {
    return this.page.getByText('Could not save the performance remark.');
  }

  // --- summary table --------------------------------------------------------------------------------

  /**
   * The "Issue #" cell for a remark renders a <button> whose text is the numeric id. Scope by the row so
   * parallel scenarios adding rows to the same scaler don't collide (never assert on a count).
   */
  private issueNumberButton(remarkId: string): Locator {
    return this.page.getByRole('button', { name: remarkId, exact: true });
  }

  private remarkRow(remarkId: string): Locator {
    return this.page.locator('tr', { has: this.issueNumberButton(remarkId) });
  }

  /** Assert a remark row is listed, optionally checking a substring it must contain (e.g. the description). */
  async expectRemarkListed(remarkId: string, contains?: string): Promise<void> {
    const row = this.remarkRow(remarkId);
    await expect(row).toBeVisible();
    if (contains !== undefined) await expect(row).toContainText(contains);
  }

  /** Assert NO row carries the given remark id (cancelled/aborted create, or a completed delete). */
  async expectRemarkNotListed(remarkId: string): Promise<void> {
    await expect(this.issueNumberButton(remarkId)).toHaveCount(0);
  }

  /** Open a remark's read-only detail panel via its Issue # button. */
  async openDetail(remarkId: string): Promise<void> {
    await this.issueNumberButton(remarkId).click();
    // Detail panel heading confirms the swap.
    await expect(
      this.page.getByRole('heading', { name: 'Scaler Performance Remark', exact: true }),
    ).toBeVisible();
  }

  /** The detail panel's "Edit Record" button (UC-PRF-002 S04 — edit via detail view). */
  async clickEditRecordOnDetail(): Promise<void> {
    await this.page.getByRole('button', { name: 'Edit Record' }).click();
    await this.expectOnForm();
  }

  /** Click the per-row Edit button (UC-PRF-002 — edit via summary list). */
  async clickEditForRow(remarkId: string): Promise<void> {
    await this.remarkRow(remarkId).getByRole('button', { name: 'Edit', exact: true }).click();
    await this.expectOnForm();
  }

  // --- delete confirm modal (UC-PRF-003) ------------------------------------------------------------

  /** Click the per-row Delete button, which opens the confirm modal. */
  async clickDeleteForRow(remarkId: string): Promise<void> {
    // NB: substring (not exact) is required — the Carbon `danger--ghost` button's accessible name is
    // "danger Delete", so { name: 'Delete', exact: true } would not match. Scoped to the row and the only
    // Delete-labelled control there, so the substring is unambiguous.
    await this.remarkRow(remarkId).getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteModal).toBeVisible();
  }

  async confirmDelete(): Promise<void> {
    await this.deleteModal.getByRole('button', { name: 'Confirm Delete' }).click();
  }

  async cancelDelete(): Promise<void> {
    await this.deleteModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.deleteModal).toBeHidden();
  }
}
