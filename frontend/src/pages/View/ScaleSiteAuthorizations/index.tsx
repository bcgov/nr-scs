import { type FC } from 'react';

import UnderConstructionPage from '@/pages/UnderConstruction';

const ScaleSiteAuthorizationsPage: FC = () => {
  return (
    <UnderConstructionPage
      title="Scale Site Authorizations"
      breadCrumbs={[
        {name: 'Create'},
        { name: 'Scale Site Authorizations', path: '/scale-site-authorizations' },
        { name: 'Scale Site Authorization' },
      ]}
    />
  );
};

export default ScaleSiteAuthorizationsPage;
