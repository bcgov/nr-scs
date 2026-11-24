import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import {
  InlineNotification,
  Modal,
  SkeletonText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FC, useMemo, useState } from 'react';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import SortableTableHeader from '@/components/core/SortableTableHeader';
import { useAuth } from '@/context/auth/useAuth';
import { useSortableTable } from '@/hooks/useSortableTable';
import { asText, ynToDisplay } from '@/pages/View/Scaler/utils';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScalerAppointmentDetail } from '@/services/scalerAppointments.types';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

import ScalerAppointmentForm from '../appointments/ScalerAppointmentForm';
import { APPOINTMENT_TYPE_LOV, GRADING_CODE_APPOINTMENT_TYPE_LOV, lovQueryKey } from '@/utils/lovCache';
import {
  buildAppointmentOptions,
  buildCreateRequest,
  buildUpdateRequest,
  createEmptyAppointmentFormValues,
  toAppointmentFormValues,
  validateAppointmentForm,
  type AppointmentFormErrors,
  type AppointmentFormMode,
  type AppointmentOption,
  type ScalerAppointmentFormValues,
} from '../appointments/appointmentFormUtils';

interface Props {
  isActive: boolean;
  scalerLicenceNo: string;
}

const AppointmentsTab: FC<Props> = ({ isActive, scalerLicenceNo }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [editorMode, setEditorMode] = useState<AppointmentFormMode>('create');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<ScalerAppointmentDetail | null>(null);
  const [formValues, setFormValues] = useState<ScalerAppointmentFormValues>(createEmptyAppointmentFormValues());
  const [formErrors, setFormErrors] = useState<AppointmentFormErrors>({});
  const [editorError, setEditorError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ScalerAppointmentDetail | null>(null);

  const appointmentsQuery = useQuery({
    queryKey: ['scaler-appointments', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.scalerAppointments.getScalerAppointments(scalerLicenceNo, token);
    },
    enabled: isActive && Boolean(scalerLicenceNo),
  });

  const appointmentLovQuery = useQuery({
    queryKey: lovQueryKey(GRADING_CODE_APPOINTMENT_TYPE_LOV),
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getGradingCodeAppointmentTypeLov(token);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
  });

  const appointmentTypeLovQuery = useQuery({
    queryKey: lovQueryKey(APPOINTMENT_TYPE_LOV),
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getAppointmentTypeLov(undefined, token);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
  });

  const gradingSystemLovQuery = useQuery({
    queryKey: ['lov', 'static-lov', 'SCALE_GRADING_SYSTEM_CODE'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov({ tableKey: 'SCALE_GRADING_SYSTEM_CODE' }, token);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
  });

  const districtLovQuery = useQuery({
    queryKey: ['lov', 'region-district-lov'],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getRegionDistrictLov(undefined, token);
    },
    enabled: isActive,
    staleTime: 5 * 60 * 1000,
  });

  const appointmentOptions = useMemo<AppointmentOption[]>(
    () => buildAppointmentOptions(appointmentLovQuery.data ?? []),
    [appointmentLovQuery.data],
  );

  const appointmentTypeDescriptions = useMemo(() => {
    return new Map(
      (appointmentTypeLovQuery.data ?? [])
        .filter((item) => item.code)
        .map((item) => [String(item.code), String(item.description ?? item.code)])
    );
  }, [appointmentTypeLovQuery.data]);

  const gradingSystemDescriptions = useMemo(() => {
    return new Map(
      (gradingSystemLovQuery.data ?? [])
        .filter((item: StaticLov) => item.code)
        .map((item: StaticLov) => [String(item.code), String(item.description ?? item.code)])
    );
  }, [gradingSystemLovQuery.data]);

  const districtDescriptions = useMemo(() => {
    return new Map(
      (districtLovQuery.data ?? [])
        .filter((item) => item.code)
        .map((item) => [String(item.code).trim().toUpperCase(), String(item.description ?? item.code)])
    );
  }, [districtLovQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      return API.scalerAppointments.createScalerAppointment(
        scalerLicenceNo,
        buildCreateRequest(formValues, appointmentOptions),
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scaler-appointments', scalerLicenceNo] });
      closeEditor();
    },
    onError: (error: unknown) => {
      setEditorError(extractApiError(error, 'Could not create appointment.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingAppointment?.scalerLicenceAttributeId) {
        throw new Error('No appointment selected for update.');
      }
      const token = await userToken();
      return API.scalerAppointments.updateScalerAppointment(
        scalerLicenceNo,
        editingAppointment.scalerLicenceAttributeId,
        buildUpdateRequest(formValues, appointmentOptions),
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scaler-appointments', scalerLicenceNo] });
      closeEditor();
    },
    onError: (error: unknown) => {
      setEditorError(extractApiError(error, 'Could not update appointment.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteCandidate?.scalerLicenceAttributeId) {
        throw new Error('No appointment selected for delete.');
      }
      const token = await userToken();
      await API.scalerAppointments.deleteScalerAppointment(
        scalerLicenceNo,
        deleteCandidate.scalerLicenceAttributeId,
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scaler-appointments', scalerLicenceNo] });
      setDeleteCandidate(null);
      setBannerError(null);
    },
    onError: (error: unknown) => {
      setBannerError(extractApiError(error, 'Could not delete appointment.'));
      setDeleteCandidate(null);
    },
  });

  const appointments: ScalerAppointmentDetail[] = appointmentsQuery.data ?? [];
  const { sortedRows, sortKey, sortDirection, onSortChange } = useSortableTable(appointments);
  const isLovLoading =
    appointmentLovQuery.isLoading ||
    appointmentTypeLovQuery.isLoading ||
    gradingSystemLovQuery.isLoading ||
    districtLovQuery.isLoading;
  const isEditorSubmitting = createMutation.isPending || updateMutation.isPending;

  const loading = appointmentsQuery.isLoading && !appointmentsQuery.data;
  const loadError =
    appointmentsQuery.error?.message ||
    appointmentLovQuery.error?.message ||
    appointmentTypeLovQuery.error?.message ||
    gradingSystemLovQuery.error?.message ||
    districtLovQuery.error?.message ||
    null;

  const handleFieldChange = <K extends keyof ScalerAppointmentFormValues>(
    field: K,
    value: ScalerAppointmentFormValues[K],
  ) => {
    setFormValues((previous) => {
      const next = { ...previous, [field]: value };
      if (field === 'provinceWideInd' && value === 'Y') {
        next.orgUnitNo = '';
      }
      return next;
    });

    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
    setEditorError(null);
  };

  const resetEditorForm = () => {
    setFormValues(
      editorMode === 'edit'
        ? toAppointmentFormValues(editingAppointment, appointmentOptions)
        : createEmptyAppointmentFormValues()
    );
    setFormErrors({});
    setEditorError(null);
  };

  const openCreateEditor = () => {
    setEditorMode('create');
    setEditingAppointment(null);
    setFormValues(createEmptyAppointmentFormValues());
    setFormErrors({});
    setEditorError(null);
    setEditorOpen(true);
  };

  const openEditEditor = (appointment: ScalerAppointmentDetail) => {
    setEditorMode('edit');
    setEditingAppointment(appointment);
    setFormValues(toAppointmentFormValues(appointment, appointmentOptions));
    setFormErrors({});
    setEditorError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingAppointment(null);
    setFormValues(createEmptyAppointmentFormValues());
    setFormErrors({});
    setEditorError(null);
  };

  const handleSave = () => {
    const nextErrors = validateAppointmentForm(formValues, appointmentOptions, editorMode);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setEditorError(Object.values(nextErrors)[0] ?? 'Please fix the errors below.');
      scrollToError();
      return;
    }

    setEditorError(null);
    if (editorMode === 'create') {
      createMutation.mutate();
      return;
    }

    updateMutation.mutate();
  };

  const appointmentTypeLabel = (appointment: ScalerAppointmentDetail) => {
    const code = appointment.scalerAppointmentType ?? '';
    return appointmentTypeDescriptions.get(code) ?? asText(code);
  };

  const gradingSystemLabel = (appointment: ScalerAppointmentDetail) => {
    const code = appointment.scaleGradingSystemCode ?? '';
    return gradingSystemDescriptions.get(code) ?? asText(code);
  };

  const districtLabel = (appointment: ScalerAppointmentDetail) => {
    if (appointment.orgUnitNo == null) {
      return '—';
    }

    const key = String(appointment.orgUnitNo).trim().toUpperCase();
    return districtDescriptions.get(key) ?? String(appointment.orgUnitNo);
  };

  return (
    <div className="scs__tab-view__panel">
      <div className="scs__view-tab-actions scs__view-tab-actions--top">
        <PermissionGate permission={PERMISSIONS.SCALER_APPOINTMENT_CREATE}>
          <Button
            kind="primary"
            size="sm"
            type="button"
            onClick={openCreateEditor}
            disabled={Boolean(loadError) || isLovLoading}
          >
            Add Appointment
          </Button>
        </PermissionGate>
      </div>

      {loadError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Appointments unavailable."
          subtitle={loadError}
          className="view-scaler__notification"
        />
      ) : null}

      {bannerError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Appointments action failed."
          subtitle={bannerError}
          className="view-scaler__notification"
        />
      ) : null}

      {loading ? <SkeletonText paragraph lineCount={6} /> : null}

      {!loading && appointments.length === 0 ? (
        <p>No appointments found for this scaler.</p>
      ) : null}

      {!loading && appointments.length > 0 ? (
        <Table size="sm" useZebraStyles>
          <TableHead>
            <TableRow>
              <SortableTableHeader
                label="Appointment Type"
                sortKeyName="scalerAppointmentType"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Grading System"
                sortKeyName="scaleGradingSystemCode"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Reg / Dist"
                sortKeyName="orgUnitNo"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Province Wide?"
                sortKeyName="provinceWideInd"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Effective Date"
                sortKeyName="issuedDate"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Expiry Date"
                sortKeyName="expiryDate"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Cancellation Date"
                sortKeyName="cancellationDate"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <SortableTableHeader
                label="Cancellation Reason"
                sortKeyName="cancellationReasonTxt"
                activeSortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSortChange}
              />
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((appointment: ScalerAppointmentDetail) => {
              const appointmentId = appointment.scalerLicenceAttributeId ?? `${appointment.scalerLicenceNo}-${appointment.issuedDate}`;
              return (
                <TableRow key={String(appointmentId)}>
                  <TableCell>{appointmentTypeLabel(appointment)}</TableCell>
                  <TableCell>{gradingSystemLabel(appointment)}</TableCell>
                  <TableCell>{districtLabel(appointment)}</TableCell>
                  <TableCell>{ynToDisplay(appointment.provinceWideInd)}</TableCell>
                  <TableCell>{asText(appointment.issuedDate)}</TableCell>
                  <TableCell>{asText(appointment.expiryDate)}</TableCell>
                  <TableCell>{asText(appointment.cancellationDate)}</TableCell>
                  <TableCell>{asText(appointment.cancellationReasonTxt)}</TableCell>
                  <TableCell>
                    <div className="scs__table-actions">
                      <PermissionGate permission={PERMISSIONS.SCALER_APPOINTMENT_UPDATE}>
                        <Button
                          kind="ghost"
                          size="sm"
                          type="button"
                          noIcon
                          onClick={() => openEditEditor(appointment)}
                          disabled={isLovLoading}
                        >
                          Edit
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.SCALER_APPOINTMENT_DELETE}>
                        <Button
                          kind="danger--ghost"
                          size="sm"
                          type="button"
                          noIcon
                          onClick={() => setDeleteCandidate(appointment)}
                        >
                          Delete
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      <Modal
        open={editorOpen}
        onRequestClose={closeEditor}
        modalHeading={editorMode === 'create' ? 'Scaler Appointment - Create' : 'Scaler Appointment - Edit'}
        passiveModal
        size="lg"
      >
        {editorError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Please fix the appointment form."
            subtitle={editorError}
            className="view-scaler__notification"
          />
        ) : null}

        <ScalerAppointmentForm
          appointmentOptions={appointmentOptions}
          errors={formErrors}
          isSubmitting={isEditorSubmitting}
          mode={editorMode}
          values={formValues}
          onChange={handleFieldChange}
        />

        <div className="scs__form__divider scs__form__divider--actions" />

        <div className="form-actions">
          <Button kind="secondary" type="button" className="action-btn" onClick={closeEditor} disabled={isEditorSubmitting}>
            Back
          </Button>
          <Button
            kind="secondary"
            type="button"
            className="action-btn"
            onClick={resetEditorForm}
            renderIcon={ResetIcon}
            disabled={isEditorSubmitting}
          >
            Reset
          </Button>
          <Button
            kind="primary"
            type="button"
            className="action-btn"
            onClick={handleSave}
            renderIcon={SaveIcon}
            disabled={isEditorSubmitting || isLovLoading}
          >
            Save Record
          </Button>
        </div>
      </Modal>

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


export default AppointmentsTab;


