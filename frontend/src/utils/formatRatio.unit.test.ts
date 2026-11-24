import { describe, expect, it } from 'vitest';

import { formatRatio } from './formatRatio';

describe('formatRatio', () => {
  it('joins a value and its total', () => {
    expect(formatRatio(4, 10)).toBe('4 / 10');
  });

  it('drops the total when it is missing', () => {
    expect(formatRatio(4, null)).toBe('4');
    expect(formatRatio(4, undefined)).toBe('4');
  });

  it('renders a missing value as an empty left-hand side', () => {
    expect(formatRatio(null, null)).toBe('');
    expect(formatRatio(undefined, 10)).toBe('/ 10');
  });
});
