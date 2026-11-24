import { PERMISSIONS } from '@/context/auth/permissions';
import API from '@/services/APIs';
import type { ScalerRiskAssessmentDetail } from '@/services/scalerRiskAssessments.service';

import type { RiskAssessmentFormConfig } from './index';

/** Scaler-specific labels, routes, API calls, and header fields for the shared edit/view page. */
export const scalerRiskAssessmentConfig: RiskAssessmentFormConfig<ScalerRiskAssessmentDetail> = {
  listLabel: 'Scaler Risk Assessments',
  listPath: '/scaler-risk-assessments',
  updatePermission: PERMISSIONS.SCALER_RISK_ASSESSMENT_UPDATE,
  recordSectionTitle: 'Scaler Record',
  getAssessment: (id, token) => API.scalerRiskAssessments.getScalerRiskAssessment(id, token),
  updateAssessment: (id, request, token) =>
    API.scalerRiskAssessments.updateScalerRiskAssessment(id, request, token),
  createInit: (scalerLicenceNo, token) =>
    API.scalerRiskAssessments.getScalerRiskAssessmentCreateInit(scalerLicenceNo, token),
  create: (scalerLicenceNo, request, token) =>
    API.scalerRiskAssessments.createScalerRiskAssessment(scalerLicenceNo, request, token),
  riskRatingsQueryKey: (scalerLicenceNo) => ['scaler-risk-ratings', scalerLicenceNo.trim()],
  entityIdFromDetail: (detail) => detail.scalerLicenceNo,
  createReturnPath: (scalerLicenceNo) =>
    `/scalers/view/${encodeURIComponent(scalerLicenceNo)}?tab=risk-rating`,
  createBreadcrumbs: (scalerLicenceNo) => [
    { name: 'Scalers', path: '/scalers' },
    {
      name: `Scaler ${scalerLicenceNo}`,
      path: `/scalers/view/${encodeURIComponent(scalerLicenceNo)}?tab=risk-rating`,
    },
    { name: 'Create' },
  ],
  headerFields: (detail) => [
    { id: 'scaler-licence-no', label: 'Licence #', value: detail?.scalerLicenceNo ?? '' },
    { id: 'client-name', label: 'Name', value: detail?.clientName ?? '' },
    { id: 'region-name', label: 'Region', value: detail?.regionName ?? '' },
    { id: 'district-name', label: 'District', value: detail?.districtName ?? '' },
  ],
  successRedirect: (detail) =>
    detail.scalerLicenceNo
      ? `/scalers/view/${encodeURIComponent(detail.scalerLicenceNo)}?tab=risk-rating`
      : '/scaler-risk-assessments',
};
