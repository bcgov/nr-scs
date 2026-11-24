import type { FC } from 'react';
import { useParams } from 'react-router-dom';

import RiskAssessmentForm from '@/components/Form/RiskAssessment';
import { scaleSiteRiskAssessmentConfig } from '@/components/Form/RiskAssessment/scaleSiteConfig';

const ScaleSiteRiskAssessmentCreatePage: FC = () => {
  const { scaleSiteIdNmbr } = useParams<{ scaleSiteIdNmbr: string }>();

  return (
    <RiskAssessmentForm
      config={scaleSiteRiskAssessmentConfig}
      mode="create"
      entityId={scaleSiteIdNmbr}
      title="Scale Site Risk Assessment - Create"
    />
  );
};

export default ScaleSiteRiskAssessmentCreatePage;
