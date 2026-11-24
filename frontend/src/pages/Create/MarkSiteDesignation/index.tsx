import { Add, ArrowLeft, Edit, Save, Reset as ResetIcon } from '@carbon/icons-react';
import { Column, Form, FormLabel, Grid, InlineNotification, Select, SelectItem, TextArea, TextInput } from '@carbon/react';
import { type ChangeEvent, type Dispatch, type FC, type SetStateAction, useState } from 'react';

import Button from '@/components/core/Button';
import PageTitle from '@/components/core/PageTitle';
import { useNavigate } from 'react-router-dom';

import DateInput from '@/components/core/DateInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AuthorizationConditionsSection from '@/components/Form/AuthorizationConditionsSection';
import ScaleSitesSection, { type SelectedScaleSite } from '@/components/Form/ScaleSitesSection';
import TableRemoveButton from '@/components/Form/TableRemoveButton';
import TableResource from '@/components/Form/TableResource';
import { type TableHeaderType } from '@/components/Form/TableResource/types';
import ScaleSiteSearchModal from '@/components/Modal/ScaleSiteSearchModal';
import { useAuth } from '@/context/auth/useAuth';
import API from '@/services/APIs';
import type { StaticLov } from '@/services/lov.service';
import type { ScaleAuthCondition } from '@/services/scalerAuthorizations.service';
import type { ScaleSiteSearchResult } from '@/services/scaleSites.service';
import { extractApiError } from '@/utils/extractApiError';
import {
  type MarkSiteDesignationTextValues,
  validateMarkSiteDesignationTextLengths,
} from '@/utils/markSiteDesignationLengths';
import { requiredLabel } from '@/utils/requiredLabel';
import { scrollToError } from '@/utils/scrollToError';

import './index.scss';

type SpeciesContentRow = {
  id: string;
  speciesCode: string;
  contentPercent: string;
};

type SpeciesContentDraft = {
  speciesCode: string;
  contentPercent: string;
};

type MarkSiteBasicValues = {
  timberMark: string;
  effectiveDate: string;
  expiryDate: string;
  regDist: string;
  districtWideInd: DistrictWideIndicator;
};

type DistrictWideIndicator = '' | 'Y' | 'N';

type MarkSiteSaveValues = MarkSiteBasicValues & {
  geographicLocation: string;
  population: string;
  estimatedVolume: string;
  estimatedTruckLoads: string;
  timberDescription: string;
  transportationDateDesc: string;
  otherRequirements: string;
};

type MarkSiteFieldSetter = Dispatch<SetStateAction<Record<string, string>>>;

type TimberMarkLookupDeps = {
  timberMark: string;
  userToken: () => Promise<string | undefined>;
  setMarkHolderClient: Dispatch<SetStateAction<string>>;
  setMarkHolderLoc: Dispatch<SetStateAction<string>>;
  setMarkHolderName: Dispatch<SetStateAction<string>>;
  setMarkStatus: Dispatch<SetStateAction<string>>;
  setFormError: Dispatch<SetStateAction<string | null>>;
  setLookingUp: Dispatch<SetStateAction<boolean>>;
  setFieldErrors: MarkSiteFieldSetter;
};

type SecondStageLookupDeps = {
  userToken: () => Promise<string | undefined>;
  setSpeciesOptions: Dispatch<SetStateAction<StaticLov[]>>;
  setExemptionOptions: Dispatch<SetStateAction<StaticLov[]>>;
};

type ScaleSiteAddDeps = {
  scaleSiteInput: string;
  /** Current list, needed to reject a site that is already on it (the updater cannot raise the error). */
  scaleSites: SelectedScaleSite[];
  userToken: () => Promise<string | undefined>;
  setScaleSites: Dispatch<SetStateAction<SelectedScaleSite[]>>;
  setScaleSiteInput: Dispatch<SetStateAction<string>>;
  setFieldErrors: MarkSiteFieldSetter;
  clearFieldError: (key: string) => void;
  setAdding: Dispatch<SetStateAction<boolean>>;
};

type SaveMarkSiteDeps = {
  values: MarkSiteSaveValues;
  scaleSites: SelectedScaleSite[];
  speciesRows: SpeciesContentRow[];
  conditions: ScaleAuthCondition[];
  exceptions: StaticLov[];
  userToken: () => Promise<string | undefined>;
  navigate: (path: string) => void;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setFormError: Dispatch<SetStateAction<string | null>>;
};

const validateMarkSiteBasics = ({
  timberMark,
  effectiveDate,
  expiryDate,
  regDist,
  districtWideInd,
}: MarkSiteBasicValues) => {
  const nextErrors: Record<string, string> = {};
  const required = (key: string, ok: boolean, message: string) => {
    if (!ok) {
      nextErrors[key] = message;
    }
  };

  required('timberMark', timberMark.trim().length > 0, 'Timber Mark is required.');
  required('effectiveDate', effectiveDate.trim().length > 0, 'Effective Date is required.');
  required('expiryDate', expiryDate.trim().length > 0, 'Expiry Date is required.');
  required('regDist', regDist.trim().length > 0, 'Reg / Dist is required.');
  required('districtWideInd', districtWideInd === 'Y' || districtWideInd === 'N', 'District Wide is required.');

  if (effectiveDate && expiryDate && effectiveDate > expiryDate) {
    nextErrors.expiryDate = 'Expiry Date must be on or after Effective Date.';
  }

  return { ok: Object.keys(nextErrors).length === 0, nextErrors, formError: null as string | null };
};

const WHOLE_NUMBER_RE = /^-?\d+$/;
const NON_NEGATIVE_WHOLE_NUMBER_RE = /^\d+$/;

/**
 * Format rules for the optional fields. Shared by both gates ("Add Conditions" and "Save Record")
 * because every field they cover lives in the first section, which is filled in before either.
 */
const validateMarkSiteOptionalFields = (
  estimatedVolume: string,
  estimatedTruckLoads: string,
  textValues: MarkSiteDesignationTextValues,
): Record<string, string> => {
  const errors: Record<string, string> = validateMarkSiteDesignationTextLengths(textValues);

  if (estimatedVolume.trim() && !WHOLE_NUMBER_RE.test(estimatedVolume.trim())) {
    errors.estimatedVolume = 'Est. Volume must be an integer.';
  }
  if (estimatedTruckLoads.trim() && !WHOLE_NUMBER_RE.test(estimatedTruckLoads.trim())) {
    errors.estimatedTruckLoads = 'Est. Truck Loads must be an integer.';
  }

  return errors;
};

const validateMarkSiteSave = (
  values: MarkSiteBasicValues,
  scaleSiteCount: number,
  estimatedVolume: string,
  estimatedTruckLoads: string,
  textValues: MarkSiteDesignationTextValues,
) => {
  const result = validateMarkSiteBasics(values);
  const nextErrors = {
    ...result.nextErrors,
    ...validateMarkSiteOptionalFields(estimatedVolume, estimatedTruckLoads, textValues),
  };

  if (values.districtWideInd === 'N' && scaleSiteCount === 0) {
    nextErrors.scaleSites = 'At least one Scale Site is required when District Wide is No.';
  }

  return { ok: Object.keys(nextErrors).length === 0, nextErrors, formError: null as string | null };
};

const loadMarkSiteSecondStageLookups = async ({
  userToken,
  setSpeciesOptions,
  setExemptionOptions,
}: SecondStageLookupDeps) => {
  try {
    const token = await userToken();
    const [speciesLov, exemptionsLov] = await Promise.all([
      API.lov.getStaticLov({ tableKey: 'SCALE_SPECIES_CODE' }, token),
      API.lov.getStaticLov({ tableKey: 'EXEMPT_MARK_METHOD_CODE' }, token),
    ]);
    setSpeciesOptions(speciesLov ?? []);
    setExemptionOptions(exemptionsLov ?? []);
  } catch {
    setSpeciesOptions([]);
    setExemptionOptions([]);
  }
};

const lookupTimberMarkHolder = async ({
  timberMark,
  userToken,
  setMarkHolderClient,
  setMarkHolderLoc,
  setMarkHolderName,
  setMarkStatus,
  setFormError,
  setLookingUp,
  setFieldErrors,
}: TimberMarkLookupDeps) => {
  if (timberMark.trim().length === 0) {
    setFormError(null);
    setFieldErrors((prev) => ({ ...prev, timberMark: 'Timber Mark is required.' }));
    return;
  }

  try {
    setLookingUp(true);
    const token = await userToken();
    const lookup = await API.markSiteDesignation.getMarkSiteDesignationTimberMarkLookup(timberMark.trim(), token);
    setMarkHolderClient(lookup.markHolderClient ?? '');
    setMarkHolderLoc(lookup.markHolderLoc ?? '');
    setMarkHolderName(lookup.markHolderName ?? '');
    setMarkStatus(lookup.markStatus ?? '');
    setFormError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.timberMark;
      return next;
    });
  } catch (error) {
    setMarkHolderClient('');
    setMarkHolderLoc('');
    setMarkHolderName('');
    setMarkStatus('');
    setFormError(extractApiError(error, 'Could not resolve timber mark.'));
  } finally {
    setLookingUp(false);
  }
};

const addScaleSiteById = async ({
  scaleSiteInput,
  scaleSites,
  userToken,
  setScaleSites,
  setScaleSiteInput,
  setFieldErrors,
  clearFieldError,
  setAdding,
}: ScaleSiteAddDeps) => {
  const trimmed = scaleSiteInput.trim();
  if (!trimmed) {
    setFieldErrors((prev) => ({ ...prev, scaleSites: 'Site # is required.' }));
    return;
  }

  try {
    setAdding(true);
    const token = await userToken();
    const matches = await API.scaleSites.searchScaleSites({ scaleSiteIdNmbr: trimmed }, token);
    const found = matches?.[0];

    if (!found?.scaleSiteIdNmbr || String(found.scaleSiteIdNmbr).toUpperCase() !== trimmed.toUpperCase()) {
      setFieldErrors((prev) => ({ ...prev, scaleSites: `Site ${trimmed} was not found.` }));
      return;
    }

    // Rejected, not silently de-duplicated — same defect and same legacy message as the edit screen.
    // QA reported this against edit only, but create carried the identical silent no-op.
    if (scaleSites.some((site) => site.scaleSiteIdNmbr === String(found.scaleSiteIdNmbr))) {
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
  } catch (error) {
    setFieldErrors((prev) => ({ ...prev, scaleSites: extractApiError(error, 'Could not add scale site.') }));
  } finally {
    setAdding(false);
  }
};

const saveMarkSiteDesignation = async ({
  values,
  scaleSites,
  speciesRows,
  conditions,
  exceptions,
  userToken,
  navigate,
  setSubmitting,
  setFormError,
}: SaveMarkSiteDeps) => {
  try {
    setSubmitting(true);
    const token = await userToken();
    const created = await API.markSiteDesignation.createMarkSiteDesignation(
      {
        timberMark: values.timberMark.trim(),
        geographicLocation: values.geographicLocation.trim() || null,
        population: values.population.trim() || null,
        effectiveDate: values.effectiveDate,
        expiryDate: values.expiryDate,
        orgUnitNo: Number(values.regDist),
        districtWideInd: values.districtWideInd === 'Y' ? 'Y' : 'N',
        estimatedVolume: values.estimatedVolume.trim() ? Number(values.estimatedVolume) : null,
        estimatedTruckLoads: values.estimatedTruckLoads.trim() ? Number(values.estimatedTruckLoads) : null,
        timberDescription: values.timberDescription.trim() || null,
        transportationDateDesc: values.transportationDateDesc.trim() || null,
        otherRequirements: values.otherRequirements.trim() || null,
        scaleSites: scaleSites.map((site) => String(site.scaleSiteIdNmbr ?? '').trim()).filter(Boolean),
        speciesContent: speciesRows
          .map((row) => ({
            scaleSpeciesCode: row.speciesCode.trim() || null,
            contentPercent: row.contentPercent.trim() ? Number(row.contentPercent.trim()) : null,
          }))
          .filter((row) => row.scaleSpeciesCode),
        conditions: conditions
          .map((condition) => ({
            scaleConditionClassCode: String(condition.scaleConditionClassCode ?? '').trim() || null,
            scaleAuthConditionId: condition.scaleAuthConditionId ?? null,
          }))
          .filter((condition) => condition.scaleConditionClassCode && condition.scaleAuthConditionId),
        exceptions: exceptions.map((e) => String(e.code ?? '').trim()).filter(Boolean),
      },
      token,
    );

    if (created.haulingMarkAuthorizationId) {
      navigate(`/mark-site-designations/view?haulingMarkAuthorizationId=${encodeURIComponent(String(created.haulingMarkAuthorizationId))}`);
      return;
    }

    setFormError('Mark Site Designation was created, but no identifier was returned.');
  } catch (error) {
    setFormError(extractApiError(error, 'Could not create mark site designation.'));
  } finally {
    setSubmitting(false);
  }
};

const formatSpeciesLabel = (option: StaticLov): string => option.description ?? option.code ?? '';

const MarkSiteBasicsSection: FC<{
  msdNumber: string;
  timberMark: string;
  setTimberMark: (value: string) => void;
  markHolderClient: string;
  markHolderLoc: string;
  markHolderName: string;
  markStatus: string;
  geographicLocation: string;
  setGeographicLocation: (value: string) => void;
  population: string;
  setPopulation: (value: string) => void;
  effectiveDate: string;
  setEffectiveDate: (value: string) => void;
  expiryDate: string;
  setExpiryDate: (value: string) => void;
  regDist: string;
  setRegDist: (value: string) => void;
  districtWideInd: DistrictWideIndicator;
  setDistrictWideInd: (value: '' | 'Y' | 'N') => void;
  estimatedVolume: string;
  setEstimatedVolume: (value: string) => void;
  estimatedTruckLoads: string;
  setEstimatedTruckLoads: (value: string) => void;
  timberDescription: string;
  setTimberDescription: (value: string) => void;
  transportationDateDesc: string;
  setTransportationDateDesc: (value: string) => void;
  otherRequirements: string;
  setOtherRequirements: (value: string) => void;
  isLookingUp: boolean;
  onUpdateTimberMark: () => void;
  showError: (key: string) => boolean;
  fieldErrors: Record<string, string>;
}> = ({
  msdNumber,
  timberMark,
  setTimberMark,
  markHolderClient,
  markHolderLoc,
  markHolderName,
  markStatus,
  geographicLocation,
  setGeographicLocation,
  population,
  setPopulation,
  effectiveDate,
  setEffectiveDate,
  expiryDate,
  setExpiryDate,
  regDist,
  setRegDist,
  districtWideInd,
  setDistrictWideInd,
  estimatedVolume,
  setEstimatedVolume,
  estimatedTruckLoads,
  setEstimatedTruckLoads,
  timberDescription,
  setTimberDescription,
  transportationDateDesc,
  setTransportationDateDesc,
  otherRequirements,
  setOtherRequirements,
  isLookingUp,
  onUpdateTimberMark,
  showError,
  fieldErrors,
}) => (
  <>
    <h4 className="scs__form__section-title">MSD Authorization</h4>
    <Grid className="scs__form__grid">
      <Column lg={8} md={8} sm={4}>
        <TextInput id="msd-number" value={msdNumber} onChange={() => undefined} labelText="MSD #" disabled />
      </Column>
      <Column lg={8} md={8} sm={4} />
      <Column lg={8} md={8} sm={4}>
        <FormLabel style={{ marginBottom: '8px' }}>
          {requiredLabel('Timber Mark', 'scs__required')}
        </FormLabel>
        <div className="scs__input-search-row">
          <TextInput
            id="timber-mark"
            value={timberMark}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTimberMark(e.target.value)}
            labelText=""
            hideLabel
            invalid={showError('timberMark')}
            invalidText={fieldErrors.timberMark}
          />
          <Button
            type="button"
            kind="secondary"
            className="scs__input-search-button cds--btn--field"
            onClick={onUpdateTimberMark}
            disabled={isLookingUp}
            aria-label="Update Timber Mark"
            title="Update Timber Mark"
            renderIcon={Edit}
          >
            Update
          </Button>
        </div>
      </Column>
      <Column lg={8} md={8} sm={4}>
        <FormLabel style={{ marginBottom: '8px', marginTop: '4px' }}>Mark Holder (Client / Loc)</FormLabel>
        <div className="client-loc-row mark-site-designation-create__mark-holder-row" aria-label="Mark Holder (Client / Loc)">
          <TextInput id="mark-holder-client" value={markHolderClient} onChange={() => undefined} placeholder="Client" labelText="" disabled />
          <span className="slash">/</span>
          <TextInput id="mark-holder-loc" value={markHolderLoc} onChange={() => undefined} placeholder="Loc" labelText="" disabled />
        </div>
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="mark-holder-name" value={markHolderName} onChange={() => undefined} labelText="Mark Holder Name" disabled />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="mark-status" value={markStatus} onChange={() => undefined} labelText="Mark Status" disabled />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <DateInput
          id="effective-date"
          value={effectiveDate}
          onChange={setEffectiveDate}
          placeholder="YYYY-MM-DD"
          ariaLabel="Effective Date"
          labelText={requiredLabel('Effective Date', 'scs__required')}
          hideLabel={false}
          invalid={showError('effectiveDate')}
          invalidText={fieldErrors.effectiveDate}
        />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <DateInput
          id="expiry-date"
          value={expiryDate}
          onChange={setExpiryDate}
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
          value={regDist}
          onChange={setRegDist}
          hideLabel={false}
          labelText={requiredLabel('Reg / Dist', 'scs__required')}
          invalid={showError('regDist')}
          invalidText={fieldErrors.regDist}
        />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <Select
          id="district-wide"
          value={districtWideInd}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setDistrictWideInd(e.target.value as '' | 'Y' | 'N')}
          labelText={requiredLabel('District Wide?', 'scs__required')}
          invalid={showError('districtWideInd')}
          invalidText={fieldErrors.districtWideInd}
        >
          <SelectItem value="" text="" />
          <SelectItem value="Y" text="Yes" />
          <SelectItem value="N" text="No" />
        </Select>
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="population" value={population} onChange={(e: ChangeEvent<HTMLInputElement>) => setPopulation(e.target.value)} labelText="Population" maxLength={4} />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="estimated-volume" value={estimatedVolume} onChange={(e: ChangeEvent<HTMLInputElement>) => setEstimatedVolume(e.target.value)} labelText="Est. Volume" maxLength={6} invalid={showError('estimatedVolume')} invalidText={fieldErrors.estimatedVolume} />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput id="estimated-truck-loads" value={estimatedTruckLoads} onChange={(e: ChangeEvent<HTMLInputElement>) => setEstimatedTruckLoads(e.target.value)} labelText="Est. Truck Loads" maxLength={6} invalid={showError('estimatedTruckLoads')} invalidText={fieldErrors.estimatedTruckLoads} />
      </Column>
      <Column lg={8} md={8} sm={4} />
      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="geographic-location"
          value={geographicLocation}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setGeographicLocation(e.target.value)}
          rows={4}
          labelText="Geographic Location"
          invalid={showError('geographicLocation')}
          invalidText={fieldErrors.geographicLocation}
        />
      </Column>
      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="timber-description"
          value={timberDescription}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTimberDescription(e.target.value)}
          rows={4}
          labelText="Timber Description"
          invalid={showError('timberDescription')}
          invalidText={fieldErrors.timberDescription}
        />
      </Column>
      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="transportation-date-desc"
          value={transportationDateDesc}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTransportationDateDesc(e.target.value)}
          rows={4}
          labelText="Transportation Date Desc"
          invalid={showError('transportationDateDesc')}
          invalidText={fieldErrors.transportationDateDesc}
        />
      </Column>
      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="other-requirements"
          value={otherRequirements}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setOtherRequirements(e.target.value)}
          rows={4}
          labelText="Other Requirements"
          invalid={showError('otherRequirements')}
          invalidText={fieldErrors.otherRequirements}
        />
      </Column>
    </Grid>
  </>
);

const SpeciesContentSection: FC<{
  speciesRows: SpeciesContentRow[];
  setSpeciesRows: Dispatch<SetStateAction<SpeciesContentRow[]>>;
  speciesOptions: StaticLov[];
  speciesDraft: SpeciesContentDraft;
  setSpeciesDraft: Dispatch<SetStateAction<SpeciesContentDraft>>;
  fieldErrors: Record<string, string>;
  setFieldErrors: MarkSiteFieldSetter;
  clearFieldError: (key: string) => void;
}> = ({ speciesRows, setSpeciesRows, speciesOptions, speciesDraft, setSpeciesDraft, fieldErrors, setFieldErrors, clearFieldError }) => {
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

    if (speciesCode && !speciesOptions.some((option) => String(option.code ?? '') === speciesCode)) {
      nextErrors.speciesCode = 'Select a valid species.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      return;
    }

    setSpeciesRows((prev) => [
      ...prev,
      {
        id: `species-${Date.now()}-${prev.length}`,
        speciesCode,
        contentPercent,
      },
    ]);
    setSpeciesDraft({ speciesCode: '', contentPercent: '' });
    clearFieldError('speciesCode');
    clearFieldError('contentPercent');
  };

  const removeSpeciesRow = (rowId: string) => {
    setSpeciesRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  return (
    <>
      <div className="scs__form__divider" />
      <h4 className="scs__form__section-title">Species Content</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <div className="mark-site-designation-create__species-input-row">
            <div className="mark-site-designation-create__species-input-field mark-site-designation-create__species-input-field--species">
              <Select
                id="species-input"
                value={speciesDraft.speciesCode}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setSpeciesDraft((prev) => ({ ...prev, speciesCode: e.target.value }));
                  clearFieldError('speciesCode');
                }}
                labelText="Species"
                invalid={Boolean(fieldErrors.speciesCode)}
                invalidText={fieldErrors.speciesCode}
              >
                <SelectItem value="" text="" />
                {speciesOptions.filter((option) => !selectedCodes.has(String(option.code ?? ''))).map((option) => (
                  <SelectItem key={`${option.code ?? ''}`} value={String(option.code ?? '')} text={formatSpeciesLabel(option)} />
                ))}
              </Select>
            </div>
            <div className="mark-site-designation-create__species-input-field mark-site-designation-create__species-input-field--content">
              <TextInput
                id="species-content-input"
                value={speciesDraft.contentPercent}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
              <Button kind="secondary" className="scs__input-search-button" onClick={addSpeciesRow} renderIcon={Add}>
                Add
              </Button>
            </div>
          </div>
        </Column>
      </Grid>
      {speciesRows.length > 0 ? (
        <TableResource
          headers={[
            {
              key: 'speciesCode',
              header: 'Species',
              selected: true,
              renderAs: (_value: unknown, row: SpeciesContentRow) => speciesLabelByCode.get(row.speciesCode) ?? row.speciesCode,
            },
            { key: 'contentPercent', header: 'Content', selected: true, renderAs: (value: unknown) => `${value}%` },
            {
              key: 'remove',
              header: '\u00A0',
              selected: true,
              renderAs: (_value: unknown, row: SpeciesContentRow) => (
                <div style={{ textAlign: 'right' }}>
                  <TableRemoveButton onClick={() => removeSpeciesRow(row.id)} />
                </div>
              ),
            },
          ] as TableHeaderType<SpeciesContentRow>[]}
          content={{
            content: speciesRows.map((row) => ({ ...row, id: row.id })),
            page: {
              size: Math.max(1, speciesRows.length),
              number: 0,
              totalElements: speciesRows.length,
              totalPages: 1,
            },
          }}
          loading={false}
          error={false}
        />
      ) : null}
    </>
  );
};

const ExceptionsSection: FC<{
  exemptionOptions: StaticLov[];
  selectedExceptions: StaticLov[];
  setSelectedExceptions: Dispatch<SetStateAction<StaticLov[]>>;
}> = ({ exemptionOptions, selectedExceptions, setSelectedExceptions }) => (
  <>
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
          disabled={false}
        />
      </Column>
    </Grid>
  </>
);

const ConditionsSection: FC<{
  conditions: ScaleAuthCondition[];
  setConditions: Dispatch<SetStateAction<ScaleAuthCondition[]>>;
  isSubmitting: boolean;
}> = ({ conditions, setConditions, isSubmitting }) => (
  <>
    <div className="scs__form__divider" />
    <AuthorizationConditionsSection
      conditionClassCode="MSD"
      templateFilterField="MSD"
      conditions={conditions}
      setConditions={setConditions}
      // MSD's own legacy wording (`errors.dup_condition`) — see the edit screen.
      duplicateConditionMessage={() => 'Condition already exists for Mark Site Designation.'}
      disabled={isSubmitting}
      conditionLinkPath="/maintenance/conditions"
      searchConditions={API.scalerAuthorizations.searchActiveScaleAuthConditions}
      getTemplateConditions={API.scalerAuthorizations.getScaleAuthTemplateConditions}
    />
  </>
);

const ActionsSection: FC<{
  showAdvancedSection: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onReset: () => void;
  onAddConditions: () => void;
  onSaveRecord: () => void;
}> = ({ showAdvancedSection, isSubmitting, onBack, onReset, onAddConditions, onSaveRecord }) => (
  <div className="form-actions">
    <Button kind="secondary" onClick={onBack} className="action-btn" renderIcon={ArrowLeft}>
      Back
    </Button>
    <Button kind="secondary" onClick={onReset} className="action-btn" renderIcon={ResetIcon}>
      Reset
    </Button>
    {showAdvancedSection ? (
      <Button kind="primary" onClick={onSaveRecord} className="action-btn" disabled={isSubmitting} renderIcon={Save}>
        {isSubmitting ? 'Saving...' : 'Save Record'}
      </Button>
    ) : (
      <Button kind="primary" onClick={onAddConditions} className="action-btn" renderIcon={Add} disabled={isSubmitting}>
        Add Conditions
      </Button>
    )}
  </div>
);

const MarkSiteDesignationCreateForm: FC = () => {
  const navigate = useNavigate();
  const { userToken } = useAuth();

  const [msdNumber] = useState('');
  const [timberMark, setTimberMark] = useState('');
  const [markHolderClient, setMarkHolderClient] = useState('');
  const [markHolderLoc, setMarkHolderLoc] = useState('');
  const [markHolderName, setMarkHolderName] = useState('');
  const [markStatus, setMarkStatus] = useState('');
  const [geographicLocation, setGeographicLocation] = useState('');
  const [population, setPopulation] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [regDist, setRegDist] = useState('');
  const [districtWideInd, setDistrictWideInd] = useState<'' | 'Y' | 'N'>('');
  const [estimatedVolume, setEstimatedVolume] = useState('');
  const [estimatedTruckLoads, setEstimatedTruckLoads] = useState('');
  const [timberDescription, setTimberDescription] = useState('');
  const [transportationDateDesc, setTransportationDateDesc] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('');

  const [showAdvancedSection, setShowAdvancedSection] = useState(false);
  const [conditions, setConditions] = useState<ScaleAuthCondition[]>([]);
  const [scaleSites, setScaleSites] = useState<SelectedScaleSite[]>([]);
  const [scaleSiteInput, setScaleSiteInput] = useState('');
  const [scaleSiteModalOpen, setScaleSiteModalOpen] = useState(false);
  const [isAddingScaleSite, setIsAddingScaleSite] = useState(false);
  const [speciesOptions, setSpeciesOptions] = useState<StaticLov[]>([]);
  const [exemptionOptions, setExemptionOptions] = useState<StaticLov[]>([]);
  const [speciesRows, setSpeciesRows] = useState<SpeciesContentRow[]>([]);
  const [speciesDraft, setSpeciesDraft] = useState<SpeciesContentDraft>({ speciesCode: '', contentPercent: '' });
  const [selectedExceptions, setSelectedExceptions] = useState<StaticLov[]>([]);

  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

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

  const showError = (key: string) => submitAttempted && Boolean(fieldErrors[key]);

  /** The free-text fields, grouped for the shared column-length rule. */
  const textValues = {
    geographicLocation,
    timberDescription,
    transportationDateDesc,
    otherRequirements,
  };

  const resetForm = () => {
    setTimberMark('');
    setMarkHolderClient('');
    setMarkHolderLoc('');
    setMarkHolderName('');
    setMarkStatus('');
    setGeographicLocation('');
    setPopulation('');
    setEffectiveDate('');
    setExpiryDate('');
    setRegDist('');
    setDistrictWideInd('');
    setEstimatedVolume('');
    setEstimatedTruckLoads('');
    setTimberDescription('');
    setTransportationDateDesc('');
    setOtherRequirements('');
    setShowAdvancedSection(false);
    setConditions([]);
    setScaleSites([]);
    setScaleSiteInput('');
    setScaleSiteModalOpen(false);
    setIsAddingScaleSite(false);
    setSpeciesOptions([]);
    setExemptionOptions([]);
    setSpeciesRows([]);
    setSelectedExceptions([]);
    setSubmitAttempted(false);
    setFormError(null);
    setFieldErrors({});
  };

  const onUpdateTimberMark = () => {
    void lookupTimberMarkHolder({
      timberMark,
      userToken,
      setMarkHolderClient,
      setMarkHolderLoc,
      setMarkHolderName,
      setMarkStatus,
      setFormError,
      setLookingUp: setIsLookingUp,
      setFieldErrors,
    });
  };

  const onAddConditions = () => {
    setSubmitAttempted(true);
    const result = validateMarkSiteBasics({ timberMark, effectiveDate, expiryDate, regDist, districtWideInd });
    const nextErrors = {
      ...result.nextErrors,
      ...validateMarkSiteOptionalFields(estimatedVolume, estimatedTruckLoads, textValues),
    };

    setFieldErrors(nextErrors);
    setFormError(result.formError);
    if (Object.keys(nextErrors).length > 0) {
      scrollToError();
      return;
    }

    void loadMarkSiteSecondStageLookups({
      userToken,
      setSpeciesOptions,
      setExemptionOptions,
    });

    setShowAdvancedSection(true);
  };

  const onAddScaleSite = () => {
    void addScaleSiteById({
      scaleSiteInput,
      scaleSites,
      userToken,
      setScaleSites,
      setScaleSiteInput,
      setFieldErrors,
      clearFieldError,
      setAdding: setIsAddingScaleSite,
    });
  };

  const onOpenScaleSiteSearch = () => setScaleSiteModalOpen(true);

  const onRemoveScaleSite = (scaleSiteIdNmbr: string) => {
    setScaleSites((prev) => prev.filter((site) => site.scaleSiteIdNmbr !== scaleSiteIdNmbr));
  };

  const onSaveRecord = () => {
    setSubmitAttempted(true);
    const result = validateMarkSiteSave(
      { timberMark, effectiveDate, expiryDate, regDist, districtWideInd },
      scaleSites.length,
      estimatedVolume,
      estimatedTruckLoads,
      textValues,
    );
    setFieldErrors(result.nextErrors);
    setFormError(result.formError);
    if (!result.ok) {
      scrollToError();
      return;
    }

    void saveMarkSiteDesignation({
      values: {
        timberMark,
        effectiveDate,
        expiryDate,
        regDist,
        districtWideInd,
        geographicLocation,
        population,
        estimatedVolume,
        estimatedTruckLoads,
        timberDescription,
        transportationDateDesc,
        otherRequirements,
      },
      scaleSites,
      speciesRows,
      conditions,
      exceptions: selectedExceptions,
      userToken,
      navigate,
      setSubmitting: setIsSubmitting,
      setFormError,
    });
  };

  return (
    <Grid className="report-grid">
      <Column lg={16} md={8} sm={4}>
        <PageTitle title="Mark Site Designation - Create" />

        <Form onSubmit={(e) => e.preventDefault()} className="mark-site-designation-create-form scs__form">
          {formError || (submitAttempted && Object.keys(fieldErrors).length > 0) ? (
            <InlineNotification
              kind="error"
              lowContrast
              title="Please fix the errors below."
              subtitle={formError ?? 'Some required fields are missing.'}
              style={{ marginBottom: '24px' }}
            />
          ) : null}

          <MarkSiteBasicsSection
            msdNumber={msdNumber}
            timberMark={timberMark}
            setTimberMark={setTimberMark}
            markHolderClient={markHolderClient}
            markHolderLoc={markHolderLoc}
            markHolderName={markHolderName}
            markStatus={markStatus}
            geographicLocation={geographicLocation}
            setGeographicLocation={setGeographicLocation}
            population={population}
            setPopulation={setPopulation}
            effectiveDate={effectiveDate}
            setEffectiveDate={setEffectiveDate}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            regDist={regDist}
            setRegDist={setRegDist}
            districtWideInd={districtWideInd}
            setDistrictWideInd={(value) => {
              setDistrictWideInd(value);
              if (value === 'Y') {
                setScaleSites([]);
                clearFieldError('scaleSites');
              }
            }}
            estimatedVolume={estimatedVolume}
            setEstimatedVolume={setEstimatedVolume}
            estimatedTruckLoads={estimatedTruckLoads}
            setEstimatedTruckLoads={setEstimatedTruckLoads}
            timberDescription={timberDescription}
            setTimberDescription={setTimberDescription}
            transportationDateDesc={transportationDateDesc}
            setTransportationDateDesc={setTransportationDateDesc}
            otherRequirements={otherRequirements}
            setOtherRequirements={setOtherRequirements}
            isLookingUp={isLookingUp}
            onUpdateTimberMark={onUpdateTimberMark}
            showError={showError}
            fieldErrors={fieldErrors}
          />

          {showAdvancedSection ? (
            <>
              <ScaleSitesSection
                districtWideInd={districtWideInd}
                scaleSiteInput={scaleSiteInput}
                scaleSites={scaleSites}
                onScaleSiteInputChange={setScaleSiteInput}
                onAddScaleSite={onAddScaleSite}
                onOpenSearch={onOpenScaleSiteSearch}
                onRemoveScaleSite={onRemoveScaleSite}
                isAddingScaleSite={isAddingScaleSite}
                addDisabled={isAddingScaleSite}
                searchDisabled={isAddingScaleSite}
                labelText={requiredLabel('Site #', 'scs__required')}
                // Add-time errors are not submit-gated — see the same note on the edit screen.
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
              />
              <ExceptionsSection
                exemptionOptions={exemptionOptions}
                selectedExceptions={selectedExceptions}
                setSelectedExceptions={setSelectedExceptions}
              />
              <ConditionsSection conditions={conditions} setConditions={setConditions} isSubmitting={isSubmitting} />
            </>
          ) : null}

          <div className="scs__form__divider scs__form__divider--actions" />
          <ActionsSection
            showAdvancedSection={showAdvancedSection}
            isSubmitting={isSubmitting}
            onBack={() => globalThis.history.back()}
            onReset={resetForm}
            onAddConditions={onAddConditions}
            onSaveRecord={onSaveRecord}
          />
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

export default MarkSiteDesignationCreateForm;
