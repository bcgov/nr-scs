import { type Page } from '@playwright/test';

import { BaseRiskRatingTabPage } from './BaseRiskRatingTabPage';

/**
 * Scale Site view's RISK RATING tab (nr-scs `pages/View/ScaleSite/.../RiskRatingTab` -> shared
 * `pages/View/shared/RiskRatingTabView`, route `/scale-sites/view/:scaleSiteIdNmbr?tab=risk-rating`).
 * All behaviour lives in {@link BaseRiskRatingTabPage}; this subclass supplies only the scale-site view
 * route + empty message.
 */
export class ScaleSiteRiskRatingTabPage extends BaseRiskRatingTabPage {
  constructor(page: Page) {
    super(page, {
      viewPathname: (id) => `/scale-sites/view/${encodeURIComponent(id)}`,
      emptyMessage: 'No risk assessments found for this scale site.',
    });
  }
}
