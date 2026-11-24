import { type Page } from '@playwright/test';

import { BaseRiskAssessmentFormPage } from './BaseRiskAssessmentFormPage';

/**
 * Scaler Risk Assessment FORM (nr-scs `components/Form/RiskAssessment` fed by `scalerConfig.ts`). All
 * behaviour lives in {@link BaseRiskAssessmentFormPage}; this subclass supplies only the scaler routes +
 * header field, which differ from the scale-site subject:
 *   - create: `/scalers/:scalerLicenceNo/risk-assessments/create` (header from create-init)
 *   - edit:   `/scaler-risk-assessments/edit/:riskQuestionnaireId`
 *   - view:   `/scaler-risk-assessments/view/:riskQuestionnaireId` (read-only + an Edit button)
 * The subject is a scaler LICENCE NO (e.g. "019D") shown in the `#scaler-licence-no` header field.
 */
export class ScalerRiskAssessmentFormPage extends BaseRiskAssessmentFormPage {
  constructor(page: Page) {
    super(page, {
      createPath: (id) => `/scalers/${encodeURIComponent(id)}/risk-assessments/create`,
      editPath: (id) => `/scaler-risk-assessments/edit/${encodeURIComponent(id)}`,
      viewPath: (id) => `/scaler-risk-assessments/view/${encodeURIComponent(id)}`,
      headerFieldId: 'scaler-licence-no',
      editUrlPattern: (id) => new RegExp(`/scaler-risk-assessments/edit/${id}$`),
    });
  }

  /** Subject-named alias for the scaler steps' domain vocabulary (delegates to the base). */
  async expectHeaderScaler(scalerLicenceNo: string): Promise<void> {
    await this.expectHeaderSubject(scalerLicenceNo);
  }

  /**
   * Assert the scaler record tombstone header the shared form renders from `scalerConfig.headerFields`
   * (`#client-name` / `#region-name` / `#district-name`). The licence field (`#scaler-licence-no`) is
   * asserted separately by {@link expectHeaderScaler} and the `open*` readiness checks. Populated on the
   * create surface from create-init's tombstone and on view/edit from the assessment detail, so it verifies
   * the same three fields on every surface.
   */
  async expectScalerRecordHeader(record: {
    clientName: string;
    regionName: string;
    districtName: string;
  }): Promise<void> {
    await this.expectHeaderFields([
      { id: 'client-name', value: record.clientName },
      { id: 'region-name', value: record.regionName },
      { id: 'district-name', value: record.districtName },
    ]);
  }
}
