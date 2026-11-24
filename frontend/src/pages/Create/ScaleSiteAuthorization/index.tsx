import { Column, Form, FormLabel, Grid, InlineNotification, TextInput } from '@carbon/react';
import { Reset as ResetIcon } from '@carbon/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type FC, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Button from '@/components/core/Button';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import ScaleSiteSearchModal from '@/components/Modal/ScaleSiteSearchModal';
import PageTitle from '@/components/core/PageTitle';
import DateInput from '@/components/core/DateInput';
import { useAuth } from '@/context/auth/useAuth';
import { validateScaleSiteAuthorizationBasics } from '@/pages/authorizations/authorizationValidation';
import API from '@/services/APIs';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';
import { extractApiError } from '@/utils/extractApiError';
import { requiredLabel } from '@/utils/requiredLabel';
import { scrollToError } from '@/utils/scrollToError';

import './index.scss';

const ScaleSiteAuthorizationCreatePage: FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [authorizationNumber] = useState('');
  const [scaleSiteNumber, setScaleSiteNumber] = useState(
    () => searchParams.get('scaleSiteIdNmbr')?.trim().toUpperCase() ?? '',
  );
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expectedAnnualScaleVolume, setExpectedAnnualScaleVolume] = useState('');

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showConditions, setShowConditions] = useState(false);
  const [conditions, setConditions] = useState<ScaleAuthCondition[]>([]);
  const [scaleSiteModalOpen, setScaleSiteModalOpen] = useState(false);

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

  const onReset = () => {
    setScaleSiteNumber('');
    setEffectiveDate('');
    setExpiryDate('');
    setExpectedAnnualScaleVolume('');

    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
    setShowConditions(false);
    setConditions([]);
  };

  const validateBasics = () =>
    validateScaleSiteAuthorizationBasics({
      scaleSiteNumber,
      effectiveDate,
      expiryDate,
      expectedAnnualScaleVolume,
    });


  const onAddConditions = () => {
    setSubmitAttempted(true);
    const result = validateBasics();
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
    if (!result.ok) {
      scrollToError();
      return;
    }
    setShowConditions(true);
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

    const expectedVolume = Number(expectedAnnualScaleVolume);
    if (!Number.isFinite(expectedVolume)) {
      setFieldErrors((prev) => ({ ...prev, expectedAnnualScaleVolume: 'Expected Annual Scale Volume must be a number.' }));
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await userToken();
      const payload = {
        scaleSiteIdNmbr: scaleSiteNumber.trim().toUpperCase(),
        authorizationEffectiveDate: effectiveDate,
        authorizationExpiryDate: expiryDate,
        expectedScaleVolume: expectedVolume,
        conditions: conditions
          .filter((item) => item.scaleAuthConditionId)
          .map((item) => ({
            scaleAuthConditionId: item.scaleAuthConditionId ?? null,
            scaleConditionClassCode: item.scaleConditionClassCode ?? 'SIA',
          })),
      };

      const created = await API.scaleSiteAuthorizations.createScaleSiteAuthorization(payload, token);
      if (created?.scaleSiteAuthorizationId) {
        setFormError(null);
        // The global query config sets refetchOnMount:false + a 3h staleTime, so a plain
        // invalidate won't refetch the (now-inactive) list on the way back. Drop the cached
        // authorization lists so the scale site's Authorizations tab and the Work Bench refetch
        // and show the new record when the user returns.
        //
        // Removed by prefix rather than by site number: the tab keys its list off the
        // `/scale-sites/view/{id}` URL param while this form keys off the uppercased payload, so
        // an exact key can miss on case. Extra sites dropped from cache just refetch once.
        queryClient.removeQueries({ queryKey: ['scale-site-authorizations'] });
        queryClient.removeQueries({ queryKey: ['workbench', 'scale-site-authorizations'] });
        navigate(`/scale-site-authorizations/view/${created.scaleSiteAuthorizationId}`);
        return;
      }
    } catch (error) {
      setFormError(extractApiError(error, 'Could not create scale site authorization.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = (key: string) => submitAttempted && Boolean(fieldErrors[key]);

  return (
    <>
      <Grid className="report-grid">
        <Column lg={16} md={8} sm={4}>
          <PageTitle title="Scale Site Authorization - Create" />

          <Form onSubmit={(e) => e.preventDefault()} className="scale-site-authorization-create-form scs__form">
            <fieldset disabled={isSubmitting} className="scale-site-authorization-create__fieldset">
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
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setScaleSiteNumber(e.target.value);
                        clearFieldError('scaleSiteNumber');
                      }}
                      labelText=""
                      hideLabel
                      maxLength={4}
                      invalid={Boolean(fieldErrors.scaleSiteNumber)}
                      invalidText={fieldErrors.scaleSiteNumber}
                    />
                    <Button kind="secondary" className="scs__input-search-button" onClick={onSearchScaleSite}>
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
                  />
                </Column>

                <Column lg={8} md={8} sm={4}>
                  <TextInput
                    id="expected-annual-scale-volume"
                    value={expectedAnnualScaleVolume}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setExpectedAnnualScaleVolume(e.target.value);
                      clearFieldError('expectedAnnualScaleVolume');
                    }}
                    labelText={requiredLabel('Expected Annual Scale Volume', 'scale-site-authorization-create__required')}
                    maxLength={10}
                    invalid={showError('expectedAnnualScaleVolume')}
                    invalidText={fieldErrors.expectedAnnualScaleVolume}
                  />
                </Column>
              </Grid>

              {showConditions ? (
                <>
                  <div className="scs__form__divider" />

                  <AuthorizationConditionsSection
                    conditionClassCode="SIA"
                    templateFilterField="SIA"
                    conditions={conditions}
                    setConditions={setConditions}
                    disabled={isSubmitting}
                    conditionLinkPath="/maintenance/conditions"
                    searchConditions={API.scaleSiteAuthorizations.searchActiveScaleSiteAuthConditions}
                    getTemplateConditions={API.scaleSiteAuthorizations.getScaleSiteAuthTemplateConditions}
                  />
                </>
              ) : null}

              <div className="scs__form__divider scs__form__divider--actions" />

              <div className="form-actions">
                <Button kind="secondary" onClick={() => navigate(-1)} className="action-btn">
                  Back
                </Button>
                <Button kind="secondary" onClick={onReset} className="action-btn" renderIcon={ResetIcon}>
                  Reset
                </Button>
                {!showConditions ? (
                  <Button kind="primary" onClick={onAddConditions} className="action-btn">
                    Add Conditions
                  </Button>
                ) : (
                  <Button kind="primary" onClick={onSaveRecord} className="action-btn">
                    Save Record
                  </Button>
                )}
              </div>
            </fieldset>
          </Form>
        </Column>
      </Grid>

      <ScaleSiteSearchModal
        open={scaleSiteModalOpen}
        onRequestClose={() => setScaleSiteModalOpen(false)}
        onScaleSiteSelect={handleScaleSiteSelect}
      />
    </>
  );
};

export default ScaleSiteAuthorizationCreatePage;
