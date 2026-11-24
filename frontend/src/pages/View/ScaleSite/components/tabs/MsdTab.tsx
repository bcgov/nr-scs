import {
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';

import PermissionGate from '@/components/PermissionGate';
import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import { useLazyTabQuery } from '@/hooks/useLazyTabQuery';
import API from '@/services/APIs';
import type { MarkSiteDesignationSummary } from '@/services/scaleSiteMarkSiteDesignations.service';

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const MsdTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const navigate = useNavigate();

  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr.trim();

  const msdQuery = useLazyTabQuery<MarkSiteDesignationSummary>(
    ['scale-site-mark-site-designations', normalizedScaleSiteIdNmbr],
    (token) => API.scaleSiteMarkSiteDesignations.getScaleSiteMarkSiteDesignations(normalizedScaleSiteIdNmbr, token),
    isActive && normalizedScaleSiteIdNmbr.length > 0,
  );

  const designations: MarkSiteDesignationSummary[] = msdQuery.rows;

  const renderAddAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.MSD_CREATE}>
        <Button
          kind="primary"
          type="button"
          size="sm"
          onClick={() => navigate('/mark-site-designations/create')}
        >
          Add Mark Site Designation
        </Button>
      </PermissionGate>
    </div>
  );

  if (normalizedScaleSiteIdNmbr.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No mark site designations found"
          description="No scale site number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  if (msdQuery.isPending) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddAction()}
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (msdQuery.isError) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddAction()}
        <EmptySection
          icon="WarningFilled"
          title="Could not load mark site designations"
          description={
            msdQuery.error?.message ??
            'The mark site designations for this scale site could not be retrieved.'
          }
          whiteLayer
        />
      </div>
    );
  }

  return (
    <div className="scs__tab-view__panel">
      {renderAddAction()}

      <h4>MSD - Timber Marks</h4>

      {designations.length === 0 ? (
        <EmptySection
          icon="Information"
          title="No mark site designations found"
          description="This scale site does not have any mark site designations."
          whiteLayer
        />
      ) : (
        <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Mark site designations">
          <TableHead>
            <TableRow>
              <TableHeader>Timber Mark</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {designations.map((designation, index) => (
              <TableRow key={`${designation.timberMark ?? 'mark'}-${index}`}>
                <TableCell>
                  {designation.timberMark ? (
                    <PermissionLink permission={PERMISSIONS.MSD_QUERY} to={`/mark-site-designations?timberMark=${encodeURIComponent(designation.timberMark)}`}>
                      {designation.timberMark}
                    </PermissionLink>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default MsdTab;
