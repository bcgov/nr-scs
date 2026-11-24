import React from 'react';
import { Column, Grid } from '@carbon/react';
import { useSearchParams } from 'react-router-dom';

import PageTitle from '@/components/core/PageTitle';

const ScalerSummaryViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const scalerLicenceNo = searchParams.get('scalerLicenceNo') ?? '';

  return (
    <Grid className="view-scaler-summary">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Scaler Record"
          breadCrumbs={[
            { name: 'Queries' },
            { name: 'Scalers', path: '/scalers' },
            {
              name: 'Scaler Record',
              path: scalerLicenceNo
                ? `/scalers/summary?scalerLicenceNo=${encodeURIComponent(scalerLicenceNo)}`
                : '/scalers/summary',
            },
          ]}
          experimental
        />
      </Column>

      <Column lg={16} md={8} sm={4}>
        <p>
          Licence #: {scalerLicenceNo || 'Not provided'}
        </p>
      </Column>
    </Grid>
  );
};

export default ScalerSummaryViewPage;
