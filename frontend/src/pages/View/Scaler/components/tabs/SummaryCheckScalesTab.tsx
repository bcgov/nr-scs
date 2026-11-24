import { SkeletonText } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import SummaryCheckScaleListTable from '@/components/core/SummaryCheckScaleListTable';
import { useAuth } from '@/context/auth/useAuth';
import { useCheckScaleTypeLov } from '@/hooks/useCheckScaleTypeLov';
import API from '@/services/APIs';

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

/**
 * Scaler view "Summary Check Scales" tab (legacy P132, summaryCheckScaleList.jsp). The summary
 * sibling of {@link CheckScalesTab}: a list of the scaler's summary check scales with an Add entry
 * point — but no statistics block and no filter (legacy summary list has neither). The Add button
 * and the Check Scale # drilldown carry { backTo, scalerName } route state so the existing
 * create/update pages' context-sensitive Back button returns to this tab.
 */
const SummaryCheckScalesTab: FC<Props> = ({ isActive, scalerLicenceNo }) => {
  const { userToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const normalizedScalerLicenceNo = scalerLicenceNo.trim();

  const tabQuery = useQuery({
    queryKey: ['scaler-summary-check-scales', normalizedScalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.summaryCheckScale.getScalerSummaryCheckScales(normalizedScalerLicenceNo, token);
    },
    enabled: isActive && normalizedScalerLicenceNo.length > 0,
  });

  const { descriptions: typeDescriptions } = useCheckScaleTypeLov(isActive);

  // Seeds the create/update pages: Back target + Back-button gate, and the create licence pre-fill.
  const navState = {
    backTo: `${location.pathname}${location.search}`,
    scalerName: normalizedScalerLicenceNo,
    originalScalerLicenceNo: normalizedScalerLicenceNo,
  };

  const renderAddAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.SUMMARY_CHECK_SCALE_CREATE}>
        <Button
          kind="primary"
          type="button"
          size="sm"
          onClick={() => navigate('/summary-check-scales/create', { state: navState })}
        >
          Add Summary Check Scale
        </Button>
      </PermissionGate>
    </div>
  );

  if (normalizedScalerLicenceNo.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No summary check scales found"
          description="No scaler licence number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  if (tabQuery.isPending) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddAction()}
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (tabQuery.isError) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddAction()}
        <EmptySection
          icon="WarningFilled"
          title="Could not load summary check scales"
          description={
            tabQuery.error?.message ??
            'The summary check scales for this scaler could not be retrieved.'
          }
          whiteLayer
        />
      </div>
    );
  }

  const summaryCheckScales = tabQuery.data?.summaryCheckScales ?? [];

  return (
    <div className="scs__tab-view__panel">
      {renderAddAction()}
      <h4 style={{ marginBottom: '1rem' }}>Summary Check Scales</h4>
      {summaryCheckScales.length === 0 ? (
        <EmptySection
          icon="Information"
          title="No summary check scales found"
          description="This scaler does not have any summary check scales."
          whiteLayer
        />
      ) : (
        <SummaryCheckScaleListTable
          rows={summaryCheckScales}
          checkScaleTypeDescriptions={typeDescriptions}
          drilldownState={navState}
        />
      )}
    </div>
  );
};

export default SummaryCheckScalesTab;
