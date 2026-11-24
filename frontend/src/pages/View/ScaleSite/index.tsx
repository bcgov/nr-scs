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
import { isForbiddenError } from '@/utils/extractApiError';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleSiteSummary, ScaleSiteTombstone } from '@/services/scaleSites.service';

import ScaleSiteHeader from './components/ScaleSiteHeader';
import ScaleSiteTabs from './components/ScaleSiteTabs';
import { SCALE_SITE_TABS } from './components/scaleSiteTabDefinitions';
import { firstErrorMessage } from './utils';

import './index.scss';

interface SiteTypeLovData {
  priorityLovs: StaticLov[];
  scaleMethodTypeLovs: StaticLov[];
}

const ScaleSiteViewPage: React.FC = () => {
  const { scaleSiteIdNmbr } = useParams<{ scaleSiteIdNmbr: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const { can } = usePermissions();

  // Only the sections this user may see. Their slugs drive useTabRouting, so tab index and `?tab=`
  // stay aligned once a section is hidden — and a deep link to a hidden section resolves to the first
  // visible tab instead of a blank panel.
  const visibleTabs = React.useMemo(
    () => SCALE_SITE_TABS.filter((tab) => can(tab.permission)),
    [can],
  );
  const tabSlugs = React.useMemo(() => visibleTabs.map((tab) => tab.slug), [visibleTabs]);
  const { activeTabIndex, onTabChange } = useTabRouting(tabSlugs);
  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr?.trim() ?? '';
  const hasValidScaleSiteId = normalizedScaleSiteIdNmbr.length > 0;
  const canReadSummary = can(PERMISSIONS.SCALE_SITE_SUMMARY_READ);

  const summaryQuery = useQuery<ScaleSiteSummary, Error>({
    queryKey: ['scale-site-summary', normalizedScaleSiteIdNmbr],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSites.getScaleSiteSummary(normalizedScaleSiteIdNmbr, token);
    },
    enabled: hasValidScaleSiteId && canReadSummary,
  });
  const tombstoneQuery = useQuery<ScaleSiteTombstone, Error>({
    queryKey: ['scale-site-tombstone', normalizedScaleSiteIdNmbr],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSites.getScaleSiteTombstone(normalizedScaleSiteIdNmbr, token);
    },
    enabled: hasValidScaleSiteId,
  });
  const siteTypeLovsQuery = useQuery<SiteTypeLovData, Error>({
    queryKey: ['scale-site-summary-site-type-lovs'],
    queryFn: async () => {
      const token = await userToken();
      const [priorityLovs, scaleMethodTypeLovs] = await Promise.all([
        API.lov.getStaticLov({ tableKey: 'SCALE_SITE_PRIORITY_CODE' }, token),
        API.lov.getStaticLov({ tableKey: 'SCALE_METHOD_TYPE_CODE' }, token),
      ]);

      return {
        priorityLovs,
        scaleMethodTypeLovs,
      };
    },
    enabled: hasValidScaleSiteId && canReadSummary,
  });
  const canQuerySites = can(PERMISSIONS.SCALE_SITE_QUERY);
  const breadCrumbs = [
    { name: 'Scale Sites', ...(canQuerySites ? { path: '/scale-sites' } : {}) },
    { name: normalizedScaleSiteIdNmbr ? `Scale Site ${normalizedScaleSiteIdNmbr}` : 'Scale Site' },
  ];
  if (!hasValidScaleSiteId) {
    return (
      <Grid className="view-scale-site">
        <PageTitle title="Scale Site Record" breadCrumbs={breadCrumbs} />
        <Column lg={16} md={8} sm={4}>
          <EmptySection
            icon="WarningFilled"
            title="Scale site not available"
            description="A valid scale site number was not provided in the route."
            whiteLayer
          />
        </Column>
      </Grid>
    );
  }
  const recordPending = tombstoneQuery.isPending
    || (canReadSummary && (summaryQuery.isPending || siteTypeLovsQuery.isPending));
  const recordError = canReadSummary ? summaryQuery.error : tombstoneQuery.error;
  const recordFailed = canReadSummary
    ? summaryQuery.isError || !summaryQuery.data
    : tombstoneQuery.isError || !tombstoneQuery.data;

  if (recordPending) {
    return (
      <Grid className="view-scale-site">
        <PageTitle title="Scale Site Record" breadCrumbs={breadCrumbs} />
        <Column lg={16} md={8} sm={4}>
          <div className="scs__tab-view__panel">
            <SkeletonText paragraph lineCount={8} />
          </div>
        </Column>
      </Grid>
    );
  }
  if (recordFailed) {
    const denied = isForbiddenError(recordError);
    return (
      <Grid className="view-scale-site">
        <PageTitle title="Scale Site Record" breadCrumbs={breadCrumbs} />
        <Column lg={16} md={8} sm={4}>
          <EmptySection
            icon="WarningFilled"
            title="Could not load scale site"
            description={
              denied
                ? 'You do not have access to this record.'
                : firstErrorMessage(summaryQuery.error, tombstoneQuery.error)
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
    <Grid className="view-scale-site">
      <PageTitle title="Scale Site Record" breadCrumbs={breadCrumbs} />
      <Column lg={16} md={8} sm={4} className="scs__tab-view__header-band">
        <ScaleSiteHeader
          summary={summaryQuery.data ?? null}
          tombstone={tombstoneQuery.data ?? null}
          onSearch={() => navigate('/scale-sites')}
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="scs__tab-view__tabs-col">
        <ScaleSiteTabs
          activeTabIndex={activeTabIndex}
          onTabChange={onTabChange}
          scaleSiteIdNmbr={normalizedScaleSiteIdNmbr}
          summary={summaryQuery.data ?? null}
          priorityLovs={siteTypeLovsQuery.data?.priorityLovs ?? []}
          scaleMethodTypeLovs={siteTypeLovsQuery.data?.scaleMethodTypeLovs ?? []}
          tabs={visibleTabs}
        />
      </Column>
    </Grid>
  );
};
export default ScaleSiteViewPage;
