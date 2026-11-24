import {
  Column,
  Form,
  Grid,
  InlineNotification,
  Select,
  SelectItem,
  TextArea,
  TextInput,
} from '@carbon/react';
import { Reset as ResetIcon, Save as SaveIcon } from '@carbon/icons-react';
import type { FC } from 'react';
import Button from '@/components/core/Button';
import ClientLocSearch from '@/components/core/ClientLocSearch';
import DmsInput from '@/components/core/DmsInput';
import DistrictSelect from '@/components/core/DistrictSelect';
import { requiredLabel } from '@/utils/requiredLabel';
import { coordinateFieldMessages, coordinateInvalidParts } from './logic';
import type {
  ScaleSiteFormMode,
  ScaleSiteFormValues,
  ScaleSiteFormErrors,
  ScaleSiteSiteTypeOption,
} from './logic';

export type {
  ScaleSiteFormMode,
  ScaleSiteFormValues,
  ScaleSiteFormErrors,
  ScaleSiteSiteTypeOption,
} from './logic';

export interface ScaleSiteFormProps {
  mode: ScaleSiteFormMode;
  values: ScaleSiteFormValues;
  onChange: <K extends keyof ScaleSiteFormValues>(field: K, value: ScaleSiteFormValues[K]) => void;
  errors: ScaleSiteFormErrors;
  submitAttempted: boolean;
  isSubmitting: boolean;
  formError: string | null;
  loadError: string | null;
  onSave: () => void;
  onReset: () => void;
  siteTypeOptions: ScaleSiteSiteTypeOption[];
  isLoadingSiteTypes: boolean;
}

const ScaleSiteForm: FC<ScaleSiteFormProps> = ({
  values,
  onChange,
  errors,
  submitAttempted,
  isSubmitting,
  formError,
  loadError,
  onSave,
  onReset,
  siteTypeOptions,
  isLoadingSiteTypes,
}) => {
  const showError = (key: string) => submitAttempted && Boolean(errors[key]);
  const saveLabel = isSubmitting ? 'Saving…' : 'Save Record';

  return (
    <Form onSubmit={(e) => e.preventDefault()} className="scale-site-create-form scs__form">
      {formError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Save failed."
          subtitle={formError}
          style={{ marginBottom: '24px' }}
        />
      ) : null}
      {loadError ? (
        <InlineNotification
          kind="error"
          lowContrast
          title="Site type options unavailable."
          subtitle={loadError}
          style={{ marginBottom: '24px' }}
        />
      ) : null}

      <h4 className="scs__form__section-title">Scale Site Information</h4>
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="scale-site-name"
            value={values.scaleSiteName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('scaleSiteName', e.target.value)}
            labelText={requiredLabel('Scale Site Name', 'scale-site-create__required')}
            maxLength={40}
            invalid={showError('scaleSiteName')}
            invalidText={errors.scaleSiteName}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <ClientLocSearch
            labelText={requiredLabel('Owner (Client / Loc)', 'scale-site-create__required')}
            client={values.ownerClient}
            loc={values.ownerLoc}
            onClientChange={(v) => onChange('ownerClient', v)}
            onLocChange={(v) => onChange('ownerLoc', v)}
            clientInvalid={showError('ownerClient')}
            clientInvalidText={errors.ownerClient}
            locInvalid={showError('ownerLoc')}
            locInvalidText={errors.ownerLoc}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DistrictSelect
            id="reg-dist"
            value={values.regDist}
            onChange={(v) => onChange('regDist', v)}
            hideLabel={false}
            labelText={requiredLabel('Reg / Dist', 'scale-site-create__required')}
            invalid={showError('regDist')}
            invalidText={errors.regDist}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <TextInput
            id="timber-brand"
            value={values.timberBrand}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange('timberBrand', e.target.value)}
            maxLength={7}
            labelText="Timber Brand"
            invalid={showError('timberBrand')}
            invalidText={errors.timberBrand}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DmsInput
            id="latitude"
            value={values.latitude}
            onChange={(v) => onChange('latitude', v)}
            labelText="Latitude"
            degreesDigits={2}
            allowSign
            invalid={showError('latitude')}
            invalidParts={showError('latitude') ? coordinateInvalidParts(values.latitude, 'latitude') : undefined}
            invalidMessages={showError('latitude') ? coordinateFieldMessages(values.latitude, 'latitude') : undefined}
            invalidText={errors.latitude}
          />
        </Column>

        <Column lg={8} md={8} sm={4}>
          <DmsInput
            id="longitude"
            value={values.longitude}
            onChange={(v) => onChange('longitude', v)}
            labelText="Longitude"
            degreesDigits={3}
            allowSign
            invalid={showError('longitude')}
            invalidParts={showError('longitude') ? coordinateInvalidParts(values.longitude, 'longitude') : undefined}
            invalidMessages={showError('longitude') ? coordinateFieldMessages(values.longitude, 'longitude') : undefined}
            invalidText={errors.longitude}
          />
        </Column>

        <Column lg={16} md={8} sm={4}>
          <TextArea
            id="site-location-description"
            value={values.siteLocationDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange('siteLocationDescription', e.target.value)}
            labelText={requiredLabel('Description of Site Location', 'scale-site-create__required')}
            maxLength={200}
            invalid={showError('siteLocation')}
            invalidText={errors.siteLocation}
            rows={5}
          />
        </Column>
      </Grid>

      <div className="scs__form__divider" />

      <h4 className="scs__form__section-title">Site Type</h4>
      {errors.siteTypes ? (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Site type"
          subtitle={errors.siteTypes}
          style={{ marginBottom: '16px' }}
        />
      ) : null}
      <Grid className="scs__form__grid">
        <Column lg={8} md={8} sm={4}>
          <Select
            id="site-type-primary"
            value={values.primarySiteType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('primarySiteType', e.target.value)}
            labelText={requiredLabel('Primary', 'scale-site-create__required')}
            invalid={showError('primarySiteType')}
            invalidText={errors.primarySiteType}
            disabled={isLoadingSiteTypes}
          >
            <SelectItem value="" text="Select" disabled />
            {siteTypeOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code} text={opt.description} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="site-type-secondary"
            value={values.secondarySiteType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('secondarySiteType', e.target.value)}
            labelText="Secondary"
            disabled={isLoadingSiteTypes}
          >
            <SelectItem value="" text="Select" />
            {siteTypeOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code} text={opt.description} />
            ))}
          </Select>
        </Column>

        <Column lg={8} md={8} sm={4}>
          <Select
            id="site-type-tertiary"
            value={values.tertiarySiteType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange('tertiarySiteType', e.target.value)}
            labelText="Tertiary"
            disabled={isLoadingSiteTypes}
          >
            <SelectItem value="" text="Select" />
            {siteTypeOptions.map((opt) => (
              <SelectItem key={opt.code} value={opt.code} text={opt.description} />
            ))}
          </Select>
        </Column>
      </Grid>

      <div className="scs__form__divider scs__form__divider--actions" />

      <div className="form-actions">
        <Button
          kind="secondary"
          onClick={onReset}
          className="action-btn"
          renderIcon={ResetIcon}
          disabled={isSubmitting}
        >
          Reset
        </Button>
        <Button
          kind="primary"
          onClick={onSave}
          className="action-btn"
          renderIcon={SaveIcon}
          disabled={isSubmitting}
        >
          {saveLabel}
        </Button>
      </div>
    </Form>
  );
};

export default ScaleSiteForm;
