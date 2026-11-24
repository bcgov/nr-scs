import { PERMISSIONS } from '@/context/auth/permissions';
import { type FC } from "react";

import RiskRatingTabView from "@/pages/View/shared/RiskRatingTabView";
import API from "@/services/APIs";

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

const RiskRatingTab: FC<Props> = ({ isActive, scalerLicenceNo }) => (
  <RiskRatingTabView
    isActive={isActive}
    entityId={scalerLicenceNo}
    queryKeyPrefix="scaler-risk-ratings"
    loadRatings={(id, token) =>
      API.scalerRiskAssessments.getScalerRiskRatings(id, token)
    }
    viewPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_READ}
    createPermission={PERMISSIONS.SCALER_RISK_ASSESSMENT_CREATE}
    assessmentViewPath={(id) =>
      `/scaler-risk-assessments/view/${encodeURIComponent(String(id))}`
    }
    emptyMessage="No risk assessments found for this scaler."
    notificationClassName="view-scaler__notification"
    createPath={`/scalers/${encodeURIComponent(scalerLicenceNo)}/risk-assessments/create`}
  />
);

export default RiskRatingTab;
