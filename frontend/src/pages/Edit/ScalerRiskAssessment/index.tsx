import type { FC } from 'react';

import RiskAssessmentForm from '@/components/Form/RiskAssessment';
import { scalerRiskAssessmentConfig } from '@/components/Form/RiskAssessment/scalerConfig';

const ScalerRiskAssessmentEditPage: FC = () => (
  <RiskAssessmentForm
    config={scalerRiskAssessmentConfig}
    mode="edit"
    title="Scaler Risk Assessment - Edit"
  />
);

export default ScalerRiskAssessmentEditPage;
