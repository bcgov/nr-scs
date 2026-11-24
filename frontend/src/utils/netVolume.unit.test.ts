import { describe, expect, it } from 'vitest';

import { formatNetVolume } from './netVolume';

describe('formatNetVolume', () => {
  it('keeps all three stored decimals rather than rounding to one', () => {
    expect(formatNetVolume(20.845)).toBe('20.845');
    expect(formatNetVolume(1.234)).toBe('1.234');
  });

  it('pads to one decimal, matching the legacy "0.0##" minimum', () => {
    expect(formatNetVolume(20)).toBe('20.0');
    expect(formatNetVolume(0)).toBe('0.0');
  });

  it('trims the unused decimals instead of padding to three', () => {
    expect(formatNetVolume(20.4)).toBe('20.4');
    expect(formatNetVolume(20.45)).toBe('20.45');
  });

  it('rounds away a fourth decimal and any floating-point artifact', () => {
    expect(formatNetVolume(1.2345)).toBe('1.235');
    expect(formatNetVolume(0.1 + 0.2)).toBe('0.3');
  });

  it('omits the grouping separator, as the legacy pattern does', () => {
    expect(formatNetVolume(1234.567)).toBe('1234.567');
  });

  it('accepts a numeric string', () => {
    expect(formatNetVolume('12.345')).toBe('12.345');
  });

  it('renders a blank or unparseable value as empty rather than 0.0', () => {
    expect(formatNetVolume(null)).toBe('');
    expect(formatNetVolume(undefined)).toBe('');
    expect(formatNetVolume('')).toBe('');
    expect(formatNetVolume('abc')).toBe('');
    expect(formatNetVolume(Number.NaN)).toBe('');
    expect(formatNetVolume(Number.POSITIVE_INFINITY)).toBe('');
  });
});
