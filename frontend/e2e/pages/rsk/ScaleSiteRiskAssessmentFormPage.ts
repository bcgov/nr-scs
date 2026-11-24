import { type Page } from '@playwright/test';

import { BaseRiskAssessmentFormPage } from './BaseRiskAssessmentFormPage';

/**
 * Scale Site Risk Assessment FORM (nr-scs `components/Form/RiskAssessment` fed by `scaleSiteConfig.ts`).
 * All behaviour lives in {@link BaseRiskAssessmentFormPage}; this subclass supplies only the scale-site
 * routes + header field, which differ from the scaler subject:
 *   - create: `/scale-sites/:scaleSiteIdNmbr/risk-assessments/create` (header from create-init)
 *   - edit:   `/scale-site-risk-assessments/edit/:riskQuestionnaireId`
 *   - view:   `/scale-site-risk-assessments/view/:riskQuestionnaireId` (read-only + an Edit button)
 */
export class ScaleSiteRiskAssessmentFormPage extends BaseRiskAssessmentFormPage {
  constructor(page: Page) {
    super(page, {
      createPath: (id) => `/scale-sites/${encodeURIComponent(id)}/risk-assessments/create`,
      editPath: (id) => `/scale-site-risk-assessments/edit/${encodeURIComponent(id)}`,
      viewPath: (id) => `/scale-site-risk-assessments/view/${encodeURIComponent(id)}`,
      headerFieldId: 'scale-site-id-nmbr',
      editUrlPattern: (id) => new RegExp(`/scale-site-risk-assessments/edit/${id}$`),
    });
  }

  /** Subject-named alias kept for the scale-site steps' domain vocabulary (delegates to the base). */
  async expectHeaderSite(scaleSiteIdNmbr: string): Promise<void> {
    await this.expectHeaderSubject(scaleSiteIdNmbr);
  }
}
