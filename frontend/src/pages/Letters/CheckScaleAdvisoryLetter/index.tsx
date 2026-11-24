import { type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LetterOptionsPage from '../components/LetterOptionsPage';

import API from '@/services/APIs';

const CheckScaleAdvisoryLetterPage: FC = () => {
  const { checkScaleId } = useParams<{ checkScaleId: string }>();
  const navigate = useNavigate();
  const letterId = Number(checkScaleId ?? 0);

  return (
    <LetterOptionsPage
      title="Check Scale Advisory Letter Options"
      reportBaseName={`Check-Scale-Advisory-Letter-${letterId}`}
      letterId={letterId}
      showSignatureBlockToggle={false}
      allowEmptySignatory={true}
      onBack={() => navigate(-1)}
      createLetter={(id, payload, token) => API.checkScale.createCheckScaleAdvisoryLetter(id, payload, token)}
    />
  );
};

export default CheckScaleAdvisoryLetterPage;
