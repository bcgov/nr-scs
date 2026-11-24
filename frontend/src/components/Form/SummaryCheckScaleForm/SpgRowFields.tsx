import { Column, Grid, Select, SelectItem, TextInput } from '@carbon/react';
import { type ChangeEvent, type FC, type ReactNode, useMemo } from 'react';

import type { SpeciesProductGradeXref, StaticLov } from '@/services/lov.service';
import { requiredLabel } from '@/utils/requiredLabel';
import {
  buildSpeciesXrefIndex,
  codeDescLabel,
  filterGradeOptions,
  filterProductOptions,
  gradeEnabled as computeGradeEnabled,
  isSpecialForestProduct,
  productEnabled as computeProductEnabled,
  type ReturnTypeLabel,
  type SummaryCheckScaleSpgRowValues,
} from './summaryCheckScaleViewModel';

const REQUIRED_CLASS = 'summary-check-scale-form__required';

type FieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement>;

export interface SpgRowFieldsProps {
  values: SummaryCheckScaleSpgRowValues;
  onChange: (field: keyof SummaryCheckScaleSpgRowValues, value: string) => void;
  errors: Record<string, string>;
  /** Whether to surface field errors (typically submit/add attempted). */
  showErrors: boolean;
  returnType: ReturnTypeLabel;
  speciesLov: StaticLov[];
  productLov: StaticLov[];
  gradeLov: StaticLov[];
  /** Valid species/product/grade combinations; narrows Product/Grade options. */
  xref: SpeciesProductGradeXref[];
  /** Optional action (e.g. the Update page's Add button) rendered inline after the last field. */
  action?: ReactNode;
}

/**
 * The species/product/grade roll-up input fields shared by the Create page (its single row) and the
 * Update page's add-row block. Owns the legacy species→product/grade gating; the parent owns the
 * value state, validation, and what to do on submit/add.
 */
const SpgRowFields: FC<SpgRowFieldsProps> = ({
  values,
  onChange,
  errors,
  showErrors,
  returnType,
  speciesLov,
  productLov,
  gradeLov,
  xref,
  action,
}) => {
  const sfp = isSpecialForestProduct(returnType);
  const productIsEnabled = computeProductEnabled(returnType, values.speciesCode);
  const gradeIsEnabled = computeGradeEnabled(returnType, values.speciesCode, values.productCode);
  const showError = (key: string) => showErrors && Boolean(errors[key]);

  // Narrow Product/Grade options to the combinations valid for the selected species (legacy filterDropList).
  const xrefIndex = useMemo(() => buildSpeciesXrefIndex(xref), [xref]);
  const productOptions = useMemo(
    () => filterProductOptions(productLov, xrefIndex, values.speciesCode),
    [productLov, xrefIndex, values.speciesCode],
  );
  const gradeOptions = useMemo(
    () => filterGradeOptions(gradeLov, xrefIndex, returnType, values.speciesCode, values.productCode),
    [gradeLov, xrefIndex, returnType, values.speciesCode, values.productCode],
  );

  return (
    <Grid className="scs__form__grid">
      <Column lg={8} md={8} sm={4}>
        <Select
          id="species"
          value={values.speciesCode}
          onChange={(e: FieldChangeEvent) => onChange('speciesCode', e.target.value)}
          labelText={requiredLabel('Species', REQUIRED_CLASS)}
          invalid={showError('speciesCode')}
          invalidText={errors.speciesCode}
        >
          <SelectItem value="" text="" />
          {speciesLov.map((option) => (
            <SelectItem key={option.code ?? ''} value={option.code ?? ''} text={codeDescLabel(option)} />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="product"
          value={values.productCode}
          onChange={(e: FieldChangeEvent) => onChange('productCode', e.target.value)}
          labelText={sfp ? requiredLabel('Product', REQUIRED_CLASS) : 'Product'}
          disabled={!productIsEnabled}
          invalid={showError('productCode')}
          invalidText={errors.productCode}
        >
          <SelectItem value="" text="" />
          {productOptions.map((option) => (
            <SelectItem key={option.code ?? ''} value={option.code ?? ''} text={codeDescLabel(option)} />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <Select
          id="grade"
          value={values.gradeCode}
          onChange={(e: FieldChangeEvent) => onChange('gradeCode', e.target.value)}
          labelText={gradeIsEnabled ? requiredLabel('Grade', REQUIRED_CLASS) : 'Grade'}
          disabled={!gradeIsEnabled}
          invalid={showError('gradeCode')}
          invalidText={errors.gradeCode}
        >
          <SelectItem value="" text="" />
          {gradeOptions.map((option) => (
            <SelectItem key={option.code ?? ''} value={option.code ?? ''} text={codeDescLabel(option)} />
          ))}
        </Select>
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="original-pieces"
          value={values.originalPieces}
          onChange={(e: FieldChangeEvent) => onChange('originalPieces', e.target.value)}
          labelText={requiredLabel('Original Pieces', REQUIRED_CLASS)}
          maxLength={4}          invalid={showError('originalPieces')}
          invalidText={errors.originalPieces}
        />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="check-pieces"
          value={values.checkPieces}
          onChange={(e: FieldChangeEvent) => onChange('checkPieces', e.target.value)}
          labelText={requiredLabel('Check Scale Pieces', REQUIRED_CLASS)}
          maxLength={4}          invalid={showError('checkPieces')}
          invalidText={errors.checkPieces}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="original-net-volume"
          value={values.originalNetVolume}
          onChange={(e: FieldChangeEvent) => onChange('originalNetVolume', e.target.value)}
          labelText={requiredLabel('Original Net Volume', REQUIRED_CLASS)}
          maxLength={8}          invalid={showError('originalNetVolume')}
          invalidText={errors.originalNetVolume}
        />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="check-net-volume"
          value={values.checkNetVolume}
          onChange={(e: FieldChangeEvent) => onChange('checkNetVolume', e.target.value)}
          labelText={requiredLabel('Check Scale Net Volume', REQUIRED_CLASS)}
          maxLength={8}          invalid={showError('checkNetVolume')}
          invalidText={errors.checkNetVolume}
        />
      </Column>

      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="original-net-value"
          value={values.originalNetValue}
          onChange={(e: FieldChangeEvent) => onChange('originalNetValue', e.target.value)}
          labelText={requiredLabel('Original Net Value', REQUIRED_CLASS)}
          maxLength={9}          invalid={showError('originalNetValue')}
          invalidText={errors.originalNetValue}
        />
      </Column>
      <Column lg={8} md={8} sm={4}>
        <TextInput
          id="check-net-value"
          value={values.checkNetValue}
          onChange={(e: FieldChangeEvent) => onChange('checkNetValue', e.target.value)}
          labelText={requiredLabel('Check Scale Net Value', REQUIRED_CLASS)}
          maxLength={9}          invalid={showError('checkNetValue')}
          invalidText={errors.checkNetValue}
        />
      </Column>

      {action ? (
        <Column lg={8} md={8} sm={4}>
          <div className="summary-check-scale-form__inline-action">{action}</div>
        </Column>
      ) : null}
    </Grid>
  );
};

export default SpgRowFields;
