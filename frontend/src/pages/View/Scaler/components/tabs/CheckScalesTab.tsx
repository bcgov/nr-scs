import {
  Select,
  SelectItem,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { type FC, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import CheckScaleSummaryTable from '@/components/core/CheckScaleSummaryTable';
import EmptySection from '@/components/core/EmptySection';
import SortableTableHeader from '@/components/core/SortableTableHeader';
import { useAuth } from '@/context/auth/useAuth';
import { useCheckScaleTypeLov } from '@/hooks/useCheckScaleTypeLov';
import { useSortableTable } from '@/hooks/useSortableTable';
import API from '@/services/APIs';
import type {
  CheckScaleStats,
  ScalerCheckScaleFilterValue,
} from '@/services/checkScales.service';

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

const FILTER_OPTIONS: ScalerCheckScaleFilterValue[] = [
  'All',
  'Primary',
  'Secondary',
  'Primary/Secondary',
  'Check',
];

/** Legacy renders the statistics cells with format="0.00" (two decimals). */
const formatStat = (value?: number | null): string =>
  value === null || value === undefined ? '—' : value.toFixed(2);

interface StatsRow {
  variance: string;
  last10: number | null;
  past12: number | null;
  all: number | null;
}

const StatsTable: FC<{ stats?: CheckScaleStats | null }> = ({ stats }) => {
  const rows: StatsRow[] = [
    {
      variance: 'Volume',
      last10: stats?.last10Volume ?? null,
      past12: stats?.past12Volume ?? null,
      all: stats?.allVolume ?? null,
    },
    {
      variance: 'Value',
      last10: stats?.last10Value ?? null,
      past12: stats?.past12Value ?? null,
      all: stats?.allValue ?? null,
    },
  ];

  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(rows);

  return (
    <Table size="sm" className="scs__tab-view__table" aria-label="Check scale statistics">
      <TableHead>
        <TableRow>
          <SortableTableHeader
            label="Variance %"
            sortKeyName="variance"
            activeSortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="Last 10 Checked"
            sortKeyName="last10"
            activeSortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="Past 12 Months"
            sortKeyName="past12"
            activeSortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSortChange}
          />
          <SortableTableHeader
            label="All"
            sortKeyName="all"
            activeSortKey={sortKey}
            sortDirection={sortDirection}
            onSort={onSortChange}
          />
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedRows.map((row) => (
          <TableRow key={row.variance}>
            <TableCell>
              <strong>{row.variance}</strong>
            </TableCell>
            <TableCell>{formatStat(row.last10)}</TableCell>
            <TableCell>{formatStat(row.past12)}</TableCell>
            <TableCell>{formatStat(row.all)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const CheckScalesTab: FC<Props> = ({ isActive, scalerLicenceNo }) => {
  const { userToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<ScalerCheckScaleFilterValue>('All');

  const normalizedScalerLicenceNo = scalerLicenceNo.trim();

  const tabQuery = useQuery({
    queryKey: ['scaler-check-scales', normalizedScalerLicenceNo, filter],
    queryFn: async () => {
      const token = await userToken();
      return API.checkScale.getScalerCheckScales(normalizedScalerLicenceNo, filter, token);
    },
    enabled: isActive && normalizedScalerLicenceNo.length > 0,
  });

  const { descriptions: typeDescriptions } = useCheckScaleTypeLov(isActive);

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
        id="scaler-check-scales-filter"
        labelText="Filter"
        size="sm"
        value={filter}
        onChange={(event) => setFilter(event.target.value as ScalerCheckScaleFilterValue)}
      >
        {FILTER_OPTIONS.map((option) => (
          <SelectItem key={option} value={option} text={option} />
        ))}
      </Select>
    </div>
  );

  if (normalizedScalerLicenceNo.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No check scales found"
          description="No scaler licence number is available for this record."
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
            tabQuery.error?.message ?? 'The check scales for this scaler could not be retrieved.'
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
      <h4>Check Scale Statistics</h4>
      <StatsTable stats={tabQuery.data?.stats} />

      <h4 style={{ marginTop: '1.5rem' }}>Check Scale Summary</h4>
      {renderFilter()}

      {checkScales.length === 0 ? (
        <EmptySection
          icon="Information"
          title="No check scales found"
          description="This scaler does not have any check scales for the selected filter."
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
