import { type Locator, type Page, expect } from '@playwright/test';

import { clientSideNavigate, loginAsMockScsUser } from '../../common/authNav';

/**
 * Page Object for Maintain Inspection Question (route: /maintenance/questions).
 *
 * Unlike CHK's multi-route split layout, this screen is a SINGLE route: a list (left/only panel) plus
 * an in-page Carbon `Modal` that switches between `create` / `edit` / `view` mode (`QuestionsAdminPage`
 * + `QuestionsModal`). All three modes share one field-id set; the `-readonly` suffix ids appear only
 * when a "used" question is opened for edit (`isReadOnly` in QuestionsModal.tsx).
 */

/** Visible field label -> stable element id (nr-scs QuestionsModal, create/edit mode). */
export const QUESTION_FIELD_IDS: Record<string, string> = {
  'Sort Order': '#question-sort-order',
  'Comment Required': '#comment-required',
  'Effective Date': '#effective-date',
  'Expiry Date': '#expiry-date',
  Question: '#question-text',
};

/** Ids of the three ActiveMultiSelect (FilterableMultiSelect) groups, by visible titleText label. */
export const MULTISELECT_IDS: Record<string, string> = {
  'Inspection Type': '#inspection-type',
  'Scaling Methods': '#scaling-methods',
  'Valid Responses': '#valid-responses',
};

/**
 * When a question has been used (`isReadOnly` in QuestionsModal.tsx), Question/Inspection Type/Scaling
 * Methods/Valid Responses swap to a DIFFERENT, `-readonly`-suffixed disabled TextInput/TextArea (their
 * interactive control disappears entirely); Comment Required/Effective Date keep their normal id and
 * just gain the `disabled` attribute. Sort Order and Expiry Date are never disabled by `isReadOnly`.
 */
const READONLY_SWAP_IDS: Record<string, string> = {
  Question: '#question-text-readonly',
  'Inspection Type': '#inspection-type-readonly',
  'Scaling Methods': '#scaling-methods-readonly',
  'Valid Responses': '#valid-responses-readonly',
};

export class QuestionsPage {
  readonly page: Page;

  // List
  readonly heading: Locator;
  readonly addQuestionButton: Locator;

  // Modal (shared across create/edit/view)
  readonly modal: Locator;
  readonly backButton: Locator;
  readonly resetButton: Locator;
  readonly saveButton: Locator;
  readonly editRecordButton: Locator;
  readonly deleteButton: Locator;

  // Delete confirmation (shared ConfirmDeleteModal component)
  readonly confirmDeleteModal: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // Page-level error banner (Carbon InlineNotification kind="error", role="status" by default)
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Maintain Questions' });
    this.addQuestionButton = page.getByRole('button', { name: 'Add Question' });
    this.errorBanner = page.locator('.cds--inline-notification--error');

    // The Questions screen now renders through the shared MaintenanceFormModal, so its main modal ALSO
    // carries `scs__modal--no-footer` (same as the ConfirmDeleteModal) — the two can no longer be told
    // apart by that class. Both can be mounted OPEN simultaneously (clicking Delete on the view modal
    // opens ConfirmDeleteModal alongside it), so split them by the confirm modal's unique body text: the
    // main modal is the one that does NOT contain it, the confirm modal is the one that does. This keeps
    // each locator matching exactly one element (no Playwright strict-mode violation).
    const deleteConfirmText = page.getByText('Are you sure you want to delete this record?');
    this.modal = page.locator('.cds--modal.scs__modal').filter({ hasNot: deleteConfirmText });
    this.backButton = this.modal.getByRole('button', { name: 'Back', exact: true });
    this.resetButton = this.modal.getByRole('button', { name: 'Reset', exact: true });
    this.saveButton = this.modal.getByRole('button', { name: /^Save Record|Saving…$/ });
    this.editRecordButton = this.modal.getByRole('button', { name: 'Edit Record' });
    // Carbon renders a danger-kind button's accessible name with a "danger " prefix (documented SCS quirk).
    this.deleteButton = this.modal.getByRole('button', { name: 'danger Delete', exact: true });

    this.confirmDeleteModal = page.locator('.cds--modal.scs__modal').filter({ has: deleteConfirmText });
    this.confirmDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'danger OK', exact: true });
    this.cancelDeleteButton = this.confirmDeleteModal.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** Log in as mock SCS_SYS_ADMIN and client-side navigate to the Questions list. */
  async goto(): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, '/maintenance/questions');
    await expect(this.heading).toBeVisible();
  }

  /** Open the create modal via "Add Question". */
  async openCreate(): Promise<void> {
    await this.addQuestionButton.click();
    await expect(this.modal.getByText('Maintain Questions - Create')).toBeVisible();
  }

  /**
   * Open a question's View modal from the list by clicking its id link. The list paginates client-side
   * (10/page by default), so a freshly-seeded question can land off page 1 — bump the pager to 50/page so
   * every row fits, then fall back to the next page if the link still isn't on the current page.
   */
  async openView(questionId: string): Promise<void> {
    await this.setItemsPerPage(50);
    const link = this.page.getByRole('button', { name: questionId, exact: true });
    // Walk the client-side pages until the row appears (poll absorbs the re-render after each nav). At
    // 50/page the current data is 2 pages, so this checks both.
    await expect
      .poll(
        async () => {
          if ((await link.count()) > 0) return true;
          const nextPage = this.page.getByRole('button', { name: 'Next page' });
          if (await nextPage.isEnabled().catch(() => false)) await nextPage.click();
          return (await link.count()) > 0;
        },
        { timeout: 20_000, message: `question ${questionId} not found in the list (any page)` },
      )
      .toBe(true);
    await link.click();
    await expect(this.modal.getByText('Inspection Question - Details')).toBeVisible();
  }

  /** Set the list pager to `n` items/page (Carbon pager options are [10, 25, 50]) so a seeded row isn't
   *  stranded on a later page. Targets Carbon's items-per-page `<select>` (the first select in the
   *  pager). No-op if the pager isn't present. */
  private async setItemsPerPage(n: number): Promise<void> {
    const perPage = this.page.locator('.cds--pagination .cds--select-input').first();
    if ((await perPage.count()) > 0) {
      await perPage.selectOption(String(n));
    }
  }

  /** From the View modal, open Edit. */
  async openEdit(): Promise<void> {
    await this.editRecordButton.click();
    await expect(this.modal.getByText('Maintain Questions - Edit')).toBeVisible();
  }

  /** Resolve a simple text/date/select field's id by visible label; throws on an unknown label. */
  fieldId(label: string): string {
    const id = QUESTION_FIELD_IDS[label];
    if (!id) throw new Error(`Unknown Question field: "${label}". Add it to QUESTION_FIELD_IDS.`);
    return id;
  }

  /** Fill a simple text field (Sort Order, Question) by visible label. */
  async fillField(label: string, value: string): Promise<void> {
    await this.page.locator(this.fieldId(label)).fill(value);
  }

  /** Assert a field's current value by visible label (web-first, so it survives a re-render). */
  async expectFieldValue(label: string, value: string): Promise<void> {
    await expect(this.page.locator(this.fieldId(label))).toHaveValue(value);
  }

  /** Set the Comment Required native <Select> by visible option text ('Yes' | 'No' | ''). */
  async selectCommentRequired(label: string): Promise<void> {
    await this.page.selectOption(this.fieldId('Comment Required'), { label });
  }

  /**
   * Set (or clear, with '') a Carbon flatpickr date field: click, type, blur to commit via onBlur, then
   * dismiss the calendar overlay by clicking an always-present neutral field (Sort Order). The dismissal
   * matters because the open flatpickr calendar is layered OVER the modal body — including the Save
   * button — so a later Save click is intercepted by a calendar day (see UC-CCQ-001 @S05a Effective Date).
   * NOT Escape to dismiss: this screen's date fields live inside a Carbon `Modal`, which listens for
   * Escape in the capture phase (`Modal.js handleEscapeKey`) and closes the WHOLE modal. Clicking Sort
   * Order is the same outside-click idiom `toggleMultiSelectOption` uses to close its dropdown.
   */
  async setDateField(label: 'Effective Date' | 'Expiry Date', value: string): Promise<void> {
    const input = this.page.locator(this.fieldId(label));
    await input.click();
    await input.fill(value);
    await input.blur();
    await this.page.locator(this.fieldId('Sort Order')).click();
  }

  /**
   * Open a multi-select group (Carbon FilterableMultiSelect) and click the option matching `optionText`
   * (the LOV description, e.g. "Minor"). Selecting an already-selected option deselects it. Closes the
   * dropdown via an outside click on the always-present Sort Order field — NOT Escape, which Carbon's
   * `Modal` captures globally to close the whole modal (see setDateField's comment for the same gotcha).
   */
  async toggleMultiSelectOption(group: 'Inspection Type' | 'Scaling Methods' | 'Valid Responses', optionText: string): Promise<void> {
    const id = MULTISELECT_IDS[group];
    const container = this.page.locator(id);
    await container.getByTitle('Open').click();
    // Scoped to this multiselect's own container — a page-wide getByRole('option', ...) also matches a
    // native <select>'s <option> elements (they carry an implicit role="option" too), colliding with
    // Comment Required's Yes/No options.
    await container.getByRole('option', { name: optionText, exact: true }).click();
    await this.page.locator(this.fieldId('Sort Order')).click(); // outside click closes the dropdown
  }

  /** Deselect every option currently selected in a multi-select group (drives the "at least N" rules). */
  async clearMultiSelect(group: 'Inspection Type' | 'Scaling Methods' | 'Valid Responses'): Promise<void> {
    const id = MULTISELECT_IDS[group];
    const container = this.page.locator(id);
    // Carbon's selected-item chips/tags in a FilterableMultiSelect are removed via the "Clear all selected items" button.
    // Every caller (the @S05b "clear the {group}" step) first enters a valid question, so the group
    // always has a selection here and the Carbon "Clear all selected items" button is present. Assert it
    // rather than swallow a miss with .catch(false) — a genuine absence should fail precisely, not later.
    const clearAll = container.getByTitle('Clear all selected items');
    await expect(clearAll).toBeVisible();
    await clearAll.click();
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

  /**
   * Assert a field is disabled when the question is "used" (S07) — either its readonly-swapped
   * TextInput/TextArea (Question/Inspection Type/Scaling Methods/Valid Responses) or, for
   * Comment Required/Effective Date, its normal control now carrying `disabled`.
   */
  async expectFieldDisabledWhenUsed(label: string): Promise<void> {
    const readonlyId = READONLY_SWAP_IDS[label];
    const locator = this.page.locator(readonlyId ?? this.fieldId(label));
    await expect(locator).toBeDisabled();
  }

  /** The info banner shown when editing a "used" question (STA-002, re-grounded text). */
  usedQuestionInfoBanner(): Locator {
    return this.modal.getByText('This question has been used in an inspection.');
  }

  /** True once the Modal has fully closed (used after a successful save). */
  async expectModalClosed(): Promise<void> {
    await expect(this.modal).toBeHidden();
  }
}
