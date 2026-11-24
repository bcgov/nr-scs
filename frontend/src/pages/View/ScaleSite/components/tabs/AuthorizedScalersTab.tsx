import {
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@carbon/react';
import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';

import PermissionGate from '@/components/PermissionGate';
import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import SortableTableHeader from '@/components/core/SortableTableHeader';
import { StatusFilterSelect } from '@/components/Form/StatusFilterSelect';
import { useLazyTabQuery } from '@/hooks/useLazyTabQuery';
import { useSortableTable } from '@/hooks/useSortableTable';
import { useStatusFilter } from '@/hooks/useStatusFilter';
import API from '@/services/APIs';
import type { AuthorizedScalerSummary } from '@/services/scaleSiteAuthorizedScalers.service';
import { asText } from '@/utils/display';

interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const AuthorizedScalersTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const navigate = useNavigate();

  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr.trim();

  const authorizedScalersQuery = useLazyTabQuery<AuthorizedScalerSummary>(
    ['scale-site-authorized-scalers', normalizedScaleSiteIdNmbr],
    (token) => API.scaleSiteAuthorizedScalers.getScaleSiteAuthorizedScalers(normalizedScaleSiteIdNmbr, token),
    isActive && normalizedScaleSiteIdNmbr.length > 0,
  );

  const authorizedScalers: AuthorizedScalerSummary[] = authorizedScalersQuery.rows;

  const { status, setStatus, filtered: filteredAuthorizedScalers } = useStatusFilter(authorizedScalers);

  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(filteredAuthorizedScalers);

  const renderAddAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.SCALER_AUTHORIZATION_CREATE}>
        <Button
          kind="primary"
          type="button"
          size="sm"
          onClick={() => navigate('/scaler-authorizations/create')}
        >
          Add Authorization
        </Button>
      </PermissionGate>
    </div>
  );

  if (normalizedScaleSiteIdNmbr.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No authorized scalers found"
          description="No scale site number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  if (authorizedScalersQuery.isPending) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddAction()}
        <SkeletonText paragraph lineCount={6} />
      </div>
    );
  }

  if (authorizedScalersQuery.isError) {
    return (
      <div className="scs__tab-view__panel">
        {renderAddAction()}
        <EmptySection
          icon="WarningFilled"
          title="Could not load authorized scalers"
          description={
            authorizedScalersQuery.error?.message ??
            'The authorized scalers for this scale site could not be retrieved.'
          }
          whiteLayer
        />
      </div>
    );
  }

  return (
    <div className="scs__tab-view__panel">
      {renderAddAction()}

      <StatusFilterSelect
        id="scale-site-authorized-scalers-status-filter"
        value={status}
        onChange={setStatus}
      />

      {filteredAuthorizedScalers.length === 0 ? (
        <EmptySection
          icon="Information"
          title="No authorized scalers found"
          description="This scale site does not have any authorized scalers for the selected status."
          whiteLayer
        />
      ) : (
        <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Authorized scalers">
          <TableHead>
            <TableRow>
              <SortableTableHeader label="Authorization #" sortKeyName="scalerAuthorizationId" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="Licence #" sortKeyName="scalerLicenceNo" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="Name" sortKeyName="clientName" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="Status" sortKeyName="status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="Appointment" sortKeyName="scalerAppointmentTypes" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="Effective Date" sortKeyName="authorizationEffectiveDate" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="Expiry Date" sortKeyName="authorizationExpiryDate" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
              <SortableTableHeader label="District Wide?" sortKeyName="districtWideInd" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((scaler) => {
              const authorizationId = scaler.scalerAuthorizationId;
              const licenceNo = scaler.scalerLicenceNo;
              return (
                <TableRow key={String(authorizationId ?? `${licenceNo}-${scaler.authorizationEffectiveDate}`)}>
                  <TableCell>
                    {authorizationId != null ? (
                      <PermissionLink permission={PERMISSIONS.SCALER_AUTHORIZATION_READ} to={`/scaler-authorizations/view/${encodeURIComponent(String(authorizationId))}`}>
                        {authorizationId}
                      </PermissionLink>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {licenceNo ? (
                      <PermissionLink permission={PERMISSIONS.SCALER_READ} to={`/scalers/view/${encodeURIComponent(licenceNo)}`}>
                        {licenceNo}
                      </PermissionLink>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{asText(scaler.clientName)}</TableCell>
                  <TableCell>{asText(scaler.status)}</TableCell>
                  <TableCell>{asText(scaler.scalerAppointmentTypes)}</TableCell>
                  <TableCell>{asText(scaler.authorizationEffectiveDate)}</TableCell>
                  <TableCell>{asText(scaler.authorizationExpiryDate)}</TableCell>
                  <TableCell>{asText(scaler.districtWideInd)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AuthorizedScalersTab;
