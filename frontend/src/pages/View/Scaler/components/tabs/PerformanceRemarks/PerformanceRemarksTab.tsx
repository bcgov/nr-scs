import { Save as SaveIcon } from '@carbon/icons-react';
import { Column, Grid, InlineNotification, Modal, SkeletonText } from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import PermissionLink from '@/components/core/PermissionLink';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import { usePermissions } from '@/context/auth/usePermissions';
import Button from '@/components/core/Button';
import DateInput from '@/components/core/DateInput';
import TableResource from '@/components/Form/TableResource';
import { toPageableContent, useClientTableSort } from '@/components/Form/TableResource/clientTable';
import type { TableHeaderType } from '@/components/Form/TableResource/types';
import { useAuth } from '@/context/auth/useAuth';
import { asText } from '@/pages/View/Scaler/utils';
import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';

import type { ScalerPerformanceRemarkDetail } from '@/services/scalerPerformanceRemarks.types';
import type { ScalerSummary } from '@/services/scalers.service';
import PerformanceRemarkDetailView from './PerformanceRemarkDetailView';
import PerformanceRemarksAction from './PerformanceRemarksAction';
import { checkScaleViewPath, issueTypeLabel } from './performanceRemarkDisplay';

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
  summary: ScalerSummary;
}

type RemarkRow = ScalerPerformanceRemarkDetail & {
  issueType: string | null;
  actions: null;
};

const NUMERIC_SORT_KEYS = new Set<keyof RemarkRow>([
  'scalerPerformanceRemarkId',
  'checkScaleId',
]);

const PerformanceRemarksTab: FC<Props> = ({
  isActive,
  scalerLicenceNo,
  summary,
}) => {
  const { userToken } = useAuth();
  const { can, canAny } = usePermissions();
  const queryClient = useQueryClient();

  // Gates the licence-cancelled-date editor below (the field stays visible, but read-only).
  const canCancelLicence = can(PERMISSIONS.SCALER_LICENCE_CANCEL);
  /**
   * Whether the Actions column exists at all. Both its buttons are permission-gated individually, but
   * a role holding neither — every read-only column in the matrix — would otherwise be left with a
   * headed column of empty cells. Same treatment as the Contacts tab's row actions.
   */
  const showRowActions = canAny([
    PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE,
    PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE,
  ]);

  const [formState, setFormState] = useState<'view' | 'create' | 'edit' | 'detail'>('view');
  const [selectedRemark, setSelectedRemark] = useState<ScalerPerformanceRemarkDetail | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<ScalerPerformanceRemarkDetail | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelledDate, setCancelledDate] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const seededForRef = useRef<string | null>(null);

  const remarksQuery = useQuery({
    queryKey: ['scaler-performance-remarks', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.scalerPerformanceRemarks.getScalerPerformanceRemarks(
        scalerLicenceNo,
        token,
      );
    },
    enabled: isActive && Boolean(scalerLicenceNo),
  });

  useEffect(() => {
    if (seededForRef.current !== scalerLicenceNo) {
      setCancelledDate(summary.licenceCancelledDate ?? '');
      seededForRef.current = scalerLicenceNo;
    }
  }, [summary, scalerLicenceNo]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      return API.scalers.updateLicenceCancelledDate(
        scalerLicenceNo,
        cancelledDate.trim() === '' ? null : cancelledDate,
        token,
      );
    },
    onSuccess: async () => {
      setCancelError(null);
      // Refresh the header/Summary data the parent page renders (licence status and the cancelled
      // date reflect this change), so it's visible without a reload.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['scaler-summary', scalerLicenceNo],
        }),
        queryClient.invalidateQueries({
          queryKey: ['scaler-tombstone', scalerLicenceNo],
        }),
      ]);
    },
    onError: (error: unknown) => {
      setCancelError(
        extractApiError(error, 'Could not update the licence cancelled date.'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (deleteCandidate?.scalerPerformanceRemarkId == null) {
        throw new Error('No performance remark selected for delete.');
      }
      const token = await userToken();
      await API.scalerPerformanceRemarks.deleteScalerPerformanceRemark(
        scalerLicenceNo,
        deleteCandidate.scalerPerformanceRemarkId,
        token,
      );
    },
    onSuccess: async () => {
      setDeleteError(null);
      setDeleteCandidate(null);
      await queryClient.invalidateQueries({
        queryKey: ['scaler-performance-remarks', scalerLicenceNo],
      });
    },
    onError: (error: unknown) => {
      setDeleteError(extractApiError(error, 'Could not delete the performance remark.'));
      setDeleteCandidate(null);
    },
  });

  const remarks: ScalerPerformanceRemarkDetail[] = remarksQuery.data ?? [];
  const loading = remarksQuery.isLoading && !remarksQuery.data;
  const loadError = remarksQuery.error?.message ?? null;

  const rows: RemarkRow[] = useMemo(
    () =>
      remarks.map((remark) => ({
        ...remark,
        issueType: issueTypeLabel(remark) || null,
        actions: null,
      })),
    [remarks],
  );

  const { sortedRows, sortKey, sortDirection, onSortChange } = useClientTableSort(
    rows,
    NUMERIC_SORT_KEYS,
  );

  const actionsHeader: TableHeaderType<RemarkRow> = {
    key: 'actions',
    header: 'Actions',
    selected: true,
    sortable: false,
    renderAs: (_value, row) =>
      row ? (
        <div className="scs__table-actions">
          <PermissionGate permission={PERMISSIONS.SCALER_PERFORMANCE_REMARK_UPDATE}>
            <Button
              kind="ghost"
              size="sm"
              type="button"
              noIcon
              onClick={() => {
                setSelectedRemark(row);
                setFormState('edit');
              }}
            >
              Edit
            </Button>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.SCALER_PERFORMANCE_REMARK_DELETE}>
            <Button
              kind="danger--ghost"
              size="sm"
              type="button"
              noIcon
              onClick={() => {
                setDeleteError(null);
                setDeleteCandidate(row);
              }}
            >
              Delete
            </Button>
          </PermissionGate>
        </div>
      ) : null,
  };

  const headers: TableHeaderType<RemarkRow>[] = [
    {
      key: 'scalerPerformanceRemarkId',
      header: 'Issue #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) =>
        row?.scalerPerformanceRemarkId != null ? (
          <button
            type="button"
            className="scs__tab-view__table-link scs__tab-view__table-link--button"
            onClick={() => {
              setSelectedRemark(row);
              setFormState('detail');
            }}
          >
            {asText(row.scalerPerformanceRemarkId)}
          </button>
        ) : (
          asText(row?.scalerPerformanceRemarkId)
        ),
    },
    {
      key: 'loggedTimestamp',
      header: 'Date Of Incident',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.loggedTimestamp),
    },
    {
      key: 'issueType',
      header: 'Issue Type',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.issueType),
    },
    {
      key: 'suspendStartDate',
      header: 'Suspension Start Date',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.suspendStartDate),
    },
    {
      key: 'suspendEndDate',
      header: 'Suspension End Date',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.suspendEndDate),
    },
    {
      key: 'checkScaleId',
      header: 'Associated Check Scale #',
      selected: true,
      sortable: true,
      renderAs: (_value, row) =>
        row?.checkScaleId != null ? (
          <PermissionLink
            className="scs__tab-view__table-link"
            permission={PERMISSIONS.CHECK_SCALE_QUERY}
            to={checkScaleViewPath(row.checkScaleId)}
          >
            {asText(row.checkScaleId)}
          </PermissionLink>
        ) : (
          asText(row?.checkScaleId)
        ),
    },
    {
      key: 'performanceRemarkDesc',
      header: 'Description',
      selected: true,
      sortable: true,
      renderAs: (_value, row) => asText(row?.performanceRemarkDesc),
    },
    // Dropped entirely, not left empty, for a role holding neither row verb — see showRowActions.
    ...(showRowActions ? [actionsHeader] : []),
  ];

  const content = toPageableContent(
    sortedRows,
    (row, index) => row.scalerPerformanceRemarkId ?? `remark-${index}`,
  );

  if (formState === 'detail' && selectedRemark) {
    return (
      <PerformanceRemarkDetailView
        remark={selectedRemark}
        onBack={() => {
          setSelectedRemark(null);
          setFormState('view');
        }}
        onEdit={() => setFormState('edit')}
      />
    );
  }

  if (formState === 'create') {
    return (
      <PerformanceRemarksAction
        scalerLicenceNo={scalerLicenceNo}
        onCancel={() => setFormState('view')}
        onSaved={() => setFormState('view')}
      />
    );
  }

  if (formState === 'edit' && selectedRemark) {
    return (
      <PerformanceRemarksAction
        scalerLicenceNo={scalerLicenceNo}
        remark={selectedRemark}
        onCancel={() => {
          setSelectedRemark(null);
          setFormState('view');
        }}
        onSaved={() => {
          setSelectedRemark(null);
          setFormState('view');
        }}
      />
    );
  }

  return (
    <div className="scs__tab-view__panel">
      {loadError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Performance remarks unavailable."
          subtitle={loadError}
          className="view-scaler__notification"
        />
      ) : null}

      {deleteError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not delete the performance remark."
          subtitle={deleteError}
          className="view-scaler__notification"
        />
      ) : null}

      <div className="scs__view-tab-actions scs__view-tab-actions--top">
        <PermissionGate permission={PERMISSIONS.SCALER_PERFORMANCE_REMARK_CREATE}>
          <Button
            kind="primary"
            size="sm"
            type="button"
            onClick={() => setFormState('create')}
          >
            Add Performance Remark
          </Button>
        </PermissionGate>
      </div>

      {loading ? <SkeletonText paragraph lineCount={6} /> : null}

      {!loading && !loadError && remarks.length === 0 ? (
        <p>No performance remarks found for this scaler.</p>
      ) : null}

      {!loading && !loadError && remarks.length > 0 ? (
        <TableResource
          headers={headers}
          content={content}
          loading={false}
          error={false}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
        />
      ) : null}

      <div className="scs__form__divider" />

      {cancelError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not save the licence cancelled date."
          subtitle={cancelError}
          className="view-scaler__notification"
        />
      ) : null}

      {cancelMutation.isSuccess && !cancelError ? (
        <InlineNotification
          kind="success"
          lowContrast
          title="Licence cancelled date saved."
          className="view-scaler__notification"
        />
      ) : null}

      <Grid className="scs__tab-view__filter">
        <Column lg={8} md={4} sm={4}>
          <DateInput
            id="scaler-licence-cancelled-date"
            labelText="Licence Cancelled Date"
            hideLabel={false}
            value={cancelledDate}
            readOnly={!canCancelLicence}
            onChange={(value) => {
              setCancelledDate(value);
              setCancelError(null);
              if (cancelMutation.isSuccess || cancelMutation.isError) {
                cancelMutation.reset();
              }
            }}
          />
        </Column>
      </Grid>

      <PermissionGate permission={PERMISSIONS.SCALER_LICENCE_CANCEL}>
        <div className="scs__view-tab-actions">
          <Button
            kind="primary"
            size="sm"
            type="button"
            onClick={() => cancelMutation.mutate()}
            renderIcon={SaveIcon}
            disabled={cancelMutation.isPending}
          >
            Save Record
          </Button>
        </div>
      </PermissionGate>

      <Modal
        open={Boolean(deleteCandidate)}
        onRequestClose={() => setDeleteCandidate(null)}
        onSecondarySubmit={() => setDeleteCandidate(null)}
        onRequestSubmit={() => deleteMutation.mutate()}
        modalHeading="Are you sure you want to delete this record?"
        primaryButtonText="Confirm Delete"
        secondaryButtonText="Cancel"
        primaryButtonDisabled={deleteMutation.isPending}
        danger
      />
    </div>
  );
};

export default PerformanceRemarksTab;
