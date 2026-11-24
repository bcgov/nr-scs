import { describe, expect, it } from 'vitest';

import {
  compareDateOnly,
  dateOnlyFieldError,
  normalizeDateInput,
  isFutureDateOnly,
  isValidDateOnly,
  parseDateOnly,
} from './dateOnly';

describe('parseDateOnly', () => {
  it('parses a valid YYYY-MM-DD date', () => {
    const parsed = parseDateOnly('2025-01-10');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2025);
    expect(parsed?.getMonth()).toBe(0);
    expect(parsed?.getDate()).toBe(10);
  });

  it('rejects malformed strings', () => {
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly('2025-1-1')).toBeNull();
    expect(parseDateOnly('07/07/2026')).toBeNull();
  });

  it('rejects non-existent calendar dates that JS would roll over', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('2025-13-01')).toBeNull();
    expect(parseDateOnly('2025-00-10')).toBeNull();
  });
});

describe('isValidDateOnly', () => {
  it('reflects parseDateOnly', () => {
    expect(isValidDateOnly('2025-02-28')).toBe(true);
    expect(isValidDateOnly('2025-02-29')).toBe(false);
  });
});

describe('compareDateOnly', () => {
  it('orders valid dates', () => {
    expect(compareDateOnly('2025-01-01', '2025-01-02')).toBeLessThan(0);
    expect(compareDateOnly('2025-01-02', '2025-01-01')).toBeGreaterThan(0);
    expect(compareDateOnly('2025-01-01', '2025-01-01')).toBe(0);
  });

  it('returns 0 when either side is invalid', () => {
    expect(compareDateOnly('nope', '2025-01-01')).toBe(0);
    expect(compareDateOnly('2025-01-01', '2026-02-30')).toBe(0);
  });
});

describe('isFutureDateOnly', () => {
  const toDateOnly = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;

  it('treats a local tomorrow as future and local today/yesterday as not', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    expect(isFutureDateOnly(toDateOnly(tomorrow))).toBe(true);
    expect(isFutureDateOnly(toDateOnly(now))).toBe(false);
    expect(isFutureDateOnly(toDateOnly(yesterday))).toBe(false);
  });

  it('returns false for an invalid date string', () => {
    expect(isFutureDateOnly('nope')).toBe(false);
    expect(isFutureDateOnly('')).toBe(false);
  });
});

describe('dateOnlyFieldError', () => {
  it('accepts a real calendar date', () => {
    expect(dateOnlyFieldError('2026-02-28', 'Effective Date')).toBeNull();
  });

  it('treats blank as acceptable — "required" is the caller’s rule', () => {
    expect(dateOnlyFieldError('', 'Effective Date')).toBeNull();
    expect(dateOnlyFieldError('   ', 'Effective Date')).toBeNull();
    expect(dateOnlyFieldError(null, 'Effective Date')).toBeNull();
    expect(dateOnlyFieldError(undefined, 'Effective Date')).toBeNull();
  });

  /**
   * The regression this exists for: `new Date('2026-02-30')` does NOT return Invalid Date — V8 rolls
   * the day overflow over to 2026-03-02. Every form that guarded with `Number.isNaN(d.getTime())`
   * therefore waved a non-existent day through and compared the silently corrected date.
   */
  it('rejects a day that does not exist in that month', () => {
    expect(dateOnlyFieldError('2026-02-30', 'Effective Date')).toBe('Effective Date is not a valid date.');
    expect(dateOnlyFieldError('2026-04-31', 'Expiry Date')).toBe('Expiry Date is not a valid date.');
  });

  it('rejects an out-of-range month', () => {
    expect(dateOnlyFieldError('2026-13-01', 'Effective Date')).toBe('Effective Date is not a valid date.');
  });

  it('rejects text that is not a date at all', () => {
    expect(dateOnlyFieldError('not-a-date', 'Effective Date')).toBe('Effective Date is not a valid date.');
  });

  it('uses the label it is given, so each form keeps its own wording', () => {
    expect(dateOnlyFieldError('2026-02-30', 'Effective date')).toBe('Effective date is not a valid date.');
  });
});

describe('normalizeDateInput', () => {
  describe('dashed entry', () => {
    it.each([
      ['2026-01-05', '2026-01-05', 'already complete'],
      ['2026-1-5', '2026-01-05', 'single-digit month and day are padded'],
      ['26-01-05', '2026-01-05', 'a two-digit year becomes 20YY'],
      ['26-1-5', '2026-01-05', 'both shorthands at once'],
      ['2026-1-', '2026-01-', 'completes only as far as the user got'],
      ['2026-', '2026-', 'a year and a separator is left as a year and a separator'],
    ])('%s -> %s (%s)', (input, expected) => {
      expect(normalizeDateInput(input)).toBe(expected);
    });

    it.each([
      ['YYY-M-', 'non-numeric parts'],
      ['20-26-01-05', 'too many segments'],
      ['2026-013-05', 'a three-digit month'],
      ['206-01-05', 'a three-digit year'],
    ])('leaves %s alone (%s) for submit to reject', (input) => {
      expect(normalizeDateInput(input)).toBe(input);
    });
  });

  describe('digits-only entry is always positional YYYYMMDD', () => {
    it.each([
      ['20260105', '2026-01-05', 'a full eight digits'],
      ['202601055', '2026-01-05', 'nine digits keep the first eight'],
      ['2026010599', '2026-01-05', 'ten digits keep the first eight'],
    ])('%s -> %s (%s)', (input, expected) => {
      expect(normalizeDateInput(input)).toBe(expected);
    });

    it.each([
      ['260105', '2601-05', 'a four-digit year and a month, NOT a two-digit year'],
      ['2026010', '2026-01-0', 'separators reach only as far as the digits do'],
      ['20260', '2026-0', 'a single month digit is left as one digit, not padded'],
      ['2026', '2026', 'a bare year gains no separator'],
      ['12345', '1234-5', 'split at the fixed boundary regardless of plausibility'],
      ['1', '1', 'a single digit is left alone'],
    ])('%s -> %s (%s)', (input, expected) => {
      expect(normalizeDateInput(input)).toBe(expected);
    });

    it('never applies the 20YY shorthand to digits-only input', () => {
      // The shorthand belongs to dashed entry only. Applying it here would give digits-only input two
      // possible readings, which is exactly the ambiguity this rule removes.
      expect(normalizeDateInput('260105')).not.toBe('2026-01-05');
      expect(normalizeDateInput('26-01-05')).toBe('2026-01-05');
    });
  });

  describe('what it deliberately does NOT do', () => {
    it('reshapes an impossible date rather than correcting it', () => {
      // The whole point: show what they meant, explain it on submit. Silently returning 2026-08-01
      // here is the overflow bug this work exists to remove.
      expect(normalizeDateInput('20260732')).toBe('2026-07-32');
      expect(normalizeDateInput('20261301')).toBe('2026-13-01');
    });

    it('passes blank and whitespace through as empty', () => {
      expect(normalizeDateInput('')).toBe('');
      expect(normalizeDateInput('   ')).toBe('');
      expect(normalizeDateInput(null)).toBe('');
      expect(normalizeDateInput(undefined)).toBe('');
    });

    it('leaves text that is neither digits nor dashed alone', () => {
      expect(normalizeDateInput('not-a-date')).toBe('not-a-date');
      expect(normalizeDateInput('abcd')).toBe('abcd');
    });
  });
});
