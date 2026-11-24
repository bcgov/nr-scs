import { describe, expect, it } from 'vitest';

import type { CheckScaleApiModel } from '@/services/checkScales.service';
import type { StaticLov } from '@/services/lov.service';

import {
  asString,
  buildSpeciesRows,
  buildSpeciesTotals,
  formatDecimal,
  toNumberOrNull,
  ynToDisplay,
} from './checkScaleViewModel';

const speciesLov = [{ code: 'FI', description: 'Fir' }] as StaticLov[];
const gradeLov = [{ code: 'G1', description: 'Grade 1' }] as StaticLov[];
const productLov = [{ code: 'LG', description: 'Logs' }] as StaticLov[];

describe('asString', () => {
  it('renders null and undefined as empty rather than "null"', () => {
    expect(asString(null)).toBe('');
    expect(asString(undefined)).toBe('');
  });

  it('stringifies everything else, including zero and false', () => {
    expect(asString(0)).toBe('0');
    expect(asString(false)).toBe('false');
    expect(asString('x')).toBe('x');
  });
});

describe('ynToDisplay', () => {
  it('maps the stored indicator to words', () => {
    expect(ynToDisplay('Y')).toBe('Yes');
    expect(ynToDisplay('N')).toBe('No');
  });

  it('renders anything else as blank rather than guessing', () => {
    expect(ynToDisplay('')).toBe('');
    expect(ynToDisplay(null)).toBe('');
    expect(ynToDisplay(undefined)).toBe('');
    expect(ynToDisplay('y')).toBe('');
  });
});

describe('toNumberOrNull', () => {
  it('parses numeric strings and numbers', () => {
    expect(toNumberOrNull('12.5')).toBe(12.5);
    expect(toNumberOrNull(3)).toBe(3);
  });

  it('preserves zero rather than collapsing it to null', () => {
    expect(toNumberOrNull(0)).toBe(0);
    expect(toNumberOrNull('0')).toBe(0);
  });

  it('returns null for blank and unparseable input', () => {
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
    expect(toNumberOrNull('abc')).toBeNull();
    expect(toNumberOrNull(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('formatDecimal', () => {
  it('fixes to the requested places', () => {
    expect(formatDecimal(1.005, 2)).toBe('1.00');
    expect(formatDecimal(2, 1)).toBe('2.0');
  });

  it('renders a missing value as blank, not 0.00', () => {
    expect(formatDecimal(null, 2)).toBe('');
    expect(formatDecimal(undefined, 2)).toBe('');
  });
});

describe('buildSpeciesRows', () => {
  const summary = [
    {
      speciesCode: 'FI',
      speciesGrade: 'G1',
      productCode: 'LG',
      orgPieces: 10,
      orgNetVolume: 1.25,
      orgNetValue: 100.5,
      chkPieces: 9,
      chkNetVolume: 1.2,
      chkNetValue: 99,
    },
  ] as CheckScaleApiModel['speciesSummary'];

  it('describes each code through its LOV', () => {
    const [row] = buildSpeciesRows(summary, speciesLov, gradeLov, productLov);

    expect(row.species).toBe('Fir');
    expect(row.speciesGrade).toBe('Grade 1');
    expect(row.productCode).toBe('Logs');
  });

  it('falls back to the raw code when the LOV has no description', () => {
    const [row] = buildSpeciesRows(summary, [], [], []);

    expect(row.species).toBe('FI');
  });

  it('keeps the stored volume precision (legacy 0.0##) and formats value to two', () => {
    const [row] = buildSpeciesRows(summary, speciesLov, gradeLov, productLov);

    expect(row.orgNetVolume).toBe('1.25');
    expect(row.orgNetValue).toBe('100.50');
    expect(row.chkNetVolume).toBe('1.2');
    expect(row.chkNetValue).toBe('99.00');
  });

  it('shows all three stored decimals rather than rounding to one', () => {
    const [row] = buildSpeciesRows(
      [{ speciesCode: 'FI', orgNetVolume: 20.845, chkNetVolume: 1234.567 }] as CheckScaleApiModel['speciesSummary'],
      speciesLov,
      gradeLov,
      productLov,
    );

    expect(row.orgNetVolume).toBe('20.845');
    // No grouping separator, matching the legacy DecimalFormat pattern.
    expect(row.chkNetVolume).toBe('1234.567');
  });

  it('keeps nulls null rather than formatting them as zero', () => {
    const [row] = buildSpeciesRows(
      [{ speciesCode: 'FI', orgNetVolume: null, orgNetValue: null }] as CheckScaleApiModel['speciesSummary'],
      speciesLov,
      gradeLov,
      productLov,
    );

    expect(row.orgNetVolume).toBeNull();
    expect(row.orgNetValue).toBeNull();
  });

  it('gives every row a distinct key, including rows with the same codes', () => {
    const duplicated = [
      { speciesCode: 'FI', speciesGrade: 'G1', productCode: 'LG' },
      { speciesCode: 'FI', speciesGrade: 'G1', productCode: 'LG' },
    ] as CheckScaleApiModel['speciesSummary'];

    const ids = buildSpeciesRows(duplicated, speciesLov, gradeLov, productLov).map((r) => r.id);

    expect(new Set(ids).size).toBe(2);
  });

  it('marks missing codes as UNK in the key rather than producing undefined', () => {
    const [row] = buildSpeciesRows(
      [{}] as CheckScaleApiModel['speciesSummary'],
      speciesLov,
      gradeLov,
      productLov,
    );

    expect(row.id).toBe('UNK-UNK-UNK-0');
  });

  it('returns an empty list for a missing summary', () => {
    expect(buildSpeciesRows(undefined, speciesLov, gradeLov, productLov)).toEqual([]);
  });
});

describe('buildSpeciesTotals', () => {
  it('sums pieces as integers, keeps volume precision and formats value to 2 places', () => {
    const totals = buildSpeciesTotals([
      { orgPieces: 10, orgNetVolume: 1.25, orgNetValue: 100.5, chkPieces: 9, chkNetVolume: 1.2, chkNetValue: 99 },
      { orgPieces: 5, orgNetVolume: 0.75, orgNetValue: 10, chkPieces: 4, chkNetVolume: 0.8, chkNetValue: 1 },
    ] as CheckScaleApiModel['speciesSummary']);

    expect(totals.orgPieces).toBe(15);
    expect(totals.orgNetVolume).toBe('2.0');
    expect(totals.orgNetValue).toBe('110.50');
    expect(totals.chkPieces).toBe(13);
    expect(totals.chkNetVolume).toBe('2.0');
    expect(totals.chkNetValue).toBe('100.00');
  });

  it('treats null and unparseable entries as zero rather than producing NaN', () => {
    const totals = buildSpeciesTotals([
      { orgPieces: null, orgNetVolume: undefined, orgNetValue: 'abc' as never },
      { orgPieces: 2 },
    ] as CheckScaleApiModel['speciesSummary']);

    expect(totals.orgPieces).toBe(2);
    expect(totals.orgNetVolume).toBe('0.0');
    expect(totals.orgNetValue).toBe('0.00');
  });

  it('keeps three stored decimals, and rounds a floating-point sum rather than leaking the artifact', () => {
    expect(
      buildSpeciesTotals([
        { orgNetVolume: 20.845 },
        { orgNetVolume: 3.1 },
      ] as CheckScaleApiModel['speciesSummary']).orgNetVolume,
    ).toBe('23.945');

    // 0.1 + 0.2 === 0.30000000000000004 in IEEE-754.
    expect(
      buildSpeciesTotals([
        { orgNetVolume: 0.1 },
        { orgNetVolume: 0.2 },
      ] as CheckScaleApiModel['speciesSummary']).orgNetVolume,
    ).toBe('0.3');
  });

  it('returns zeroed totals for a missing summary', () => {
    const totals = buildSpeciesTotals(undefined);

    expect(totals.orgPieces).toBe(0);
    expect(totals.chkNetValue).toBe('0.00');
  });
});
