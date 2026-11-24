import { describe, expect, it } from 'vitest';

import { buildScaleSiteSiteTypeDisplayRows, firstErrorMessage, formatCoordinate, formatOwnerClientDisplay } from './utils';

describe('formatOwnerClientDisplay', () => {
  it('shows whichever parts are known', () => {
    expect(formatOwnerClientDisplay(' 00012345 ', ' 01 ')).toBe('00012345 / 01');
    expect(formatOwnerClientDisplay('00012345', '')).toBe('00012345');
    expect(formatOwnerClientDisplay(null, '02')).toBe('02');
    expect(formatOwnerClientDisplay('  ', undefined)).toBe('—');
  });
});

describe('formatCoordinate', () => {
  it('joins the parts that are present and dashes an empty coordinate', () => {
    expect(formatCoordinate(null, null, undefined)).toBe('—');
    expect(formatCoordinate(49, 10, 5)).toBe('49° 10′ 5″');
    expect(formatCoordinate(49)).toBe('49°');
    expect(formatCoordinate(null, 10)).toBe('10′');
    expect(formatCoordinate(undefined, undefined, 0)).toBe('0″');
  });
});

describe('firstErrorMessage', () => {
  it('returns the first message it finds, else the generic text', () => {
    expect(firstErrorMessage(null, new Error(''), new Error('Second'), new Error('Third'))).toBe('Second');
    expect(firstErrorMessage(undefined, null)).toBe('The scale site record could not be retrieved.');
  });
});

describe('buildScaleSiteSiteTypeDisplayRows', () => {
  it('accepts numeric priority codes and falls back to the raw method code', () => {
    const rows = buildScaleSiteSiteTypeDisplayRows(
      [
        { priorityCode: '1', scaleMethodTypeCode: 'wt' },
        { priorityCode: ' 3 ', scaleMethodTypeCode: 'ZZ' },
        { priorityCode: 'Q', scaleMethodTypeCode: 'IGNORED' },
      ] as never,
      [{ code: '1', description: 'First priority' }, { code: 'S', description: '  ' }] as never,
      [{ code: 'WT', description: 'Weight' }] as never,
    );

    expect(rows.map((r) => r.slot)).toEqual(['PRIMARY', 'SECONDARY', 'TERTIARY']);
    expect(rows[0]).toMatchObject({ priorityCode: '1', priorityDescription: 'First priority', scaleMethodTypeCode: 'WT', scaleMethodTypeDescription: 'Weight' });
    expect(rows[1]).toMatchObject({ priorityCode: 'S', priorityDescription: 'Secondary', scaleMethodTypeCode: '', scaleMethodTypeDescription: '' });
    expect(rows[2]).toMatchObject({ priorityCode: '3', priorityDescription: 'Tertiary', scaleMethodTypeCode: 'ZZ', scaleMethodTypeDescription: 'ZZ' });
  });

  it('copes with nothing at all', () => {
    const rows = buildScaleSiteSiteTypeDisplayRows(null, null, null);
    expect(rows.map((r) => r.priorityDescription)).toEqual(['Primary', 'Secondary', 'Tertiary']);
  });
});
