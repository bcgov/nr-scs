import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import { Column, Form, FormLabel, Grid, InlineNotification, TextArea, TextInput } from '@carbon/react';
import { useQueryClient } from '@tanstack/react-query';
import { type FC, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/core/Button';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import ScaleSiteSearchModal from '@/components/Modal/ScaleSiteSearchModal';
import PageTitle from '@/components/core/PageTitle';
import DateInput from '@/components/core/DateInput';
import { useAuth } from '@/context/auth/useAuth';
import {
  toOutcome,
  validateScaleSiteAuthorizationBasics,
} from '@/pages/authorizations/authorizationValidation';
import API from '@/services/APIs';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';
import type { ScaleSiteAuthorizationDetail, ScaleSiteAuthorizationUpdateRequest } from '@/services/scaleSiteAuthorizations.service';
import { extractApiError } from '@/utils/extractApiError';
import { requiredLabel } from '@/utils/requiredLabel';
import { scrollToError } from '@/utils/scrollToError';

type Snapshot = {
  scaleSiteNumber: string;
  effectiveDate: string;
  expiryDate: string;
  expectedAnnualScaleVolume: string;
  cancellationDate: string;
  cancellationReasonTxt: string;
  conditions: ScaleAuthCondition[];
};

const ScaleSiteAuthorizationEditPage: FC = () => {
  const { scaleSiteAuthorizationId } = useParams<{ scaleSiteAuthorizationId: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [record, setRecord] = useState<ScaleSiteAuthorizationDetail | null>(null);
  const [authorizationNumber, setAuthorizationNumber] = useState('');
  const [scaleSiteNumber, setScaleSiteNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expectedAnnualScaleVolume, setExpectedAnnualScaleVolume] = useState('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [cancellationReasonTxt, setCancellationReasonTxt] = useState('');

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [conditions, setConditions] = useState<ScaleAuthCondition[]>([]);
  const [scaleSiteModalOpen, setScaleSiteModalOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const resolvedNumericId = useMemo(() => Number(scaleSiteAuthorizationId ?? 0), [scaleSiteAuthorizationId]);
  const letterExists = Boolean(record?.letterExists);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev || !Object.prototype.hasOwnProperty.call(prev, key)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setFormError(null);
      setRecord(null);
      try {
        const token = await userToken();
        if (!Number.isFinite(resolvedNumericId) || resolvedNumericId <= 0) {
          setFormError('Invalid ID');
          return;
        }

        const detail = await API.scaleSiteAuthorizations.getScaleSiteAuthorization(resolvedNumericId, token);

        if (!mounted) {
          return;
        }
        const nextDetail = detail ?? null;
        setRecord(nextDetail);
        setAuthorizationNumber(String(nextDetail?.scaleSiteAuthorizationId ?? ''));
        setScaleSiteNumber(String(nextDetail?.scaleSiteIdNmbr ?? ''));
        setEffectiveDate(String(nextDetail?.authorizationEffectiveDate ?? ''));
        setExpiryDate(String(nextDetail?.authorizationExpiryDate ?? ''));
        setExpectedAnnualScaleVolume(
          nextDetail?.expectedScaleVolume == null ? '' : String(nextDetail.expectedScaleVolume),
        );
        setCancellationDate(String(nextDetail?.cancellationDate ?? ''));
        setCancellationReasonTxt(String(nextDetail?.cancellationReasonTxt ?? ''));
        setConditions(nextDetail?.conditions ?? []);

        setSnapshot({
          scaleSiteNumber: String(nextDetail?.scaleSiteIdNmbr ?? ''),
          effectiveDate: String(nextDetail?.authorizationEffectiveDate ?? ''),
          expiryDate: String(nextDetail?.authorizationExpiryDate ?? ''),
          expectedAnnualScaleVolume: nextDetail?.expectedScaleVolume == null ? '' : String(nextDetail.expectedScaleVolume),
          cancellationDate: String(nextDetail?.cancellationDate ?? ''),
          cancellationReasonTxt: String(nextDetail?.cancellationReasonTxt ?? ''),
          conditions: nextDetail?.conditions ?? [],
        });
      } catch (e: unknown) {
        if (mounted) {
          setFormError(e instanceof Error ? e.message : 'Could not load record.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, [resolvedNumericId, userToken]);

  const onReset = () => {
    if (!snapshot) {
      return;
    }
    setScaleSiteNumber(snapshot.scaleSiteNumber);
    setEffectiveDate(snapshot.effectiveDate);
    setExpiryDate(snapshot.expiryDate);
    setExpectedAnnualScaleVolume(snapshot.expectedAnnualScaleVolume);
    setCancellationDate(snapshot.cancellationDate);
    setCancellationReasonTxt(snapshot.cancellationReasonTxt);
    setConditions(snapshot.conditions);
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
  };

  const validateBasics = () => {
    // Once a letter exists the authorization is locked, so there is nothing left to validate.
    if (letterExists) {
      return toOutcome({});
    }

    return validateScaleSiteAuthorizationBasics({
      scaleSiteNumber,
      effectiveDate,
      expiryDate,
      expectedAnnualScaleVolume,
    });
  };


  const onSearchScaleSite = () => {
    setScaleSiteModalOpen(true);
  };

  const handleScaleSiteSelect = (site: { scaleSiteIdNmbr?: string | null }) => {
    if (!site?.scaleSiteIdNmbr) {
      return;
    }
    setScaleSiteNumber(site.scaleSiteIdNmbr ?? '');
    setScaleSiteModalOpen(false);
    clearFieldError('scaleSiteNumber');
  };

  const onSaveRecord = async () => {
    setSubmitAttempted(true);
    const result = validateBasics();
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
    if (!result.ok) {
      scrollToError();
      return;
    }

    const expectedVolume = expectedAnnualScaleVolume.trim().length > 0
      ? Number(expectedAnnualScaleVolume)
      : null;

    if (!letterExists && expectedVolume != null && !Number.isFinite(expectedVolume)) {
      setFieldErrors((prev) => ({ ...prev, expectedAnnualScaleVolume: 'Expected Annual Scale Volume must be a number.' }));
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await userToken();
      const payload: ScaleSiteAuthorizationUpdateRequest = {
        scaleSiteIdNmbr: scaleSiteNumber.trim().toUpperCase(),
        authorizationEffectiveDate: effectiveDate,
        authorizationExpiryDate: expiryDate,
        expectedScaleVolume: expectedVolume ?? 0,
        conditions: conditions
          .filter((item) => item.scaleAuthConditionId)
          .map((item) => ({
            scaleAuthConditionId: item.scaleAuthConditionId ?? null,
            scaleConditionClassCode: item.scaleConditionClassCode ?? 'SIA',
          })),
        cancellationDate: cancellationDate || undefined,
        cancellationReasonTxt: cancellationReasonTxt || undefined,
      };

      const updated = await API.scaleSiteAuthorizations.updateScaleSiteAuthorization(resolvedNumericId, payload, token);
      if (updated?.scaleSiteAuthorizationId) {
        setFormError(null);
        // refetchOnMount:false + a 3h staleTime means the inactive list won't refetch on the way
        // back, so drop the cached authorization lists to surface the edited record (e.g. a newly
        // added Cancellation Date) on return. Prefix removal — see the Create page for why.
        queryClient.removeQueries({ queryKey: ['scale-site-authorizations'] });
        queryClient.removeQueries({ queryKey: ['workbench', 'scale-site-authorizations'] });
        navigate(`/scale-site-authorizations/view/${updated.scaleSiteAuthorizationId}`);
        return;
      }
    } catch (error) {
      setFormError(extractApiError(error, 'Could not update scale site authorization.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = (key: string) => submitAttempted && Boolean(fieldErrors[key]);

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Scale Site Authorization - Edit"
          breadCrumbs={[
            { name: 'Create' },
            { name: 'Scale Site Authorization', path: '/scale-site-authorizations/create' },
          ]}
        />

        <Form onSubmit={(e) => e.preventDefault()} className="scale-site-authorization-create-form scs__form">
          <fieldset disabled={isSubmitting || isLoading} className="scale-site-authorization-create__fieldset">
            {formError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Unable to save scale site authorization"
                subtitle={formError}
              />
            ) : null}
            <h4 className="scs__form__section-title">Scale Site Authorization</h4>

            <Grid className="scs__form__grid">
              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="authorization-number"
                  value={authorizationNumber}
                  onChange={() => undefined}
                  labelText="Authorization #"
                  disabled
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <FormLabel style={{ marginBottom: '8px' }}>
                  {requiredLabel('Scale Site #', 'scale-site-authorization-create__required')}
                </FormLabel>
                <div className="scale-site-authorization-create__scale-site-row">
                  <TextInput
                    id="scale-site-number"
                    value={scaleSiteNumber}
                    onChange={(e) => {
                      setScaleSiteNumber(e.target.value);
                      clearFieldError('scaleSiteNumber');
                    }}
                    labelText=""
                    hideLabel
                    maxLength={4}
                    invalid={Boolean(fieldErrors.scaleSiteNumber)}
                    invalidText={fieldErrors.scaleSiteNumber}
                    disabled={letterExists}
                  />
                  <Button kind="secondary" className="scs__input-search-button" onClick={onSearchScaleSite} disabled={letterExists}>
                    Search
                  </Button>
                </div>
              </Column>

              <Column lg={8} md={8} sm={4}>
                <DateInput
                  id="effective-date"
                  value={effectiveDate}
                  onChange={(v: string) => {
                    setEffectiveDate(v);
                    clearFieldError('effectiveDate');
                    clearFieldError('expiryDate');
                  }}
                  placeholder="YYYY-MM-DD"
                  ariaLabel="Effective Date"
                  labelText={requiredLabel('Effective Date', 'scale-site-authorization-create__required')}
                  hideLabel={false}
                  invalid={Boolean(fieldErrors.effectiveDate)}
                  invalidText={fieldErrors.effectiveDate}
                  disabled={letterExists}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <DateInput
                  id="expiry-date"
                  value={expiryDate}
                  onChange={(v: string) => {
                    setExpiryDate(v);
                    clearFieldError('expiryDate');
                    clearFieldError('effectiveDate');
                  }}
                  placeholder="YYYY-MM-DD"
                  ariaLabel="Expiry Date"
                  labelText={requiredLabel('Expiry Date', 'scale-site-authorization-create__required')}
                  hideLabel={false}
                  invalid={Boolean(fieldErrors.expiryDate)}
                  invalidText={fieldErrors.expiryDate}
                  disabled={letterExists}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <TextInput
                  id="expected-annual-scale-volume"
                  value={expectedAnnualScaleVolume}
                  onChange={(e) => {
                    setExpectedAnnualScaleVolume(e.target.value);
                    clearFieldError('expectedAnnualScaleVolume');
                  }}
                  labelText={requiredLabel('Expected Annual Scale Volume', 'scale-site-authorization-create__required')}
                  maxLength={10}
                  invalid={showError('expectedAnnualScaleVolume')}
                  invalidText={fieldErrors.expectedAnnualScaleVolume}
                  disabled={letterExists}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <DateInput
                  id="cancellation-date"
                  value={cancellationDate}
                  onChange={(v: string) => {
                    setCancellationDate(v);
                    clearFieldError('cancellationDate');
                  }}
                  placeholder="YYYY-MM-DD"
                  ariaLabel="Cancellation Date"
                  labelText="Cancellation Date"
                  hideLabel={false}
                  invalid={Boolean(fieldErrors.cancellationDate)}
                  invalidText={fieldErrors.cancellationDate}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <TextArea
                  id="cancellation-reason"
                  labelText="Cancellation Reason"
                  value={cancellationReasonTxt}
                  onChange={(e) => {
                    setCancellationReasonTxt(e.target.value);
                    clearFieldError('cancellationReasonTxt');
                  }}
                  rows={3}
                />
              </Column>
            </Grid>

            <div className="scs__form__divider" />

            <AuthorizationConditionsSection
              conditionClassCode="SIA"
              templateFilterField="SIA"
              conditions={conditions}
              setConditions={setConditions}
              disabled={letterExists}
              conditionLinkPath="/maintenance/conditions"
              searchConditions={API.scaleSiteAuthorizations.searchActiveScaleSiteAuthConditions}
              getTemplateConditions={API.scaleSiteAuthorizations.getScaleSiteAuthTemplateConditions}
            />

            <div className="scs__form__divider scs__form__divider--actions" />

            <div className="form-actions">
              <Button kind="secondary" onClick={() => navigate(-1)} className="action-btn">
                Back
              </Button>
              <Button kind="secondary" onClick={onReset} className="action-btn" renderIcon={ResetIcon}>
                Reset
              </Button>
              <Button kind="primary" onClick={onSaveRecord} className="action-btn" renderIcon={SaveIcon}>
                Save Record
              </Button>
            </div>
          </fieldset>
        </Form>
      </Column>

      <ScaleSiteSearchModal
        open={scaleSiteModalOpen}
        onRequestClose={() => setScaleSiteModalOpen(false)}
        onScaleSiteSelect={handleScaleSiteSelect}
      />
    </Grid>
  );
};

export default ScaleSiteAuthorizationEditPage;
