import { type Page, type Locator, expect } from '@playwright/test';

import { loginAsMockScsUser, clientSideNavigate } from '../common/authNav';

/**
 * Per-subject config for {@link BaseRiskRatingTabPage}. The Scaler and Scale Site view pages render the
 * SAME shared Risk Rating tab (`pages/View/shared/RiskRatingTabView`): identical "Add Risk Assessment"
 * button, read-only `RiskRatingTable` (Rating/Level columns), and Assessment-ID row links. They differ
 * only by the view route and the empty-list message.
 */
export interface RiskTabRoutes {
  /** The subject view page's pathname (e.g. `/scalers/view/019D`), WITHOUT the `?tab=risk-rating`. */
  viewPathname(subjectId: string): string;
  /** The empty-state text the shared tab renders when the subject has no assessments. */
  emptyMessage: string;
}

const TAB_QUERY = 'risk-rating';

/**
 * Shared page object for the subject view's RISK RATING tab — the entry point of the create flow (open
 * subject -> Risk Rating tab -> Add Risk Assessment). All logic lives here once; the scaler and scale-site
 * subjects supply only their view route + empty message via {@link RiskTabRoutes}.
 */
export abstract class BaseRiskRatingTabPage {
  constructor(
    protected readonly page: Page,
    private readonly routes: RiskTabRoutes,
  ) {}

  private get addAssessmentButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Risk Assessment' });
  }

  /** Log in, then client-side navigate to the subject's Risk Rating tab; wait for the Add button. */
  async open(subjectId: string): Promise<void> {
    await loginAsMockScsUser(this.page);
    await clientSideNavigate(this.page, `${this.routes.viewPathname(subjectId)}?tab=${TAB_QUERY}`);
    await expect(this.addAssessmentButton).toBeVisible();
  }

  /** The empty-list state (subject has no risk assessments). */
  async expectEmptyList(): Promise<void> {
    await expect(this.page.getByText(this.routes.emptyMessage)).toBeVisible();
  }

  /**
   * Assert we are ON this subject's Risk Rating tab — the landing after create-save, edit-save and Back.
   * Asserts the URL, not just the Add button: that button renders on EVERY subject's risk-rating tab, so
   * it cannot tell a correct landing from a landing on the wrong subject, and edit's `successRedirect`
   * silently falls back to the list route when the detail's subject id is missing. A URL predicate (not a
   * regex) so the `?` needs no escaping and query-param order doesn't matter. The Add-button wait stays as
   * the "tab has finished rendering" signal.
   */
  async expectOnTab(subjectId: string): Promise<void> {
    await expect(this.page).toHaveURL(
      (url) =>
        url.pathname === this.routes.viewPathname(subjectId) &&
        url.searchParams.get('tab') === TAB_QUERY,
    );
    await expect(this.addAssessmentButton).toBeVisible();
  }

  /** Click Add Risk Assessment (navigates to the routed create page). */
  async clickAddAssessment(): Promise<void> {
    await this.addAssessmentButton.click();
  }

  /** The Assessment ID cell renders a RouterLink whose text is the assessment id. */
  private assessmentLink(assessmentId: string): Locator {
    return this.page.getByRole('link', { name: assessmentId, exact: true });
  }

  /** The table row carrying a given assessment's link (scoped by id — parallel-safe vs a count). */
  private assessmentRow(assessmentId: string): Locator {
    return this.page.locator('tr', { has: this.assessmentLink(assessmentId) });
  }

  /**
   * Assert a specific assessment is listed with its Rating + Level columns rendered. Scoped to the row
   * carrying that id, so it is robust to other rows a parallel scenario might add on the same subject.
   */
  async expectAssessmentListed(
    assessmentId: string,
    columns: { rating: string; level: string },
  ): Promise<void> {
    const row = this.assessmentRow(assessmentId);
    await expect(row).toBeVisible();
    await expect(row).toContainText(columns.rating);
    await expect(row).toContainText(columns.level);
  }

  /** Assert NO row carries the given assessment id (the discard/back path created nothing). */
  async expectAssessmentNotListed(assessmentId: string): Promise<void> {
    await expect(this.assessmentLink(assessmentId)).toHaveCount(0);
  }

  /** Open an assessment via its Assessment ID link (row-link -> view hop). */
  async openAssessment(assessmentId: string): Promise<void> {
    await this.assessmentLink(assessmentId).click();
  }
}
