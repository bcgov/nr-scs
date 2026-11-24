import { PERMISSIONS } from '@/context/auth/permissions';
import { type FC } from "react";

import RiskRatingTabView from "@/pages/View/shared/RiskRatingTabView";
import API from "@/services/APIs";

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const RiskRatingTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => (
  <RiskRatingTabView
    isActive={isActive}
    entityId={scaleSiteIdNmbr}
    queryKeyPrefix="scale-site-risk-ratings"
    loadRatings={(id, token) =>
      API.scaleSiteRiskAssessments.getScaleSiteRiskRatings(id, token)
    }
    viewPermission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_READ}
    createPermission={PERMISSIONS.SCALE_SITE_RISK_ASSESSMENT_CREATE}
    assessmentViewPath={(id) =>
      `/scale-site-risk-assessments/view/${encodeURIComponent(String(id))}`
    }
    emptyMessage="No risk assessments found for this scale site."
    notificationClassName="scs__notification"
    createPath={`/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/risk-assessments/create`}
  />
);

export default RiskRatingTab;
