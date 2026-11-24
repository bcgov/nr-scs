import { Reset as ResetIcon } from '@carbon/icons-react';
import {
  Column,
  Form,
  FormLabel,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  TextInput,
} from '@carbon/react';
import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, type FC, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Button from '@/components/core/Button';
import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import ScaleSitesSection from '@/components/Form/ScaleSitesSection';
import DateInput from '@/components/core/DateInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import PageTitle from '@/components/core/PageTitle';
import { useAuth } from '@/context/auth/useAuth';
import { useSelectedScaleSites } from '@/pages/authorizations/useSelectedScaleSites';
import {
  validateScalerAuthorization,
  validateScalerAuthorizationBasics,
} from '@/pages/authorizations/authorizationValidation';
import ScalerSearchModal from '@/components/Modal/ScalerSearchModal';
import ScaleSiteSearchModal from '@/components/Modal/ScaleSiteSearchModal';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleAuthCondition, ScalerAuthorizationCreateRequest } from '@/services/scalerAuthorizations.service';
import { extractApiError } from '@/utils/extractApiError';
import { requiredLabel } from '@/utils/requiredLabel';
import { scrollToError } from '@/utils/scrollToError';
import { filterScalerAuthorizationJobFunctions } from '@/utils/scalerAuthorizationJobFunctions';

import './index.scss';

const ScalerAuthorizationCreatePage: FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [authorizationNumber] = useState('');
  const [scalerLicenceNo, setScalerLicenceNo] = useState(() => searchParams.get('scalerLicenceNo')?.trim() ?? '');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [regDist, setRegDist] = useState('');
  const [districtWideInd, setDistrictWideInd] = useState<'' | 'Y' | 'N'>('');

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConditions, setShowConditions] = useState(false);
  const [scalerModalOpen, setScalerModalOpen] = useState(false);
  const [pendingSelectedScaler, setPendingSelectedScaler] = useState<{ scalerLicenceNo?: string | null } | null>(null);
  const [pendingScroll, setPendingScroll] = useState<{ x: number; y: number } | null>(null);

  const [conditions, setConditions] = useState<ScaleAuthCondition[]>([]);
  

  const {
    scaleSites,
    setScaleSites,
    scaleSiteInput,
    setScaleSiteInput,
    scaleSitesError,
    setScaleSitesError,
    scaleSiteModalOpen,
    setScaleSiteModalOpen,
    onAddScaleSite,
    handleScaleSiteSelect,
    onRemoveScaleSite,
  } = useSelectedScaleSites(userToken);

  const [jobFunctionOptions, setJobFunctionOptions] = useState<StaticLov[]>([]);
  const [selectedJobFunctions, setSelectedJobFunctions] = useState<StaticLov[]>([]);
  const [authForestProducts, setAuthForestProducts] = useState<StaticLov[]>([]);
  const [selectedForestProducts, setSelectedForestProducts] = useState<StaticLov[]>([]);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev || !Object.hasOwn(prev, key)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onReset = () => {
    setScalerLicenceNo('');
    setEffectiveDate('');
    setExpiryDate('');
    setRegDist('');
    setDistrictWideInd('');

    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});

    setShowConditions(false);
    setConditions([]);
    setScaleSites([]);
    setScaleSiteInput('');
    setScaleSitesError(null);
    setSelectedJobFunctions([]);
    setAuthForestProducts([]);
    setSelectedForestProducts([]);
  };

  const validate = () =>
    validateScalerAuthorization({
      scalerLicenceNo,
      effectiveDate,
      expiryDate,
      regDist,
      districtWideInd,
      selectedJobFunctions,
      scaleSites,
      selectedForestProducts,
    });

  // Lightweight validation used before opening the Conditions section
  const validateBasics = () =>
    validateScalerAuthorizationBasics({
      scalerLicenceNo,
      effectiveDate,
      expiryDate,
      regDist,
      districtWideInd,
    });


  const onAddConditions = async () => {
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

  useEffect(() => {
    if (!showConditions) {
      return;
    }

    let isMounted = true;

    const loadLovs = async () => {
      const token = await userToken();
      const [forestProductsResult, jobFuncsResult] = await Promise.allSettled([
        API.lov.getStaticLov({ tableKey: 'SCALE_PRODUCT_CODE' }, token),
        API.lov.getStaticLov({ tableKey: 'SCALE_METHOD_TYPE_CODE' }, token),
      ]);

      if (!isMounted) {
        return;
      }
      setAuthForestProducts(forestProductsResult.status === 'fulfilled' ? forestProductsResult.value ?? [] : []);
      setJobFunctionOptions(
        filterScalerAuthorizationJobFunctions(
          jobFuncsResult.status === 'fulfilled' ? jobFuncsResult.value ?? [] : [],
        ),
      );
    };

    loadLovs();

    return () => {
      isMounted = false;
    };
  }, [showConditions, userToken]);

  const onSaveRecord = async () => {
    setSubmitAttempted(true);
    const result = validate();
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
    if (!result.ok) {
      scrollToError();
      return;
    }

    const orgUnitNo = Number(regDist);
    if (!Number.isFinite(orgUnitNo)) {
      setFormError('Reg / Dist must be a valid number.');
      return;
    }

    const selectedJobFunctionCodes = (selectedJobFunctions ?? [])
      .map((item) => String(item.code ?? ''))
      .filter(Boolean);

    if (selectedJobFunctionCodes.length === 0) {
      setFormError('At least one Job Function is required.');
      return;
    }

    

    if (districtWideInd === 'N' && scaleSites.length === 0) {
      setFormError('At least one Scale Site is required when District Wide is No.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await userToken();
      // No per-input preload: controls will be disabled via `isSubmitting`.
      const basePayload = {
        scalerLicenceNo: scalerLicenceNo.trim(),
        orgUnitNo,
        districtWideInd: districtWideInd as 'Y' | 'N',
        authorizationEffectiveDate: effectiveDate,
        authorizationExpiryDate: expiryDate,
        jobFunctions: selectedJobFunctionCodes,
        authForestProducts: selectedForestProducts.map((item) => String(item.code ?? '')).filter(Boolean),
        conditions: conditions
          .filter((item) => item.scaleAuthConditionId != null)
          .map((item) => ({
            scaleAuthConditionId: item.scaleAuthConditionId ?? null,
            scaleConditionClassCode: item.scaleConditionClassCode ?? 'SCA',
          })),
      } as ScalerAuthorizationCreateRequest;

      const payload: ScalerAuthorizationCreateRequest = {
        ...basePayload,
        ...(districtWideInd === 'N' ? { scaleSites: scaleSites.map((item) => item.scaleSiteIdNmbr) } : {}),
      };

      const created = await API.scalerAuthorizations.createScalerAuthorization(payload, token);
      if (created?.scalerAuthorizationId) {
        setFormError(null);
        // The global query config sets refetchOnMount:false + a 3h staleTime, so a plain
        // invalidate won't refetch the (now-inactive) list on the way back. Drop the cached
        // authorization lists so the scaler's Authorizations tab and the Work Bench refetch
        // and show the new record when the user returns.
        queryClient.removeQueries({ queryKey: ['scaler-authorizations', scalerLicenceNo.trim()] });
        queryClient.removeQueries({ queryKey: ['workbench', 'scaler-authorizations'] });
        navigate(`/scaler-authorizations/view/${created.scalerAuthorizationId}`);
        return;
      }
    } catch (error) {
      setFormError(extractApiError(error, 'Could not create scaler authorization.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSearchScaler = () => {
    setScalerModalOpen(true);
  };

  const handleScalerSelect = (selectedScaler: { scalerLicenceNo?: string | null }) => {
    setPendingSelectedScaler(selectedScaler);

    const w = globalThis.window ?? undefined;
    if (w) {
      setPendingScroll({ x: w.scrollX ?? 0, y: w.scrollY ?? 0 });
    }

    setTimeout(() => setScalerModalOpen(false), 0);
  };

  useEffect(() => {
    if (!scalerModalOpen && pendingSelectedScaler) {
      const scrollX = pendingScroll?.x ?? 0;
      const scrollY = pendingScroll?.y ?? 0;

      setScalerLicenceNo(pendingSelectedScaler.scalerLicenceNo ?? '');

      const t1 = globalThis.setTimeout(() => {
        if (globalThis.window) {
          globalThis.window.scrollTo({ left: scrollX, top: scrollY });
        }

        const el = document.getElementById('authorized-scaler-licence') as HTMLInputElement | null;
        if (el) {
          el.focus();
          if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }

        setPendingSelectedScaler(null);
        setPendingScroll(null);
      }, 150);

      return () => globalThis.clearTimeout(t1);
    }
    return undefined;
  }, [scalerModalOpen, pendingSelectedScaler, pendingScroll]);

  const showError = (key: string) => submitAttempted && Boolean(fieldErrors[key]);

  return (
    <>
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Scaler Authorization - Create" />

        <Form onSubmit={(e) => e.preventDefault()} className="scaler-authorization-create-form scs__form">
          <fieldset disabled={isSubmitting} className="scaler-authorization-create__fieldset">
          {/* summary notification removed per UX request */}
          {formError ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Please fix the errors below."
              subtitle={formError}
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          <h4 className="scs__form__section-title">Scaler Authorization</h4>

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
                {requiredLabel('Authorized Scaler Licence #', 'scaler-authorization-create__required')}
              </FormLabel>
              <div className="scs__input-search-row">
                <TextInput
                  id="authorized-scaler-licence"
                  value={scalerLicenceNo}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setScalerLicenceNo(e.target.value);
                    clearFieldError('scalerLicenceNo');
                  }}
                  labelText=""
                  hideLabel
                  maxLength={8}
                  invalid={showError('scalerLicenceNo')}
                  invalidText={fieldErrors.scalerLicenceNo}
                />
                <Button kind="secondary" className="scs__input-search-button cds--btn--field" buttonLabel="Search" onClick={onSearchScaler}>
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
                labelText={requiredLabel('Effective Date', 'scaler-authorization-create__required')}
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
                labelText={requiredLabel('Expiry Date', 'scaler-authorization-create__required')}
                hideLabel={false}
                invalid={Boolean(fieldErrors.expiryDate)}
                invalidText={fieldErrors.expiryDate}
              />
              
            </Column>

            <Column lg={8} md={8} sm={4}>
              <DistrictSelect
                value={regDist}
                onChange={(v) => {
                  setRegDist(v);
                  clearFieldError('regDist');
                }}
                hideLabel={false}
                labelText={requiredLabel('Reg / Dist', 'scaler-authorization-create__required')}
                invalid={showError('regDist')}
                invalidText={fieldErrors.regDist}
              />
            </Column>

            <Column lg={8} md={8} sm={4}>
              <Select
                id="district-wide"
                value={districtWideInd}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setDistrictWideInd(e.target.value as '' | 'Y' | 'N');
                  clearFieldError('districtWideInd');
                  if (e?.target?.value === 'Y') {
                    setScaleSitesError(null);
                    setFieldErrors((p) => {
                      const q = { ...p };
                      delete q.scaleSites;
                      return q;
                    });
                  }
                }}
                labelText={requiredLabel('District Wide?', 'scaler-authorization-create__required')}
                invalid={showError('districtWideInd')}
                invalidText={fieldErrors.districtWideInd}
              >
                <SelectItem value="" text="" />
                <SelectItem value="Y" text="Yes" />
                <SelectItem value="N" text="No" />
              </Select>
            </Column>
          </Grid>

          <div className="scs__form__divider" />

          {showConditions ? (
            <>
              <Grid className="scs__form__grid">
                <Column lg={8} md={8} sm={4}>
                  <ActiveMultiSelect<StaticLov>
                    id="job-functions"
                    items={jobFunctionOptions}
                    itemToString={(item) => (item?.description ? String(item.description) : '')}
                    titleText={requiredLabel('Job Functions', 'scaler-authorization-create__required')}
                    selectedItems={selectedJobFunctions}
                    onChange={(event) => {
                      setSelectedJobFunctions(event.selectedItems ?? []);
                      clearFieldError('jobFunctions');
                    }}
                    invalid={Boolean(fieldErrors.jobFunctions)}
                    invalidText={fieldErrors.jobFunctions}
                    disabled={isSubmitting}
                  />
                    
                </Column>

                <Column lg={8} md={8} sm={4}>
                  <ActiveMultiSelect<StaticLov>
                    id="sfp-products"
                    items={authForestProducts}
                    itemToString={(item) => (item?.description ? String(item.description) : '')}
                    titleText={
                      (selectedJobFunctions ?? []).some((j) => String(j?.code ?? '') === 'S')
                        ? requiredLabel('Special Forest Products', 'scaler-authorization-create__required')
                        : 'Special Forest Products'
                    }
                    selectedItems={selectedForestProducts}
                    onChange={(event) => {
                      setSelectedForestProducts(event.selectedItems ?? []);
                      clearFieldError('sfpProducts');
                    }}
                    invalid={Boolean(fieldErrors.sfpProducts)}
                    invalidText={fieldErrors.sfpProducts}
                    disabled={isSubmitting}
                  />
                  
                </Column>
              </Grid>

              

              {districtWideInd === 'Y' ? null : (
                <ScaleSitesSection
                  districtWideInd={districtWideInd}
                  scaleSiteInput={scaleSiteInput}
                  onScaleSiteInputChange={(value) => {
                    setScaleSiteInput(value);
                    setScaleSitesError(null);
                    clearFieldError('scaleSites');
                  }}
                  scaleSites={scaleSites}
                  onAddScaleSite={onAddScaleSite}
                  onOpenSearch={() => setScaleSiteModalOpen(true)}
                  onRemoveScaleSite={onRemoveScaleSite}
                  addDisabled={isSubmitting || !scaleSiteInput.trim()}
                  searchDisabled={isSubmitting}
                  labelText={requiredLabel('Site #', 'scaler-authorization-create__required')}
                  invalid={showError('scaleSites') || Boolean(scaleSitesError)}
                  invalidText={fieldErrors.scaleSites ?? scaleSitesError ?? ''}
                  sectionError={scaleSitesError}
                />
              )}
              <ScaleSiteSearchModal
                open={scaleSiteModalOpen}
                onRequestClose={() => setScaleSiteModalOpen(false)}
                onScaleSiteSelect={handleScaleSiteSelect}
              />

              <div className="scs__form__divider" />
              <AuthorizationConditionsSection
                conditionClassCode="SCA"
                templateFilterField="SCA"
                conditions={conditions}
                setConditions={setConditions}
                disabled={isSubmitting}
                conditionLinkPath="/maintenance/conditions"
                searchConditions={API.scalerAuthorizations.searchActiveScaleAuthConditions}
                getTemplateConditions={API.scalerAuthorizations.getScaleAuthTemplateConditions}
              />
              <div className="scs__form__divider" />
            </>
          ) : null}

          </fieldset>

          <div className="form-actions">
            <Button kind="secondary" onClick={() => navigate('/welcome')} className="action-btn">
              Back
            </Button>
            <Button kind="secondary" onClick={onReset} className="action-btn" renderIcon={ResetIcon}>
              Reset
            </Button>
            {showConditions ? (
              <Button kind="primary" onClick={onSaveRecord} className="action-btn" disabled={isSubmitting}>
                Save Record
              </Button>
            ) : (
              <Button kind="primary" onClick={onAddConditions} className="action-btn" disabled={isSubmitting}>
                Add Conditions
              </Button>
            )}
          </div>
        </Form>
      </Column>
    </Grid>
    <ScalerSearchModal open={scalerModalOpen} onRequestClose={() => setScalerModalOpen(false)} onScalerSelect={handleScalerSelect} />
    </>
  );
};

export default ScalerAuthorizationCreatePage;
