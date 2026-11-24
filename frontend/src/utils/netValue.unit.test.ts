import { describe, expect, it } from 'vitest';

import { NET_VALUE_MAX_LENGTH, validateNetValue } from './netValue';

describe('validateNetValue', () => {
  it('reports empty as required', () => {
    expect(validateNetValue('Net Value', '')).toBe('Required.');
    expect(validateNetValue('Net Value', '   ')).toBe('Required.');
  });

  it('rejects non-numeric input', () => {
    expect(validateNetValue('Net Value', 'abc')).toContain('must be a number');
    expect(validateNetValue('Net Value', '1,234.5')).toContain('must be a number');
  });

  it('rejects too many digits before or after the decimal', () => {
    expect(validateNetValue('Net Value', '1234567')).toContain('6 digits before');
    expect(validateNetValue('Net Value', '1.234')).toContain('6 digits before');
  });

  it('accepts valid NUMBER(8,2) values', () => {
    expect(validateNetValue('Net Value', '123456.78')).toBeUndefined();
    expect(validateNetValue('Net Value', '1234.5')).toBeUndefined();
    expect(validateNetValue('Net Value', '0')).toBeUndefined();
    expect(validateNetValue('Net Value', '100.00')).toBeUndefined();
  });

  it('caps input length at 6 digits + dot + 2 decimals', () => {
    expect(NET_VALUE_MAX_LENGTH).toBe(9);
  });
});
