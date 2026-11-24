import { type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LetterOptionsPage from '../components/LetterOptionsPage';

import API from '@/services/APIs';

const ScaleSiteAuthorizationLetterPage: FC = () => {
  const { scaleSiteAuthorizationId } = useParams<{ scaleSiteAuthorizationId: string }>();
  const navigate = useNavigate();
  const letterId = Number(scaleSiteAuthorizationId ?? 0);

  return (
    <LetterOptionsPage
      title="Scale Site Authorization Letter Options"
      reportBaseName={`Scale-Site-Authorization-Letter-${letterId}`}
      letterId={letterId}
      signatureLabel="Show Scale Site Authorization Signature"
      onBack={() => navigate(-1)}
      createLetter={(id, payload, token) => API.scaleSiteAuthorizations.createScaleSiteAuthorizationLetter(id, payload, token)}
    />
  );
};

export default ScaleSiteAuthorizationLetterPage;
