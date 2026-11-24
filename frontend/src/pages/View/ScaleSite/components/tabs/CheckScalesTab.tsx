import { Select, SelectItem, SkeletonText } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { type FC, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import CheckScaleSummaryTable from '@/components/core/CheckScaleSummaryTable';
import EmptySection from '@/components/core/EmptySection';
import { useAuth } from '@/context/auth/useAuth';
import { useCheckScaleTypeLov } from '@/hooks/useCheckScaleTypeLov';
import API from '@/services/APIs';

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

/** Sentinel for the legacy "All" filter option (no type-code restriction). */
const ALL_TYPES = '';

const CheckScalesTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const { userToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [typeCodeFilter, setTypeCodeFilter] = useState<string>(ALL_TYPES);

  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr.trim();

  const tabQuery = useQuery({
    queryKey: ['scale-site-check-scales', normalizedScaleSiteIdNmbr, typeCodeFilter],
    queryFn: async () => {
      const token = await userToken();
      return API.checkScale.getScaleSiteCheckScales(
        normalizedScaleSiteIdNmbr,
        typeCodeFilter === ALL_TYPES ? undefined : typeCodeFilter,
        token,
      );
    },
    enabled: isActive && normalizedScaleSiteIdNmbr.length > 0,
  });

  const { options: typeOptions, descriptions: typeDescriptions } = useCheckScaleTypeLov(isActive);

  const renderAddCheckScaleAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.CHECK_SCALE_CREATE}>
        <Button kind="primary" type="button" size="sm" onClick={() => navigate('/check-scales/create')}>
          Add Check Scale
        </Button>
      </PermissionGate>
    </div>
  );

  const renderFilter = () => (
    <div style={{ maxWidth: '16rem', marginBottom: '1rem' }}>
      <Select
        id="scale-site-check-scales-filter"
        labelText="Filter"
        size="sm"
        value={typeCodeFilter}
        onChange={(event) => setTypeCodeFilter(event.target.value)}
      >
        <SelectItem value={ALL_TYPES} text="All" />
        {typeOptions.map((item) => (
          <SelectItem
            key={String(item.code)}
            value={String(item.code)}
            text={String(item.description ?? item.code)}
          />
        ))}
      </Select>
    </div>
  );

  if (normalizedScaleSiteIdNmbr.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No check scales found"
          description="No scale site number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  if (tabQuery.isPending) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddCheckScaleAction()}
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (tabQuery.isError) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddCheckScaleAction()}
        <EmptySection
          icon="WarningFilled"
          title="Could not load check scales"
          description={
            tabQuery.error?.message ?? 'The check scales for this scale site could not be retrieved.'
          }
          whiteLayer
        />
      </div>
    );
  }

  const checkScales = tabQuery.data?.checkScales ?? [];

  return (
    <div className="scs__tab-view__panel">
      {renderAddCheckScaleAction()}
      {renderFilter()}

      {checkScales.length === 0 ? (
        <EmptySection
          icon="Information"
          title="No check scales found"
          description="This scale site does not have any check scales for the selected filter."
          whiteLayer
        />
      ) : (
        <CheckScaleSummaryTable
          rows={checkScales}
          checkScaleTypeDescriptions={typeDescriptions}
          backTo={`${location.pathname}${location.search}`}
        />
      )}
    </div>
  );
};

export default CheckScalesTab;
