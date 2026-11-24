import { Column, Grid } from '@carbon/react';
import { type FC, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageTitle from '@/components/core/PageTitle';
import ScalerForm, { type ScalerFormValues } from '@/components/Form/ScalerForm';
import { buildCreateRequest, createEmptyScalerFormValues, validateScalerForm } from '@/components/Form/ScalerForm/logic';
import { resolveServerErrors, useScalerFormLovOptions } from '@/components/Form/ScalerForm/support';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import { scrollToError } from '@/utils/scrollToError';

import './index.scss';

const ScalerCreatePage: FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();

  const [values, setValues] = useState<ScalerFormValues>(createEmptyScalerFormValues);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { appointmentOptions, trainingOptions, appointmentTypesError, trainingTypesError } =
    useScalerFormLovOptions();

  const handleFieldChange = useCallback(
    <K extends keyof ScalerFormValues>(field: K, value: ScalerFormValues[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const onReset = () => {
    setValues(createEmptyScalerFormValues());
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
  };

  useEffect(() => {
    if (!submitAttempted) {
      return;
    }

    const result = validateScalerForm(values, 'create');
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
  }, [submitAttempted, values]);

  const onSaveRecord = async () => {
    setSubmitAttempted(true);
    const result = validateScalerForm(values, 'create');
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
    if (!result.ok) {
      scrollToError();
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await userToken();
      const created = await API.scalers.createScaler(buildCreateRequest(values, appointmentOptions), token);
      const licenceNo = created.scalerLicenceNo;
      if (licenceNo) {
        navigate(`/scalers/view/${licenceNo}`);
        return;
      }
      setFormError('Scaler was created, but no licence number was returned.');
    } catch (error) {
      const resolved = resolveServerErrors(error, 'Could not create scaler.');
      setFieldErrors((prev) => ({ ...prev, ...resolved.fieldErrors }));
      setFormError(resolved.formError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Scaler - Create" />

        <ScalerForm
          mode="create"
          values={values}
          onChange={handleFieldChange}
          fieldErrors={fieldErrors}
          formError={formError}
          submitAttempted={submitAttempted}
          isSubmitting={isSubmitting}
          appointmentOptions={appointmentOptions}
          trainingOptions={trainingOptions}
          appointmentTypesError={appointmentTypesError}
          trainingTypesError={trainingTypesError}
          onSave={onSaveRecord}
          onReset={onReset}
        />
      </Column>
    </Grid>
  );
};

export default ScalerCreatePage;
