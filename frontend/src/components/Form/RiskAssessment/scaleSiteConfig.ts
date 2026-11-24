import { PERMISSIONS } from '@/context/auth/permissions';
import API from '@/services/APIs';
import type { ScaleSiteRiskAssessmentDetail } from '@/services/scaleSiteRiskAssessments.service';

import type { RiskAssessmentFormConfig } from './index';

/** Scale-site-specific labels, routes, API calls, and header fields for the shared edit/view page. */
export const scaleSiteRiskAssessmentConfig: RiskAssessmentFormConfig<ScaleSiteRiskAssessmentDetail> = {
  listLabel: 'Scale Site Risk Assessments',
  listPath: '/scale-site-risk-assessments',
  updatePermission: PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_UPDATE,
  recordSectionTitle: 'Scale Site Record',
  getAssessment: (id, token) => API.scaleSiteRiskAssessments.getScaleSiteRiskAssessment(id, token),
  updateAssessment: (id, request, token) =>
    API.scaleSiteRiskAssessments.updateScaleSiteRiskAssessment(id, request, token),
  createInit: (scaleSiteIdNmbr, token) =>
    API.scaleSiteRiskAssessments.getScaleSiteRiskAssessmentCreateInit(scaleSiteIdNmbr, token),
  create: (scaleSiteIdNmbr, request, token) =>
    API.scaleSiteRiskAssessments.createScaleSiteRiskAssessment(scaleSiteIdNmbr, request, token),
  riskRatingsQueryKey: (scaleSiteIdNmbr) => ['scale-site-risk-ratings', scaleSiteIdNmbr.trim()],
  entityIdFromDetail: (detail) => detail.scaleSiteIdNmbr,
  createReturnPath: (scaleSiteIdNmbr) =>
    `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=risk-rating`,
  createBreadcrumbs: (scaleSiteIdNmbr) => [
    { name: 'Scale Sites', path: '/scale-sites' },
    {
      name: `Scale Site ${scaleSiteIdNmbr}`,
      path: `/scale-sites/view/${encodeURIComponent(scaleSiteIdNmbr)}?tab=risk-rating`,
    },
    { name: 'Create' },
  ],
  headerFields: (detail) => [
    { id: 'scale-site-id-nmbr', label: 'Scale Site #', value: detail?.scaleSiteIdNmbr ?? '' },
    { id: 'site-name', label: 'Site Name', value: detail?.siteName ?? '' },
    { id: 'region-name', label: 'Region', value: detail?.regionName ?? '' },
    { id: 'district-name', label: 'District', value: detail?.districtName ?? '' },
  ],
  successRedirect: (detail) =>
    detail.scaleSiteIdNmbr
      ? `/scale-sites/view/${encodeURIComponent(detail.scaleSiteIdNmbr)}?tab=risk-rating`
      : '/scale-site-risk-assessments',
};
