import { Column, Grid, InlineLoading, InlineNotification, SkeletonText } from '@carbon/react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import CheckScaleForm, {
  type CheckScaleFormEditableField,
  type CheckScaleFormErrors,
  type CheckScaleFormValues,
} from '@/components/Form/CheckScaleForm';
import { asString, buildFormValues, buildSpeciesRows } from '@/components/Form/CheckScaleForm/checkScaleViewModel';
import SpeciesProductGradeSummary from '@/components/core/SpeciesProductGradeSummary';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { CheckScaleApiModel, CheckScaleUpdateRequest } from '@/services/checkScales.service';
import type { StaticLov } from '@/services/lov.service';
import { extractApiError } from '@/utils/extractApiError';
import { validateNetValue } from '@/utils/netValue';
import { scrollToError } from '@/utils/scrollToError';

const CheckScaleEditPage: FC = () => {
  const { checkScaleId } = useParams<{ checkScaleId: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [checkScaleTypeOptions, setCheckScaleTypeOptions] = useState<StaticLov[]>([]);
  const [speciesLov, setSpeciesLov] = useState<StaticLov[]>([]);
  const [productLov, setProductLov] = useState<StaticLov[]>([]);
  const [gradeLov, setGradeLov] = useState<StaticLov[]>([]);

  const [values, setValues] = useState<CheckScaleFormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await userToken();
        const [typeLov, species, product, grade] = await Promise.all([
          API.lov.getStaticLov({ tableKey: 'CHECK_SCALE_TYPE_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_SPECIES_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_PRODUCT_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_GRADE_CODE' }, token),
        ]);
        if (!cancelled) {
          setCheckScaleTypeOptions(typeLov ?? []);
          setSpeciesLov(species ?? []);
          setProductLov(product ?? []);
          setGradeLov(grade ?? []);
        }
      } catch {
        if (!cancelled) {
          setCheckScaleTypeOptions([]);
          setSpeciesLov([]);
          setProductLov([]);
          setGradeLov([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userToken]);

  const { data: loadedData, isLoading, isError } = useQuery<CheckScaleApiModel, Error>({
    queryKey: ['checkScale', checkScaleId],
    queryFn: async () => {
      const token = await userToken();
      if (!checkScaleId) {
        throw new Error('Check Scale ID is not provided');
      }
      return (await API.checkScale.getCheckScale(checkScaleId, token)) as unknown as CheckScaleApiModel;
    },
    enabled: !!checkScaleId,
  });

  useEffect(() => {
    if (loadedData && !values) {
      setValues(buildFormValues(loadedData, 2));
    }
  }, [loadedData, values]);

  const speciesRows = useMemo(
    () => buildSpeciesRows(loadedData?.speciesSummary, speciesLov, gradeLov, productLov),
    [loadedData, speciesLov, productLov, gradeLov],
  );

  const handleFormChange = (field: CheckScaleFormEditableField, value: string) => {
    setValues((prev) => (prev ? { ...prev, [field]: value as CheckScaleFormValues[typeof field] } : prev));
  };

  const validate = (): { ok: boolean; next: Record<string, string> } => {
    const next: Record<string, string> = {};
    if (!values) {
      return { ok: false, next };
    }
    if (!values.checkScaleType) {
      next.checkScaleType = 'Check Scale Type is required.';
    }
    if (values.followedGoodPractices !== 'Yes' && values.followedGoodPractices !== 'No') {
      next.followedGoodPractices = 'Followed Good Practices is required.';
    }
    if (values.originalWithinStandard !== 'Yes' && values.originalWithinStandard !== 'No') {
      next.originalWithinStandard = 'Original within Standard is required.';
    }
    const originalNetValueError = validateNetValue('Original Scale Net Value', values.originalNetValue);
    if (originalNetValueError) {
      next.originalNetValue = originalNetValueError;
    }
    const checkNetValueError = validateNetValue('Check Scale Net Value', values.checkNetValue);
    if (checkNetValueError) {
      next.checkNetValue = checkNetValueError;
    }
    return { ok: Object.keys(next).length === 0, next };
  };

  const onBack = () => {
    if (checkScaleId) {
      navigate(`/check-scales/view/${encodeURIComponent(checkScaleId)}`);
    } else {
      navigate(-1);
    }
  };

  const onReset = () => {
    if (loadedData) {
      setValues(buildFormValues(loadedData, 2));
      setFieldErrors({});
      setSubmitAttempted(false);
      setServerError('');
    }
  };

  const onSave = () => {
    setSubmitAttempted(true);
    const result = validate();
    setFieldErrors(result.next);
    if (!result.ok || !checkScaleId) {
      scrollToError();
      return;
    }

    setServerError('');
    const payload: CheckScaleUpdateRequest = {
      checkScaleTypeCode: values.checkScaleType,
      followedGoodPracticeInd: values.followedGoodPractices === 'Yes' ? 'Y' : 'N',
      originalWithinStandardInd: values.originalWithinStandard === 'Yes' ? 'Y' : 'N',
      chkScalerCommentTxt: values.comment || undefined,
      originalScaleNetValue: parseFloat(values.originalNetValue),
      checkScaleNetValue: parseFloat(values.checkNetValue),
    };

    setIsSaving(true);
    (async () => {
      try {
        const token = await userToken();
        await API.checkScale.updateCheckScale(checkScaleId, payload, token);
        queryClient.removeQueries({ queryKey: ['checkScale', checkScaleId] });
        // Drop the cached tab lists so the scaler + scale site Check Scales tabs reflect the edit.
        queryClient.removeQueries({ queryKey: ['scaler-check-scales'] });
        queryClient.removeQueries({ queryKey: ['scale-site-check-scales'] });
        navigate(`/check-scales/view/${encodeURIComponent(checkScaleId)}`);
      } catch (err) {
        setServerError(extractApiError(err, 'Save failed'));
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const formErrors: CheckScaleFormErrors = {
    checkScaleType: fieldErrors.checkScaleType,
    followedGoodPractices: fieldErrors.followedGoodPractices,
    originalWithinStandard: fieldErrors.originalWithinStandard,
    comment: fieldErrors.comment,
    originalNetValue: fieldErrors.originalNetValue,
    checkNetValue: fieldErrors.checkNetValue,
  };

  // Resolve the error case before the loading guard: a failed load leaves `values` null,
  // so `isLoading || !values` below would otherwise keep the page on the skeleton forever
  // and the not-found message would never render.
  if (isError || (!isLoading && !loadedData)) {
    return (
      <Grid>
        <Column lg={16} md={8} sm={4}>
          <PageTitle title="Error" />
          <p>Could not retrieve check scale data.</p>
        </Column>
      </Grid>
    );
  }

  if (isLoading || !values) {
    return (
      <Grid>
        <Column lg={16} md={8} sm={4}>
          <PageTitle
          title="Check Scale - Edit"
          breadCrumbs={[
            { name: 'Scalers', path: '/scalers' },
            { name: 'Check Scale', path: checkScaleId ? `/check-scales/view/${checkScaleId}` : undefined },
            { name: 'Edit' },
          ]}
        />
          <SkeletonText paragraph />
          <SkeletonText paragraph />
          <SkeletonText paragraph />
        </Column>
      </Grid>
    );
  }

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Check Scale - Edit"
          breadCrumbs={[
            { name: 'Scalers', path: '/scalers' },
            { name: 'Check Scale', path: checkScaleId ? `/check-scales/view/${checkScaleId}` : undefined },
            { name: 'Edit' },
          ]}
        />

        {submitAttempted && Object.keys(fieldErrors).length > 0 && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Please fix the errors below."
            subtitle="All required fields must be filled."
            style={{ marginBottom: '24px' }}
          />
        )}

        {serverError && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Save failed"
            subtitle={serverError}
            style={{ marginBottom: '24px' }}
          />
        )}

        <div className="scs__form" style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Check Scale #:</strong> {asString(loadedData.checkScaleId)}
          </div>

          <CheckScaleForm
            mode="edit"
            values={values}
            checkScaleTypeOptions={checkScaleTypeOptions}
            errors={formErrors}
            onChange={handleFormChange}
          />

          <div style={{ marginTop: '24px' }}>
            <h4 style={{ marginTop: '24px', marginBottom: '16px' }}>Species Product Grade Summary</h4>
            <Grid style={{ rowGap: '16px' }}>
              <Column lg={16} md={8} sm={4}>
                <SpeciesProductGradeSummary rows={speciesRows} isSortable size="sm" />
              </Column>
            </Grid>
          </div>

          <div className="form-actions" style={{ marginTop: '16px' }}>
            <Button onClick={onBack} className="action-btn" disabled={isSaving}>
              Back
            </Button>
            <Button onClick={onReset} className="action-btn" disabled={isSaving}>
              Reset
            </Button>
            {isSaving ? (
              <InlineLoading description="Saving…" status="active" />
            ) : (
              <Button onClick={onSave} className="action-btn">
                Save Record
              </Button>
            )}
          </div>
        </div>
      </Column>
    </Grid>
  );
};

export default CheckScaleEditPage;
