import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@carbon/react';
import { type FC, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import PermissionLink from '@/components/core/PermissionLink';
import PermissionGate from '@/components/PermissionGate';
import ScaleSiteLink from '@/components/core/ScaleSiteLink';
import SortableTableHeader from '@/components/core/SortableTableHeader';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import EmptySection from '@/components/core/EmptySection';
import { useAuthorizationLetterDownload } from '@/hooks/useAuthorizationLetterDownload';
import { useLazyTabQuery } from '@/hooks/useLazyTabQuery';
import { useSortableTable } from '@/hooks/useSortableTable';
import { useStatusFilter } from '@/hooks/useStatusFilter';
import { asText, ynToDisplay } from '@/pages/View/Scaler/utils';
import API from '@/services/APIs';
import type { ScalerAuthorizationListItem } from '@/services/scalerAuthorizations.service';

import AuthorizationsTabShell from '@/components/Form/authorizationsTab/AuthorizationsTabShell';
interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

const AuthorizationsTab: FC<Props> = ({ isActive, scalerLicenceNo }) => {
  const navigate = useNavigate();
  const letter = useAuthorizationLetterDownload({
    fetchLetter: (id, token) => API.scalerAuthorizations.getScalerAuthorizationLetter(id, token),
    letterRoute: (id) => `/scaler-authorizations/${encodeURIComponent(String(id))}/letter`,
    fallbackBaseName: 'scaler-authorization-letter',
  });

  const normalizedScalerLicenceNo = scalerLicenceNo.trim();

  const authorizationsQuery = useLazyTabQuery<ScalerAuthorizationListItem>(
    ['scaler-authorizations', normalizedScalerLicenceNo],
    (token) => API.scalerAuthorizations.listScalerAuthorizations(normalizedScalerLicenceNo, token),
    isActive && normalizedScalerLicenceNo.length > 0,
  );

  const districtLovQuery = useLazyTabQuery(
    ['lov', 'region-district-lov'],
    (token) => API.lov.getRegionDistrictLov(undefined, token),
    isActive,
    { staleTime: 5 * 60 * 1000 },
  );

  const districtDescriptions = useMemo(() => {
    return new Map(
      districtLovQuery.rows
        .filter((item) => item.code)
        .map((item) => [String(item.code).trim().toUpperCase(), String(item.description ?? item.code)]),
    );
  }, [districtLovQuery.rows]);

  const authorizations: ScalerAuthorizationListItem[] = authorizationsQuery.rows;

  const { status, setStatus, filtered: filteredAuthorizations } = useStatusFilter(authorizations);

  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(filteredAuthorizations);

  const districtLabel = (orgUnitNo?: number | null) => {
    if (orgUnitNo == null) {
      return '—';
    }
    const key = String(orgUnitNo).trim().toUpperCase();
    return districtDescriptions.get(key) ?? String(orgUnitNo);
  };

  /** Legacy parity: scalerAuthorizationList.jsp links each site number to the site record. */
  const renderAuthorizedSites = (authorization: ScalerAuthorizationListItem) => {
    if (ynToDisplay(authorization.districtWideInd) === 'Yes') {
      return 'All';
    }
    const sites = authorization.authorizedSites ?? [];
    if (sites.length === 0) {
      return '—';
    }

    return sites.map((site, index) => (
      <span key={`${String(site).trim()}-${index}`}>
        {index > 0 ? ', ' : null}
        <ScaleSiteLink scaleSiteIdNmbr={site} />
      </span>
    ));
  };

  const goToCreate = () => {
    navigate(`/scaler-authorizations/create?scalerLicenceNo=${encodeURIComponent(normalizedScalerLicenceNo)}`);
  };

  const renderAddAction = () => (
    <div className="scs__view-tab-actions scs__view-tab-actions--top">
      <PermissionGate permission={PERMISSIONS.SCALER_AUTHORIZATION_CREATE}>
        <Button
          kind="primary"
          type="button"
          size="sm"
          onClick={goToCreate}
          disabled={normalizedScalerLicenceNo.length === 0}
        >
          Add Authorization
        </Button>
      </PermissionGate>
    </div>
  );

  if (normalizedScalerLicenceNo.length === 0) {
    return (
      <div className="scs__tab-view__panel">
        <EmptySection
          icon="Information"
          title="No authorizations found"
          description="No scaler licence number is available for this record."
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
            'The authorizations for this scaler could not be retrieved.'
      }
      letter={letter}
      notificationClassName="view-scaler__notification"
      statusFilterId="scaler-authorizations-status-filter"
      status={status}
      onStatusChange={setStatus}
      isEmpty={filteredAuthorizations.length === 0}
      emptyDescription="This scaler does not have any authorizations for the selected status."
    >
      <Table size="sm" useZebraStyles className="scs__tab-view__table" aria-label="Scaler authorizations">
        <TableHead>
          <TableRow>
            <SortableTableHeader
              label="Authorization #"
              sortKeyName="scalerAuthorizationId"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="Effective Date"
              sortKeyName="authorizationEffectiveDate"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="Expiry Date"
              sortKeyName="authorizationExpiryDate"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="Authorized Sites"
              sortKeyName="authorizedSites"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="District Wide?"
              sortKeyName="districtWideInd"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="Authorized District"
              sortKeyName="orgUnitNo"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="Status"
              sortKeyName="status"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
            <SortableTableHeader
              label="Authorization Letter"
              sortKeyName="letterExists"
              activeSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSortChange}
            />
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.map((authorization) => {
            const id = authorization.scalerAuthorizationId;
            return (
              <TableRow key={String(id ?? `${authorization.authorizationEffectiveDate}-${authorization.orgUnitNo}`)}>
                <TableCell>
                  {id != null ? (
                    <PermissionLink permission={PERMISSIONS.SCALER_AUTHORIZATION_READ} to={`/scaler-authorizations/view/${encodeURIComponent(String(id))}`}>
                      {id}
                    </PermissionLink>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{asText(authorization.authorizationEffectiveDate)}</TableCell>
                <TableCell>{asText(authorization.authorizationExpiryDate)}</TableCell>
                <TableCell>{renderAuthorizedSites(authorization)}</TableCell>
                <TableCell>{ynToDisplay(authorization.districtWideInd)}</TableCell>
                <TableCell>{districtLabel(authorization.orgUnitNo)}</TableCell>
                <TableCell>{asText(authorization.status)}</TableCell>
                <TableCell>
                  {authorization.letterExists ? (
                    <PermissionGate
                      permission={PERMISSIONS.SCALER_AUTHORIZATION_LETTER_VIEW}
                      fallback="—"
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

export default AuthorizationsTab;
