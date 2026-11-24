import { Table, TableBody, TableCell, TableRow } from '@carbon/react';
import type { FC } from 'react';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import type { ScalerSummary } from '@/services/scalers.service';
import type { ScalerTombstone } from '@/services/scalersTombstone.types';

import { asText } from '../utils';

interface Props {
  summary: ScalerSummary;
  tombstone?: ScalerTombstone | null;
  onSearch: () => void;
}

const ScalerHeader: FC<Props> = ({ summary, tombstone, onSearch }) => {
  const headerName = tombstone
    ? [tombstone.clientName, tombstone.legalFirstName].filter(Boolean).join(', ') || '—'
    : '—';

  const headerRegion = tombstone ? tombstone.regionName : summary.orgUnitName || '—';
  const headerDistrict = tombstone ? tombstone.districtName : summary.orgUnitName || '—';

  return (
    <div className="scs__tab-view__header">
      <Table size="sm" useZebraStyles={false}>
        <TableBody>
          <TableRow>
            <TableCell className="scs__tab-view__label">Licence #:</TableCell>
            <TableCell>{asText(summary.scalerLicenceNo)}</TableCell>
            <TableCell className="scs__tab-view__label">Name:</TableCell>
            <TableCell>{headerName}</TableCell>
            <TableCell className="scs__tab-view__label">Region:</TableCell>
            <TableCell>{asText(headerRegion)}</TableCell>
            <TableCell className="scs__tab-view__label">District:</TableCell>
            <TableCell>{asText(headerDistrict)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="scs__tab-view__header-actions">
        <PermissionGate permission={PERMISSIONS.SCALER_QUERY}>
          <Button kind="primary" type="button" size="sm" onClick={onSearch}>
            Search
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
};

export default ScalerHeader;

