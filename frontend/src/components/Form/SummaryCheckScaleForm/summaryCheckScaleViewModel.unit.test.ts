import { describe, expect, it } from 'vitest';

import type { SpeciesProductGradeXref, StaticLov } from '@/services/lov.service';
import {
  buildSpeciesXrefIndex,
  buildSpgRowRequest,
  filterGradeOptions,
  filterProductOptions,
  nextSpgRowAfterChange,
  validateHeader,
  validateSpgRow,
  EMPTY_HEADER_VALUES,
  EMPTY_SPG_ROW,
} from './summaryCheckScaleViewModel';

const lov = (code: string): StaticLov => ({ code, description: `${code} desc` });

// FIR: XM (grades 1,2) + BG (no grade); PINE: XM (grade 3); CEDAR: SH (no grade).
// Blank/sentinel cells exercise the `" "`/`""` handling.
const XREF: SpeciesProductGradeXref[] = [
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '1' },
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '2' },
  { scaleSpeciesCode: 'FIR', scaleProductCode: 'BG', scaleGradeCode: ' ' },
  { scaleSpeciesCode: 'PINE', scaleProductCode: 'XM', scaleGradeCode: '3' },
  { scaleSpeciesCode: 'CEDAR', scaleProductCode: 'SH', scaleGradeCode: '' },
  { scaleSpeciesCode: '', scaleProductCode: 'XM', scaleGradeCode: '9' }, // blank species: ignored
];

const PRODUCT_LOV = [lov('XM'), lov('BG'), lov('SH'), lov('ZZ')];
const GRADE_LOV = [lov('1'), lov('2'), lov('3'), lov('9')];

const codes = (options: StaticLov[]): (string | null | undefined)[] => options.map((o) => o.code);

describe('buildSpeciesXrefIndex', () => {
  const index = buildSpeciesXrefIndex(XREF);

  it('buckets products by species, ignoring blank products and blank species', () => {
    expect([...(index.productsBySpecies.get('FIR') ?? [])].sort()).toEqual(['BG', 'XM']);
    expect([...(index.productsBySpecies.get('PINE') ?? [])]).toEqual(['XM']);
    expect([...(index.productsBySpecies.get('CEDAR') ?? [])]).toEqual(['SH']);
    expect(index.productsBySpecies.has('')).toBe(false);
  });

  it('buckets grades by species across any product, treating " "/"" as no value', () => {
    expect([...(index.gradesBySpecies.get('FIR') ?? [])].sort()).toEqual(['1', '2']);
    expect([...(index.gradesBySpecies.get('PINE') ?? [])]).toEqual(['3']);
    // CEDAR's only row has a blank grade => no grade bucket entry.
    expect(index.gradesBySpecies.get('CEDAR')).toBeUndefined();
  });

  it('buckets XM grades separately for the SFP/XM path', () => {
    expect([...(index.xmGradesBySpecies.get('FIR') ?? [])].sort()).toEqual(['1', '2']);
    expect([...(index.xmGradesBySpecies.get('PINE') ?? [])]).toEqual(['3']);
    expect(index.xmGradesBySpecies.has('CEDAR')).toBe(false);
  });

  it('returns empty maps for null/empty input', () => {
    const empty = buildSpeciesXrefIndex(null);
    expect(empty.productsBySpecies.size).toBe(0);
    expect(empty.gradesBySpecies.size).toBe(0);
    expect(empty.xmGradesBySpecies.size).toBe(0);
  });
});

describe('filterProductOptions', () => {
  const index = buildSpeciesXrefIndex(XREF);

  it('narrows products to those valid for the species', () => {
    expect(codes(filterProductOptions(PRODUCT_LOV, index, 'FIR'))).toEqual(['XM', 'BG']);
    expect(codes(filterProductOptions(PRODUCT_LOV, index, 'CEDAR'))).toEqual(['SH']);
  });

  it('returns the full list when no species is selected (Product is disabled anyway)', () => {
    expect(codes(filterProductOptions(PRODUCT_LOV, index, ''))).toEqual(['XM', 'BG', 'SH', 'ZZ']);
  });

  it('returns an empty list for a species with no valid products', () => {
    expect(filterProductOptions(PRODUCT_LOV, index, 'UNKNOWN')).toEqual([]);
  });
});

describe('filterGradeOptions', () => {
  const index = buildSpeciesXrefIndex(XREF);

  it('SFP + XM: narrows to the species XM grades', () => {
    expect(codes(filterGradeOptions(GRADE_LOV, index, 'Special Forest Product', 'FIR', 'XM'))).toEqual(['1', '2']);
    expect(codes(filterGradeOptions(GRADE_LOV, index, 'Special Forest Product', 'PINE', 'XM'))).toEqual(['3']);
  });

  it('SFP + non-XM product: leaves the list untouched (Grade is disabled)', () => {
    expect(codes(filterGradeOptions(GRADE_LOV, index, 'Special Forest Product', 'FIR', 'BG'))).toEqual([
      '1',
      '2',
      '3',
      '9',
    ]);
  });

  it('LT/SLT: narrows to the species grades (any product)', () => {
    expect(codes(filterGradeOptions(GRADE_LOV, index, 'Log Tally', 'FIR', ''))).toEqual(['1', '2']);
    expect(codes(filterGradeOptions(GRADE_LOV, index, 'Sample Log Tally', 'PINE', ''))).toEqual(['3']);
  });

  it('returns the full list when no species is selected', () => {
    expect(codes(filterGradeOptions(GRADE_LOV, index, 'Log Tally', '', ''))).toEqual(['1', '2', '3', '9']);
  });
});

describe('nextSpgRowAfterChange', () => {
  const base = { ...EMPTY_SPG_ROW, speciesCode: 'FIR', productCode: 'XM', gradeCode: '1' };

  it('clears Product and Grade when Species changes', () => {
    const next = nextSpgRowAfterChange(base, 'speciesCode', 'PINE', 'Special Forest Product');
    expect(next).toMatchObject({ speciesCode: 'PINE', productCode: '', gradeCode: '' });
  });

  it('clears Grade when an SFP product changes away from XM', () => {
    const next = nextSpgRowAfterChange(base, 'productCode', 'BG', 'Special Forest Product');
    expect(next).toMatchObject({ productCode: 'BG', gradeCode: '' });
  });

  it('keeps Grade when the SFP product is XM', () => {
    const next = nextSpgRowAfterChange(base, 'productCode', 'XM', 'Special Forest Product');
    expect(next.gradeCode).toBe('1');
  });

  it('does not clear Grade on a product change for LT/SLT (product is not used)', () => {
    const next = nextSpgRowAfterChange(base, 'productCode', 'BG', 'Log Tally');
    expect(next.gradeCode).toBe('1');
  });

  it('leaves species/product/grade alone when an unrelated field changes', () => {
    const next = nextSpgRowAfterChange(base, 'originalPieces', '5', 'Special Forest Product');
    expect(next).toMatchObject({ speciesCode: 'FIR', productCode: 'XM', gradeCode: '1', originalPieces: '5' });
  });
});

describe('validateSpgRow numeric precision (legacy OAValidator.checkPrecision parity)', () => {
  // A complete, valid Log Tally row (grade required, product unused) to vary one field at a time.
  const validRow = {
    speciesCode: 'FIR',
    productCode: '',
    gradeCode: '1',
    originalPieces: '10',
    checkPieces: '9',
    originalNetVolume: '12.345',
    checkNetVolume: '11.5',
    originalNetValue: '100.50',
    checkNetValue: '95.00',
  };
  const run = (overrides: Partial<typeof validRow>) =>
    validateSpgRow('Log Tally', { ...validRow, ...overrides });

  it('accepts net volume within NUMBER(7,3) and net value within NUMBER(8,2)', () => {
    const result = run({ originalNetVolume: '1234.567', originalNetValue: '123456.78' });
    expect(result.ok).toBe(true);
  });

  it('rejects pieces with a decimal (integer-only)', () => {
    expect(run({ originalPieces: '10.5' }).errors.originalPieces).toBe('Original Pieces must be an integer.');
  });

  it('rejects net volume with more than 3 decimals', () => {
    expect(run({ checkNetVolume: '1.2345' }).errors.checkNetVolume).toBe(
      'Check Scale Net Volume is too long. Please shorten to 4 digits before the decimal place, and 3 after.',
    );
  });

  it('rejects net volume with more than 4 digits before the decimal', () => {
    expect(run({ originalNetVolume: '12345.6' }).errors.originalNetVolume).toBe(
      'Original Net Volume is too long. Please shorten to 4 digits before the decimal place, and 3 after.',
    );
  });

  it('rejects net value with more than 2 decimals', () => {
    expect(run({ originalNetValue: '10.123' }).errors.originalNetValue).toBe(
      'Original Net Value is too long. Please shorten to 6 digits before the decimal place, and 2 after.',
    );
  });

  it('rejects net value with more than 6 digits before the decimal', () => {
    expect(run({ checkNetValue: '1234567.8' }).errors.checkNetValue).toBe(
      'Check Scale Net Value is too long. Please shorten to 6 digits before the decimal place, and 2 after.',
    );
  });

  it('still flags a non-numeric value before precision', () => {
    expect(run({ originalNetValue: 'abc' }).errors.originalNetValue).toBe('Original Net Value must be a number.');
  });
});

describe('validateHeader future-date rule', () => {
  it('flags future original/check dates inline on the date fields', () => {
    const errors = validateHeader({
      ...EMPTY_HEADER_VALUES,
      originalDateOfScale: '9999-01-01',
      checkDateOfScale: '9999-01-02',
    }).errors;
    expect(errors.originalDateOfScale).toBe('Scale dates cannot be in the future.');
    expect(errors.checkDateOfScale).toBe('Scale dates cannot be in the future.');
  });

  it('does not flag past dates', () => {
    const errors = validateHeader({
      ...EMPTY_HEADER_VALUES,
      originalDateOfScale: '2020-01-01',
      checkDateOfScale: '2020-01-02',
    }).errors;
    expect(errors.originalDateOfScale).toBeUndefined();
    expect(errors.checkDateOfScale).toBeUndefined();
  });
});

describe('buildSpgRowRequest', () => {
  const filledRow = {
    speciesCode: 'FIR',
    productCode: 'XM',
    gradeCode: '1',
    originalPieces: '10',
    checkPieces: '9',
    originalNetVolume: '12.5',
    checkNetVolume: '11.5',
    originalNetValue: '100.50',
    checkNetValue: '95.00',
  };

  it('coerces the numeric fields and keeps product + grade for SFP + XM', () => {
    const request = buildSpgRowRequest('Special Forest Product', filledRow);
    expect(request).toEqual({
      scaleSpeciesCode: 'FIR',
      scaleProductCode: 'XM',
      scaleGradeCode: '1',
      originalScalePieceCnt: 10,
      originalScaleNetVolume: 12.5,
      originalScaleNetValue: 100.5,
      checkScalePieceCnt: 9,
      checkScaleNetVolume: 11.5,
      checkScaleNetValue: 95,
    });
  });

  it('blanks grade for an SFP non-XM product', () => {
    const request = buildSpgRowRequest('Special Forest Product', { ...filledRow, productCode: 'BG' });
    expect(request.scaleProductCode).toBe('BG');
    expect(request.scaleGradeCode).toBeNull();
  });

  it('blanks product for LT/SLT but keeps grade', () => {
    const request = buildSpgRowRequest('Log Tally', { ...filledRow, productCode: '' });
    expect(request.scaleProductCode).toBeNull();
    expect(request.scaleGradeCode).toBe('1');
  });
});
