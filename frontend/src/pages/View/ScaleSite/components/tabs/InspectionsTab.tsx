import {
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@carbon/react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';

import PermissionGate from '@/components/PermissionGate';
import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import SortableTableHeader from '@/components/core/SortableTableHeader';
import { useLazyTabQuery } from '@/hooks/useLazyTabQuery';
import { useSortableTable } from '@/hooks/useSortableTable';
import API from '@/services/APIs';
import type { ScaleSiteInspectionSummary } from '@/services/scaleSiteInspections.service';

import { asText } from '../../utils';

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const buildInspectionDetailPath = (inspectionId: number, scaleSiteIdNmbr: string): string => {
  return `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/view/${encodeURIComponent(String(inspectionId))}`;
};

const buildInspectionCreatePath = (scaleSiteIdNmbr: string): string => {
  return `/scale-sites/${encodeURIComponent(scaleSiteIdNmbr)}/inspections/create`;
};

const InspectionsTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const navigate = useNavigate();
  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr.trim();
  const renderAddInspectionAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.SCALE_SITE_INSPECTION_CREATE}>
        <Button
          kind="primary"
          type="button"
          size="sm"
          onClick={() => navigate(buildInspectionCreatePath(normalizedScaleSiteIdNmbr))}
        >
          Add Inspection
        </Button>
      </PermissionGate>
    </div>
  );

  const {
    rows: inspections,
    isPending,
    isError,
    error,
  } = useLazyTabQuery<ScaleSiteInspectionSummary>(
    ['scale-site-inspections', normalizedScaleSiteIdNmbr],
    (token) => API.scaleSiteInspections.getScaleSiteInspectionSummaries(normalizedScaleSiteIdNmbr, token),
    isActive && normalizedScaleSiteIdNmbr.length > 0,
  );

  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(inspections);

  if (normalizedScaleSiteIdNmbr.length === 0) {
    // The Add button is omitted too: the inspection create route needs the site number.
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No inspections found"
          description="No scale site number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddInspectionAction()}
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddInspectionAction()}
        <EmptySection
          icon="WarningFilled"
          title="Could not load inspections"
          description={error?.message ?? 'The inspections for this scale site could not be retrieved.'}
          whiteLayer
        />
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddInspectionAction()}
        <EmptySection
          icon="Information"
          title="No inspections found"
          description="This scale site does not have any recorded inspections."
          whiteLayer
        />
      </div>
    );
  }

  return (
    <div className="scs__tab-view__panel">
      {renderAddInspectionAction()}
      <Table
        size="sm"
        useZebraStyles
        className="scs__tab-view__table"
        aria-label="Scale site inspections"
      >
        <TableHead>
          <TableRow>
            <SortableTableHeader label="Inspection #" sortKeyName="inspectionId" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Inspection Type" sortKeyName="inspectionTypeDescription" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Site Type" sortKeyName="siteTypeDisplay" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Inspection Date" sortKeyName="inspectionDate" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Inspector #" sortKeyName="inspector" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Follow up Inspection?" sortKeyName="followUpInspectionIndicator" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((inspection, index) => {
            const inspectionKey = inspection.inspectionId ?? `inspection-${index}`;

            return (
              <TableRow key={inspectionKey}>
                <TableCell>
                  {inspection.inspectionId != null ? (
                    <PermissionLink
                      permission={PERMISSIONS.SCALE_SITE_INSPECTION_READ}
                      className="view-scale-site__table-link"
                      to={buildInspectionDetailPath(inspection.inspectionId, normalizedScaleSiteIdNmbr)}
                    >
                      {inspection.inspectionId}
                    </PermissionLink>
                  ) : (
                    asText(inspection.inspectionId)
                  )}
                </TableCell>
                <TableCell>{asText(inspection.inspectionTypeDescription)}</TableCell>
                <TableCell>{asText(inspection.siteTypeDisplay)}</TableCell>
                <TableCell>{asText(inspection.inspectionDate)}</TableCell>
                <TableCell>{asText(inspection.inspector)}</TableCell>
                <TableCell>{asText(inspection.followUpInspectionIndicator)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default InspectionsTab;


