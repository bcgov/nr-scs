import type { FC } from 'react';

import RiskAssessmentForm from '@/components/Form/RiskAssessment';
import { scaleSiteRiskAssessmentConfig } from '@/components/Form/RiskAssessment/scaleSiteConfig';

const ScaleSiteRiskAssessmentEditPage: FC = () => (
  <RiskAssessmentForm
    config={scaleSiteRiskAssessmentConfig}
    mode="edit"
    title="Scale Site Risk Assessment - Edit"
  />
);

export default ScaleSiteRiskAssessmentEditPage;
