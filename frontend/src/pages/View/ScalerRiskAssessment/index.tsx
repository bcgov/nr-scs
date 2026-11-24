import type { FC } from 'react';

import RiskAssessmentForm from '@/components/Form/RiskAssessment';
import { scalerRiskAssessmentConfig } from '@/components/Form/RiskAssessment/scalerConfig';

const ScalerRiskAssessmentViewPage: FC = () => (
  <RiskAssessmentForm
    config={scalerRiskAssessmentConfig}
    mode="view"
    title="Scaler Risk Assessment - View"
  />
);

export default ScalerRiskAssessmentViewPage;
