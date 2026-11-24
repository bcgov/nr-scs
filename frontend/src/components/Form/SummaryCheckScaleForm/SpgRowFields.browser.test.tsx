import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SpeciesProductGradeXref, StaticLov } from '@/services/lov.service';
import SpgRowFields from './SpgRowFields';
import { EMPTY_SPG_ROW, type SummaryCheckScaleSpgRowValues } from './summaryCheckScaleViewModel';

const lov = (code: string): StaticLov => ({ code, description: `${code} desc` });

const XREF: SpeciesProductGradeXref[] = [
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '1' },
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '2' },
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'BG', scaleGradeCode: ' ' },
];

const SPECIES_LOV = [lov('FIR'), lov('PINE')];
const PRODUCT_LOV = [lov('XM'), lov('BG'), lov('ZZ')];
const GRADE_LOV = [lov('1'), lov('2'), lov('9')];

const renderFields = (
  returnType: 'Special Forest Product' | 'Log Tally',
  values: Partial<SummaryCheckScaleSpgRowValues>,
) =>
  render(
    <SpgRowFields
      values={{ ...EMPTY_SPG_ROW, ...values }}
      onChange={vi.fn()}
      errors={{}}
      showErrors={false}
      returnType={returnType}
      speciesLov={SPECIES_LOV}
      productLov={PRODUCT_LOV}
      gradeLov={GRADE_LOV}
      xref={XREF}
    />,
  );

const optionValues = (name: RegExp) =>
  within(screen.getByRole('combobox', { name })).getAllByRole('option').map((o) => o.getAttribute('value'));

afterEach(() => cleanup());

describe('SpgRowFields species filtering', () => {
  it('disables Product until a species is chosen (SFP)', () => {
    renderFields('Special Forest Product', { speciesCode: '' });
    expect(screen.getByRole('combobox', { name: /Product/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Grade/ })).toBeDisabled();
  });

  it('narrows Product options to the selected species (SFP)', () => {
    renderFields('Special Forest Product', { speciesCode: 'FIR' });
    // leading blank option + the two products valid for FIR (ZZ filtered out).
    expect(optionValues(/Product/)).toEqual(['', 'XM', 'BG']);
    expect(screen.getByRole('combobox', { name: /Product/ })).toBeEnabled();
  });

  it('enables and filters Grade only when the SFP product is XM', () => {
    renderFields('Special Forest Product', { speciesCode: 'FIR', productCode: 'XM' });
    expect(screen.getByRole('combobox', { name: /Grade/ })).toBeEnabled();
    expect(optionValues(/Grade/)).toEqual(['', '1', '2']);
  });

  it('keeps Grade disabled for an SFP non-XM product', () => {
    renderFields('Special Forest Product', { speciesCode: 'FIR', productCode: 'BG' });
    expect(screen.getByRole('combobox', { name: /Grade/ })).toBeDisabled();
  });

  it('filters Grade by species directly for LT/SLT (no product step)', () => {
    renderFields('Log Tally', { speciesCode: 'FIR' });
    expect(screen.getByRole('combobox', { name: /Product/ })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Grade/ })).toBeEnabled();
    expect(optionValues(/Grade/)).toEqual(['', '1', '2']);
  });
});
