import { Column, Grid } from '@carbon/react';
import { type FC } from 'react';

import EmptySection from '@/components/core/EmptySection';
import PageTitle from '@/components/core/PageTitle';

type UnderConstructionPageProps = {
  title: string;
  breadCrumbs?: { name: string; path?: string }[];
};

const UnderConstructionPage: FC<UnderConstructionPageProps> = ({ title, breadCrumbs }) => {
  return (
    <Grid>
      <PageTitle title={title} subtitle="This page is under construction." breadCrumbs={breadCrumbs} />
      <Column lg={16} md={8} sm={4}>
        <EmptySection
          pictogram="Tools"
          title="Under construction"
          description="This feature hasn’t been implemented yet."
          whiteLayer
        />
      </Column>
    </Grid>
  );
};

export default UnderConstructionPage;
