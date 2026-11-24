import { Column, Grid, SkeletonText } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import { PERMISSIONS } from '@/context/auth/permissions';
import { usePermissions } from '@/context/auth/usePermissions';
import { useTabRouting } from '@/hooks/useTabRouting';
import API from '@/services/APIs';
import { extractApiError, isForbiddenError } from '@/utils/extractApiError';
import type { ScalerSummary } from '@/services/scalers.service';
import type { ScalerTombstone } from '@/services/scalersTombstone.types';

import ScalerHeader from './components/ScalerHeader';
import ScalerTabs from './components/ScalerTabs';
import { SCALER_TABS } from './components/scalerTabDefinitions';
import './index.scss';

const ScalerViewPage: React.FC = () => {
  const { scalerLicenceNo } = useParams<{ scalerLicenceNo: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const { can } = usePermissions();

  // Only the sections this user may see. Their slugs drive useTabRouting, so tab index and `?tab=`
  // stay aligned once a section is hidden — and a deep link to a hidden section (e.g. an Industry
  // Scaler opening ?tab=risk-rating) resolves to the first visible tab instead of a blank panel.
  const visibleTabs = React.useMemo(
    () => SCALER_TABS.filter((tab) => can(tab.permission)),
    [can],
  );
  const tabSlugs = React.useMemo(() => visibleTabs.map((tab) => tab.slug), [visibleTabs]);
  const { activeTabIndex, onTabChange } = useTabRouting(tabSlugs);

  const breadCrumbs = [
    { name: 'Scalers', ...(can(PERMISSIONS.SCALER_QUERY) ? { path: '/scalers' } : {}) },
    { name: scalerLicenceNo ? `Scaler ${scalerLicenceNo}` : 'Scaler' },
  ];

  const summaryQuery = useQuery<ScalerSummary, Error>({
    queryKey: ['scaler-summary', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      if (!scalerLicenceNo) {
        throw new Error('Scaler licence number is not provided');
      }
      return API.scalers.getScalerSummary(scalerLicenceNo, token);
    },
    enabled: Boolean(scalerLicenceNo),
  });

  const tombstoneQuery = useQuery<ScalerTombstone | null, Error>({
    queryKey: ['scaler-tombstone', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      if (!scalerLicenceNo) {
        throw new Error('Scaler licence number is not provided');
      }
      return API.scalers.getScalerTombstone(scalerLicenceNo, token);
    },
    enabled: Boolean(scalerLicenceNo),
  });

  if (summaryQuery.isLoading || tombstoneQuery.isLoading) {
    return (
      <Grid>
        <Column lg={16} md={8} sm={4}>
          <PageTitle title="Scaler Record" breadCrumbs={breadCrumbs} />
          <SkeletonText paragraph lineCount={6} />
        </Column>
      </Grid>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data || !scalerLicenceNo) {
    const denied = isForbiddenError(summaryQuery.error);
    return (
      <Grid>
        <Column lg={16} md={8} sm={4}>
          <PageTitle title="Scaler Record" breadCrumbs={breadCrumbs} />
          <EmptySection
            icon="WarningFilled"
            title="Could not load scaler"
            description={
              denied
                ? 'You do not have access to this record.'
                : extractApiError(summaryQuery.error, 'Could not retrieve scaler data.')
            }
            whiteLayer
          >
            <Button kind="secondary" type="button" onClick={() => navigate(-1)}>
              Back
            </Button>
          </EmptySection>
        </Column>
      </Grid>
    );
  }

  return (
    <Grid className="view-scaler">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Scaler Record" breadCrumbs={breadCrumbs} />
      </Column>

      <Column lg={16} md={8} sm={4} className="scs__tab-view__header-band">
        <ScalerHeader
          summary={summaryQuery.data}
          tombstone={tombstoneQuery.data}
          onSearch={() => navigate('/scalers')}
        />
      </Column>

      <Column lg={16} md={8} sm={4} className="scs__tab-view__tabs-col">
        <ScalerTabs
          activeTabIndex={activeTabIndex}
          onTabChange={onTabChange}
          scalerLicenceNo={scalerLicenceNo}
          summary={summaryQuery.data}
          tabs={visibleTabs}
        />
      </Column>
    </Grid>
  );
};

export default ScalerViewPage;
