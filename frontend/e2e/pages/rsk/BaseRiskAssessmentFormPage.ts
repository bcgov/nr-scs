import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Per-subject routing + header config injected into {@link BaseRiskAssessmentFormPage}. The scaler and
 * scale-site risk assessments are driven by the SAME shared React component
 * (`components/Form/RiskAssessment` fed by `scalerConfig.ts` / `scaleSiteConfig.ts`): identical field ids
 * (`#question-<id>`, `#comments`, `#risk-rating`, `#max-risk-rating`, `#risk-questionnaire-id`), identical
 * buttons, and the create/edit/view surfaces differing ONLY by route and by the header field that names
 * the subject. This config carries exactly those differences so the base holds all the shared logic.
 */
export interface RiskFormRoutes {
  /** Create surface for a subject (scaler licence no / scale site id). */
  createPath(subjectId: string): string;
  /** Edit surface for an existing assessment id. */
  editPath(assessmentId: string): string;
  /** Read-only view surface for an existing assessment id. */
  viewPath(assessmentId: string): string;
  /** The header field id that shows the subject on every surface (`scaler-licence-no` / `scale-site-id-nmbr`). */
  headerFieldId: string;
  /** URL predicate proving a rejected edit-save did NOT navigate back to the list. */
  editUrlPattern(assessmentId: string): RegExp;
}

/**
 * Shared page object for the Risk Assessment FORM (create / edit / view), which the scaler and scale-site
 * subjects both render from `components/Form/RiskAssessment`. All selectors, the login+client-side-nav
 * dance, questionnaire actions, and assertions live here ONCE; the two subjects supply only their routes
 * + header field via {@link RiskFormRoutes}. The questionnaire renders each answer as a Carbon
 * `Select id="question-<questionId>"` (a native <select>, blank option = "no answer"); Comments is
 * `#comments` (TextArea, maxLength 4000); the read-only totals are `#risk-rating` (product-rule grand
 * total) / `#max-risk-rating`.
 */
export abstract class BaseRiskAssessmentFormPage {
  constructor(
    protected readonly page: Page,
    private readonly routes: RiskFormRoutes,
  ) {}

  // ---- locators ----
  protected field(id: string): Locator {
    return this.page.locator(`#${id}`);
  }
  private answerSelect(questionId: number): Locator {
    return this.page.locator(`#question-${questionId}`);
  }
  /** Every rendered answer <Select>, in section/question order. */
  private get answerSelects(): Locator {
    return this.page.locator('select[id^="question-"]');
  }
  private get commentsInput(): Locator {
    return this.page.locator('#comments');
  }
  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Assessment' });
  }
  private get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back' });
  }
  private get resetButton(): Locator {
    return this.page.getByRole('button', { name: 'Reset' });
  }
  private get editButton(): Locator {
    return this.page.getByRole('button', { name: 'Edit' });
  }
  private get errorBanner(): Locator {
    return this.page.locator('.cds--inline-notification--error');
  }

  // ---- open a surface (login once, then client-side nav so the mock session survives) ----

  /** Create surface for a subject; ready when the header (populated from create-init) shows the id. */
  async openCreate(subjectId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, this.routes.createPath(subjectId));
    await expect(this.field(this.routes.headerFieldId)).toHaveValue(subjectId);
  }

  /** Edit surface for an existing assessment; ready when the Risk Assessment ID field shows the id. */
  async openEdit(assessmentId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, this.routes.editPath(assessmentId));
    await expect(this.field('risk-questionnaire-id')).toHaveValue(assessmentId);
  }

  /** Read-only view surface for an existing assessment; ready when the Risk Assessment ID shows. */
  async openView(assessmentId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, this.routes.viewPath(assessmentId));
    await expect(this.field('risk-questionnaire-id')).toHaveValue(assessmentId);
  }

  // ---- questionnaire actions ----

  /**
   * Wait for the questionnaire body to render. The `open*` helpers only await the HEADER field, which is
   * populated by a different query than the template's question list — so a bare, non-retrying
   * `answerSelects.count()` can read 0 purely because the questions have not painted yet. Auto-retrying
   * so the wait is a real wait, not a race whose outcome depends on machine speed.
   */
  private async expectQuestionnaireRendered(): Promise<void> {
    await expect(
      this.answerSelects.first(),
      'expected the questionnaire to render answer selects',
    ).toBeVisible();
  }

  /** Answer one question by selecting a specific answer id (Carbon Select renders a native <select>). */
  async answer(questionId: number, answerId: number): Promise<void> {
    await this.answerSelect(questionId).selectOption(String(answerId));
  }

  /** Answer a fixed set of question -> answer pairs (the in-range set). */
  async answerAll(pairs: readonly { questionId: number; answerId: number }[]): Promise<void> {
    for (const { questionId, answerId } of pairs) {
      await this.answer(questionId, answerId);
    }
  }

  /**
   * Answer every rendered question EXCEPT the given one (left on its blank option) — drives the create
   * "all questions must be answered" gate. Uses the in-range pairs so the answered rows are valid.
   */
  async answerAllExcept(
    pairs: readonly { questionId: number; answerId: number }[],
    skipQuestionId: number,
  ): Promise<void> {
    for (const { questionId, answerId } of pairs) {
      if (questionId === skipQuestionId) continue;
      await this.answer(questionId, answerId);
    }
  }

  /** Clear every answer back to its blank option (drives the edit zero-answers divergence). */
  async clearAllAnswers(): Promise<void> {
    await this.expectQuestionnaireRendered();
    const count = await this.answerSelects.count();
    for (let i = 0; i < count; i += 1) {
      await this.answerSelects.nth(i).selectOption('');
    }
  }

  /**
   * Set the Comments field. `fill()` routes through the browser's text-insert path, so it honours the
   * TextArea's `maxLength` — over-typing past the cap keeps only the allowed length.
   */
  async setComments(value: string): Promise<void> {
    await this.commentsInput.fill(value);
  }

  async commentsValue(): Promise<string> {
    return this.commentsInput.inputValue();
  }

  async commentsMaxLength(): Promise<number> {
    return Number(await this.commentsInput.getAttribute('maxlength'));
  }

  // ---- buttons ----
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }
  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }
  async clickEdit(): Promise<void> {
    await this.editButton.click();
  }

  // ---- assertions ----
  async expectError(message: string): Promise<void> {
    await expect(this.errorBanner).toContainText(message);
  }

  /**
   * The client-side computed totals shown above Comments: `#risk-rating` is the grand total (the PRODUCT
   * of each section's summed answer weights — the same product rule the backend applies) and
   * `#max-risk-rating` its ceiling. Retrying `toHaveValue`, not an `inputValue()` snapshot: the total is
   * recomputed from React state on every answer change, so a bare read can land before the re-render.
   */
  async expectComputedTotals(total: string, maxTotal: string): Promise<void> {
    await expect(this.field('risk-rating')).toHaveValue(total);
    await expect(this.field('max-risk-rating')).toHaveValue(maxTotal);
  }

  /** The header field naming the subject (scaler licence / scale site id) shows the expected value. */
  async expectHeaderSubject(subjectId: string): Promise<void> {
    await expect(this.field(this.routes.headerFieldId)).toHaveValue(subjectId);
  }

  /**
   * Assert a set of read-only header "tombstone" fields by id -> expected value. The shared form renders
   * these from `config.headerFields` (e.g. the scaler's client / region / district); the subject page
   * objects name them in their own vocabulary. Kept generic here so both subjects reuse the one loop.
   */
  async expectHeaderFields(fields: readonly { id: string; value: string }[]): Promise<void> {
    for (const { id, value } of fields) {
      await expect(this.field(id)).toHaveValue(value);
    }
  }

  async expectAssessmentId(assessmentId: string): Promise<void> {
    await expect(this.field('risk-questionnaire-id')).toHaveValue(assessmentId);
  }

  /** Proves the read-only view: every answer <Select> and the Comments box are disabled. */
  async expectAllControlsReadOnly(): Promise<void> {
    await this.expectQuestionnaireRendered(); // same paint race as clearAllAnswers — wait, don't count blind
    const count = await this.answerSelects.count();
    for (let i = 0; i < count; i += 1) {
      await expect(this.answerSelects.nth(i)).toBeDisabled();
    }
    await expect(this.commentsInput).toBeDisabled();
  }

  /** View mode shows Back + Edit (no Save/Reset). */
  async expectViewActions(): Promise<void> {
    await expect(this.backButton).toBeVisible();
    await expect(this.editButton).toBeVisible();
    await expect(this.saveButton).toHaveCount(0);
  }

  /** Edit mode shows Back + Reset + Save (no Edit). */
  async expectEditActions(): Promise<void> {
    await expect(this.saveButton).toBeVisible();
    await expect(this.resetButton).toBeVisible();
    await expect(this.editButton).toHaveCount(0);
  }

  /** Still on the edit form (a rejected save did NOT navigate to the tab). */
  async expectStillOnEditForm(assessmentId: string): Promise<void> {
    await expect(this.page).toHaveURL(this.routes.editUrlPattern(assessmentId));
  }

  /** On the create form (used after clicking Add, and to prove a blocked save did not navigate away). */
  async expectOnCreateForm(): Promise<void> {
    await expect(this.page).toHaveURL(/\/risk-assessments\/create$/);
    await expect(this.saveButton).toBeVisible();
  }
}
