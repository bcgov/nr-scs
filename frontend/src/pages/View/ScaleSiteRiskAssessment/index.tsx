import type { FC } from 'react';

import RiskAssessmentForm from '@/components/Form/RiskAssessment';
import { scaleSiteRiskAssessmentConfig } from '@/components/Form/RiskAssessment/scaleSiteConfig';

const ScaleSiteRiskAssessmentViewPage: FC = () => (
  <RiskAssessmentForm
    config={scaleSiteRiskAssessmentConfig}
    mode="view"
    title="Scale Site Risk Assessment - View"
  />
);

export default ScaleSiteRiskAssessmentViewPage;
