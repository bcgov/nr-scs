import { ArrowLeft, Save, Reset as ResetIcon } from '@carbon/icons-react';
import {
  Column,
  Form,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
  TextArea,
  TextInput,
} from '@carbon/react';
import { type Dispatch, type FC, type SetStateAction, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/core/Button';
import DateInput from '@/components/core/DateInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import ScaleSitesSection, { type SelectedScaleSite } from '@/components/Form/ScaleSitesSection';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';
import type { MarkSiteDesignationDetail } from '@/services/markSiteDesignation.service';
import PageTitle from '@/components/core/PageTitle';
import { requiredLabel } from '@/utils/requiredLabel';
import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import TableRemoveButton from '@/components/Form/TableRemoveButton';
import TableResource from '@/components/Form/TableResource';
import { type TableHeaderType } from '@/components/Form/TableResource/types';
import ScaleSiteSearchModal from '@/components/Modal/ScaleSiteSearchModal';
import type { ScaleSiteSearchResult } from '@/services/scaleSites.service';
import { extractApiError } from '@/utils/extractApiError';
import { validateMarkSiteDesignationTextLengths } from '@/utils/markSiteDesignationLengths';
import { scrollToError } from '@/utils/scrollToError';

type SpeciesContentRow = {
  id: string;
  speciesCode: string;
  contentPercent: string;
};

type SpeciesContentDraft = {
  speciesCode: string;
  contentPercent: string;
};

type FieldSetter = Dispatch<SetStateAction<Record<string, string>>>;

const WHOLE_NUMBER_RE = /^-?\d+$/;
const NON_NEGATIVE_WHOLE_NUMBER_RE = /^\d+$/;

const formatSpeciesLabel = (option: StaticLov): string => option.description ?? option.code ?? '';

const toSpeciesRows = (detail: MarkSiteDesignationDetail): SpeciesContentRow[] =>
  (detail.speciesContent ?? []).map((s, i) => ({
    id: `species-${i}`,
    speciesCode: s.scaleSpeciesCode ?? '',
    contentPercent: s.contentPercent == null ? '' : String(s.contentPercent),
  }));

const toScaleSites = (detail: MarkSiteDesignationDetail): SelectedScaleSite[] =>
  (detail.scaleSites ?? [])
    .filter((s) => s.scaleSiteIdNmbr != null)
    .map((s) => ({
      scaleSiteIdNmbr: s.scaleSiteIdNmbr as string,
      siteName: s.siteName ?? null,
    }));

const toConditions = (detail: MarkSiteDesignationDetail): ScaleAuthCondition[] =>
  (detail.conditions ?? []).map((c) => ({
    scaleConditionClassCode: c.scaleConditionClassCode ?? null,
    scaleAuthConditionId: c.scaleAuthConditionId ?? null,
    scaleAuthConditionTitle: c.scaleAuthConditionTitle ?? null,
    scaleAuthConditionDesc: c.scaleAuthConditionDesc ?? null,
    ministryStandardInd: c.ministryStandardInd ?? null,
    sortOrderNo: c.sortOrderNo ?? null,
    effectiveDate: c.effectiveDate ?? null,
    expiryDate: c.expiryDate ?? null,
  }));

type EditFormState = {
  geographicLocation: string;
  population: string;
  effectiveDate: string;
  expiryDate: string;
  regDist: string;
  districtWideInd: '' | 'Y' | 'N';
  estimatedVolume: string;
  estimatedTruckLoads: string;
  timberDescription: string;
  transportationDateDesc: string;
  otherRequirements: string;
};

const detailToFormState = (detail: MarkSiteDesignationDetail): EditFormState => {
  const dwiRaw = detail.districtWideInd;
  let dwiVal: '' | 'Y' | 'N' = '';
  if (dwiRaw === 'Y') {
    dwiVal = 'Y';
  } else if (dwiRaw === 'N') {
    dwiVal = 'N';
  }
  return {
    geographicLocation: detail.geographicLocation ?? '',
    population: detail.population == null ? '' : String(detail.population),
    effectiveDate: detail.effectiveDate ?? '',
    expiryDate: detail.expiryDate ?? '',
    regDist: detail.orgUnitNo == null ? '' : String(detail.orgUnitNo),
    districtWideInd: dwiVal,
    estimatedVolume: detail.estimatedVolume == null ? '' : String(detail.estimatedVolume),
    estimatedTruckLoads: detail.estimatedTruckLoads == null ? '' : String(detail.estimatedTruckLoads),
    timberDescription: detail.timberDescription ?? '',
    transportationDateDesc: detail.transportationDateDesc ?? '',
    otherRequirements: detail.otherRequirements ?? '',
  };
};

const validateSave = (
  values: EditFormState,
  letterExists: boolean,
  scaleSiteCount: number,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!values.expiryDate.trim()) {
    errors.expiryDate = 'Expiry Date is required.';
  }

  // ERR-007 applies on both paths: once a letter exists the Effective Date is locked, but it still
  // bounds the Expiry Date, which stays editable.
  if (
    !errors.expiryDate &&
    values.effectiveDate &&
    values.expiryDate &&
    values.effectiveDate > values.expiryDate
  ) {
    errors.expiryDate = 'Expiry Date must be on or after Effective Date.';
  }

  if (letterExists) {
    return errors;
  }

  if (!values.effectiveDate.trim()) {
    errors.effectiveDate = 'Effective Date is required.';
  }
  if (!values.regDist.trim()) {
    errors.regDist = 'Reg / Dist is required.';
  }
  if (values.districtWideInd !== 'Y' && values.districtWideInd !== 'N') {
    errors.districtWideInd = 'District Wide is required.';
  }
  if (values.districtWideInd === 'N' && scaleSiteCount === 0) {
    errors.scaleSites = 'At least one Scale Site is required when District Wide is No.';
  }
  if (values.estimatedVolume.trim() && !WHOLE_NUMBER_RE.test(values.estimatedVolume.trim())) {
    errors.estimatedVolume = 'Est. Volume must be an integer.';
  }
  if (values.estimatedTruckLoads.trim() && !WHOLE_NUMBER_RE.test(values.estimatedTruckLoads.trim())) {
    errors.estimatedTruckLoads = 'Est. Truck Loads must be an integer.';
  }

  // Column lengths (ERR-019..ERR-022). Below the `letterExists` return above on purpose: a letter
  // disables every free-text field, so an over-length value cannot be entered on that path.
  Object.assign(errors, validateMarkSiteDesignationTextLengths(values));

  return errors;
};

// ---- Sub-sections --------------------------------------------------------

const SpeciesContentSection: FC<{
  speciesRows: SpeciesContentRow[];
  setSpeciesRows: Dispatch<SetStateAction<SpeciesContentRow[]>>;
  speciesOptions: StaticLov[];
  speciesDraft: SpeciesContentDraft;
  setSpeciesDraft: Dispatch<SetStateAction<SpeciesContentDraft>>;
  fieldErrors: Record<string, string>;
  setFieldErrors: FieldSetter;
  clearFieldError: (key: string) => void;
  disabled: boolean;
}> = ({
  speciesRows,
  setSpeciesRows,
  speciesOptions,
  speciesDraft,
  setSpeciesDraft,
  fieldErrors,
  setFieldErrors,
  clearFieldError,
  disabled,
}) => {
  const selectedCodes = new Set(speciesRows.map((row) => row.speciesCode).filter(Boolean));
  const speciesLabelByCode = new Map(
    speciesOptions.map((option) => [String(option.code ?? ''), formatSpeciesLabel(option)]),
  );

  const addSpeciesRow = () => {
    const nextErrors: Record<string, string> = {};
    const speciesCode = speciesDraft.speciesCode.trim();
    const contentPercent = speciesDraft.contentPercent.trim();

    if (!speciesCode) {
      nextErrors.speciesCode = 'Species is required.';
    }
    if (!contentPercent) {
      nextErrors.contentPercent = 'Content is required.';
    } else if (!NON_NEGATIVE_WHOLE_NUMBER_RE.test(contentPercent)) {
      nextErrors.contentPercent = 'Content must be an integer.';
    }
    if (speciesCode && selectedCodes.has(speciesCode)) {
      nextErrors.speciesCode = 'Species has already been added.';
    }
    if (speciesCode && !speciesOptions.some((o) => String(o.code ?? '') === speciesCode)) {
      nextErrors.speciesCode = 'Select a valid species.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    setSpeciesRows((prev) => [
      ...prev,
      { id: `species-${Date.now()}-${prev.length}`, speciesCode, contentPercent },
    ]);
    setSpeciesDraft({ speciesCode: '', contentPercent: '' });
    clearFieldError('speciesCode');
    clearFieldError('contentPercent');
  };

  return (
    <>
      <div className="scs__form__divider" />
      <h4 className="scs__form__section-title">Species Content</h4>
      {disabled ? null : (
        <Grid className="scs__form__grid">
          <Column lg={8} md={8} sm={4}>
            <div className="mark-site-designation-create__species-input-row">
              <div className="mark-site-designation-create__species-input-field mark-site-designation-create__species-input-field--species">
                <Select
                  id="species-input"
                  value={speciesDraft.speciesCode}
                  onChange={(e) => {
                    setSpeciesDraft((prev) => ({ ...prev, speciesCode: e.target.value }));
                    clearFieldError('speciesCode');
                  }}
                  labelText="Species"
                  invalid={Boolean(fieldErrors.speciesCode)}
                  invalidText={fieldErrors.speciesCode}
                >
                  <SelectItem value="" text="" />
                  {speciesOptions
                    .filter((o) => !selectedCodes.has(String(o.code ?? '')))
                    .map((o) => (
                      <SelectItem key={String(o.code ?? '')} value={String(o.code ?? '')} text={formatSpeciesLabel(o)} />
                    ))}
                </Select>
              </div>
              <div className="mark-site-designation-create__species-input-field mark-site-designation-create__species-input-field--content">
                <TextInput
                  id="species-content-input"
                  value={speciesDraft.contentPercent}
                  onChange={(e) => {
                    setSpeciesDraft((prev) => ({ ...prev, contentPercent: e.target.value }));
                    clearFieldError('contentPercent');
                  }}
                  labelText="Content"
                  maxLength={3}
                  invalid={Boolean(fieldErrors.contentPercent)}
                  invalidText={fieldErrors.contentPercent}
                />
              </div>
              <span style={{ alignSelf: 'flex-end', paddingBottom: '0.65rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>%</span>
              <div className="mark-site-designation-create__species-input-field mark-site-designation-create__species-input-field--add">
                <Button kind="secondary" className="scs__input-search-button" onClick={addSpeciesRow}>
                  Add
                </Button>
              </div>
            </div>
          </Column>
        </Grid>
      )}
      {speciesRows.length > 0 ? (
        <TableResource
          headers={[
            {
              key: 'speciesCode',
              header: 'Species',
              selected: true,
              renderAs: (_value: unknown, row: SpeciesContentRow) =>
                speciesLabelByCode.get(row.speciesCode) ?? row.speciesCode,
            },
            { key: 'contentPercent', header: 'Content', selected: true, renderAs: (value: unknown) => (value != null ? `${value as number}%` : '') },
            ...(!disabled
              ? [
                  {
                    key: 'remove' as keyof SpeciesContentRow,
                    header: '\u00A0',
                    selected: true,
                    renderAs: (_value: unknown, row: SpeciesContentRow) => (
                      <div style={{ textAlign: 'right' }}>
                        <TableRemoveButton onClick={() => setSpeciesRows((prev) => prev.filter((r) => r.id !== row.id))} />
                      </div>
                    ),
                  } as TableHeaderType<SpeciesContentRow>,
                ]
              : []),
          ] as TableHeaderType<SpeciesContentRow>[]}
          content={{
            content: speciesRows,
            page: { size: Math.max(1, speciesRows.length), number: 0, totalElements: speciesRows.length, totalPages: 1 },
          }}
          loading={false}
          error={false}
        />
      ) : null}
    </>
  );
};

// ---- Main component -------------------------------------------------------

const MarkSiteDesignationEditPage: FC = () => {
  const navigate = useNavigate();
  const { authorizationId: authorizationIdParam } = useParams<{ authorizationId: string }>();
  const { userToken } = useAuth();

  const authorizationId = Number(authorizationIdParam);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<MarkSiteDesignationDetail | null>(null);

  // Read-only display fields from detail
  const [msdNumber, setMsdNumber] = useState('');
  const [timberMark, setTimberMark] = useState('');
  const [markHolderClient, setMarkHolderClient] = useState('');
  const [markHolderLoc, setMarkHolderLoc] = useState('');
  const [markHolderName, setMarkHolderName] = useState('');
  const [markStatus, setMarkStatus] = useState('');

  // Editable form state
  const [values, setValues] = useState<EditFormState>({
    geographicLocation: '',
    population: '',
    effectiveDate: '',
    expiryDate: '',
    regDist: '',
    districtWideInd: '',
    estimatedVolume: '',
    estimatedTruckLoads: '',
    timberDescription: '',
    transportationDateDesc: '',
    otherRequirements: '',
  });
  const snapshotValues = useRef<EditFormState>(values);

  // Associations
  const [scaleSites, setScaleSites] = useState<SelectedScaleSite[]>([]);
  const snapshotScaleSites = useRef<SelectedScaleSite[]>([]);
  const [scaleSiteInput, setScaleSiteInput] = useState('');
  const [scaleSiteModalOpen, setScaleSiteModalOpen] = useState(false);
  const [isAddingScaleSite, setIsAddingScaleSite] = useState(false);

  const [speciesRows, setSpeciesRows] = useState<SpeciesContentRow[]>([]);
  const snapshotSpeciesRows = useRef<SpeciesContentRow[]>([]);
  const [speciesDraft, setSpeciesDraft] = useState<SpeciesContentDraft>({ speciesCode: '', contentPercent: '' });
  const [speciesOptions, setSpeciesOptions] = useState<StaticLov[]>([]);

  const [exemptionOptions, setExemptionOptions] = useState<StaticLov[]>([]);
  const [selectedExceptions, setSelectedExceptions] = useState<StaticLov[]>([]);
  const snapshotExceptions = useRef<StaticLov[]>([]);

  const [conditions, setConditions] = useState<ScaleAuthCondition[]>([]);
  const snapshotConditions = useRef<ScaleAuthCondition[]>([]);

  // Form status
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const letterExists = Boolean(record?.letterExists);

  // Load record on mount
  useEffect(() => {
    if (!Number.isFinite(authorizationId) || authorizationId <= 0) {
      setLoadError('A valid authorization id was not provided.');
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = await userToken();
        const [detail, speciesLov, exemptionsLov] = await Promise.all([
          API.markSiteDesignation.getMarkSiteDesignation(authorizationId, token),
          API.lov.getStaticLov({ tableKey: 'SCALE_SPECIES_CODE' }, token),
          API.lov.getStaticLov({ tableKey: 'EXEMPT_MARK_METHOD_CODE' }, token),
        ]);

        if (!mounted) {
          return;
        }

        setRecord(detail);
        setMsdNumber(String(detail.haulingMarkAuthorizationId ?? ''));
        setTimberMark(detail.timberMark ?? '');
        setMarkHolderClient(detail.markHolderClient ?? '');
        setMarkHolderLoc(detail.markHolderLoc ?? '');
        setMarkHolderName(detail.markHolderName ?? '');
        setMarkStatus(detail.markStatus ?? '');

        const formState = detailToFormState(detail);
        setValues(formState);
        snapshotValues.current = formState;

        const sites = toScaleSites(detail);
        setScaleSites(sites);
        snapshotScaleSites.current = sites;

        const species = toSpeciesRows(detail);
        setSpeciesRows(species);
        snapshotSpeciesRows.current = species;

        const conds = toConditions(detail);
        setConditions(conds);
        snapshotConditions.current = conds;

        setSpeciesOptions(speciesLov ?? []);

        // Hydrate the Exceptions multi-select from the saved exempt mark method codes by resolving
        // each code to its LOV item, so the control shows the current selections on load. The LOV is
        // date-filtered server-side, so a saved code whose row has since expired (or an empty/failed
        // LOV response) won't be found — fall back to a synthetic { code, description: code } item for
        // any unresolved code so it stays selected and round-trips through save instead of being
        // silently dropped (which would delete the association on update).
        const savedExceptionCodes = (detail.exceptions ?? []).map((code) => String(code));
        const exemptionByCode = new Map(
          (exemptionsLov ?? []).map((option) => [String(option.code ?? ''), option]),
        );
        const selectedExceptionItems = savedExceptionCodes.map(
          (code) => exemptionByCode.get(code) ?? { code, description: code },
        );
        // Include any synthetic (unresolved) codes in the options so they render as checked entries
        // in the dropdown alongside the current LOV rows.
        const unresolvedOptions = selectedExceptionItems.filter(
          (item) => !exemptionByCode.has(String(item.code ?? '')),
        );
        setExemptionOptions([...(exemptionsLov ?? []), ...unresolvedOptions]);
        setSelectedExceptions(selectedExceptionItems);
        snapshotExceptions.current = selectedExceptionItems;
      } catch (e) {
        if (!mounted) {
          return;
        }
        setLoadError(extractApiError(e, 'Could not load mark site designation.'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => { mounted = false; };
  }, [authorizationId, userToken]);

  const set = (field: keyof EditFormState) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!Object.hasOwn(prev, key)) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const showError = (key: string) => submitAttempted && Boolean(fieldErrors[key]);

  const resetForm = () => {
    setValues(snapshotValues.current);
    setScaleSites(snapshotScaleSites.current);
    setSpeciesRows(snapshotSpeciesRows.current);
    setConditions(snapshotConditions.current);
    setSelectedExceptions(snapshotExceptions.current);
    setScaleSiteInput('');
    setSpeciesDraft({ speciesCode: '', contentPercent: '' });
    setSubmitAttempted(false);
    setFieldErrors({});
    setFormError(null);
  };

  const onAddScaleSite = () => {
    const trimmed = scaleSiteInput.trim();
    if (!trimmed) {
      setFieldErrors((prev) => ({ ...prev, scaleSites: 'Site # is required.' }));
      return;
    }
    void (async () => {
      try {
        setIsAddingScaleSite(true);
        const token = await userToken();
        const matches = await API.scaleSites.searchScaleSites({ scaleSiteIdNmbr: trimmed }, token);
        const found = matches?.[0];
        if (!found?.scaleSiteIdNmbr || String(found.scaleSiteIdNmbr).toUpperCase() !== trimmed.toUpperCase()) {
          setFieldErrors((prev) => ({ ...prev, scaleSites: `Site ${trimmed} was not found.` }));
          return;
        }
        // A site already in the list is REJECTED with the legacy message rather than silently dropped.
        // The old silent de-dup returned `prev` and then fell through to clear the input and the error,
        // so the screen looked exactly like a successful add while nothing had been added.
        if (scaleSites.some((s) => s.scaleSiteIdNmbr === String(found.scaleSiteIdNmbr))) {
          setFieldErrors((prev) => ({
            ...prev,
            scaleSites: `The Scale Site ${found.scaleSiteIdNmbr} has already been added.`,
          }));
          return;
        }
        setScaleSites((prev) => [
          ...prev,
          { scaleSiteIdNmbr: String(found.scaleSiteIdNmbr), siteName: found.siteName ?? null },
        ]);
        setScaleSiteInput('');
        clearFieldError('scaleSites');
      } catch (e) {
        setFieldErrors((prev) => ({ ...prev, scaleSites: extractApiError(e, 'Could not add scale site.') }));
      } finally {
        setIsAddingScaleSite(false);
      }
    })();
  };

  const onSaveRecord = () => {
    setSubmitAttempted(true);
    const errors = validateSave(values, letterExists, scaleSites.length);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      scrollToError();
      return;
    }

    void (async () => {
      try {
        setIsSubmitting(true);
        const token = await userToken();
        await API.markSiteDesignation.updateMarkSiteDesignation(
          authorizationId,
          {
            geographicLocation: values.geographicLocation.trim() || null,
            population: values.population.trim() || null,
            effectiveDate: values.effectiveDate || null,
            expiryDate: values.expiryDate,
            orgUnitNo: values.regDist.trim() ? Number(values.regDist) : null,
            districtWideInd: (values.districtWideInd === 'Y' || values.districtWideInd === 'N')
              ? values.districtWideInd
              : null,
            estimatedVolume: values.estimatedVolume.trim() ? Number(values.estimatedVolume) : null,
            estimatedTruckLoads: values.estimatedTruckLoads.trim() ? Number(values.estimatedTruckLoads) : null,
            timberDescription: values.timberDescription.trim() || null,
            transportationDateDesc: values.transportationDateDesc.trim() || null,
            otherRequirements: values.otherRequirements.trim() || null,
            scaleSites: scaleSites.map((s) => String(s.scaleSiteIdNmbr ?? '').trim()).filter(Boolean),
            speciesContent: speciesRows
              .map((row) => ({
                scaleSpeciesCode: row.speciesCode.trim() || null,
                contentPercent: row.contentPercent.trim() ? Number(row.contentPercent) : null,
              }))
              .filter((row) => row.scaleSpeciesCode),
            conditions: conditions
              .filter((c) => String(c.ministryStandardInd ?? '').toUpperCase() !== 'Y')
              .map((c) => ({
                scaleConditionClassCode: String(c.scaleConditionClassCode ?? '').trim() || null,
                scaleAuthConditionId: c.scaleAuthConditionId ?? null,
              }))
              .filter((c) => c.scaleConditionClassCode && c.scaleAuthConditionId),
            exceptions: selectedExceptions.map((e) => String(e.code ?? '').trim()).filter(Boolean),
          },
          token,
        );
        navigate(`/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(String(authorizationId))}`);
      } catch (e: unknown) {
        setFormError(extractApiError(e, 'Could not update mark site designation.'));
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  if (loading) {
    return (
      <Grid className="report-grid">
        <Column lg={16} md={8} sm={4}>
          <SkeletonText paragraph lineCount={10} />
        </Column>
      </Grid>
    );
  }

  if (loadError) {
    return (
      <Grid className="report-grid">
        <Column lg={16} md={8} sm={4}>
          <InlineNotification kind="error" title="Error" subtitle={loadError} />
        </Column>
      </Grid>
    );
  }

  const locked = letterExists;
  const markHolderClientLoc =
    markHolderClient || markHolderLoc ? `${markHolderClient}/${markHolderLoc}` : '';

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle
          title="Mark Site Designation - Edit"
          breadCrumbs={[
            { name: 'Queries' },
            { name: 'Mark Site Designations', path: '/mark-site-designations' },
            {
              name: 'Mark Site Designation',
              path: `/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(String(authorizationId))}`,
            },
            { name: 'Edit' },
          ]}
        />

        <Form onSubmit={(e) => e.preventDefault()} className="mark-site-designation-create-form scs__form">
          {submitAttempted && (formError || Object.keys(fieldErrors).length > 0) ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Please fix the errors below."
              subtitle={formError ?? 'Some required fields are missing.'}
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          {locked ? (
            <InlineNotification
              kind="info"
              lowContrast
              title="Letter issued"
              subtitle="A letter has been issued for this authorization. Only the Expiry Date may be changed."
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          <h4 className="scs__form__section-title">MSD Authorization</h4>
          <Grid className="scs__form__grid">
            <Column lg={8} md={8} sm={4}>
              <TextInput id="msd-number" labelText="MSD #" value={msdNumber} readOnly />
            </Column>
            <Column lg={8} md={8} sm={4} />
            <Column lg={8} md={8} sm={4}>
              <TextInput id="timber-mark" labelText="Timber Mark" value={timberMark} readOnly />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <TextInput id="mark-holder-client-loc" labelText="Mark Holder (Client / Loc)" value={markHolderClientLoc} readOnly />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <TextInput id="mark-holder-name" labelText="Mark Holder Name" value={markHolderName} readOnly />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <TextInput id="mark-status" labelText="Mark Status" value={markStatus} readOnly />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <DateInput
                id="effective-date"
                value={values.effectiveDate}
                onChange={set('effectiveDate')}
                placeholder="YYYY-MM-DD"
                ariaLabel="Effective Date"
                labelText={requiredLabel('Effective Date', 'scs__required')}
                hideLabel={false}
                disabled={locked}
                invalid={showError('effectiveDate')}
                invalidText={fieldErrors.effectiveDate}
              />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <DateInput
                id="expiry-date"
                value={values.expiryDate}
                onChange={set('expiryDate')}
                placeholder="YYYY-MM-DD"
                ariaLabel="Expiry Date"
                labelText={requiredLabel('Expiry Date', 'scs__required')}
                hideLabel={false}
                invalid={showError('expiryDate')}
                invalidText={fieldErrors.expiryDate}
              />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <DistrictSelect
                value={values.regDist}
                onChange={set('regDist')}
                hideLabel={false}
                labelText={requiredLabel('Reg / Dist', 'scs__required')}
                disabled={locked}
                invalid={showError('regDist')}
                invalidText={fieldErrors.regDist}
              />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <Select
                id="district-wide"
                value={values.districtWideInd}
                onChange={(e) => {
                  set('districtWideInd')(e.target.value);
                  if (e.target.value === 'Y') {
                    setScaleSites([]);
                    clearFieldError('scaleSites');
                  }
                }}
                labelText={requiredLabel('District Wide?', 'scs__required')}
                disabled={locked}
                invalid={showError('districtWideInd')}
                invalidText={fieldErrors.districtWideInd}
              >
                <SelectItem value="" text="" />
                <SelectItem value="Y" text="Yes" />
                <SelectItem value="N" text="No" />
              </Select>
            </Column>
            <Column lg={8} md={8} sm={4}>
              <TextInput
                id="population"
                labelText="Population"
                value={values.population}
                onChange={(e) => set('population')(e.target.value)}
                disabled={locked}
                maxLength={4}
              />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <TextInput
                id="estimated-volume"
                labelText="Est. Volume"
                value={values.estimatedVolume}
                onChange={(e) => set('estimatedVolume')(e.target.value)}
                disabled={locked}
                maxLength={6}
                invalid={showError('estimatedVolume')}
                invalidText={fieldErrors.estimatedVolume}
              />
            </Column>
            <Column lg={8} md={8} sm={4}>
              <TextInput
                id="estimated-truck-loads"
                labelText="Est. Truck Loads"
                value={values.estimatedTruckLoads}
                onChange={(e) => set('estimatedTruckLoads')(e.target.value)}
                disabled={locked}
                maxLength={6}
                invalid={showError('estimatedTruckLoads')}
                invalidText={fieldErrors.estimatedTruckLoads}
              />
            </Column>
            <Column lg={8} md={8} sm={4} />
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="geographic-location"
                labelText="Geographic Location"
                value={values.geographicLocation}
                onChange={(e) => set('geographicLocation')(e.target.value)}
                disabled={locked}
                rows={4}
                invalid={showError('geographicLocation')}
                invalidText={fieldErrors.geographicLocation}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="timber-description"
                labelText="Timber Description"
                value={values.timberDescription}
                onChange={(e) => set('timberDescription')(e.target.value)}
                disabled={locked}
                rows={4}
                invalid={showError('timberDescription')}
                invalidText={fieldErrors.timberDescription}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="transportation-date-desc"
                labelText="Transportation Date Desc"
                value={values.transportationDateDesc}
                onChange={(e) => set('transportationDateDesc')(e.target.value)}
                disabled={locked}
                rows={4}
                invalid={showError('transportationDateDesc')}
                invalidText={fieldErrors.transportationDateDesc}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <TextArea
                id="other-requirements"
                labelText="Other Requirements"
                value={values.otherRequirements}
                onChange={(e) => set('otherRequirements')(e.target.value)}
                disabled={locked}
                rows={4}
                invalid={showError('otherRequirements')}
                invalidText={fieldErrors.otherRequirements}
              />
            </Column>
          </Grid>

          <ScaleSitesSection
            districtWideInd={values.districtWideInd}
            scaleSiteInput={scaleSiteInput}
            scaleSites={scaleSites}
            onScaleSiteInputChange={setScaleSiteInput}
            onAddScaleSite={onAddScaleSite}
            onOpenSearch={() => setScaleSiteModalOpen(true)}
            onRemoveScaleSite={(id) => setScaleSites((prev) => prev.filter((s) => s.scaleSiteIdNmbr !== id))}
            isAddingScaleSite={isAddingScaleSite}
            addDisabled={locked || isAddingScaleSite}
            searchDisabled={locked || isAddingScaleSite}
            labelText="Site #"
            // NOT submit-gated (unlike the record-level fields below/above, which use showError). The
            // Add button raises its errors at add time, so gating them behind submitAttempted hid them
            // until a save — and validateSave then overwrote fieldErrors, clearing them unseen. That was
            // UC-MSD-002 Divergence #2; QA's ticket is the decision to surface them at add time.
            invalid={Boolean(fieldErrors.scaleSites)}
            invalidText={fieldErrors.scaleSites}
          />

          <SpeciesContentSection
            speciesRows={speciesRows}
            setSpeciesRows={setSpeciesRows}
            speciesOptions={speciesOptions}
            speciesDraft={speciesDraft}
            setSpeciesDraft={setSpeciesDraft}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            clearFieldError={clearFieldError}
            disabled={locked}
          />

          <div className="scs__form__divider" />
          <h4 className="scs__form__section-title">Exemptions</h4>
          <Grid className="scs__form__grid">
            <Column lg={8} md={8} sm={4}>
              <ActiveMultiSelect<StaticLov>
                id="exceptions"
                items={exemptionOptions}
                itemToString={(item) => (item?.description ? String(item.description) : '')}
                titleText="Exemptions"
                selectedItems={selectedExceptions}
                onChange={(event) => setSelectedExceptions(event.selectedItems ?? [])}
                disabled={locked}
              />
            </Column>
          </Grid>

          <div className="scs__form__divider" />
          <AuthorizationConditionsSection
            conditionClassCode="MSD"
            templateFilterField="MSD"
            conditions={conditions}
            setConditions={setConditions}
            // MSD has its own legacy duplicate wording (`errors.dup_condition`), which names the record
            // type and takes no id — not the `scaleSiteAuthorization.duplicateCondition` default.
            duplicateConditionMessage={() => 'Condition already exists for Mark Site Designation.'}
            disabled={locked || isSubmitting}
            loadDefaults={false}
            conditionLinkPath="/maintenance/conditions"
            searchConditions={API.scalerAuthorizations.searchActiveScaleAuthConditions}
            getTemplateConditions={API.scalerAuthorizations.getScaleAuthTemplateConditions}
          />

          <div className="scs__form__divider scs__form__divider--actions" />
          <div className="form-actions">
            <Button kind="secondary" onClick={() => globalThis.history.back()} renderIcon={ArrowLeft}>
              Back
            </Button>
            <Button kind="secondary" onClick={resetForm} renderIcon={ResetIcon}>
              Reset
            </Button>
            <Button kind="primary" onClick={onSaveRecord} disabled={isSubmitting} renderIcon={Save}>
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </Form>
      </Column>

      <ScaleSiteSearchModal
        open={scaleSiteModalOpen}
        onRequestClose={() => setScaleSiteModalOpen(false)}
        onScaleSiteSelect={(site: ScaleSiteSearchResult) => {
          if (!site?.scaleSiteIdNmbr) {
            return;
          }
          setScaleSiteInput(String(site.scaleSiteIdNmbr));
          setScaleSiteModalOpen(false);
          clearFieldError('scaleSites');
        }}
      />
    </Grid>
  );
};

export default MarkSiteDesignationEditPage;
