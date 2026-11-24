import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import { Form, InlineNotification } from '@carbon/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FC, useMemo, useState } from 'react';

import Button from '@/components/core/Button';
import WhoDidIt from '@/components/core/WhoDidIt';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

import type { ScalerPerformanceRemarkDetail } from '@/services/scalerPerformanceRemarks.types';
import PerformanceRemarksForm from './PerformanceRemarksForm';
import {
  buildCreateRequest,
  buildIssueTypeOptions,
  buildUpdateRequest,
  createEmptyPerformanceRemarkFormValues,
  mapDetailToFormValues,
  mapServerFieldErrors,
  validatePerformanceRemarkForm,
  type PerformanceRemarkFormErrors,
  type PerformanceRemarkFormValues,
  type ServerFieldError,
} from './performanceRemarkFormUtils';

interface Props {
  scalerLicenceNo: string;
  /** Present → edit that remark; absent → create a new one. */
  remark?: ScalerPerformanceRemarkDetail | null;
  onCancel: () => void;
  onSaved: () => void;
}

const ACTN_LOV = 'SCALER_PERFORMANCE_ACTN_CODE';
const OUTCM_LOV = 'SCALER_PERFORMANCE_OUTCM_CODE';

/**
 * Create/edit form for a scaler performance remark. The two flows are identical apart from the
 * seed values, the submit call, and a few labels, so they share one component (mirroring
 * ExamUpgradesTab). Passing a `remark` switches it into edit mode.
 */
const PerformanceRemarksAction: FC<Props> = ({ scalerLicenceNo, remark, onCancel, onSaved }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const isEdit = remark != null;
  const remarkId = remark?.scalerPerformanceRemarkId ?? null;

  // Values the form loaded with — empty for create, or the row for edit. Snapshotted so Reset
  // restores the original (mirroring the legacy original-DTO snapshot) rather than clearing.
  const seededValues = useMemo(
    () => (remark ? mapDetailToFormValues(remark) : createEmptyPerformanceRemarkFormValues()),
    [remark],
  );

  const [formValues, setFormValues] = useState<PerformanceRemarkFormValues>(seededValues);
  const [formErrors, setFormErrors] = useState<PerformanceRemarkFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const actionLovQuery = useQuery({
    queryKey: ['lov', 'static-lov', ACTN_LOV],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov({ tableKey: ACTN_LOV }, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  const outcomeLovQuery = useQuery({
    queryKey: ['lov', 'static-lov', OUTCM_LOV],
    queryFn: async () => {
      const token = await userToken();
      return API.lov.getStaticLov({ tableKey: OUTCM_LOV }, token);
    },
    staleTime: 5 * 60 * 1000,
  });

  const actionOptions = useMemo(
    () => buildIssueTypeOptions(actionLovQuery.data ?? []),
    [actionLovQuery.data],
  );
  const outcomeOptions = useMemo(
    () => buildIssueTypeOptions(outcomeLovQuery.data ?? []),
    [outcomeLovQuery.data],
  );

  const activeLovQuery = formValues.issueType === 'ACTION' ? actionLovQuery : outcomeLovQuery;
  const isLovLoading = activeLovQuery.isLoading;
  const lovError = activeLovQuery.error?.message ?? null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      if (isEdit) {
        if (remarkId == null) {
          throw new Error('This performance remark is missing an identifier and cannot be updated.');
        }
        return API.scalerPerformanceRemarks.updateScalerPerformanceRemark(
          scalerLicenceNo,
          remarkId,
          buildUpdateRequest(formValues),
          token,
        );
      }
      return API.scalerPerformanceRemarks.createScalerPerformanceRemark(
        scalerLicenceNo,
        buildCreateRequest(formValues),
        token,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['scaler-performance-remarks', scalerLicenceNo],
      });
      onSaved();
    },
    onError: (error: unknown) => {
      // Field-scoped server errors (VALIDATION_ERROR fieldErrors) surface beneath their input,
      // consistent with client-side validation; form-level errors fall through to the banner.
      const serverFieldErrors =
        (error as { response?: { data?: { fieldErrors?: ServerFieldError[] } } })
          ?.response?.data?.fieldErrors ?? null;
      const { errors, banner } = mapServerFieldErrors(serverFieldErrors);
      if (Object.keys(errors).length > 0) {
        setFormErrors((previous) => ({ ...previous, ...errors }));
        setFormError(banner);
        return;
      }
      // Unmapped field errors (no inline home) still carry specific per-field reasons — prefer them
      // over the generic super-message from extractApiError.
      if (banner) {
        setFormError(banner);
        return;
      }
      setFormError(
        extractApiError(
          error,
          isEdit
            ? 'Could not update the performance remark.'
            : 'Could not create the performance remark.',
        ),
      );
    },
  });

  const handleFieldChange = <K extends keyof PerformanceRemarkFormValues>(
    field: K,
    value: PerformanceRemarkFormValues[K],
  ) => {
    setFormValues((previous) => {
      const next = { ...previous, [field]: value };
      // Switching Issue Type hides one of the code inputs — drop the hidden code so a stale value
      // is never submitted, and clear its error.
      if (field === 'issueType') {
        next.scalerPerformanceActnCode = '';
        next.scalerPerformanceOutcmCode = '';
      }
      return next;
    });

    setFormErrors((previous) => {
      const next = { ...previous, [field]: undefined };
      if (field === 'issueType') {
        next.scalerPerformanceActnCode = undefined;
        next.scalerPerformanceOutcmCode = undefined;
      }
      return next;
    });
    setFormError(null);
  };

  const resetForm = () => {
    setFormValues(seededValues);
    setFormErrors({});
    setFormError(null);
  };

  const handleSave = () => {
    const nextErrors = validatePerformanceRemarkForm(formValues);
    setFormErrors(nextErrors);
    setFormError(null);

    // Client-side validation failures are shown inline beneath each field — no banner.
    if (Object.keys(nextErrors).length > 0) {
      scrollToError();
      return;
    }

    saveMutation.mutate();
  };

  const isSubmitting = saveMutation.isPending;

  return (
    <div className="scs__tab-view__panel">
      <section className="view-scale-site__section">
        <h4 className="view-scale-site__section-title">
          {`Scaler Performance Remark - ${isEdit ? 'Update' : 'Create'}`}
        </h4>

        {lovError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Issue Type options unavailable."
            subtitle={lovError}
            className="view-scaler__notification"
          />
        ) : null}

        {formError ? (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not save the performance remark."
            subtitle={formError}
            className="view-scaler__notification"
          />
        ) : null}

        <Form onSubmit={(event) => event.preventDefault()}>
          <PerformanceRemarksForm
            actionOptions={actionOptions}
            outcomeOptions={outcomeOptions}
            errors={formErrors}
            isSubmitting={isSubmitting}
            issueNumber={remarkId != null ? String(remarkId) : ''}
            values={formValues}
            onChange={handleFieldChange}
          />

          <div className="scs__form__divider scs__form__divider--actions" />

          <div className="form-actions">
            <Button
              kind="secondary"
              type="button"
              className="action-btn"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              kind="secondary"
              type="button"
              className="action-btn"
              onClick={resetForm}
              renderIcon={ResetIcon}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              kind="primary"
              type="button"
              className="action-btn"
              onClick={handleSave}
              renderIcon={SaveIcon}
              disabled={isSubmitting || isLovLoading || Boolean(lovError)}
            >
              Save Record
            </Button>
            {isEdit ? <WhoDidIt audit={remark} /> : null}
          </div>
        </Form>
      </section>
    </div>
  );
};

export default PerformanceRemarksAction;
