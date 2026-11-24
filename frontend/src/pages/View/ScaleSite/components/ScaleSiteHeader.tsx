import { Table, TableBody, TableCell, TableRow } from '@carbon/react';
import type { FC } from 'react';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import type { ScaleSiteSummary, ScaleSiteTombstone } from '@/services/scaleSites.service';

import { asText } from '../utils';

interface Props {
  summary?: ScaleSiteSummary | null;
  tombstone?: ScaleSiteTombstone | null;
  onSearch: () => void;
}

const ScaleSiteHeader: FC<Props> = ({ summary, tombstone, onSearch }) => {
  const headerScaleSiteId = tombstone?.scaleSiteIdNmbr ?? summary?.scaleSiteIdNmbr;
  const headerSiteName = tombstone?.siteName ?? summary?.siteName;
  const headerRegionName = tombstone?.regionName;
  const headerDistrictName = tombstone?.districtName;

  return (
    <div className="scs__tab-view__header">
      <Table size="sm" useZebraStyles={false}>
        <TableBody>
          <TableRow>
            <TableCell className="scs__tab-view__label">Scale Site #:</TableCell>
            <TableCell>{asText(headerScaleSiteId)}</TableCell>
            <TableCell className="scs__tab-view__label">Scale Site Name:</TableCell>
            <TableCell>{asText(headerSiteName)}</TableCell>
            <TableCell className="scs__tab-view__label">Region:</TableCell>
            <TableCell>{asText(headerRegionName)}</TableCell>
            <TableCell className="scs__tab-view__label">District:</TableCell>
            <TableCell>{asText(headerDistrictName)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="scs__tab-view__header-actions">
        <PermissionGate permission={PERMISSIONS.SCALE_SITE_QUERY}>
          <Button kind="primary" type="button" size="sm" onClick={onSearch}>
            Search
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
};

export default ScaleSiteHeader;

