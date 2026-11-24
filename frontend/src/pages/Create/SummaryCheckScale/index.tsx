import { Column, Form, Grid, InlineNotification } from '@carbon/react';
import { ArrowLeft as BackIcon, Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { type FC, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import SummaryCheckScaleForm, {
  type SummaryCheckScaleHeaderField,
} from '@/components/Form/SummaryCheckScaleForm';
import SpgRowFields from '@/components/Form/SummaryCheckScaleForm/SpgRowFields';
import {
  EMPTY_HEADER_VALUES,
  EMPTY_SPG_ROW,
  RETURN_TYPE_API,
  buildSpgRowRequest,
  mapServerFieldErrors,
  nextSpgRowAfterChange,
  toYesNoInd,
  validateHeader,
  validateSpgRow,
  type ReturnTypeLabel,
  type SummaryCheckScaleHeaderValues,
  type SummaryCheckScaleSpgRowValues,
} from '@/components/Form/SummaryCheckScaleForm/summaryCheckScaleViewModel';
import { extractApiError } from '@/utils/extractApiError';
import { scrollToError } from '@/utils/scrollToError';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { SummaryCheckScaleCreateRequest } from '@/services/summaryCheckScales.service';

import { useSummaryCheckScaleLovs } from '@/hooks/useSummaryCheckScaleLovs';
const SummaryCheckScaleCreatePage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backState = (location.state ?? {}) as {
    backTo?: string;
    scalerName?: string;
    originalScalerLicenceNo?: string;
  };
  const hasTombstone = Boolean(backState.scalerName);
  // Legacy parity: seed Original Scaler Licence # from the scaler context when present.
  const initialHeader: SummaryCheckScaleHeaderValues = backState.originalScalerLicenceNo
    ? { ...EMPTY_HEADER_VALUES, originalScalerLicence: backState.originalScalerLicenceNo }
    : EMPTY_HEADER_VALUES;

  const [header, setHeader] = useState<SummaryCheckScaleHeaderValues>(initialHeader);
  const [spgRow, setSpgRow] = useState<SummaryCheckScaleSpgRowValues>(EMPTY_SPG_ROW);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  // Bumped on each failed save attempt; the effect below scrolls to the first error post-commit
  // (so it works on the async server-error path too, where the invalid class isn't in the DOM yet
  // when the handler runs).
  const [scrollTick, setScrollTick] = useState(0);
  const { checkScaleTypeOptions, speciesLov, productLov, gradeLov, spgXref } =
    useSummaryCheckScaleLovs();

  const { userToken } = useAuth();
  const queryClient = useQueryClient();


  // Scroll to the first error after the render that applied the invalid state has committed.
  useEffect(() => {
    if (scrollTick > 0) {
      scrollToError();
    }
  }, [scrollTick]);

  const onHeaderChange = (field: SummaryCheckScaleHeaderField, value: string) => {
    setHeader((prev) => ({ ...prev, [field]: value as SummaryCheckScaleHeaderValues[typeof field] }));
  };

  const onSpgChange = (field: keyof SummaryCheckScaleSpgRowValues, value: string) => {
    setSpgRow((prev) => nextSpgRowAfterChange(prev, field, value, header.returnType));
  };

  const onReturnTypeChange = (value: ReturnTypeLabel) => {
    setHeader((prev) => ({ ...prev, returnType: value }));
    // Legacy returnTypeChange(): reset the SPG row so Product/Grade re-gate on the new type.
    setSpgRow((prev) => ({ ...prev, speciesCode: '', productCode: '', gradeCode: '' }));
  };

  const clearForm = () => {
    setHeader(initialHeader);
    setSpgRow(EMPTY_SPG_ROW);
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
  };

  const onSaveRecord = async () => {
    setSubmitAttempted(true);
    const headerResult = validateHeader(header);
    const spgResult = validateSpgRow(header.returnType, spgRow);
    const mergedErrors = { ...headerResult.errors, ...spgResult.errors };
    setFieldErrors(mergedErrors);
    setFormError(headerResult.formError);
    if (Object.keys(mergedErrors).length > 0) {
      setScrollTick((t) => t + 1);
      return;
    }

    const payload: SummaryCheckScaleCreateRequest = {
      returnType: RETURN_TYPE_API[header.returnType],
      checkScaleTypeCode: header.checkScaleType,
      originalScalerLicenceNo: header.originalScalerLicence,
      checkScalerLicenceNo: header.checkScalerLicence,
      loadArrivalNumber: header.loadArrivalNumber.trim() || null,
      weighSlipNumber: header.weighSlipNumber.trim() ? Number(header.weighSlipNumber) : null,
      timberMark: header.timberMark,
      scaleSiteIdNmbr: header.scaleSiteNumber,
      followedGoodPracticeInd: toYesNoInd(header.followedGoodPractices),
      originalWithinStandardInd: toYesNoInd(header.originalWithinStandard),
      checkReplacesOriginalInd: toYesNoInd(header.checkReplacesOriginal),
      partialInd: header.returnType === 'Special Forest Product' ? toYesNoInd(header.partialLoad) : null,
      originalScaleDate: header.originalDateOfScale,
      originalScaleReturnNo: Number(header.originalScaleReturn),
      chkScaleDate: header.checkDateOfScale,
      chkScaleReturnNo: Number(header.checkScaleReturn),
      chkScalerCommentTxt: header.checkScalerComment.trim() || null,
      spgRows: [buildSpgRowRequest(header.returnType, spgRow)],
    };

    try {
      setIsSaving(true);
      const token = await userToken();
      const res = await API.summaryCheckScale.createSummaryCheckScale(payload, token);
      // Drop the cached tab list so the scaler's Summary Check Scales tab shows the new row on return.
      queryClient.removeQueries({ queryKey: ['scaler-summary-check-scales'] });
      // Navigate to the update screen for the new record (UC-CHK-005-S01).
      navigate(`/summary-check-scales/${encodeURIComponent(String(res.checkScaleId))}/edit`);
    } catch (err) {
      const serverFieldErrors =
        (err as { response?: { data?: { fieldErrors?: Parameters<typeof mapServerFieldErrors>[0] } } })
          ?.response?.data?.fieldErrors ?? null;
      if (serverFieldErrors && serverFieldErrors.length > 0) {
        // Inline the server-side referential errors (e.g. scaler/timber mark/scale site not found).
        const { errors, banner } = mapServerFieldErrors(serverFieldErrors);
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        setFormError(banner ?? 'Please fix the errors below.');
        setScrollTick((t) => t + 1);
      } else {
        setFormError(extractApiError(err, 'Unable to save the summary check scale. Please try again.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onBack = () => {
    if (backState.backTo) {
      navigate(backState.backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Summary Check Scale - Create" />

        <Form onSubmit={(e) => e.preventDefault()} className="summary-check-scale-create-form scs__form">
          {submitAttempted && (formError || Object.keys(fieldErrors).length > 0) ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Please fix the errors below."
              subtitle={formError ?? 'Some required fields are missing.'}
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          <SummaryCheckScaleForm
            values={header}
            onChange={onHeaderChange}
            errors={fieldErrors}
            showErrors={submitAttempted}
            checkScaleTypeOptions={checkScaleTypeOptions}
            onReturnTypeChange={onReturnTypeChange}
          />

          <div className="scs__form__divider" />

          <h4 className="scs__form__section-title">Species Product Grade Summary</h4>
          <SpgRowFields
            values={spgRow}
            onChange={onSpgChange}
            errors={fieldErrors}
            showErrors={submitAttempted}
            returnType={header.returnType}
            speciesLov={speciesLov}
            productLov={productLov}
            gradeLov={gradeLov}
            xref={spgXref}
          />

          <div className="scs__form__divider scs__form__divider--actions" />

          <div className="form-actions">
            {hasTombstone ? (
              <Button kind="ghost" onClick={onBack} className="action-btn" renderIcon={BackIcon}>
                Back
              </Button>
            ) : null}
            <Button kind="secondary" onClick={clearForm} className="action-btn" renderIcon={ResetIcon}>
              Reset
            </Button>
            <Button
              kind="primary"
              onClick={onSaveRecord}
              className="action-btn"
              renderIcon={SaveIcon}
              disabled={isSaving}
            >
              Save Record
            </Button>
          </div>
        </Form>
      </Column>
    </Grid>
  );
};

export default SummaryCheckScaleCreatePage;
