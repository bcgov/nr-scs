import { Column, Form, Grid, InlineLoading, InlineNotification, Modal, SkeletonText } from '@carbon/react';
import {
  Add as AddIcon,
  ArrowLeft as BackIcon,
  Document as LetterIcon,
  Reset as ResetIcon,
  Save as SaveIcon,
  TrashCan as DeleteIcon,
} from '@carbon/icons-react';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import PermissionGate from '@/components/PermissionGate';
import { PERMISSIONS } from '@/context/auth/permissions';
import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import SpeciesProductGradeSummary from '@/components/core/SpeciesProductGradeSummary';
import SummaryCheckScaleForm, {
  type SummaryCheckScaleHeaderField,
} from '@/components/Form/SummaryCheckScaleForm';
import SpgRowFields from '@/components/Form/SummaryCheckScaleForm/SpgRowFields';
import { buildSpeciesRows, buildSpeciesTotals } from '@/components/Form/CheckScaleForm/checkScaleViewModel';
import {
  EMPTY_SPG_ROW,
  RETURN_TYPE_API,
  buildHeaderValues,
  buildSpgRowRequest,
  isSpecialForestProduct,
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
import type { CheckScaleApiModel } from '@/services/checkScales.service';
import { useSummaryCheckScaleLovs } from '@/hooks/useSummaryCheckScaleLovs';
import type {
  SummaryCheckScaleSpgRowKey,
  SummaryCheckScaleUpdateRequest,
} from '@/services/summaryCheckScales.service';

type ConfirmState = { type: 'row'; id: string } | { type: 'record' } | null;

const SummaryCheckScaleUpdatePage: FC = () => {
  const { checkScaleId } = useParams<{ checkScaleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  // Any header/SPG/delete change alters the scaler tab's list rows or roll-up variances; drop the
  // cached list so the Summary Check Scales tab reloads fresh on return.
  const clearSummaryTabList = () =>
    queryClient.removeQueries({ queryKey: ['scaler-summary-check-scales'] });

  // Back appears only when arriving from a scaler context (legacy scalerTombstone rule); the future
  // summary check scale tab passes { backTo, scalerName } in the route state.
  const backState = (location.state ?? {}) as { backTo?: string; scalerName?: string };
  const hasTombstone = Boolean(backState.scalerName);
  const onBack = () => {
    if (backState.backTo) {
      navigate(backState.backTo);
    } else {
      navigate(-1);
    }
  };

  const { checkScaleTypeOptions, speciesLov, productLov, gradeLov, spgXref } =
    useSummaryCheckScaleLovs();

  const [header, setHeader] = useState<SummaryCheckScaleHeaderValues | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({});
  const [headerFormError, setHeaderFormError] = useState<string | null>(null);

  const [spgRow, setSpgRow] = useState<SummaryCheckScaleSpgRowValues>(EMPTY_SPG_ROW);
  const [addAttempted, setAddAttempted] = useState(false);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  const [serverError, setServerError] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  // Bumped on each failed save/add attempt; the effect below scrolls to the first error post-commit
  // (so it works on the async server-error path too).
  const [scrollTick, setScrollTick] = useState(0);


  const { data: loaded, isLoading, isError, refetch } = useQuery<CheckScaleApiModel, Error>({
    queryKey: ['summaryCheckScale', checkScaleId],
    queryFn: async () => {
      const token = await userToken();
      if (!checkScaleId) {
        throw new Error('Check Scale ID is not provided');
      }
      return API.summaryCheckScale.getSummaryCheckScale(checkScaleId, token);
    },
    enabled: !!checkScaleId,
  });

  // Hydrate the header once when the record first loads. Save/add/delete/reset re-apply via applyLoaded.
  useEffect(() => {
    if (loaded && header === null) {
      setHeader(buildHeaderValues(loaded));
    }
  }, [loaded, header]);

  // Scroll to the first error after the render that applied the invalid state has committed.
  useEffect(() => {
    if (scrollTick > 0) {
      scrollToError();
    }
  }, [scrollTick]);

  /** Apply a freshly persisted record: refresh the query cache and re-hydrate the header. */
  const applyLoaded = (data: CheckScaleApiModel) => {
    queryClient.setQueryData(['summaryCheckScale', checkScaleId], data);
    setHeader(buildHeaderValues(data));
  };

  const speciesRows = useMemo(
    () => buildSpeciesRows(loaded?.speciesSummary, speciesLov, gradeLov, productLov),
    [loaded, speciesLov, gradeLov, productLov],
  );

  // Map each display-row id back to its raw composite key for deletion (correlated by index, using
  // the ids buildSpeciesRows actually produced — no id-formula duplication).
  const keyById = useMemo(() => {
    const map = new Map<string, SummaryCheckScaleSpgRowKey>();
    (loaded?.speciesSummary ?? []).forEach((s, i) => {
      const id = speciesRows[i]?.id;
      if (id) {
        map.set(id, {
          scaleSpeciesCode: s.speciesCode ?? '',
          scaleProductCode: s.productCode ?? '',
          scaleGradeCode: s.speciesGrade ?? '',
        });
      }
    });
    return map;
  }, [loaded, speciesRows]);

  const canDeleteRow = speciesRows.length > 1;

  // Legacy updateSummaryCheckScale.jsp: the Return Type radios are disabled once the record has any
  // SPG row (size > 0), and editable only on a zero-row record. Zero-row records are legacy partial
  // saves (header persisted, first SPG row rejected) — our atomic create never produces them.
  const returnTypeLocked = speciesRows.length > 0;
  const persistedReturnType = loaded ? buildHeaderValues(loaded).returnType : null;
  // Legacy returnTypeChange(): when the type is editable and the user crosses the SFP/non-SFP
  // boundary (which changes the SPG gating), Add stays disabled until the new type is saved.
  // LT↔SLT does not change gating, so it does not block Add.
  const returnTypeChanged =
    !!header &&
    !!persistedReturnType &&
    isSpecialForestProduct(header.returnType) !== isSpecialForestProduct(persistedReturnType);

  const onHeaderChange = (field: SummaryCheckScaleHeaderField, value: string) => {
    setHeader((prev) =>
      prev ? { ...prev, [field]: value as SummaryCheckScaleHeaderValues[typeof field] } : prev,
    );
  };

  const onSpgChange = (field: keyof SummaryCheckScaleSpgRowValues, value: string) => {
    const returnType = header?.returnType ?? 'Special Forest Product';
    setSpgRow((prev) => nextSpgRowAfterChange(prev, field, value, returnType));
  };

  // Only reachable on a zero-row record (the radios are disabled otherwise). Reset the dependent SPG
  // row so Product/Grade re-gate on the new type, mirroring the create page.
  const onReturnTypeChange = (value: ReturnTypeLabel) => {
    setHeader((prev) => (prev ? { ...prev, returnType: value } : prev));
    setSpgRow((prev) => ({ ...prev, speciesCode: '', productCode: '', gradeCode: '' }));
  };

  const onSaveHeader = async () => {
    if (!header || !checkScaleId) {
      return;
    }
    setSubmitAttempted(true);
    const result = validateHeader(header);
    setHeaderErrors(result.errors);
    setHeaderFormError(result.formError);
    if (!result.ok) {
      setScrollTick((t) => t + 1);
      return;
    }

    const payload: SummaryCheckScaleUpdateRequest = {
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
    };

    setServerError('');
    setIsMutating(true);
    try {
      const token = await userToken();
      const fresh = await API.summaryCheckScale.updateSummaryCheckScale(checkScaleId, payload, token);
      applyLoaded(fresh);
      clearSummaryTabList();
      setSubmitAttempted(false);
      setHeaderErrors({});
      setHeaderFormError(null);
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string; fieldErrors?: unknown } } })?.response?.data;
      const serverFieldErrors = (data?.fieldErrors as Parameters<typeof mapServerFieldErrors>[0]) ?? null;
      if (serverFieldErrors && serverFieldErrors.length > 0) {
        // Inline the server-side referential errors (e.g. scaler/timber mark/scale site not found).
        const { errors, banner } = mapServerFieldErrors(serverFieldErrors);
        setHeaderErrors((prev) => ({ ...prev, ...errors }));
        setSubmitAttempted(true);
        setHeaderFormError(banner);
        setScrollTick((t) => t + 1);
      } else {
        setServerError(extractApiError(err, 'Unable to save the summary check scale.'));
      }
    } finally {
      setIsMutating(false);
    }
  };

  const onAddSpgRow = async () => {
    if (!header || !checkScaleId) {
      return;
    }
    // Legacy: the changed Return Type must be saved before a row can be added.
    if (returnTypeChanged) {
      return;
    }
    setAddAttempted(true);
    const result = validateSpgRow(header.returnType, spgRow);
    setAddErrors(result.errors);
    if (!result.ok) {
      setScrollTick((t) => t + 1);
      return;
    }

    const row = buildSpgRowRequest(header.returnType, spgRow);

    setServerError('');
    setIsMutating(true);
    try {
      const token = await userToken();
      const fresh = await API.summaryCheckScale.addSpgRow(checkScaleId, row, token);
      applyLoaded(fresh);
      clearSummaryTabList();
      setSpgRow(EMPTY_SPG_ROW);
      setAddAttempted(false);
      setAddErrors({});
    } catch (err) {
      setServerError(extractApiError(err, 'Unable to add the species product grade row.'));
    } finally {
      setIsMutating(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!confirm || !checkScaleId) {
      return;
    }
    const pending = confirm;
    setConfirm(null);
    setServerError('');
    setIsMutating(true);
    try {
      const token = await userToken();
      if (pending.type === 'record') {
        await API.summaryCheckScale.deleteSummaryCheckScale(checkScaleId, token);
        queryClient.removeQueries({ queryKey: ['summaryCheckScale', checkScaleId] });
        clearSummaryTabList();
        // After deleting the whole record, return to the create form.
        navigate('/summary-check-scales/create');
        return;
      }
      const key = keyById.get(pending.id);
      if (!key) {
        return;
      }
      const fresh = await API.summaryCheckScale.deleteSpgRow(checkScaleId, key, token);
      applyLoaded(fresh);
      clearSummaryTabList();
    } catch (err) {
      setServerError(extractApiError(err, 'Unable to delete.'));
    } finally {
      setIsMutating(false);
    }
  };

  const onCreateLetter = () => {
    navigate(`/check-scales/${checkScaleId}/advisory-letter`);
  };

  const onReset = async () => {
    // Reload the current persisted values via a fresh fetch (not a client-side clear).
    setSubmitAttempted(false);
    setHeaderErrors({});
    setHeaderFormError(null);
    setAddAttempted(false);
    setAddErrors({});
    setSpgRow(EMPTY_SPG_ROW);
    setServerError('');
    const result = await refetch();
    if (result.data) {
      setHeader(buildHeaderValues(result.data));
    }
  };

  if (isLoading || !header) {
    return (
      <Grid className="report-grid">
        <Column lg={16} md={8} sm={4}>
          <PageTitle title="Summary Check Scale - Update" />
          <SkeletonText paragraph />
          <SkeletonText paragraph />
          <SkeletonText paragraph />
        </Column>
      </Grid>
    );
  }

  if (isError || !loaded) {
    return (
      <Grid className="report-grid">
        <Column lg={16} md={8} sm={4}>
          <PageTitle title="Error" />
          <p>Could not retrieve the summary check scale.</p>
        </Column>
      </Grid>
    );
  }

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Summary Check Scale - Update" subtitle={`Check Scale #${loaded.checkScaleId}`} />

        <Form onSubmit={(e) => e.preventDefault()} className="summary-check-scale-update-form scs__form">
          {submitAttempted && (headerFormError || Object.keys(headerErrors).length > 0) ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Please fix the errors below."
              subtitle={headerFormError ?? 'Some required fields are missing.'}
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          {serverError ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Action failed"
              subtitle={serverError}
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          {returnTypeChanged ? (
            <InlineNotification
              kind="warning"
              lowContrast
              hideCloseButton
              title="You must save the changed return type before you will be able to add species product grade."
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          <SummaryCheckScaleForm
            values={header}
            onChange={onHeaderChange}
            errors={headerErrors}
            showErrors={submitAttempted}
            checkScaleTypeOptions={checkScaleTypeOptions}
            returnTypeLocked={returnTypeLocked}
            onReturnTypeChange={onReturnTypeChange}
          />

          <div className="scs__form__divider" />

          <h4 className="scs__form__section-title">Add Species Product Grade</h4>
          <SpgRowFields
            values={spgRow}
            onChange={onSpgChange}
            errors={addErrors}
            showErrors={addAttempted}
            returnType={header.returnType}
            speciesLov={speciesLov}
            productLov={productLov}
            gradeLov={gradeLov}
            xref={spgXref}
            action={
              <Button
                kind="tertiary"
                onClick={onAddSpgRow}
                className="action-btn"
                renderIcon={AddIcon}
                disabled={isMutating || returnTypeChanged}
              >
                Add
              </Button>
            }
          />

          <div className="scs__form__divider" />

          <h4 className="scs__form__section-title">Species Product Grade Summary</h4>
          <Grid className="scs__form__grid">
            <Column lg={16} md={8} sm={4}>
              <SpeciesProductGradeSummary
                rows={speciesRows}
                size="sm"
                onDelete={(id) => setConfirm({ type: 'row', id })}
                canDelete={canDeleteRow}
                showNetValue
                totals={speciesRows.length > 0 ? buildSpeciesTotals(loaded.speciesSummary) : undefined}
              />
            </Column>
          </Grid>

          <div className="scs__form__divider scs__form__divider--actions" />

          {/* Button order mirrors legacy updateSummaryCheckScale.jsp: Back, Reset, Save Record, Delete, Create Letter. */}
          <div className="form-actions">
            {hasTombstone ? (
              <Button kind="ghost" onClick={onBack} className="action-btn" renderIcon={BackIcon}>
                Back
              </Button>
            ) : null}
            <Button kind="secondary" onClick={onReset} className="action-btn" renderIcon={ResetIcon} disabled={isMutating}>
              Reset
            </Button>
            {isMutating ? (
              <InlineLoading description="Working…" status="active" />
            ) : (
              <Button kind="primary" onClick={onSaveHeader} className="action-btn" renderIcon={SaveIcon}>
                Save Record
              </Button>
            )}
            <PermissionGate permission={PERMISSIONS.SUMMARY_CHECK_SCALE_DELETE}>
              <Button kind="danger--tertiary" onClick={() => setConfirm({ type: 'record' })} className="action-btn" renderIcon={DeleteIcon} disabled={isMutating}>
                Delete Record
              </Button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.CHECK_SCALE_ADVISORY_LETTER_CREATE}>
              <Button kind="tertiary" onClick={onCreateLetter} className="action-btn" renderIcon={LetterIcon} disabled={isMutating}>
                Create Letter
              </Button>
            </PermissionGate>
          </div>
        </Form>

        {confirm ? (
          <Modal
            open
            danger
            modalHeading={confirm.type === 'record' ? 'Delete summary check scale?' : 'Delete species product grade row?'}
            primaryButtonText="Delete"
            secondaryButtonText="Cancel"
            onRequestClose={() => setConfirm(null)}
            onRequestSubmit={onConfirmDelete}
          >
            {confirm.type === 'record'
              ? 'This permanently deletes the record and all its species product grade rows.'
              : 'This permanently deletes the selected species product grade row.'}
          </Modal>
        ) : null}
      </Column>
    </Grid>
  );
};

export default SummaryCheckScaleUpdatePage;
