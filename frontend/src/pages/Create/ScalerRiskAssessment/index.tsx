import type { FC } from 'react';
import { useParams } from 'react-router-dom';

import RiskAssessmentForm from '@/components/Form/RiskAssessment';
import { scalerRiskAssessmentConfig } from '@/components/Form/RiskAssessment/scalerConfig';

const ScalerRiskAssessmentCreatePage: FC = () => {
  const { scalerLicenceNo } = useParams<{ scalerLicenceNo: string }>();

  return (
    <RiskAssessmentForm
      config={scalerRiskAssessmentConfig}
      mode="create"
      entityId={scalerLicenceNo}
      title="Scaler Risk Assessment - Create"
    />
  );
};

export default ScalerRiskAssessmentCreatePage;
