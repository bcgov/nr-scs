import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate, setDateField } from '../common/authNav';
import { escapeRegExp } from '../common/urlMatch';
import { SCREEN_READY_TIMEOUT_MS } from '../common/readiness';

/**
 * Page object for the Site Inspection EDIT screen
 * (nr-scs `pages/Edit/ScaleSiteInspection`, route `/scale-sites/:id/inspections/edit/:inspectionId`).
 *
 * This screen is APP-ONLY — no legacy INS use case drives it (UC-INS-003 reached the legacy edit screen
 * only to capture compliance/enforcement, which was never built). It reuses the SAME two components as
 * create — `ScaleSiteInspectionDetails` (mode="edit") + `ScaleSiteInspectionQuestions` (mode="edit") —
 * so the field ids are identical to the create screen's; only the header layout and the action row
 * (Back / Reset / Save Record) differ. Selector strategy therefore matches
 * ScaleSiteInspectionCreatePage deliberately: stable app-rendered ids, no structural CSS.
 *
 * Which fields are editable here (verified in ScaleSiteInspectionDetails/index.tsx):
 *   editable  — site-operator-present (<select>), inspector, inspection-date, inspection-comments
 *   read-only — previous-inspection-id + recipient (both `isCreate ? editable : readOnly`), plus every
 *               site/type display field. So the edit form legitimately exposes FEWER fields than create.
 */
export class ScaleSiteInspectionEditPage {
  constructor(private readonly page: Page) {}

  // ---- header / display ----
  private field(id: string): Locator {
    return this.page.locator(`#${id}`);
  }
  private get siteOperatorPresentSelect(): Locator {
    // A <select> only in edit/create mode; the VIEW screen renders the same id as a readonly TextInput,
    // so scoping to `select#` is what proves the edit form (not the view) actually painted.
    return this.page.locator('select#site-operator-present');
  }
  private get inspectorInput(): Locator {
    return this.page.locator('#inspector');
  }
  private get commentsTextArea(): Locator {
    return this.page.locator('#inspection-comments');
  }

  // ---- question controls (ids are `question-<part>-<inspectionQuestionId>`) ----
  private get answerSelects(): Locator {
    return this.page.locator('select[id^="question-answer-"]');
  }
  private get followUpRequiredSelects(): Locator {
    return this.page.locator('select[id^="question-follow-up-required-"]');
  }
  // Element types are NOT uniform across the follow-up group, so each locator names its real tag
  // (verified in ScaleSiteInspectionQuestions/index.tsx): Action Required and Comments are Carbon
  // <TextArea> (→ textarea), Due Date is a DateInput whose id lands on the inner <input>, and
  // Required?/Complete? are <Select> (→ select). Matching `input[...]` for the TextAreas is what made
  // the first run fail with "element(s) not found".
  private get followUpActionInputs(): Locator {
    return this.page.locator('textarea[id^="question-follow-up-action-"]');
  }
  private get followUpDueDateInputs(): Locator {
    return this.page.locator('input[id^="question-follow-up-due-date-"]');
  }
  private get followUpCompletedSelects(): Locator {
    return this.page.locator('select[id^="question-follow-up-completed-"]');
  }
  private get questionCommentsInputs(): Locator {
    return this.page.locator('textarea[id^="question-comments-"]');
  }

  // ---- actions ----
  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Record' });
  }
  private get resetButton(): Locator {
    return this.page.getByRole('button', { name: 'Reset' });
  }
  private get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back' });
  }

  // ---- navigation ----------------------------------------------------------------------------

  /** Log in, then client-side navigate to the edit screen and wait for the edit form to paint. */
  async open(scaleSiteIdNmbr: string, inspectionId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await this.navigateTo(scaleSiteIdNmbr, inspectionId);
  }

  /** Client-side hop to an edit route WITHOUT re-authenticating (mock auth is in-memory only). */
  async navigateTo(scaleSiteIdNmbr: string, inspectionId: string): Promise<void> {
    await clientSideNavigate(
      this.page,
      `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/edit/${encodeURIComponent(inspectionId)}`,
    );
  }

  /**
   * The edit form is loaded: the Inspection # display carries the id AND the site-operator <select> is
   * present. Asserting both is what distinguishes a loaded EDIT form from the read-only view screen (the
   * two share every display id), so a mis-routed test fails loudly instead of asserting against the view.
   */
  async expectLoaded(inspectionId: string): Promise<void> {
    // Data-gated: the page renders a skeleton until the edit-payload query resolves, so this first
    // assertion takes the shared generous bound (see pages/common/readiness.ts). The second is cheap
    // once the first has passed, so it keeps the default timeout.
    await expect(this.field('inspection-id')).toHaveValue(inspectionId, {
      timeout: SCREEN_READY_TIMEOUT_MS,
    });
    await expect(this.siteOperatorPresentSelect).toBeVisible();
  }

  /** Number of question rows the edit payload rendered (≥1 for any create-able inspection). */
  async questionCount(): Promise<number> {
    return this.answerSelects.count();
  }

  /**
   * The `inspectionQuestionId`s the form rendered, in render order, read off the Answer selects' ids.
   * The API read-back keys its per-question assertions by these, so nothing is hard-coded to the current
   * question library (a CCQ change alters the set, not the test).
   */
  async renderedQuestionIds(): Promise<number[]> {
    const ids = await this.answerSelects.evaluateAll((nodes) =>
      nodes.map((node) => Number(node.id.replace('question-answer-', ''))),
    );
    expect(ids.length, 'edit payload rendered no question rows').toBeGreaterThan(0);
    return ids;
  }

  // ---- header field entry --------------------------------------------------------------------

  async setSiteOperatorPresent(value: 'Yes' | 'No' | ''): Promise<void> {
    await this.siteOperatorPresentSelect.selectOption(
      value === '' ? '' : value === 'Yes' ? 'Y' : 'N',
    );
  }
  async fillInspector(guid: string): Promise<void> {
    await this.inspectorInput.fill(guid);
  }
  async setInspectionDate(value: string): Promise<void> {
    await setDateField(this.page, '#inspection-date', value);
  }
  async clearInspectionDate(): Promise<void> {
    await setDateField(this.page, '#inspection-date', '');
  }
  async setComments(value: string): Promise<void> {
    await this.commentsTextArea.fill(value);
  }

  /** Current value of any field by its element id — the Reset assertion's comparand reader. */
  async fieldValueById(id: string): Promise<string> {
    return this.page.locator(`#${id}`).inputValue();
  }

  // ---- question field entry (by row index — stable across question-library changes) -----------

  async answerQuestion(index: number, code: string): Promise<void> {
    await this.answerSelects.nth(index).selectOption(code);
  }

  /**
   * Clear a question's answer. This IS a real user gesture, not a DOM force: the Answer `<Select>`
   * renders a blank `<SelectItem value="" text="Select" />` above the question's answer options
   * (`ScaleSiteInspectionQuestions/index.tsx:248`), so "no answer" is selectable even on the edit form
   * where every row loads pre-answered.
   */
  async clearQuestionAnswer(index: number): Promise<void> {
    await this.answerSelects.nth(index).selectOption('');
  }

  /** Answer EVERY rendered question with `code` (dynamic — no hard-coded ids/count). */
  async answerAllQuestions(code: string): Promise<void> {
    const count = await this.questionCount();
    expect(count, 'edit payload rendered no question rows').toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await this.answerSelects.nth(i).selectOption(code);
    }
  }

  async setQuestionFollowUpRequired(index: number, value: 'Yes' | 'No'): Promise<void> {
    await this.followUpRequiredSelects.nth(index).selectOption(value === 'Yes' ? 'Y' : 'N');
  }
  async setQuestionFollowUpAction(index: number, value: string): Promise<void> {
    await this.followUpActionInputs.nth(index).fill(value);
  }
  async setQuestionFollowUpDueDate(index: number, value: string): Promise<void> {
    const id = await this.followUpDueDateInputs.nth(index).getAttribute('id');
    await setDateField(this.page, `#${id}`, value);
  }
  async setQuestionFollowUpCompleted(index: number, value: 'Yes' | 'No'): Promise<void> {
    await this.followUpCompletedSelects.nth(index).selectOption(value === 'Yes' ? 'Y' : 'N');
  }
  async setQuestionComments(index: number, value: string): Promise<void> {
    await this.questionCommentsInputs.nth(index).fill(value);
  }

  /**
   * With Follow-Up Required = N the app CLEARS and DISABLES the three follow-up detail inputs, so the
   * legacy "populated when not required" arm is not user-reachable. Asserting the disable is how that
   * re-grounding is proven rather than merely claimed.
   */
  async expectFollowUpDetailsDisabled(index: number): Promise<void> {
    await expect(this.followUpActionInputs.nth(index)).toBeDisabled();
    await expect(this.followUpDueDateInputs.nth(index)).toBeDisabled();
    await expect(this.followUpCompletedSelects.nth(index)).toBeDisabled();
  }

  // ---- action clicks -------------------------------------------------------------------------

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }
  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  // ---- outcome assertions --------------------------------------------------------------------

  /** After a successful Save the app navigates to this inspection's read-only view route. */
  async expectReturnedToDetailView(scaleSiteIdNmbr: string, inspectionId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(
        `/scale-sites/${escapeRegExp(scaleSiteIdNmbr)}/inspections/view/${escapeRegExp(inspectionId)}$`,
      ),
    );
  }

  /** Still on the edit route — the form did NOT navigate away (a blocked Save stays put). */
  async expectStillOnEditForm(scaleSiteIdNmbr: string, inspectionId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      new RegExp(
        `/scale-sites/${escapeRegExp(scaleSiteIdNmbr)}/inspections/edit/${escapeRegExp(inspectionId)}$`,
      ),
    );
    await expect(this.siteOperatorPresentSelect).toBeVisible();
  }

  /** The client-side validation banner ("Please fix the highlighted fields"). */
  async expectValidationBanner(): Promise<void> {
    await expect(this.page.getByText('Please fix the highlighted fields')).toBeVisible();
  }

  /** The server-rejection banner ("Inspection update failed") — bannerMode="api". */
  async expectApiFailureBanner(): Promise<void> {
    await expect(this.page.getByText('Inspection update failed')).toBeVisible();
  }

  /** A route id that isn't a positive integer renders the "Inspection not available" empty section. */
  async expectInvalidRouteMessage(): Promise<void> {
    await expect(this.page.getByText('Inspection not available')).toBeVisible();
  }

  /** A missing/unreadable inspection renders the "Could not load inspection" empty section. */
  async expectNotFound(): Promise<void> {
    await expect(this.page.getByText('Could not load inspection')).toBeVisible();
  }
}
