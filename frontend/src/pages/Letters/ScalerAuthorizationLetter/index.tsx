import { type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LetterOptionsPage from '../components/LetterOptionsPage';

import API from '@/services/APIs';

const ScalerAuthorizationLetterPage: FC = () => {
  const { scalerAuthorizationId } = useParams<{ scalerAuthorizationId: string }>();
  const navigate = useNavigate();
  const letterId = Number(scalerAuthorizationId ?? 0);

  return (
    <LetterOptionsPage
      title="Scaler Authorization Letter Options"
      reportBaseName={`Scaler-Authorization-Letter-${letterId}`}
      letterId={letterId}
      signatureLabel="Show Scaler Authorization Signature"
      onBack={() => navigate(-1)}
      createLetter={(id, payload, token) => API.scalerAuthorizations.createScalerAuthorizationLetter(id, payload, token)}
    />
  );
};

export default ScalerAuthorizationLetterPage;
