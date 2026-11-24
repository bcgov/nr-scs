import {
  Column,
  Form,
  Grid,
  InlineLoading,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
} from '@carbon/react';
import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import DdnDdvTable from '@/components/core/DdnDdvTable';
import { useQueryClient } from '@tanstack/react-query';
import { type FC, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import CheckScaleForm, {
  type CheckScaleFormEditableField,
  type CheckScaleFormErrors,
  type CheckScaleFormValues,
} from '@/components/Form/CheckScaleForm';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type {
  CheckScaleApiModel,
  CheckScaleCreateRequest,
  CheckScaleValidationRequest,
  CheckScaleValidationResponse,
  FieldError,
  FieldErrorField,
} from '@/services/checkScales.service';
import type { StaticLov } from '@/services/lov.service';
import SpeciesProductGradeSummary from '@/components/core/SpeciesProductGradeSummary';
import { extractApiError } from '@/utils/extractApiError';
import { validateNetValue } from '@/utils/netValue';
import { formatNetVolume } from '@/utils/netVolume';
import { requiredLabel } from '@/utils/requiredLabel';
import { scrollToError } from '@/utils/scrollToError';

// The API payload is read defensively: besides the documented CheckScaleApiModel fields, several legacy
// alias keys are checked as fallbacks, so unknown extra keys are allowed.
type CheckScaleApiSource = Partial<CheckScaleApiModel> & Record<string, unknown>;
type CheckScaleApiResponse = CheckScaleValidationResponse & {
  data?: CheckScaleApiModel & { ckscNumber?: string | number | null };
  ckscNumber?: string | number | null;
};

const firstDefined = <T,>(...vals: Array<T | null | undefined>) => vals.find((v) => v !== undefined && v !== null);
const asString = (value: unknown, fallback = '') => (value !== undefined && value !== null ? String(value) : fallback);
const formatDecimal = (value: unknown, places: number, fallback = ''): string => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num.toFixed(places);
};
const toYesNo = (value: unknown, fallback: CheckScaleFormValues['followedGoodPractices']): CheckScaleFormValues['followedGoodPractices'] => {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value === 'Y') {
    return 'Yes';
  }
  if (value === 'N') {
    return 'No';
  }
  if (value === 'Yes' || value === 'No' || value === '') {
    return value;
  }
  return fallback;
};

const initialValues: CheckScaleFormValues = {
  returnType: 'Log Tally',
  checkDdn: '',
  checkDdv: '',
  originalDdn: '',
  originalDdv: '',

  checkScaleType: '',
  followedGoodPractices: '',
  originalWithinStandard: '',
  comment: '',
  originalNetValue: '',
  checkNetValue: '',

  checkScalerLicence: '',
  originalScalerLicence: '',
  secondScalerLicence: '',
  loadArrival: '',
  weighSlip: '',
  timberMark: '',
  scaleSite: '',
  checkReplacesOriginal: '',
  population: '',
  stratum: '',
  year: '',

  originalScaleDate: '',
  checkScaleDate: '',
  originalScaleReturn: '',
  checkScaleReturn: '',
  originalTops: '',
  checkTops: '',
  originalButts: '',
  checkButts: '',
  originalLength: '',
  checkLength: '',
  originalNetVolume: '',
  checkNetVolume: '',
};

const CheckScaleCreatePage: FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const [checkScaleTypeOptions, setCheckScaleTypeOptions] = useState<StaticLov[]>([]);
  const [speciesLov, setSpeciesLov] = useState<StaticLov[]>([]);
  const [productLov, setProductLov] = useState<StaticLov[]>([]);
  const [gradeLov, setGradeLov] = useState<StaticLov[]>([]);
  const [values, setValues] = useState<CheckScaleFormValues>(initialValues);
  const setValue = <K extends keyof CheckScaleFormValues>(key: K, value: CheckScaleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

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

  const describeCode = (lov: StaticLov[], code: string | null | undefined): string | null => {
    if (!code) {
      return null;
    }
    const match = lov.find((o) => o.code === code);
    return match?.description ?? code;
  };

  const mergeApiValues = (prev: CheckScaleFormValues, src: CheckScaleApiSource): CheckScaleFormValues => {
    const next = { ...prev };

    next.checkDdn = asString(firstDefined(src.chkLogTallyDocNo, src.chkSampleLogTallyDocNo), prev.checkDdn);
    next.checkDdv = asString(firstDefined(src.chkLogTallyVer, src.chkSampleLogTallyVer), prev.checkDdv);
    next.originalDdn = asString(firstDefined(src.orgLogTallyDocNo, src.orgSampleLogTallyDocNo), prev.originalDdn);
    next.originalDdv = asString(firstDefined(src.orgLogTallyVer, src.orgSampleLogTallyVer), prev.originalDdv);

    next.checkScalerLicence = asString(
      firstDefined(src.checkScalerLicenceNo, src.chkScalerLicence, src.checkScalerLicence),
      prev.checkScalerLicence,
    );
    next.originalScalerLicence = asString(
      firstDefined(src.originalScalerLicenceNo, src.orgScalerLicence, src.originalScalerLicence),
      prev.originalScalerLicence,
    );
    next.secondScalerLicence = asString(firstDefined(src.secondScalerLicenceNo, src.secondScalerLicence), prev.secondScalerLicence);
    next.loadArrival = asString(firstDefined(src.loadArrivalNumber, src.loadArrivalNo, src.loadArrival), prev.loadArrival);
    next.weighSlip = asString(firstDefined(src.weighSlipNumber, src.weighSlipNo, src.weighSlip), prev.weighSlip);
    next.timberMark = asString(src.timberMark, prev.timberMark);
    next.scaleSite = asString(firstDefined(src.scaleSiteIdNmbr, src.scaleSiteNo, src.scaleSite), prev.scaleSite);

    next.followedGoodPractices = toYesNo(firstDefined(src.followedGoodPracticeInd, src.followedGoodPractices, src.followed), prev.followedGoodPractices);
    next.originalWithinStandard = toYesNo(firstDefined(src.originalWithinStandardInd, src.originalWithinStandard, src.originalWithinStd), prev.originalWithinStandard);
    next.checkReplacesOriginal = toYesNo(firstDefined(src.checkReplacesOriginalInd, src.checkReplacesOriginal, src.replacesOriginal), prev.checkReplacesOriginal);

    next.population = asString(src.population, prev.population);
    next.stratum = asString(src.stratum, prev.stratum);
    next.year = asString(src.year, prev.year);
    next.comment = asString(firstDefined(src.chkScalerCommentTxt, src.checkScalerComment, src.comment), prev.comment);

    next.originalScaleDate = asString(firstDefined(src.originalScaleDate, src.originalDateOfScale, src.dateOfScaleOriginal), prev.originalScaleDate);
    next.checkScaleDate = asString(firstDefined(src.chkScaleDate, src.checkDateOfScale, src.dateOfScaleCheck), prev.checkScaleDate);
    next.originalScaleReturn = asString(firstDefined(src.originalScaleReturnNo, src.originalScaleReturn, src.scaleReturnOriginal), prev.originalScaleReturn);
    next.checkScaleReturn = asString(firstDefined(src.chkScaleReturnNo, src.checkScaleReturn, src.scaleReturnCheck), prev.checkScaleReturn);
    next.originalTops = asString(firstDefined(src.originalScaleTotalTops, src.originalTops), prev.originalTops);
    next.checkTops = asString(firstDefined(src.chkScaleTotalTops, src.checkTops), prev.checkTops);
    next.originalButts = asString(firstDefined(src.originalScaleTotalButts, src.originalButts), prev.originalButts);
    next.checkButts = asString(firstDefined(src.chkScaleTotalButts, src.checkButts), prev.checkButts);
    next.originalLength = formatDecimal(firstDefined(src.originalScaleTotalLength, src.originalLength), 1, prev.originalLength);
    next.checkLength = formatDecimal(firstDefined(src.chkScaleTotalLength, src.checkLength), 1, prev.checkLength);
    next.originalNetValue = asString(src.originalNetValue, prev.originalNetValue);
    next.checkNetValue = asString(src.checkNetValue, prev.checkNetValue);

    next.checkScaleType = asString(firstDefined(src.checkScaleTypeCode, src.checkScaleType), prev.checkScaleType);
    return next;
  };

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [serverError, setServerError] = useState('');
  const [apiResponse, setApiResponse] = useState<CheckScaleApiResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const onReset = () => {
    setValues(initialValues);
    setSubmitAttempted(false);
    setFieldErrors({});
    try {
      sessionStorage.removeItem('checkScaleDraft');
    } catch {
      // ignore
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const required = (key: string, ok: boolean, message: string) => {
      if (!ok) {
        nextErrors[key] = message;
      }
    };
    // DDV is a whole-number version (legacy validates it with OAValidator.isInteger); a non-numeric
    // entry gets the legacy "must be a number" message rather than passing through to the backend.
    const requireInteger = (key: string, value: string, label: string) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        nextErrors[key] = 'Required.';
      } else if (!/^\d+$/.test(trimmed)) {
        nextErrors[key] = `${label} must be a number.`;
      }
    };

    required('returnType', values.returnType === 'Log Tally' || values.returnType === 'Sample Log Tally', 'Return Type is required.');
    required('checkScaleDdn', values.checkDdn.trim().length > 0, 'Required.');
    requireInteger('checkScaleDdv', values.checkDdv, 'Check Scale DDV');
    required('originalScaleDdn', values.originalDdn.trim().length > 0, 'Required.');
    requireInteger('originalScaleDdv', values.originalDdv, 'Original Scale DDV');

    return { ok: Object.keys(nextErrors).length === 0, nextErrors };
  };

  const onSaveRecord = async () => {
    setSubmitAttempted(true);
    const result = validate();
    setFieldErrors(result.nextErrors);
    if (!result.ok) {
      scrollToError();
      return;
    }

    setServerError('');
    const payload: CheckScaleValidationRequest =
      values.returnType === 'Log Tally'
        ? {
            chkLogTallyDocNo: values.checkDdn || undefined,
            chkLogTallyVer: values.checkDdv ? parseInt(values.checkDdv, 10) : undefined,
            orgLogTallyDocNo: values.originalDdn || undefined,
            orgLogTallyVer: values.originalDdv ? parseInt(values.originalDdv, 10) : undefined,
          }
        : {
            chkSampleLogTallyDocNo: values.checkDdn || undefined,
            chkSampleLogTallyVer: values.checkDdv ? parseInt(values.checkDdv, 10) : undefined,
            orgSampleLogTallyDocNo: values.originalDdn || undefined,
            orgSampleLogTallyVer: values.originalDdv ? parseInt(values.originalDdv, 10) : undefined,
          };

    setIsValidating(true);
    try {
      const token = await userToken();
      const res = await API.checkScale.validateCheckScale(payload, token);

      try {
        sessionStorage.setItem('checkScaleDraft', JSON.stringify(payload));
      } catch {
        // ignore
      }

      if (res?.ok) {
        setApiResponse(res);
        setServerError('');
        setFieldErrors({});
      } else {
        applyFieldErrors(res?.errors ?? []);
        setApiResponse(null);
      }
    } catch (err) {
      setServerError(extractApiError(err, 'Validation failed'));
      setApiResponse(null);
    } finally {
      setIsValidating(false);
    }
  };

  const applyFieldErrors = (errors: FieldError[]) => {
    const mapped: Record<string, string> = {};
    for (const err of errors) {
      const key = mapBackendField(err.field);
      mapped[key] = mapped[key] ? `${mapped[key]} ${err.message}` : err.message;
    }
    setFieldErrors(mapped);
    setServerError('');
  };

  const mapBackendField = (field: FieldErrorField): string => {
    switch (field) {
      case 'returnType':
        return 'returnType';
      case 'checkScaleDdn':
        return 'checkScaleDdn';
      case 'checkScaleDdv':
        return 'checkScaleDdv';
      case 'originalScaleDdn':
        return 'originalScaleDdn';
      case 'originalScaleDdv':
        return 'originalScaleDdv';
      default:
        return 'returnType';
    }
  };

  const onBack = () => {
    setApiResponse(null);
    setServerError('');
  };

  const onPostReset = () => {
    // Mirror legacy reset: clear the truly-editable step-2 fields.
    // checkReplacesOriginal stays — it's HBS-derived and read-only.
    setValues((prev) => ({
      ...prev,
      checkScaleType: '',
      followedGoodPractices: '',
      originalWithinStandard: '',
      comment: '',
      originalNetValue: '',
      checkNetValue: '',
    }));
    setFieldErrors({});
    setServerError('');
  };

  const validateStep2 = () => {
    const next: Record<string, string> = {};
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

  const onSaveRecordPost = async () => {
    setSubmitAttempted(true);
    const step2 = validateStep2();
    setFieldErrors(step2.next);
    if (!step2.ok) {
      scrollToError();
      return;
    }
    setServerError('');

    const isSample = values.returnType === 'Sample Log Tally';
    const ddn = values.checkDdn || undefined;
    const ddv = values.checkDdv ? parseInt(values.checkDdv, 10) : undefined;
    const orgDdn = values.originalDdn || undefined;
    const orgDdv = values.originalDdv ? parseInt(values.originalDdv, 10) : undefined;

    const payload: CheckScaleCreateRequest = {
      checkScaleTypeCode: values.checkScaleType,
      followedGoodPracticeInd: values.followedGoodPractices === 'Yes' ? 'Y' : 'N',
      originalWithinStandardInd: values.originalWithinStandard === 'Yes' ? 'Y' : 'N',
      chkScalerCommentTxt: values.comment || undefined,
      originalScaleNetValue: parseFloat(values.originalNetValue),
      checkScaleNetValue: parseFloat(values.checkNetValue),
      ...(isSample
        ? {
            chkSampleLogTallyDocNo: ddn,
            chkSampleLogTallyVer: ddv,
            orgSampleLogTallyDocNo: orgDdn,
            orgSampleLogTallyVer: orgDdv,
          }
        : {
            chkLogTallyDocNo: ddn,
            chkLogTallyVer: ddv,
            orgLogTallyDocNo: orgDdn,
            orgLogTallyVer: orgDdv,
          }),
    };

    setIsSaving(true);
    try {
      const token = await userToken();
      const res = await API.checkScale.createCheckScale(payload, token);

      // Drop the cached tab lists so the scaler + scale site Check Scales tabs show the new row on return.
      queryClient.removeQueries({ queryKey: ['scaler-check-scales'] });
      queryClient.removeQueries({ queryKey: ['scale-site-check-scales'] });

      try {
        sessionStorage.removeItem('checkScaleDraft');
      } catch {
        // ignore
      }
      navigate(`/check-scales/view/${encodeURIComponent(String(res.checkScaleId))}`);
    } catch (err) {
      setServerError(extractApiError(err, 'Save failed'));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('checkScaleDraft');
      if (!raw) {
        return;
      }
      const cs = JSON.parse(raw);
      if (!cs) {
        return;
      }
      const isSample = Boolean(cs.chkSampleLogTallyDocNo);
      setValues((prev) => ({
        ...prev,
        returnType: isSample ? 'Sample Log Tally' : 'Log Tally',
        checkDdn: asString(firstDefined(cs.chkSampleLogTallyDocNo, cs.chkLogTallyDocNo), prev.checkDdn),
        checkDdv: asString(firstDefined(cs.chkSampleLogTallyVer, cs.chkLogTallyVer), prev.checkDdv),
        originalDdn: asString(firstDefined(cs.orgSampleLogTallyDocNo, cs.orgLogTallyDocNo), prev.originalDdn),
        originalDdv: asString(firstDefined(cs.orgSampleLogTallyVer, cs.orgLogTallyVer), prev.originalDdv),
      }));
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    if (!apiResponse) {
      return;
    }
    const src = (apiResponse.checkScale || apiResponse.data || apiResponse || {}) as CheckScaleApiSource;
    setValues((prev) => mergeApiValues(prev, src));
  }, [apiResponse]);

  const speciesRows = useMemo(() => {
    if (!apiResponse) {
      return [];
    }
    const src = (apiResponse.checkScale || apiResponse.data || apiResponse || {}) as CheckScaleApiSource;
    const arr = src.speciesSummary ?? [];
    return (arr || []).map((row, index: number) => ({
      id: `${row.speciesCode ?? 'UNK'}-${row.speciesGrade ?? 'UNK'}-${row.productCode ?? 'UNK'}-${index}`,
      species: describeCode(speciesLov, row.speciesCode),
      speciesGrade: describeCode(gradeLov, row.speciesGrade),
      productCode: describeCode(productLov, row.productCode),
      orgPieces: row.orgPieces ?? null,
      orgNetVolume: formatNetVolume(row.orgNetVolume) || null,
      chkPieces: row.chkPieces ?? null,
      chkNetVolume: formatNetVolume(row.chkNetVolume) || null,
    }));
  }, [apiResponse, speciesLov, productLov, gradeLov]);

  const formErrors: CheckScaleFormErrors = {
    checkScaleType: fieldErrors.checkScaleType,
    followedGoodPractices: fieldErrors.followedGoodPractices,
    originalWithinStandard: fieldErrors.originalWithinStandard,
    comment: fieldErrors.comment,
    originalNetValue: fieldErrors.originalNetValue,
    checkNetValue: fieldErrors.checkNetValue,
  };

  const handleFormChange = (field: CheckScaleFormEditableField, value: string) => {
    setValue(field, value as CheckScaleFormValues[typeof field]);
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Check Scale - Create" />

        {submitAttempted && Object.keys(fieldErrors).length > 0 && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Please fix the errors below."
            subtitle="All fields are required."
            style={{ marginBottom: '24px' }}
          />
        )}

        {serverError && <InlineNotification kind="error" lowContrast title="Request failed" subtitle={serverError} style={{ marginBottom: '24px' }} />}

        {apiResponse ? (
          <div className="check-scale-create-form scs__form" style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Check Scale #:</strong> {apiResponse?.ckscNumber ?? apiResponse?.data?.ckscNumber ?? ''}
            </div>

            <CheckScaleForm
              mode="create"
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
              <Button kind="secondary" onClick={onBack} className="action-btn" disabled={isSaving}>
                Back
              </Button>
              <Button kind="secondary" onClick={onPostReset} className="action-btn" renderIcon={ResetIcon} disabled={isSaving}>
                Reset
              </Button>
              {isSaving ? (
                <InlineLoading description="Saving…" status="active" />
              ) : (
                <Button kind="primary" onClick={onSaveRecordPost} className="action-btn" renderIcon={SaveIcon}>
                  Save Record
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Form onSubmit={(e) => e.preventDefault()} className="check-scale-create-form scs__form">
            <h4 className="scs__form__section-title">Check Scale</h4>

            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <RadioButtonGroup
                  legendText={requiredLabel('Return Type', 'scs__required')}
                  name="returnType"
                  valueSelected={values.returnType}
                  onChange={(value) => setValue('returnType', value as CheckScaleFormValues['returnType'])}
                >
                  <RadioButton id="rt-log" labelText="Log Tally" value="Log Tally" />
                  <RadioButton id="rt-sample" labelText="Sample Log Tally" value="Sample Log Tally" />
                </RadioButtonGroup>
              </Column>

              <Column lg={16} md={8} sm={4}>
                <DdnDdvTable
                  checkDdn={values.checkDdn}
                  checkDdv={values.checkDdv}
                  originalDdn={values.originalDdn}
                  originalDdv={values.originalDdv}
                  readOnly={false}
                  onChangeCheckDdn={(v) => setValue('checkDdn', v)}
                  onChangeCheckDdv={(v) => setValue('checkDdv', v)}
                  onChangeOriginalDdn={(v) => setValue('originalDdn', v)}
                  onChangeOriginalDdv={(v) => setValue('originalDdv', v)}
                  checkDdnError={fieldErrors.checkScaleDdn}
                  checkDdvError={fieldErrors.checkScaleDdv}
                  originalDdnError={fieldErrors.originalScaleDdn}
                  originalDdvError={fieldErrors.originalScaleDdv}
                />
              </Column>
            </Grid>

            <div className="scs__form__divider scs__form__divider--actions" />

            <div className="form-actions">
              <Button kind="secondary" onClick={onReset} renderIcon={ResetIcon} disabled={isValidating}>
                Reset
              </Button>
              {isValidating ? (
                <InlineLoading description="Validating…" status="active" />
              ) : (
                <Button kind="primary" onClick={onSaveRecord}>
                  Next
                </Button>
              )}
            </div>
          </Form>
        )}
      </Column>
    </Grid>
  );
};

export default CheckScaleCreatePage;
