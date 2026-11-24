import {
  Column,
  Grid,
  RadioButton,
  RadioButtonGroup,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  TextInput,
} from '@carbon/react';
import type { ChangeEvent, FC } from 'react';

import DateInput from '@/components/core/DateInput';
import type { StaticLov } from '@/services/lov.service';
import { requiredLabel } from '@/utils/requiredLabel';
import {
  partialLoadVisible as computePartialLoadVisible,
  type ReturnTypeLabel,
  type SummaryCheckScaleHeaderValues,
} from './summaryCheckScaleViewModel';

import './index.scss';

const REQUIRED_CLASS = 'summary-check-scale-form__required';

type FieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

/** Editable header fields the form reports back through {@code onChange}. */
export type SummaryCheckScaleHeaderField = keyof SummaryCheckScaleHeaderValues;

export interface SummaryCheckScaleFormProps {
  values: SummaryCheckScaleHeaderValues;
  onChange: (field: SummaryCheckScaleHeaderField, value: string) => void;
  errors: Record<string, string>;
  /** Whether to surface field errors (typically after a save attempt). */
  showErrors: boolean;
  checkScaleTypeOptions: StaticLov[];
  /**
   * When true the Return Type control is disabled and the stored value preserved (Update page —
   * the return type is locked once SPG rows exist).
   */
  returnTypeLocked?: boolean;
  /**
   * Called when the Return Type radio changes (Create). Lets the page reset the dependent SPG row.
   * Ignored when {@code returnTypeLocked}.
   */
  onReturnTypeChange?: (value: ReturnTypeLabel) => void;
}

/**
 * Controlled header form for a summary check scale, shared by the Create and Update pages (mirrors
 * the detail flow's shared {@code CheckScaleForm}). Renders only the header fields; the page composes
 * it with the SPG section and the action buttons.
 */
const SummaryCheckScaleForm: FC<SummaryCheckScaleFormProps> = ({
  values,
  onChange,
  errors,
  showErrors,
  checkScaleTypeOptions,
  returnTypeLocked = false,
  onReturnTypeChange,
}) => {
  const showError = (key: string) => showErrors && Boolean(errors[key]);
  const partialVisible = computePartialLoadVisible(values.returnType);
  const bothLoadAndWeigh =
    values.loadArrivalNumber.trim() !== '' && values.weighSlipNumber.trim() !== '';

  const handleReturnType = (value: ReturnTypeLabel) => {
    if (onReturnTypeChange) {
      onReturnTypeChange(value);
    } else {
      onChange('returnType', value);
    }
  };

  // Reports the raw input value for a field; the parent narrows it back to the field's type.
  const change = (field: SummaryCheckScaleHeaderField) => (e: FieldChangeEvent) =>
    onChange(field, e.target.value);

  return (
    <Grid className="scs__form__grid">
      <Column lg={8} md={8} sm={4}>
        <RadioButtonGroup
          legendText={requiredLabel('Return Type', REQUIRED_CLASS)}
          aria-label="Return Type"
          name="returnType"
          valueSelected={values.returnType}
          onChange={(value: unknown) => handleReturnType(value as ReturnTypeLabel)}
          disabled={returnTypeLocked}
        >
          <RadioButton labelText="Log Tally" value="Log Tally" id="return-type-log-tally" />
          <RadioButton labelText="Sample Log Tally" value="Sample Log Tally" id="return-type-sample-log-tally" />
          <RadioButton
            labelText="Special Forest Product"
            value="Special Forest Product"
            id="return-type-special-forest-product"
          />
        </RadioButtonGroup>
        {showError('returnType') ? (
          <div className="summary-check-scale-form__field-error" role="alert">
            {errors.returnType}
          </div>
        ) : null}
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="check-scale-type"
          value={values.checkScaleType}
          onChange={change('checkScaleType')}
          labelText={requiredLabel('Check Scale Type', REQUIRED_CLASS)}
          invalid={showError('checkScaleType')}
          invalidText={errors.checkScaleType}
        >
          <SelectItem value="" text="Select" disabled />
          {checkScaleTypeOptions.map((option) => (
            <SelectItem
              key={option.code ?? ''}
              value={option.code ?? ''}
              text={option.description ?? option.code ?? ''}
            />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="check-scaler-licence"
          maxLength={4}
          value={values.checkScalerLicence}
          onChange={change('checkScalerLicence')}
          labelText={requiredLabel('Check Scaler Licence #', REQUIRED_CLASS)}
          invalid={showError('checkScalerLicence')}
          invalidText={errors.checkScalerLicence}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="original-scaler-licence"
          maxLength={4}
          value={values.originalScalerLicence}
          onChange={change('originalScalerLicence')}
          labelText={requiredLabel('Original Scaler Licence #', REQUIRED_CLASS)}
          invalid={showError('originalScalerLicence')}
          invalidText={errors.originalScalerLicence}
        />
      </Column>

      <Column lg={16} md={8} sm={4}>
        <div className="summary-check-scale-form__load-or-weigh">
          <TextInput
            id="load-arrival-number"
          maxLength={10}
            value={values.loadArrivalNumber}
            onChange={change('loadArrivalNumber')}
            labelText="Load Arrival #"
            invalid={bothLoadAndWeigh || showError('loadArrivalNumber')}
            invalidText={
              bothLoadAndWeigh ? 'Enter only one of Load Arrival # or Weigh Slip #.' : errors.loadArrivalNumber
            }
          />
          <span className="summary-check-scale-form__or">{requiredLabel('Or', REQUIRED_CLASS)}</span>
          <TextInput
            id="weigh-slip-number"
          maxLength={10}
            value={values.weighSlipNumber}
            onChange={change('weighSlipNumber')}
            labelText="Weigh Slip #"
            invalid={bothLoadAndWeigh || showError('weighSlipNumber')}
            invalidText={
              bothLoadAndWeigh ? 'Enter only one of Load Arrival # or Weigh Slip #.' : errors.weighSlipNumber
            }
          />
        </div>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="timber-mark"
          maxLength={6}
          value={values.timberMark}
          onChange={change('timberMark')}
          labelText={requiredLabel('Timber Mark', REQUIRED_CLASS)}
          invalid={showError('timberMark')}
          invalidText={errors.timberMark}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="scale-site-number"
          maxLength={4}
          value={values.scaleSiteNumber}
          onChange={change('scaleSiteNumber')}
          labelText={requiredLabel('Scale Site #', REQUIRED_CLASS)}
          invalid={showError('scaleSiteNumber')}
          invalidText={errors.scaleSiteNumber}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="followed-good-practices"
          value={values.followedGoodPractices}
          onChange={change('followedGoodPractices')}
          labelText={requiredLabel('Followed Good Practices?', REQUIRED_CLASS)}
          invalid={showError('followedGoodPractices')}
          invalidText={errors.followedGoodPractices}
        >
          <SelectItem value="" text="Select" disabled />
          <SelectItem value="Yes" text="Yes" />
          <SelectItem value="No" text="No" />
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="original-within-standard"
          value={values.originalWithinStandard}
          onChange={change('originalWithinStandard')}
          labelText={requiredLabel('Original within Standard?', REQUIRED_CLASS)}
          invalid={showError('originalWithinStandard')}
          invalidText={errors.originalWithinStandard}
        >
          <SelectItem value="" text="Select" disabled />
          <SelectItem value="Yes" text="Yes" />
          <SelectItem value="No" text="No" />
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="check-replaces-original"
          value={values.checkReplacesOriginal}
          onChange={change('checkReplacesOriginal')}
          labelText={requiredLabel('Check Replaces Original?', REQUIRED_CLASS)}
          invalid={showError('checkReplacesOriginal')}
          invalidText={errors.checkReplacesOriginal}
        >
          <SelectItem value="" text="Select" disabled />
          <SelectItem value="Yes" text="Yes" />
          <SelectItem value="No" text="No" />
        </Select>
      </Column>

      {partialVisible ? (
        <Column lg={8} md={8} sm={4}>
          <Select
            id="partial-load"
            value={values.partialLoad}
            onChange={change('partialLoad')}
            labelText={requiredLabel('Partial Load?', REQUIRED_CLASS)}
            invalid={showError('partialLoad')}
            invalidText={errors.partialLoad}
          >
            <SelectItem value="" text="Select" disabled />
            <SelectItem value="Yes" text="Yes" />
            <SelectItem value="No" text="No" />
          </Select>
        </Column>
      ) : null}

      <Column lg={16} md={8} sm={4}>
        <div className="summary-check-scale-form__matrix" aria-label="Date of Scale and Scale Return matrix">
          <Table size="md" useZebraStyles={false}>
            <TableHead>
              <TableRow>
                <TableHeader scope="col" />
                <TableHeader scope="col">Original Scale</TableHeader>
                <TableHeader scope="col">Check Scale</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableHeader scope="row">{requiredLabel('Date of Scale', REQUIRED_CLASS)}</TableHeader>
                <TableCell>
                  <DateInput
                    id="original-date-of-scale"
                    value={values.originalDateOfScale}
                    onChange={(value) => onChange('originalDateOfScale', value)}
                    ariaLabel="Original Date of Scale"
                    labelText=""
                    hideLabel
                    invalid={showError('originalDateOfScale')}
                    invalidText={errors.originalDateOfScale}
                  />
                </TableCell>
                <TableCell>
                  <DateInput
                    id="check-date-of-scale"
                    value={values.checkDateOfScale}
                    onChange={(value) => onChange('checkDateOfScale', value)}
                    ariaLabel="Check Date of Scale"
                    labelText=""
                    hideLabel
                    invalid={showError('checkDateOfScale')}
                    invalidText={errors.checkDateOfScale}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableHeader scope="row">{requiredLabel('Scale Return #', REQUIRED_CLASS)}</TableHeader>
                <TableCell>
                  <TextInput
                    id="original-scale-return"
                    maxLength={4}
                    value={values.originalScaleReturn}
                    onChange={change('originalScaleReturn')}
                    labelText=""
                    aria-label="Original Scale Return"
                    invalid={showError('originalScaleReturn')}
                    invalidText={errors.originalScaleReturn}
                  />
                </TableCell>
                <TableCell>
                  <TextInput
                    id="check-scale-return"
                    maxLength={4}
                    value={values.checkScaleReturn}
                    onChange={change('checkScaleReturn')}
                    labelText=""
                    aria-label="Check Scale Return"
                    invalid={showError('checkScaleReturn')}
                    invalidText={errors.checkScaleReturn}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Column>

      <Column lg={16} md={8} sm={4}>
        <TextArea
          id="check-scaler-comment"
          value={values.checkScalerComment}
          onChange={change('checkScalerComment')}
          labelText="Check Scaler Comment"
          rows={5}
          maxLength={4000}
          invalid={showError('checkScalerComment')}
          invalidText={errors.checkScalerComment}
        />
      </Column>
    </Grid>
  );
};

export default SummaryCheckScaleForm;
