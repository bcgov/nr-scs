import { type Page } from '@playwright/test';

import { BaseRiskRatingTabPage } from './BaseRiskRatingTabPage';

/**
 * Scaler view's RISK RATING tab (nr-scs `pages/View/Scaler/.../RiskRatingTab` -> shared
 * `pages/View/shared/RiskRatingTabView`, route `/scalers/view/:scalerLicenceNo?tab=risk-rating`).
 * All behaviour lives in {@link BaseRiskRatingTabPage}; this subclass supplies only the scaler view route
 * + empty message.
 */
export class ScalerRiskRatingTabPage extends BaseRiskRatingTabPage {
  constructor(page: Page) {
    super(page, {
      viewPathname: (id) => `/scalers/view/${encodeURIComponent(id)}`,
      emptyMessage: 'No risk assessments found for this scaler.',
    });
  }
}
