import { type FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LetterOptionsPage from '../components/LetterOptionsPage';

import API from '@/services/APIs';

const MarkSiteDesignationLetterPage: FC = () => {
  const { haulingMarkAuthorizationId } = useParams<{ haulingMarkAuthorizationId: string }>();
  const navigate = useNavigate();
  const letterId = Number(haulingMarkAuthorizationId ?? 0);

  return (
    <LetterOptionsPage
      title="Mark Site Designation Letter Options"
      reportBaseName={`Mark-Site-Designation-Letter-${letterId}`}
      letterId={letterId}
      showSignatureBlockToggle={false}
      onBack={() => navigate(-1)}
      createLetter={(id, payload, token) => API.markSiteDesignation.createMarkSiteDesignationLetter(id, payload, token)}
    />
  );
};

export default MarkSiteDesignationLetterPage;
