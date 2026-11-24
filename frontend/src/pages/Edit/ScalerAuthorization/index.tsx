import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import {
  Column,
  Form,
  FormLabel,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  TextArea,
  TextInput,
} from '@carbon/react';
import { useQueryClient } from '@tanstack/react-query';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ScaleSiteLink from '@/components/core/ScaleSiteLink';
import Button from '@/components/core/Button';
import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import TableRemoveButton from '@/components/Form/TableRemoveButton';
import TableResource from '@/components/Form/TableResource';
import { type PageableResponse, type TableHeaderType } from '@/components/Form/TableResource/types';
import DateInput from '@/components/core/DateInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import PageTitle from '@/components/core/PageTitle';
import ScaleSiteSearchModal from '@/components/Modal/ScaleSiteSearchModal';
import { useAuth } from '@/context/auth/useAuth';
import { type SelectedScaleSite, useSelectedScaleSites } from '@/pages/authorizations/useSelectedScaleSites';
import {
  toOutcome,
  validateCancellationPair,
  validateScalerAuthorization,
} from '@/pages/authorizations/authorizationValidation';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type {
  ScaleAuthCondition,
  ScalerAuthorizationDetail,
  ScalerAuthorizationUpdateRequest,
} from '@/services/scalerAuthorizations.service';
import { extractApiError } from '@/utils/extractApiError';
import { requiredLabel } from '@/utils/requiredLabel';
import { scrollToError } from '@/utils/scrollToError';
import { filterScalerAuthorizationJobFunctions } from '@/utils/scalerAuthorizationJobFunctions';

type Snapshot = {
  scalerLicenceNo: string;
  effectiveDate: string;
  expiryDate: string;
  regDist: string;
  districtWideInd: '' | 'Y' | 'N';
  cancellationDate: string;
  cancellationReasonTxt: string;
  conditions: ScaleAuthCondition[];
  scaleSites: Array<{ scaleSiteIdNmbr: string; siteName?: string | null }>;
  selectedJobFunctions: StaticLov[];
  selectedForestProducts: StaticLov[];
};

const ScalerAuthorizationEditPage: FC = () => {
  const { scalerAuthorizationId } = useParams<{ scalerAuthorizationId: string }>();
  const navigate = useNavigate();
  const { userToken } = useAuth();
  const queryClient = useQueryClient();

  const [record, setRecord] = useState<ScalerAuthorizationDetail | null>(null);
  const [authorizationNumber, setAuthorizationNumber] = useState('');
  const [scalerLicenceNo, setScalerLicenceNo] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [regDist, setRegDist] = useState('');
  const [districtWideInd, setDistrictWideInd] = useState<'' | 'Y' | 'N'>('');
  const [cancellationDate, setCancellationDate] = useState('');
  const [cancellationReasonTxt, setCancellationReasonTxt] = useState('');

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const resolvedNumericId = useMemo(() => Number(scalerAuthorizationId ?? 0), [scalerAuthorizationId]);
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

  const mapSelectedOptions = useCallback((codes: Array<string | null | undefined>, options: StaticLov[]) => {
    return codes
      .map((code) => String(code ?? '').trim())
      .filter((code) => code.length > 0)
      .map((code) => {
        const match = options.find((opt) => String(opt.code ?? '') === code);
        if (match) {
          return match;
        }
        return { code, description: code } as StaticLov;
      });
  }, []);

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

        const [detail, jobFunctions, sfpProducts] = await Promise.all([
          API.scalerAuthorizations.getScalerAuthorization(resolvedNumericId, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_METHOD_TYPE_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_PRODUCT_CODE' }, token),
        ]);

        if (!mounted) {
          return;
        }

        const nextDetail = detail ?? null;
        setRecord(nextDetail);
        setAuthorizationNumber(String(nextDetail?.scalerAuthorizationId ?? ''));
        setScalerLicenceNo(String(nextDetail?.scalerLicenceNo ?? ''));
        setEffectiveDate(String(nextDetail?.authorizationEffectiveDate ?? ''));
        setExpiryDate(String(nextDetail?.authorizationExpiryDate ?? ''));
        setRegDist(nextDetail?.orgUnitNo != null ? String(nextDetail.orgUnitNo) : '');
        setDistrictWideInd((nextDetail?.districtWideInd as '' | 'Y' | 'N') ?? '');
        setCancellationDate(String(nextDetail?.cancellationDate ?? ''));
        setCancellationReasonTxt(String(nextDetail?.cancellationReasonTxt ?? ''));
        setConditions(nextDetail?.conditions ?? []);
        setScaleSites(
          (nextDetail?.scaleSites ?? []).map((site) => ({
            scaleSiteIdNmbr: String(site.scaleSiteIdNmbr ?? ''),
            siteName: site.siteName ?? null,
          })),
        );

        const jobFunctionOpts = filterScalerAuthorizationJobFunctions(jobFunctions ?? []);
        setJobFunctionOptions(jobFunctionOpts);
        setAuthForestProducts(sfpProducts ?? []);

        const selectedJobs = mapSelectedOptions(nextDetail?.jobFunctions ?? [], jobFunctionOpts);
        const selectedSfp = mapSelectedOptions(nextDetail?.authForestProducts ?? [], sfpProducts ?? []);
        setSelectedJobFunctions(selectedJobs);
        setSelectedForestProducts(selectedSfp);

        setSnapshot({
          scalerLicenceNo: String(nextDetail?.scalerLicenceNo ?? ''),
          effectiveDate: String(nextDetail?.authorizationEffectiveDate ?? ''),
          expiryDate: String(nextDetail?.authorizationExpiryDate ?? ''),
          regDist: nextDetail?.orgUnitNo != null ? String(nextDetail.orgUnitNo) : '',
          districtWideInd: (nextDetail?.districtWideInd as '' | 'Y' | 'N') ?? '',
          cancellationDate: String(nextDetail?.cancellationDate ?? ''),
          cancellationReasonTxt: String(nextDetail?.cancellationReasonTxt ?? ''),
          conditions: nextDetail?.conditions ?? [],
          scaleSites: (nextDetail?.scaleSites ?? []).map((site) => ({
            scaleSiteIdNmbr: String(site.scaleSiteIdNmbr ?? ''),
            siteName: site.siteName ?? null,
          })),
          selectedJobFunctions: selectedJobs,
          selectedForestProducts: selectedSfp,
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
  }, [mapSelectedOptions, resolvedNumericId, userToken]);

  const onReset = () => {
    if (!snapshot) {
      return;
    }
    setScalerLicenceNo(snapshot.scalerLicenceNo);
    setEffectiveDate(snapshot.effectiveDate);
    setExpiryDate(snapshot.expiryDate);
    setRegDist(snapshot.regDist);
    setDistrictWideInd(snapshot.districtWideInd);
    setCancellationDate(snapshot.cancellationDate);
    setCancellationReasonTxt(snapshot.cancellationReasonTxt);
    setConditions(snapshot.conditions);
    setScaleSites(snapshot.scaleSites);
    setSelectedJobFunctions(snapshot.selectedJobFunctions);
    setSelectedForestProducts(snapshot.selectedForestProducts);
    setScaleSiteInput('');
    setScaleSitesError(null);
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
  };

  const validate = () => {
    // The cancellation pairing applies on both paths: those two fields stay editable even once a
    // letter exists, at which point they are the only rule left to enforce.
    const nextErrors = validateCancellationPair(cancellationDate, cancellationReasonTxt);
    if (letterExists) {
      return toOutcome(nextErrors);
    }

    Object.assign(
      nextErrors,
      validateScalerAuthorization({
        scalerLicenceNo,
        effectiveDate,
        expiryDate,
        regDist,
        districtWideInd,
        selectedJobFunctions,
        scaleSites,
        selectedForestProducts,
      }).nextErrors,
    );

    return toOutcome(nextErrors);
  };


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
      .filter((c) => c);

    if (!letterExists && selectedJobFunctionCodes.length === 0) {
      setFormError('At least one Job Function is required.');
      return;
    }

    if (!letterExists && districtWideInd === 'N' && scaleSites.length === 0) {
      setFormError('At least one Scale Site is required when District Wide is No.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await userToken();
      const payload: ScalerAuthorizationUpdateRequest = {
        scalerLicenceNo: scalerLicenceNo.trim(),
        orgUnitNo,
        districtWideInd: districtWideInd as 'Y' | 'N',
        authorizationEffectiveDate: effectiveDate,
        authorizationExpiryDate: expiryDate,
        jobFunctions: selectedJobFunctionCodes,
        authForestProducts: selectedForestProducts.map((item) => String(item.code ?? '')).filter((code) => code),
        conditions: conditions
          .filter((item) => item.scaleAuthConditionId)
          .map((item) => ({
            scaleAuthConditionId: item.scaleAuthConditionId ?? null,
            scaleConditionClassCode: item.scaleConditionClassCode ?? 'SCA',
          })),
        cancellationDate: cancellationDate || undefined,
        cancellationReasonTxt: cancellationReasonTxt || undefined,
        ...(districtWideInd === 'N' ? { scaleSites: scaleSites.map((item) => item.scaleSiteIdNmbr) } : {}),
      };

      const updated = await API.scalerAuthorizations.updateScalerAuthorization(resolvedNumericId, payload, token);
      if (updated?.scalerAuthorizationId) {
        setFormError(null);
        // refetchOnMount:false + a 3h staleTime means the inactive list won't refetch on the way
        // back, so drop the cached authorization lists to surface the edited record on return.
        queryClient.removeQueries({ queryKey: ['scaler-authorizations', scalerLicenceNo.trim()] });
        queryClient.removeQueries({ queryKey: ['workbench', 'scaler-authorizations'] });
        navigate(`/scaler-authorizations/view/${updated.scalerAuthorizationId}`);
        return;
      }
    } catch (error) {
      setFormError(extractApiError(error, 'Could not update scaler authorization.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = (key: string) => submitAttempted && Boolean(fieldErrors[key]);

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Scaler Authorization - Edit"
          breadCrumbs={[
            { name: 'Create' },
            { name: 'Scaler Authorization', path: '/scaler-authorizations/create' },
          ]}
        />

        <Form onSubmit={(e) => e.preventDefault()} className="scaler-authorization-create-form scs__form">
          <fieldset disabled={isSubmitting || isLoading} className="scaler-authorization-create__fieldset">
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
                <TextInput
                  id="authorized-scaler-licence"
                  value={scalerLicenceNo}
                  onChange={(e) => {
                    setScalerLicenceNo(e.target.value);
                    clearFieldError('scalerLicenceNo');
                  }}
                  labelText=""
                  hideLabel
                  maxLength={8}
                  invalid={showError('scalerLicenceNo')}
                  invalidText={fieldErrors.scalerLicenceNo}
                  disabled={letterExists}
                />
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
                  labelText={requiredLabel('Expiry Date', 'scaler-authorization-create__required')}
                  hideLabel={false}
                  invalid={Boolean(fieldErrors.expiryDate)}
                  invalidText={fieldErrors.expiryDate}
                  disabled={letterExists}
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
                  disabled={letterExists}
                />
              </Column>

              <Column lg={8} md={8} sm={4}>
                <Select
                  id="district-wide"
                  value={districtWideInd}
                  onChange={(e) => {
                    setDistrictWideInd(e.target.value as Snapshot['districtWideInd']);
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
                  disabled={letterExists}
                >
                  <SelectItem value="" text="" />
                  <SelectItem value="Y" text="Yes" />
                  <SelectItem value="N" text="No" />
                </Select>
              </Column>

              <Column lg={8} md={8} sm={4}>
                <DateInput
                  id="cancellation-date"
                  value={cancellationDate}
                  onChange={(v: string) => {
                    setCancellationDate(v);
                    clearFieldError('cancellationDate');
                    clearFieldError('cancellationReasonTxt');
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
                    clearFieldError('cancellationDate');
                  }}
                  rows={3}
                  invalid={Boolean(fieldErrors.cancellationReasonTxt)}
                  invalidText={fieldErrors.cancellationReasonTxt}
                />
              </Column>
            </Grid>

            <div className="scs__form__divider" />

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
                  disabled={letterExists}
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
                  disabled={letterExists}
                />
              </Column>
            </Grid>

            {districtWideInd !== 'Y' ? (
              <>
                <div className="scs__form__divider" />
                <h4 className="scs__form__section-title">Scale Sites</h4>
                {scaleSitesError ? (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title="Scale Sites"
                    subtitle={scaleSitesError}
                    style={{ marginBottom: '16px' }}
                  />
                ) : null}
                <Grid className="scs__form__grid scaler-authorization-create__scale-site-row">
                  <Column lg={8} md={8} sm={4}>
                    <div className="scaler-authorization-create__input-row">
                      <TextInput
                        id="scale-site-number"
                        value={scaleSiteInput}
                        onChange={(e) => {
                          setScaleSiteInput(e.target.value);
                          setScaleSitesError(null);
                          clearFieldError('scaleSites');
                        }}
                        labelText={requiredLabel('Site #', 'scaler-authorization-create__required')}
                        maxLength={10}
                        invalid={showError('scaleSites') || Boolean(scaleSitesError)}
                        invalidText={fieldErrors.scaleSites ?? scaleSitesError ?? ''}
                        disabled={letterExists}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button kind="secondary" className="scs__input-search-button" onClick={onAddScaleSite} disabled={letterExists || !scaleSiteInput.trim()}>
                          Add
                        </Button>
                        <Button kind="secondary" className="scs__input-search-button" onClick={() => setScaleSiteModalOpen(true)} disabled={letterExists}>
                          Search
                        </Button>
                      </div>
                    </div>
                  </Column>
                </Grid>
                {scaleSites.length > 0 ? (
                  <TableResource
                    headers={[
                      {
                        key: 'scaleSiteIdNmbr',
                        header: 'Site #',
                        selected: true,
                        renderAs: (value: string) => <ScaleSiteLink scaleSiteIdNmbr={value} />,
                      },
                      { key: 'siteName', header: 'Site Name', selected: true },
                      {
                        key: 'remove', header: '\u00A0', selected: true, renderAs: (_v: unknown, r: SelectedScaleSite) => (
                          <div style={{ textAlign: 'right' }}>
                            <TableRemoveButton
                              onClick={() => onRemoveScaleSite(r.scaleSiteIdNmbr)}
                              disabled={letterExists}
                              ariaLabel={`Remove scale site ${r?.scaleSiteIdNmbr ?? ''}`}
                            />
                          </div>
                        ),
                      },
                    ] as TableHeaderType<SelectedScaleSite>[]}
                    content={{
                      content: (scaleSites || []).map((s) => ({ ...s, id: String(s.scaleSiteIdNmbr) })),
                      page: { size: Math.max(1, (scaleSites || []).length), number: 0, totalElements: (scaleSites || []).length, totalPages: 1 },
                    } as PageableResponse<SelectedScaleSite>}
                    loading={false}
                    error={false}
                  />
                ) : null}
              </>
            ) : null}

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
              disabled={letterExists}
              conditionLinkPath="/maintenance/conditions"
              searchConditions={API.scalerAuthorizations.searchActiveScaleAuthConditions}
              getTemplateConditions={API.scalerAuthorizations.getScaleAuthTemplateConditions}
            />
            <div className="scs__form__divider" />
          </fieldset>

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
        </Form>
      </Column>
    </Grid>
  );
};

export default ScalerAuthorizationEditPage;
