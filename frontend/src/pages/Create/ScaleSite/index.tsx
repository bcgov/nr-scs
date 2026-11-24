import { Column, Grid } from '@carbon/react';
import { type FC, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageTitle from '@/components/core/PageTitle';
import ScaleSiteForm, { type ScaleSiteFormErrors, type ScaleSiteFormValues, type ScaleSiteSiteTypeOption } from '@/components/Form/ScaleSiteForm';
import { buildCreateRequest, createEmptyScaleSiteFormValues, mapServerErrorToFormErrors, validateScaleSiteForm } from '@/components/Form/ScaleSiteForm/logic';
import { useAuth } from '@/context/auth/useAuth';
import { useLovOptions } from '@/hooks/useLovOptions';
import API from '@/services/APIs';
import type { ScaleMethodTypeLov } from '@/services/lov.service';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';

import './index.scss';

const ScaleSiteCreatePage: FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();

  const [values, setValues] = useState<ScaleSiteFormValues>(createEmptyScaleSiteFormValues);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ScaleSiteFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = useCallback(
    <K extends keyof ScaleSiteFormValues>(field: K, value: ScaleSiteFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

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

  const handleReset = () => {
    setValues(createEmptyScaleSiteFormValues());
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(false);
  };

  const handleSave = async () => {
    setSubmitAttempted(true);
    const { ok, errors } = validateScaleSiteForm(values);
    setFieldErrors(errors);
    setFormError(null);
    if (!ok) {
      scrollToError();
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await userToken();
      const created = await API.scaleSites.createScaleSite(buildCreateRequest(values), token);
      const newId = created.scaleSiteIdNmbr;
      if (newId) {
        navigate(`/scale-sites/view/${encodeURIComponent(newId)}`);
        return;
      }
      setFormError('Scale site was created, but no scale site number was returned.');
    } catch (error) {
      const mapped = mapServerErrorToFormErrors(extractApiError(error, 'Could not create scale site.'));
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Scale Site - Create"/>

        <ScaleSiteForm
          mode="create"
          values={values}
          onChange={handleFieldChange}
          errors={fieldErrors}
          submitAttempted={submitAttempted}
          isSubmitting={isSubmitting}
          formError={formError}
          loadError={scaleMethodTypesError}
          onSave={handleSave}
          onReset={handleReset}
          siteTypeOptions={siteTypeOptions}
          isLoadingSiteTypes={isLoadingScaleMethodTypes}
        />
      </Column>
    </Grid>
  );
};

export default ScaleSiteCreatePage;
