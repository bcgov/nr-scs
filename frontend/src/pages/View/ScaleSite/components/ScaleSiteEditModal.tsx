import { Modal } from '@carbon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FC, useCallback, useEffect, useState } from 'react';

import ScaleSiteForm, { type ScaleSiteFormErrors, type ScaleSiteFormValues, type ScaleSiteSiteTypeOption } from '@/components/Form/ScaleSiteForm';
import { buildUpdateRequest, createEmptyScaleSiteFormValues, mapServerErrorToFormErrors, toScaleSiteFormValues, validateScaleSiteForm } from '@/components/Form/ScaleSiteForm/logic';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import type { ScaleMethodTypeLov } from '@/services/lov.service';
import type { ScaleSiteSummary } from '@/services/scaleSites.service';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

interface Props {
  open: boolean;
  onClose: () => void;
  summary: ScaleSiteSummary;
}

const ScaleSiteEditModal: FC<Props> = ({ open, onClose, summary }) => {
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const scaleSiteIdNmbr = summary.scaleSiteIdNmbr?.trim() ?? '';

  const [values, setValues] = useState<ScaleSiteFormValues>(() => toScaleSiteFormValues(summary));
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ScaleSiteFormErrors>({});

  // Re-seed values from the cached summary whenever the modal opens. Reuse the
  // cached summary rather than refetching — invalidation after save keeps the
  // surrounding view in sync.
  useEffect(() => {
    if (open) {
      setValues(toScaleSiteFormValues(summary));
      setSubmitAttempted(false);
      setFormError(null);
      setFieldErrors({});
    }
  }, [open, summary]);

  const loadScaleMethodTypes = useCallback(async () => {
    const token = await userToken();
    return API.lov.getScaleMethodTypeLov(undefined, token);
  }, [userToken]);

  const {
    data: scaleMethodTypes,
    isLoading: isLoadingScaleMethodTypes,
    error: scaleMethodTypesError,
  } = useLovOptions<ScaleMethodTypeLov>(loadScaleMethodTypes, {
    cacheKey: 'scale-method-type-lov',
    errorMessage: 'Could not load site type options.',
  });

  const siteTypeOptions: ScaleSiteSiteTypeOption[] = (scaleMethodTypes ?? [])
    .filter((m): m is { code: string; description: string } => Boolean(m.code && m.description))
    .map((m) => ({ code: m.code, description: m.description }));

  const handleFieldChange = useCallback(
    <K extends keyof ScaleSiteFormValues>(field: K, value: ScaleSiteFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateMutation = useMutation({
    mutationFn: async () => {
      const token = await userToken();
      return API.scaleSites.updateScaleSite(scaleSiteIdNmbr, buildUpdateRequest(values), token);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['scale-site-summary', scaleSiteIdNmbr] });
      onClose();
    },
    onError: (error: unknown) => {
      const mapped = mapServerErrorToFormErrors(extractApiError(error, 'Could not update scale site.'));
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
    },
  });

  const handleReset = () => {
    setValues(open ? toScaleSiteFormValues(summary) : createEmptyScaleSiteFormValues());
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
  };

  const handleSave = () => {
    setSubmitAttempted(true);
    const { ok, errors } = validateScaleSiteForm(values);
    setFieldErrors(errors);
    setFormError(null);
    if (!ok) {
      scrollToError();
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Scale Site - Edit"
      passiveModal
      size="lg"
    >
      <ScaleSiteForm
        mode="edit"
        values={values}
        onChange={handleFieldChange}
        errors={fieldErrors}
        submitAttempted={submitAttempted}
        isSubmitting={updateMutation.isPending}
        formError={formError}
        loadError={scaleMethodTypesError}
        onSave={handleSave}
        onReset={handleReset}
        siteTypeOptions={siteTypeOptions}
        isLoadingSiteTypes={isLoadingScaleMethodTypes}
      />
    </Modal>
  );
};

export default ScaleSiteEditModal;
