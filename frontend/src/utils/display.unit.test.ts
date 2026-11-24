import { describe, expect, it } from 'vitest';

import { asText, formatPhone, ynToDisplay } from './display';

describe('formatPhone', () => {
  it('formats an exactly-10-digit string as (XXX) XXX-XXXX', () => {
    expect(formatPhone('2505551234')).toBe('(250) 555-1234');
  });

  it('strips non-digit characters before the length check', () => {
    expect(formatPhone('(250) 555-1234')).toBe('(250) 555-1234');
    expect(formatPhone('250.555.1234')).toBe('(250) 555-1234');
  });

  it('passes null and undefined through unchanged', () => {
    expect(formatPhone(null)).toBeNull();
    expect(formatPhone(undefined)).toBeUndefined();
  });

  it('returns non-10-digit values unchanged (legacy "return as stored" rule)', () => {
    // Too few digits.
    expect(formatPhone('5551234')).toBe('5551234');
    // Too many digits (e.g. with country code).
    expect(formatPhone('12505551234')).toBe('12505551234');
    // Already-formatted but not 10 digits stays as-is.
    expect(formatPhone('1-800-FLOWERS')).toBe('1-800-FLOWERS');
    // Empty string has zero digits, so it is returned unchanged.
    expect(formatPhone('')).toBe('');
  });
});

describe('asText', () => {
  it('renders an em dash for null, undefined, and blank strings', () => {
    expect(asText(null)).toBe('—');
    expect(asText(undefined)).toBe('—');
    expect(asText('   ')).toBe('—');
  });

  it('trims and stringifies scalar values', () => {
    expect(asText('  hello  ')).toBe('hello');
    expect(asText(42)).toBe('42');
  });

  it('serializes objects as JSON', () => {
    expect(asText({ a: 1 })).toBe('{"a":1}');
  });
});

describe('ynToDisplay', () => {
  it('maps Y/N to Yes/No and everything else to an em dash', () => {
    expect(ynToDisplay('Y')).toBe('Yes');
    expect(ynToDisplay('N')).toBe('No');
    expect(ynToDisplay(null)).toBe('—');
    expect(ynToDisplay(undefined)).toBe('—');
    expect(ynToDisplay('X')).toBe('—');
  });
});
