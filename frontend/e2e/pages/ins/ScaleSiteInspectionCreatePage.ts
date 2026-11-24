import { type Page, type Locator, expect } from '@playwright/test';

import {
  loginAsMockScsUser,
  clientSideNavigate,
  setDateField,
} from '../common/authNav';
import { escapeRegExp } from '../common/urlMatch';
import { SCREEN_READY_TIMEOUT_MS } from '../common/readiness';

/**
 * The Stage-1 "Inspection Type" `<Select>` — the create screen's readiness marker, and the ONE home for
 * that selector (the Inspections tab's "Add Inspection" hop waits on the same element, so it imports
 * this rather than re-inlining the id).
 */
export const INSPECTION_CREATE_READY_SELECTOR = '#inspection-type-code';

/**
 * Wait for the create screen's Stage 1 to actually paint. It needs the shared data-gated bound rather
 * than the default 10s because the screen renders a `SkeletonText` until BOTH its LOV queries resolve
 * (`Create/ScaleSiteInspection/index.tsx:857,905`) — see `pages/common/readiness.ts`.
 */
export async function expectInspectionCreateScreenReady(page: Page): Promise<void> {
  await expect(page.locator(INSPECTION_CREATE_READY_SELECTOR)).toBeVisible({
    timeout: SCREEN_READY_TIMEOUT_MS,
  });
}

/**
 * Page object for the two-stage Site Inspection CREATE screen
 * (nr-scs `pages/Create/ScaleSiteInspection`, route `/scale-sites/:id/inspections/create`).
 *
 * Stage 1 ("Choose your inspection parameters"): Inspection Type <Select> + Site Type checkbox group,
 * then Next. Stage 2: the ScaleSiteInspectionDetails form + the ScaleSiteInspectionQuestions matrix,
 * then Save Record. Selectors are the stable ids the app renders; the mock-auth login + client-side nav
 * dances come from the shared cross-domain helper (reuse over duplication).
 */
export class ScaleSiteInspectionCreatePage {
  constructor(private readonly page: Page) {}

  // ---- Stage 1 locators ----
  private get inspectionTypeSelect(): Locator {
    return this.page.locator(INSPECTION_CREATE_READY_SELECTOR);
  }
  private siteTypeCheckbox(code: string): Locator {
    return this.page.locator(`#site-type-code-${code}`);
  }
  private get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next' });
  }

  // ---- Stage 2 locators ----
  private get siteOperatorPresentSelect(): Locator {
    return this.page.locator('#site-operator-present');
  }
  private get inspectorInput(): Locator {
    return this.page.locator('#inspector');
  }
  private get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save Record' });
  }
  private get resetButton(): Locator {
    return this.page.getByRole('button', { name: 'Reset' });
  }
  private get backButton(): Locator {
    return this.page.getByRole('button', { name: 'Back' });
  }
  /** All per-question Answer <Select>s, in render order (ids are `question-answer-<questionId>`). */
  private get answerSelects(): Locator {
    return this.page.locator('select[id^="question-answer-"]');
  }
  private get followUpRequiredSelects(): Locator {
    return this.page.locator('select[id^="question-follow-up-required-"]');
  }

  /** Log in, then client-side navigate to the create screen for a site; wait for Stage 1 to paint. */
  async open(scaleSiteIdNmbr: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(
      this.page,
      `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/create`,
    );
    await expectInspectionCreateScreenReady(this.page);
  }

  // ---- Stage 1 actions ----
  async selectInspectionType(code: string): Promise<void> {
    await this.inspectionTypeSelect.selectOption(code);
  }

  async checkSiteType(code: string): Promise<void> {
    // force: Carbon renders the real <input type="checkbox"> visually hidden behind a styled <label>,
    // so Playwright's actionability "visible" check fails on the input itself; the label is what a user
    // clicks. Toggling the input directly (force) is the stable way to set a Carbon checkbox by id.
    await this.siteTypeCheckbox(code).check({ force: true });
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /** Stage 1 -> Stage 2: choose type + site type(s) + Next, and wait for the details form to paint. */
  async completeStageOne(inspectionTypeCode: string, siteTypeCodes: string[]): Promise<void> {
    await this.selectInspectionType(inspectionTypeCode);
    for (const code of siteTypeCodes) {
      await this.checkSiteType(code);
    }
    await this.clickNext();
    await this.expectStageTwo();
  }

  async expectStageOne(): Promise<void> {
    // Prove we are on Stage 1 AND that Stage 2 did NOT load (the details form is absent) — so a blocked
    // Next / a Back genuinely stayed on the parameters step rather than silently advancing.
    await expect(this.inspectionTypeSelect).toBeVisible();
    await expect(this.siteOperatorPresentSelect).toBeHidden();
  }

  async expectStageTwo(): Promise<void> {
    // Stage 2 paints only once the create-init query resolves (it carries the question set), so this is
    // a data-gated readiness gate and takes the shared generous bound.
    await expect(this.siteOperatorPresentSelect).toBeVisible({ timeout: SCREEN_READY_TIMEOUT_MS });
  }

  // ---- Stage 1 assertions (S10 automated → Weight-Scale-only) ----
  async expectSiteTypeChecked(code: string): Promise<void> {
    await expect(this.siteTypeCheckbox(code)).toBeChecked();
  }
  async expectSiteTypeDisabled(code: string): Promise<void> {
    await expect(this.siteTypeCheckbox(code)).toBeDisabled();
  }
  async inspectionTypeValue(): Promise<string> {
    return this.inspectionTypeSelect.inputValue();
  }

  /** Current value of any Stage 2 field by its element id (used by the Reset assertion). */
  async fieldValueById(id: string): Promise<string> {
    return this.page.locator(`#${id}`).inputValue();
  }

  // ---- Stage 2 actions ----
  async setSiteOperatorPresent(value: 'Yes' | 'No'): Promise<void> {
    await this.siteOperatorPresentSelect.selectOption(value === 'Yes' ? 'Y' : 'N');
  }
  async fillInspector(guid: string): Promise<void> {
    await this.inspectorInput.fill(guid);
  }
  async setInspectionDate(value: string): Promise<void> {
    await setDateField(this.page, '#inspection-date', value);
  }
  async setComments(value: string): Promise<void> {
    await this.page.locator('#inspection-comments').fill(value);
  }

  /** Answer EVERY rendered question with `code` (dynamic — no hard-coded question ids/count). */
  async answerAllQuestions(code: string): Promise<void> {
    const count = await this.answerSelects.count();
    expect(count, 'create-init returned no questions to answer').toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await this.answerSelects.nth(i).selectOption(code);
    }
  }

  /** Set the follow-up-required flag on the Nth question (used to drive the S07 inconsistency). */
  async setQuestionFollowUpRequired(index: number, value: 'Yes' | 'No'): Promise<void> {
    await this.followUpRequiredSelects.nth(index).selectOption(value === 'Yes' ? 'Y' : 'N');
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }
  async clickReset(): Promise<void> {
    await this.resetButton.click();
  }
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  /**
   * Fill a full, valid Stage 2 for the happy path: site-operator present, real inspector GUID,
   * today-relative past inspection date, and an answer for every question. Follow-up stays "N"
   * (the create-init default), so no follow-up detail is required.
   */
  async fillValidStageTwo(opts: {
    inspectorGuid: string;
    siteOperatorPresent: 'Yes' | 'No';
    inspectionDate: string;
    answerCode: string;
    comments?: string;
  }): Promise<void> {
    await this.setSiteOperatorPresent(opts.siteOperatorPresent);
    await this.fillInspector(opts.inspectorGuid);
    await this.setInspectionDate(opts.inspectionDate);
    if (opts.comments) {
      await this.setComments(opts.comments);
    }
    await this.answerAllQuestions(opts.answerCode);
  }

  /** After a successful Save the app redirects to the view route; return the new inspection id. */
  async waitForCreatedInspectionId(scaleSiteIdNmbr: string): Promise<string> {
    const re = new RegExp(
      `/scale-sites/${escapeRegExp(scaleSiteIdNmbr)}/inspections/view/(\\d+)$`,
    );
    await expect(this.page).toHaveURL(re);
    const match = this.page.url().match(re);
    if (!match) {
      throw new Error(`Could not extract inspection id from URL ${this.page.url()}`);
    }
    return match[1];
  }

}
