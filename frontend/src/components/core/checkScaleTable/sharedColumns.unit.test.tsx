import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';

import {
  CHECK_SCALE_NUMERIC_SORT_KEYS,
  checkScaleTypeLabel,
  checkScaleVarianceColumns,
  licenceColumn,
  type CheckScaleVarianceRow,
} from './sharedColumns';

const row: CheckScaleVarianceRow = {
  checkScaleId: 42,
  primOrigLicenceNo: 'A1234',
  primCheckLicenceNo: 'B5678',
  origScaleDate: '2026-01-01',
  checkScaleDate: '2026-01-05',
  pieceDiff: 3,
  volumeVariance: 1.5,
  valueVariance: -2,
  replacedInd: 'Y',
  checkScaleTypeCode: 'FUL',
  followedGoodPracticeInd: 'N',
  originalWithinStandardInd: 'Y',
};

const headerFor = (key: string) => {
  const column = checkScaleVarianceColumns<CheckScaleVarianceRow>(checkScaleTypeLabel(new Map()))
    .find((c) => c.key === key);
  if (!column) {
    throw new Error(`no shared column for ${key}`);
  }
  return column;
};

describe('checkScaleTypeLabel', () => {
  const descriptions = new Map([['FUL', 'Full Scale']]);

  it('resolves a known code to its description', () => {
    expect(checkScaleTypeLabel(descriptions)('FUL')).toBe('Full Scale');
  });

  it('falls back to the raw code when the description is unknown', () => {
    expect(checkScaleTypeLabel(descriptions)('XYZ')).toBe('XYZ');
  });

  it('trims before looking up, so padded codes still resolve', () => {
    expect(checkScaleTypeLabel(descriptions)('  FUL  ')).toBe('Full Scale');
  });

  it('renders an em dash for a blank or missing code', () => {
    expect(checkScaleTypeLabel(descriptions)('')).toBe('—');
    expect(checkScaleTypeLabel(descriptions)('   ')).toBe('—');
    expect(checkScaleTypeLabel(descriptions)(null)).toBe('—');
    expect(checkScaleTypeLabel(descriptions)(undefined)).toBe('—');
  });
});

describe('CHECK_SCALE_NUMERIC_SORT_KEYS', () => {
  it('marks exactly the numeric columns, so the rest sort as text', () => {
    expect([...CHECK_SCALE_NUMERIC_SORT_KEYS].sort()).toEqual([
      'checkScaleId',
      'pieceDiff',
      'valueVariance',
      'volumeVariance',
    ]);
  });
});

describe('licenceColumn', () => {
  it('renders the picked licence number as a scaler link', () => {
    const column = licenceColumn<CheckScaleVarianceRow>(
      'primOrigLicenceNo',
      'Primary Licence #',
      (r) => r?.primOrigLicenceNo,
    );

    expect(column.header).toBe('Primary Licence #');
    expect(column.sortable).toBe(true);

    renderWithProviders(<>{column.renderAs?.(undefined, row)}</>);

    expect(screen.getByText('A1234')).toBeInTheDocument();
  });
});

describe('checkScaleVarianceColumns', () => {
  it('returns the nine shared columns in their legacy order', () => {
    const columns = checkScaleVarianceColumns<CheckScaleVarianceRow>(checkScaleTypeLabel(new Map()));

    expect(columns.map((c) => c.header)).toEqual([
      'Original Scale Date',
      'Check Scale Date',
      'Piece Diff.',
      'Volume Variance %',
      'Value Variance %',
      'Replaced?',
      'Check Scale Type',
      'Good Practices?',
      'Within Standard?',
    ]);
  });

  it('renders Y/N indicators as words', () => {
    expect(headerFor('replacedInd').renderAs?.(undefined, row)).toBe('Yes');
    expect(headerFor('followedGoodPracticeInd').renderAs?.(undefined, row)).toBe('No');
  });

  it('formats the variance columns rather than printing raw numbers', () => {
    expect(String(headerFor('volumeVariance').renderAs?.(undefined, row))).toContain('1.5');
    expect(String(headerFor('valueVariance').renderAs?.(undefined, row))).toContain('2');
  });

  it('routes the type column through the supplied label resolver', () => {
    const columns = checkScaleVarianceColumns<CheckScaleVarianceRow>(
      checkScaleTypeLabel(new Map([['FUL', 'Full Scale']])),
    );
    const typeColumn = columns.find((c) => c.key === 'checkScaleTypeCode');

    expect(typeColumn?.renderAs?.(undefined, row)).toBe('Full Scale');
  });

  it('survives a row with nothing populated', () => {
    const empty = {} as CheckScaleVarianceRow;

    for (const column of checkScaleVarianceColumns<CheckScaleVarianceRow>(
      checkScaleTypeLabel(new Map()),
    )) {
      expect(() => column.renderAs?.(undefined, empty)).not.toThrow();
    }
  });
});
