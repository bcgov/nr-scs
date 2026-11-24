import {
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
import { useAuthorizationLetterDownload } from '@/hooks/useAuthorizationLetterDownload';
import { useSortableTable } from '@/hooks/useSortableTable';
import { useLazyTabQuery } from '@/hooks/useLazyTabQuery';
import { useStatusFilter } from '@/hooks/useStatusFilter';
import API from '@/services/APIs';
import { asText } from '@/utils/display';
import type { ScaleSiteAuthorizationDetail } from '@/services/scaleSiteAuthorizations.service';

import AuthorizationsTabShell from '@/components/Form/authorizationsTab/AuthorizationsTabShell';
interface Props {
  isActive: boolean;
  scaleSiteIdNmbr: string;
}

const ScaleSiteAuthorizationsTab: FC<Props> = ({ isActive, scaleSiteIdNmbr }) => {
  const navigate = useNavigate();
  const letter = useAuthorizationLetterDownload({
    fetchLetter: (id, token) => API.scaleSiteAuthorizations.getScaleSiteAuthorizationLetter(id, token),
    letterRoute: (id) => `/scale-site-authorizations/${encodeURIComponent(String(id))}/letter`,
    fallbackBaseName: 'scale-site-authorization-letter',
  });

  const normalizedScaleSiteIdNmbr = scaleSiteIdNmbr.trim();

  const authorizationsQuery = useLazyTabQuery<ScaleSiteAuthorizationDetail>(
    ['scale-site-authorizations', normalizedScaleSiteIdNmbr],
    (token) => API.scaleSiteAuthorizations.listScaleSiteAuthorizations(normalizedScaleSiteIdNmbr, token),
    isActive && normalizedScaleSiteIdNmbr.length > 0,
  );

  const authorizations: ScaleSiteAuthorizationDetail[] = authorizationsQuery.rows;

  const { status, setStatus, filtered: filteredAuthorizations } = useStatusFilter(authorizations);

  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(filteredAuthorizations);

  const goToCreate = () => {
    navigate(`/scale-site-authorizations/create?scaleSiteIdNmbr=${encodeURIComponent(normalizedScaleSiteIdNmbr)}`);
  };

  const renderAddAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_CREATE}>
        <Button
          kind="primary"
          type="button"
          size="sm"
          onClick={goToCreate}
          disabled={normalizedScaleSiteIdNmbr.length === 0}
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
          title="No authorizations found"
          description="No scale site number is available for this record."
          whiteLayer
        />
      </div>
    );
  }

  return (
    <AuthorizationsTabShell
      addAction={renderAddAction()}
      isPending={authorizationsQuery.isPending}
      isError={authorizationsQuery.isError}
      errorDescription={
        authorizationsQuery.error?.message ??
            'The authorizations for this scale site could not be retrieved.'
      }
      letter={letter}
      notificationClassName="view-scaler__notification"
      statusFilterId="scale-site-authorizations-status-filter"
      status={status}
      onStatusChange={setStatus}
      isEmpty={filteredAuthorizations.length === 0}
      emptyDescription="This scale site does not have any authorizations for the selected status."
    >
      <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Scale site authorizations">
        <TableHead>
          <TableRow>
            <SortableTableHeader label="Authorization #" sortKeyName="scaleSiteAuthorizationId" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Effective Date" sortKeyName="authorizationEffectiveDate" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Expiry Date" sortKeyName="authorizationExpiryDate" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Canceled Date" sortKeyName="cancellationDate" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Cancellation Reason" sortKeyName="cancellationReasonTxt" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Status" sortKeyName="status" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
            <SortableTableHeader label="Authorization Letter" sortKeyName="letterExists" activeSortKey={sortKey} sortDirection={sortDirection} onSort={onSortChange} />
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((authorization) => {
            const id = authorization.scaleSiteAuthorizationId;
            return (
              <TableRow key={String(id ?? `${authorization.authorizationEffectiveDate}-${authorization.authorizationExpiryDate}`)}>
                <TableCell>
                  {id != null ? (
                    <PermissionLink permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ} to={`/scale-site-authorizations/view/${encodeURIComponent(String(id))}`}>
                      {id}
                    </PermissionLink>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{asText(authorization.authorizationEffectiveDate)}</TableCell>
                <TableCell>{asText(authorization.authorizationExpiryDate)}</TableCell>
                <TableCell>{asText(authorization.cancellationDate)}</TableCell>
                <TableCell>{asText(authorization.cancellationReasonTxt)}</TableCell>
                <TableCell>{asText(authorization.status)}</TableCell>
                {/* The tab renders on SCALE_SITE_AUTHORIZATION_QUERY, which the Scale Site Owner
                    holds — but the letter is a separate matrix capability the role does not, so
                    without this gate the button renders and 403s on click. The same control on
                    View/ScaleSiteAuthorization is gated identically; this copy was missed. */}
                <TableCell>
                  {authorization.letterExists ? (
                    <PermissionGate
                      permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_LETTER_VIEW}
                      fallback={<>&mdash;</>}
                    >
                      <div className="scs__table-actions">
                        <Button
                          kind="ghost"
                          size="sm"
                          type="button"
                          noIcon
                          onClick={() => letter.open(id, authorization.letterExists)}
                          disabled={id == null || letter.busyId === id}
                        >
                          View Letter
                        </Button>
                      </div>
                    </PermissionGate>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </AuthorizationsTabShell>
  );
};

export default ScaleSiteAuthorizationsTab;
