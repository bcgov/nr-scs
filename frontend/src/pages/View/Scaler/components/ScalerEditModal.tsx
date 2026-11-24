import { InlineNotification, Modal, SkeletonText } from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ScalerForm, { type ScalerFormValues } from '@/components/Form/ScalerForm';
import { buildUpdateRequest, createEmptyScalerFormValues, toScalerFormValues, validateScalerForm } from '@/components/Form/ScalerForm/logic';
import {
  EDIT_VISIBLE_FIELD_KEYS,
  resolveServerErrors,
  useScalerFormLovOptions,
} from '@/components/Form/ScalerForm/support';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { ScalerDetail } from '@/services/scalers.service';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

interface Props {
  open: boolean;
  onClose: () => void;
  scalerLicenceNo: string;
}

/**
 * The Scaler Record - Edit modal (legacy updateScaler.jsp, tile P009). Fetches the record when
 * opened — the cached summary can't seed the form (the appointment/exam gate and raw licence
 * type codes only exist on the detail).
 */
const ScalerEditModal: FC<Props> = ({ open, onClose, scalerLicenceNo }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [values, setValues] = useState<ScalerFormValues>(createEmptyScalerFormValues);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isResetting, setIsResetting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const detailQuery = useQuery<ScalerDetail, Error>({
    queryKey: ['scaler-detail-edit', scalerLicenceNo],
    queryFn: async () => {
      const token = await userToken();
      return API.scalers.getScaler(scalerLicenceNo, token);
    },
    enabled: open && Boolean(scalerLicenceNo),
  });

  // Legacy gate (ScalerBo.appointmentOrExamExists): the appointment-XOR-exam rule applies only
  // when the scaler has no prior appointment or exam; otherwise both sections are optional.
  const enforceApptExamXor = useMemo(
    () => !detailQuery.data?.appointment && !detailQuery.data?.exam,
    [detailQuery.data],
  );

  // Re-seeds on open and on every (re)fetch — Reset relies on this
  useEffect(() => {
    if (open && detailQuery.data) {
      setValues(toScalerFormValues(detailQuery.data));
      setSubmitAttempted(false);
      setFormError(null);
      setFieldErrors({});
      setDeleteError(null);
    }
  }, [open, detailQuery.data]);

  const { appointmentOptions, trainingOptions, appointmentTypesError, trainingTypesError } =
    useScalerFormLovOptions();

  const handleFieldChange = useCallback(
    <K extends keyof ScalerFormValues>(field: K, value: ScalerFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  useEffect(() => {
    if (!submitAttempted) {
      return;
    }

    const result = validateScalerForm(values, 'edit', { enforceApptExamXor });
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
  }, [submitAttempted, values, enforceApptExamXor]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      return API.scalers.updateScaler(
        scalerLicenceNo,
        buildUpdateRequest(values, appointmentOptions),
        token,
      );
    },
    onSuccess: () => {
      // Close first — the write already succeeded; refetches shouldn't hold the modal open
      onClose();
      void queryClient.invalidateQueries({ queryKey: ['scaler-summary', scalerLicenceNo] });
      void queryClient.invalidateQueries({ queryKey: ['scaler-tombstone', scalerLicenceNo] });
      void queryClient.invalidateQueries({ queryKey: ['scaler-detail-edit', scalerLicenceNo] });
      void queryClient.invalidateQueries({ queryKey: ['scaler-detail-audit', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-exams', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-appointments', scalerLicenceNo] });
    },
    onError: (error: unknown) => {
      const resolved = resolveServerErrors(error, 'Could not update scaler.', EDIT_VISIBLE_FIELD_KEYS);
      setFieldErrors((prev) => ({ ...prev, ...resolved.fieldErrors }));
      setFormError(resolved.formError);
    },
  });

  // Legacy ScalerDelegate.deleteScaler cascade; legacy forwards delete → .scalerCreate.
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      await API.scalers.deleteScaler(scalerLicenceNo, token);
    },
    onSuccess: () => {
      setConfirmDeleteOpen(false);
      onClose();
      // Record is gone — drop the per-scaler caches (off-route return pattern) then navigate to Create.
      queryClient.removeQueries({ queryKey: ['scaler-summary', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-tombstone', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-detail-edit', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-detail-audit', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-exams', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-appointments', scalerLicenceNo] });
      queryClient.removeQueries({ queryKey: ['scaler-summary-check-scales', scalerLicenceNo] });
      navigate('/scalers/create');
    },
    onError: (error: unknown) => {
      // Dependent records block the delete (ORA-02292 → 400): keep the edit modal open and surface
      // the legacy child-record message as a modal banner (legacy DbExceptionValidator errors.db.child).
      setConfirmDeleteOpen(false);
      setDeleteError(extractApiError(error, 'Could not delete scaler.'));
    },
  });

  // Legacy Reset is a DB reload (viewUpdate) — refetch, then re-seed
  const handleReset = () => {
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
    setIsResetting(true);
    void detailQuery
      .refetch()
      .then((result) => {
        if (result.data) {
          setValues(toScalerFormValues(result.data));
        }
      })
      .finally(() => setIsResetting(false));
  };

  const handleSave = () => {
    setSubmitAttempted(true);
    const result = validateScalerForm(values, 'edit', { enforceApptExamXor });
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
    if (!result.ok) {
      scrollToError();
      return;
    }
    updateMutation.mutate();
  };

  const handleDelete = () => {
    setDeleteError(null);
    setConfirmDeleteOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onRequestClose={onClose}
        modalHeading="Scaler Record - Edit"
        passiveModal
        size="lg"
      >
        {deleteError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not delete the scaler."
            subtitle={deleteError}
            style={{ marginBottom: '16px' }}
            onCloseButtonClick={() => setDeleteError(null)}
          />
        ) : null}
        {detailQuery.isLoading ? (
          <SkeletonText paragraph lineCount={6} />
        ) : detailQuery.isError || !detailQuery.data ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not load the scaler record."
            subtitle={detailQuery.error?.message ?? 'Please close and try again.'}
          />
        ) : (
          <ScalerForm
            mode="edit"
            values={values}
            onChange={handleFieldChange}
            fieldErrors={fieldErrors}
            formError={formError}
            submitAttempted={submitAttempted}
            isSubmitting={updateMutation.isPending || deleteMutation.isPending}
            appointmentOptions={appointmentOptions}
            trainingOptions={trainingOptions}
            appointmentTypesError={appointmentTypesError}
            trainingTypesError={trainingTypesError}
            onSave={handleSave}
            onReset={handleReset}
            isResetting={isResetting}
            scalerLicenceNo={scalerLicenceNo}
            onDelete={handleDelete}
          />
        )}
      </Modal>
      {confirmDeleteOpen ? (
        <Modal
          open
          danger
          modalHeading="Delete Scaler Record"
          primaryButtonText="Delete"
          secondaryButtonText="Cancel"
          primaryButtonDisabled={deleteMutation.isPending}
          size="sm"
          onRequestClose={() => setConfirmDeleteOpen(false)}
          onRequestSubmit={() => deleteMutation.mutate()}
        >
          Are you sure you want to delete this record?
        </Modal>
      ) : null}
    </>
  );
};

export default ScalerEditModal;
