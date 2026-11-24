import { Column, Grid, InlineNotification } from '@carbon/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PermissionLink from '@/components/core/PermissionLink';
import { PERMISSIONS } from '@/context/auth/permissions';
import { usePermissions } from '@/context/auth/usePermissions';
import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import { useSortableTable } from '@/hooks/useSortableTable';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import { type MarkSiteDesignation } from '@/services/markSiteDesignation.service';
import { type ScaleSiteAuthorization } from '@/services/scaleSiteAuthorizations.service';
import { type ScalerAuthorization } from '@/services/scalerAuthorizations.service';
import { extractApiError } from '@/utils/extractApiError';

import './index.scss';

type BannerState = {
  kind: 'success' | 'error' | 'info';
  title: string;
  subtitle?: string;
};

type ScalerRow = ScalerAuthorization & {
  id: string;
  removeAction: string;
  addAction: string;
  actions: string;
};

type ScaleSiteRow = ScaleSiteAuthorization & {
  id: string;
  removeAction: string;
  addAction: string;
};

type MarkSiteRow = MarkSiteDesignation & {
  id: string;
  removeAction: string;
  addAction: string;
  actions: string;
};

const EMPTY_RESPONSE: PageableResponse<never> = {
  content: [],
  page: {
    size: 10,
    number: 0,
    totalElements: 0,
    totalPages: 1,
  },
};

const WorkBenchAdminPage: FC = () => {
  const { userToken } = useAuth();
  const navigate = useNavigate();

  const [banner, setBanner] = useState<BannerState | null>(null);
  const [scalerData, setScalerData] = useState<ScalerAuthorization[]>([]);
  const [scaleSiteData, setScaleSiteData] = useState<ScaleSiteAuthorization[]>([]);
  const [markSiteData, setMarkSiteData] = useState<MarkSiteDesignation[]>([]);
  

  const scalerQuery = useQuery({
    queryKey: ['workbench', 'scaler-authorizations'],
    queryFn: async () => {
      const token = await userToken();
      return API.scalerAuthorizations.searchScalerAuthorizations({}, token);
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const scaleSiteQuery = useQuery({
    queryKey: ['workbench', 'scale-site-authorizations'],
    queryFn: async () => {
      const token = await userToken();
      return API.scaleSiteAuthorizations.searchScaleSiteAuthorizations({}, token);
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const markSiteQuery = useQuery({
    queryKey: ['workbench', 'mark-site-designations'],
    queryFn: async () => {
      const token = await userToken();
      return API.markSiteDesignation.searchMarkSiteDesignations({}, token);
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (Array.isArray(scalerQuery.data)) {
      setScalerData(scalerQuery.data);
    }
  }, [scalerQuery.data]);

  useEffect(() => {
    if (Array.isArray(scaleSiteQuery.data)) {
      setScaleSiteData(scaleSiteQuery.data);
    }
  }, [scaleSiteQuery.data]);

  useEffect(() => {
    if (Array.isArray(markSiteQuery.data)) {
      setMarkSiteData(markSiteQuery.data);
    }
  }, [markSiteQuery.data]);

  // Show an error banner if any of the workbench endpoints failed
  useEffect(() => {
    if (scalerQuery.isError) {
      setBanner({
        kind: 'error',
        title: 'Failed to load Expiring Scaler Authorizations',
        subtitle: extractApiError(scalerQuery.error, 'Failed to load expiring scaler authorizations.'),
      });
      return;
    }

    if (scaleSiteQuery.isError) {
      setBanner({
        kind: 'error',
        title: 'Failed to load Expiring Scale Site Authorizations',
        subtitle: extractApiError(scaleSiteQuery.error, 'Failed to load expiring scale site authorizations.'),
      });
      return;
    }

    if (markSiteQuery.isError) {
      setBanner({
        kind: 'error',
        title: 'Failed to load Expiring Mark Site Designations',
        subtitle: extractApiError(markSiteQuery.error, 'Failed to load expiring mark site designations.'),
      });
      return;
    }

    // Clear query-related error banner when no query errors remain
    if (banner?.kind === 'error' && banner.title?.startsWith('Failed to load')) {
      setBanner(null);
    }
  }, [
    scalerQuery.isError,
    scalerQuery.error,
    scaleSiteQuery.isError,
    scaleSiteQuery.error,
    markSiteQuery.isError,
    markSiteQuery.error,
  ]);

  const removeMutation = useMutation({
    mutationFn: async (params: { kind: 'scaler' | 'scaleSite' | 'markSite'; id: number }) => {
      const token = await userToken();
      if (params.kind === 'scaler') {
        return API.scalerAuthorizations.removeScalerAuthorizationFromWorkbench(params.id, token);
      }
      if (params.kind === 'scaleSite') {
        return API.scaleSiteAuthorizations.removeScaleSiteAuthorizationFromWorkbench(params.id, token);
      }
      return API.markSiteDesignation.removeMarkSiteDesignationFromWorkbench(params.id, token);
    },
    onMutate: () => {
      setBanner(null);
    },
    onSuccess: (_data, vars) => {
      if (vars.kind === 'scaler') {
        setScalerData((prev) => prev.filter((row) => row.scalerAuthorizationId !== vars.id));
      } else if (vars.kind === 'scaleSite') {
        setScaleSiteData((prev) => prev.filter((row) => row.scaleSiteAuthorizationId !== vars.id));
      } else {
        setMarkSiteData((prev) => prev.filter((row) => row.haulingMarkAuthorizationId !== vars.id));
      }
      setBanner({ kind: 'info', title: 'Removed from list.' });
    },
    onError: (error) => {
      setBanner({
        kind: 'error',
        title: 'Remove failed.',
        subtitle: extractApiError(error, 'Failed to remove authorization from list.'),
      });
    },
  });

  const handleRemove = useCallback((kind: 'scaler' | 'scaleSite' | 'markSite', id: number) => {
    if (!globalThis.confirm('Are you sure you want to remove this record from the list?')) {
      return;
    }

    removeMutation.mutate({ kind, id });
  }, [removeMutation]);

  // Renews an expiring authorization: the backend clones it into a new authorization with extended
  // dates and returns the new id, which we navigate to (mirrors the legacy workbench "Add" button).
  const renewMutation = useMutation({
    mutationFn: async (params: { kind: 'scaler' | 'scaleSite' | 'markSite'; id: number }) => {
      const token = await userToken();
      if (params.kind === 'scaler') {
        return API.scalerAuthorizations.renewScalerAuthorization(params.id, token);
      }
      if (params.kind === 'scaleSite') {
        return API.scaleSiteAuthorizations.renewScaleSiteAuthorization(params.id, token);
      }
      return API.markSiteDesignation.renewMarkSiteDesignation(params.id, token);
    },
    onMutate: () => {
      setBanner(null);
    },
    onSuccess: (data, vars) => {
      const newId = data?.newAuthorizationId;
      if (newId === null || newId === undefined) {
        setBanner({
          kind: 'error',
          title: 'Renew failed.',
          subtitle: 'The renewal did not return a new authorization id.',
        });
        return;
      }

      const encodedId = encodeURIComponent(String(newId));
      if (vars.kind === 'scaler') {
        navigate(`/scaler-authorizations/view/${encodedId}`);
      } else if (vars.kind === 'scaleSite') {
        navigate(`/scale-site-authorizations/view/${encodedId}`);
      } else {
        navigate(`/mark-site-designations/view?haulingMarkAuthorizationId=${encodedId}`);
      }
    },
    onError: (error) => {
      setBanner({
        kind: 'error',
        title: 'Renew failed.',
        subtitle: extractApiError(error, 'Failed to renew authorization.'),
      });
    },
  });

  const handleRenew = useCallback((kind: 'scaler' | 'scaleSite' | 'markSite', id: number) => {
    renewMutation.mutate({ kind, id });
  }, [renewMutation]);

  // The route only requires WORKBENCH_QUERY, and §A gives four columns (DM, RM, CLE, SUP) Work Bench
  // "R (ltd)" — they read the queues and may do nothing to them. So the two actions name their own
  // verbs, and when neither is held the whole column is dropped rather than rendered with empty cells.
  const { can, canAny } = usePermissions();
  const canRemoveFromQueue = can(PERMISSIONS.WORKBENCH_UPDATE);
  const canRenewAuthorization = can(PERMISSIONS.WORKBENCH_CREATE);
  const showQueueActions = canAny([PERMISSIONS.WORKBENCH_UPDATE, PERMISSIONS.WORKBENCH_CREATE]);

  /** The Remove / Add pair shared by all three queues, gated per verb. */
  const renderQueueActions = useCallback((
    kind: 'scaler' | 'scaleSite' | 'markSite',
    id: number | null | undefined,
  ) => {
    if (!id) {
      return '';
    }
    return (
      <div style={{ textAlign: 'right' }}>
        <div className="action-cell">
          <div className="scs__table-actions">
            {canRemoveFromQueue ? (
              <Button
                kind="danger--ghost"
                size="sm"
                type="button"
                noIcon
                className="workbench-page__table-action workbench-page__table-action--remove"
                onClick={() => handleRemove(kind, id)}
              >
                Remove
              </Button>
            ) : null}
            {canRenewAuthorization ? (
              <Button
                kind="ghost"
                size="sm"
                type="button"
                noIcon
                disabled={renewMutation.isPending}
                className="workbench-page__table-action workbench-page__table-action--add"
                onClick={() => handleRenew(kind, id)}
              >
                Add
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }, [canRemoveFromQueue, canRenewAuthorization, handleRemove, handleRenew, renewMutation.isPending]);


  const scalerRows: ScalerRow[] = useMemo(() => {
    return scalerData.map((row, idx) => ({
      ...row,
      id: row.scalerAuthorizationId === null || row.scalerAuthorizationId === undefined
        ? `scaler-${idx}`
        : String(row.scalerAuthorizationId),
      removeAction: 'remove',
      addAction: 'add',
      actions: 'actions',
    }));
  }, [scalerData]);

  const scaleSiteRows: ScaleSiteRow[] = useMemo(() => {
    return scaleSiteData.map((row, idx) => ({
      ...row,
      id: row.scaleSiteAuthorizationId === null || row.scaleSiteAuthorizationId === undefined
        ? `scale-${idx}`
        : String(row.scaleSiteAuthorizationId),
      removeAction: 'remove',
      addAction: 'add',
    }));
  }, [scaleSiteData]);

  const markSiteRows: MarkSiteRow[] = useMemo(() => {
    return markSiteData.map((row, idx) => ({
      ...row,
      id: row.haulingMarkAuthorizationId === null || row.haulingMarkAuthorizationId === undefined
        ? `mark-${idx}`
        : String(row.haulingMarkAuthorizationId),
      removeAction: 'remove',
      addAction: 'add',
      actions: 'actions',
    }));
  }, [markSiteData]);

  // Each queue sorts independently; NONE preserves the backend's incoming order (no default sort).
  const scalerSort = useSortableTable(scalerRows);
  const scaleSiteSort = useSortableTable(scaleSiteRows);
  const markSiteSort = useSortableTable(markSiteRows);

  const scalerContent: PageableResponse<ScalerRow> = useMemo(() => {
    if (!scalerQuery.data && !scalerQuery.isError) {
      return {} as PageableResponse<ScalerRow>;
    }
    return {
      content: scalerSort.sortedRows,
      page: {
        size: scalerSort.sortedRows.length,
        number: 0,
        totalElements: scalerSort.sortedRows.length,
        totalPages: 1,
      },
    };
  }, [scalerQuery.data, scalerQuery.isError, scalerSort.sortedRows]);

  const scaleSiteContent: PageableResponse<ScaleSiteRow> = useMemo(() => {
    if (!scaleSiteQuery.data && !scaleSiteQuery.isError) {
      return {} as PageableResponse<ScaleSiteRow>;
    }
    return {
      content: scaleSiteSort.sortedRows,
      page: {
        size: scaleSiteSort.sortedRows.length,
        number: 0,
        totalElements: scaleSiteSort.sortedRows.length,
        totalPages: 1,
      },
    };
  }, [scaleSiteQuery.data, scaleSiteQuery.isError, scaleSiteSort.sortedRows]);

  const markSiteContent: PageableResponse<MarkSiteRow> = useMemo(() => {
    if (!markSiteQuery.data && !markSiteQuery.isError) {
      return {} as PageableResponse<MarkSiteRow>;
    }
    return {
      content: markSiteSort.sortedRows,
      page: {
        size: markSiteSort.sortedRows.length,
        number: 0,
        totalElements: markSiteSort.sortedRows.length,
        totalPages: 1,
      },
    };
  }, [markSiteQuery.data, markSiteQuery.isError, markSiteSort.sortedRows]);

  const scalerHeaders: TableHeaderType<ScalerRow>[] = useMemo(() => [
    {
      key: 'scalerAuthorizationId',
      header: 'Authorization #',
      selected: true,
      sortable: true,
      renderAs: (value) => {
        if (!value) {
          return '';
        }
        return (
          <PermissionLink permission={PERMISSIONS.SCALER_AUTHORIZATION_READ} to={`/scaler-authorizations/view/${encodeURIComponent(String(value))}`}>
            {String(value)}
          </PermissionLink>
        );
      },
    },
    { key: 'effectiveDate', header: 'Effective Date', selected: true, sortable: true },
    { key: 'expiryDate', header: 'Expiry Date', selected: true, sortable: true },
    {
      key: 'scalerLicenceNumber',
      header: 'Scaler Licence #',
      selected: true,
      sortable: true,
      renderAs: (value) => {
        if (!value) {
          return '';
        }
        return (
          <PermissionLink permission={PERMISSIONS.SCALER_READ} to={`/scalers/view/${encodeURIComponent(String(value))}`}>
            {String(value)}
          </PermissionLink>
        );
      },
    },
    {
      key: 'scalerName',
      header: 'Scaler Name',
      selected: true,
      sortable: true,
      renderAs: (value, row) => {
        if (value == null || value === '') {
          return '';
        }
        // If backend accidentally returns a numeric id in this field, fall back to licence number
        const asString = String(value);
        if (/^\d+$/.test(asString)) {
          return row?.scalerLicenceNumber ?? asString;
        }
        return asString;
      },
    },
    ...(showQueueActions ? [{
      key: 'actions' as const,
      header: '',
      selected: true,
      renderAs: (_value: unknown, row?: ScalerRow) =>
        renderQueueActions('scaler', row?.scalerAuthorizationId),
    }] : []),
  ], [renderQueueActions, showQueueActions]);

  const scalerEmpty = scalerQuery.isSuccess && scalerRows.length === 0;
  const scaleSiteEmpty = scaleSiteQuery.isSuccess && scaleSiteRows.length === 0;
  const markSiteEmpty = markSiteQuery.isSuccess && markSiteRows.length === 0;

  const scaleSiteHeaders: TableHeaderType<ScaleSiteRow>[] = useMemo(() => [
    {
      key: 'scaleSiteAuthorizationId',
      header: 'Authorization #',
      selected: true,
      sortable: true,
      renderAs: (value) => {
        if (!value) {
          return '';
        }
        return (
          <PermissionLink permission={PERMISSIONS.SCALE_SITE_AUTHORIZATION_READ} to={`/scale-site-authorizations/view/${encodeURIComponent(String(value))}`}>
            {String(value)}
          </PermissionLink>
        );
      },
    },
    { key: 'effectiveDate', header: 'Effective Date', selected: true, sortable: true },
    { key: 'expiryDate', header: 'Expiry Date', selected: true, sortable: true },
    {
      key: 'scaleSiteNumber',
      header: 'Scale Site #',
      selected: true,
      sortable: true,
      renderAs: (value) => {
        if (!value) {
          return '';
        }
        const siteNumber = String(value);
        const target = `/scale-sites/view/${encodeURIComponent(siteNumber)}`;
        return (
          <PermissionLink permission={PERMISSIONS.SCALE_SITE_READ} to={target}>
            {siteNumber}
          </PermissionLink>
        );
      },
    },
    { key: 'scaleSiteName', header: 'Scale Site Name', selected: true, sortable: true },
    ...(showQueueActions ? [{
      key: 'removeAction' as const,
      header: '',
      selected: true,
      renderAs: (_value: unknown, row?: ScaleSiteRow) =>
        renderQueueActions('scaleSite', row?.scaleSiteAuthorizationId),
    }] : []),
  ], [renderQueueActions, showQueueActions]);

  const markSiteHeaders: TableHeaderType<MarkSiteRow>[] = useMemo(() => [
    {
      key: 'haulingMarkAuthorizationId',
      header: 'Authorization #',
      selected: true,
      sortable: true,
      renderAs: (value) => {
        if (!value) {
          return '';
        }
        return (
          <PermissionLink
            permission={PERMISSIONS.MSD_READ}
            to={`/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(String(value))}`}
            title="Mark Site Designation"
          >
            {String(value)}
          </PermissionLink>
        );
      },
    },
    { key: 'effectiveDate', header: 'Effective Date', selected: true, sortable: true },
    { key: 'expiryDate', header: 'Expiry Date', selected: true, sortable: true },
    { key: 'timberMark', header: 'Timber Mark', selected: true, sortable: true },
    ...(showQueueActions ? [{
      key: 'actions' as const,
      header: '',
      selected: true,
      renderAs: (_value: unknown, row?: MarkSiteRow) =>
        renderQueueActions('markSite', row?.haulingMarkAuthorizationId),
    }] : []),
  ], [renderQueueActions, showQueueActions]);

  return (
    <Grid className="workbench-page">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Work Bench" subtitle="Administration: Work Bench" />

        {banner && (
          <InlineNotification
            kind={banner.kind}
            lowContrast
            title={banner.title}
            subtitle={banner.subtitle}
            className="workbench-page__banner"
            onCloseButtonClick={() => setBanner(null)}
          />
        )}

        <section className="workbench-page__section">
          <h4 className="workbench-page__section-title">Expiring Scaler Authorizations</h4>
          {scalerEmpty ? (
            <div className="workbench-page__empty">Zero records found</div>
          ) : (
            <TableResource
              headers={scalerHeaders}
              content={scalerContent ?? (EMPTY_RESPONSE as PageableResponse<ScalerRow>)}
              loading={scalerQuery.isLoading}
              error={scalerQuery.isError}
              sortKey={scalerSort.sortKey}
              sortDirection={scalerSort.sortDirection}
              onSortChange={scalerSort.onSortChange}
            />
          )}
        </section>

        <section className="workbench-page__section">
          <h4 className="workbench-page__section-title">Expiring Scale Site Authorizations</h4>
          {scaleSiteEmpty ? (
            <div className="workbench-page__empty">Zero records found</div>
          ) : (
            <TableResource
              headers={scaleSiteHeaders}
              content={scaleSiteContent ?? (EMPTY_RESPONSE as PageableResponse<ScaleSiteRow>)}
              loading={scaleSiteQuery.isLoading}
              error={scaleSiteQuery.isError}
              sortKey={scaleSiteSort.sortKey}
              sortDirection={scaleSiteSort.sortDirection}
              onSortChange={scaleSiteSort.onSortChange}
            />
          )}
        </section>

        <section className="workbench-page__section">
          <h4 className="workbench-page__section-title">Expiring Mark Site Designations</h4>
          {markSiteEmpty ? (
            <div className="workbench-page__empty">Zero records found</div>
          ) : (
            <TableResource
              headers={markSiteHeaders}
              content={markSiteContent ?? (EMPTY_RESPONSE as PageableResponse<MarkSiteRow>)}
              loading={markSiteQuery.isLoading}
              error={markSiteQuery.isError}
              sortKey={markSiteSort.sortKey}
              sortDirection={markSiteSort.sortDirection}
              onSortChange={markSiteSort.onSortChange}
            />
          )}
        </section>
      </Column>
    </Grid>
  );
};

export default WorkBenchAdminPage;
