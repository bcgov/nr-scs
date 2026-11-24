import { describe, expect, it } from 'vitest';

import {
  hasReportDateErrors,
  validateReportDateRange,
} from './reportDateRange';

/**
 * The shared date-window rules behind all eight Reports-tab screens. Worth pinning here rather than only
 * through the screens: this one helper is now the single definition of the rules, so a change to it changes
 * every report at once — and the tiering (ordering everywhere, required/cap only where opted in) is the part
 * most likely to be "simplified" into a behaviour change.
 */
describe('validateReportDateRange', () => {
  describe('ordering rule (applies to every report screen)', () => {
    it('flags an inverted window on both the To field and the form banner', () => {
      const errors = validateReportDateRange('2024-12-31', '2024-01-01');

      expect(errors.rangeError).toBe('To Date must be on or after From Date.');
      // Mirrored onto the field so the message is associated with an input, not just a loose banner.
      expect(errors.toError).toBe('To Date must be on or after From Date.');
      expect(errors.fromError).toBeNull();
    });

    it('accepts a correctly ordered window', () => {
      expect(validateReportDateRange('2024-01-01', '2024-12-31')).toEqual({
        fromError: null,
        toError: null,
        rangeError: null,
      });
    });

    it('accepts a single-day window where From equals To', () => {
      // The boundary of the ordering rule: equal dates must pass, not trip "on or after".
      expect(validateReportDateRange('2024-03-15', '2024-03-15').rangeError).toBeNull();
    });

    it('runs on change, not only on submit', () => {
      // The point of this: an impossible window is called out as soon as the second date is entered.
      expect(validateReportDateRange('2024-12-31', '2024-01-01', 'change').rangeError).toBe(
        'To Date must be on or after From Date.',
      );
    });

    it('stays silent while only one date has been entered', () => {
      expect(validateReportDateRange('2024-12-31', '').rangeError).toBeNull();
      expect(validateReportDateRange('', '2024-01-01').rangeError).toBeNull();
    });
  });

  describe('required dates (opt-in — District Performance only)', () => {
    it('does not require dates by default', () => {
      // The register/exception reports accept an empty window on purpose.
      expect(validateReportDateRange('', '', 'submit')).toEqual({
        fromError: null,
        toError: null,
        rangeError: null,
      });
    });

    it('reports each missing date independently when required', () => {
      const both = validateReportDateRange('', '', 'submit', { required: true });
      expect(both.fromError).toBe('From Date is required.');
      expect(both.toError).toBe('To Date is required.');

      const onlyTo = validateReportDateRange('2024-01-01', '', 'submit', { required: true });
      expect(onlyTo.fromError).toBeNull();
      expect(onlyTo.toError).toBe('To Date is required.');

      const onlyFrom = validateReportDateRange('', '2024-12-31', 'submit', { required: true });
      expect(onlyFrom.fromError).toBe('From Date is required.');
      expect(onlyFrom.toError).toBeNull();
    });

    it('does not nag about required dates while the user is still typing', () => {
      expect(validateReportDateRange('', '', 'change', { required: true })).toEqual({
        fromError: null,
        toError: null,
        rangeError: null,
      });
    });
  });

  describe('paired dates (opt-in — Mark Site Designation report only)', () => {
    const PAIRED = { pairedRequired: true } as const;
    const MESSAGE = 'If a value is entered in either From Date or To Date, then a value must be entered in both.';

    it('does not pair dates by default', () => {
      // Every other report accepts a half-filled window; only MSD rejected it in legacy.
      expect(validateReportDateRange('2024-01-01', '', 'submit').fromError).toBeNull();
    });

    it('rejects a From with no To', () => {
      const errors = validateReportDateRange('2024-01-01', '', 'submit', PAIRED);
      expect(errors.fromError).toBe(MESSAGE);
      expect(hasReportDateErrors(errors)).toBe(true);
    });

    it('rejects a To with no From', () => {
      // Legacy raised the same message, on the same (From) field, in both directions.
      const errors = validateReportDateRange('', '2024-12-31', 'submit', PAIRED);
      expect(errors.fromError).toBe(MESSAGE);
      expect(errors.toError).toBeNull();
    });

    it('accepts BOTH blank — pairing is not the same as required', () => {
      // The distinction that matters: an unfiltered window is still a legal MSD report request.
      expect(validateReportDateRange('', '', 'submit', PAIRED)).toEqual({
        fromError: null,
        toError: null,
        rangeError: null,
      });
    });

    it('accepts both filled', () => {
      expect(validateReportDateRange('2024-01-01', '2024-12-31', 'submit', PAIRED).fromError).toBeNull();
    });

    it('does not nag while the user is part-way through the pair', () => {
      // Half-filled is the NORMAL state between the two clicks of a date picker, so this rule gates
      // sending only — flagging it on change would red-flag a form the user is still filling in.
      expect(validateReportDateRange('2024-01-01', '', 'change', PAIRED)).toEqual({
        fromError: null,
        toError: null,
        rangeError: null,
      });
    });

    it('still reports the ordering failure when both are filled', () => {
      // Pairing must not shadow the rule that already applied to this screen.
      const errors = validateReportDateRange('2024-12-31', '2024-01-01', 'submit', PAIRED);
      expect(errors.fromError).toBeNull();
      expect(errors.toError).toBe('To Date must be on or after From Date.');
    });

    it('names the report screen own fields when given labels', () => {
      const errors = validateReportDateRange('2024-01-01', '', 'submit', {
        pairedRequired: true,
        fromLabel: 'Effective Date (From)',
        toLabel: 'Effective Date (To)',
      });
      expect(errors.fromError).toBe(
        'If a value is entered in either Effective Date (From) or Effective Date (To), then a value must be entered in both.',
      );
    });
  });

  describe('maximum window (opt-in — District Performance only)', () => {
    it('is uncapped by default', () => {
      // A multi-year register report is a legitimate request, so no cap unless the screen asks for one.
      expect(validateReportDateRange('2020-01-01', '2024-12-31').rangeError).toBeNull();
    });

    it('rejects a window longer than the cap', () => {
      expect(
        validateReportDateRange('2025-01-01', '2026-01-02', 'submit', { maxYears: 1 }).rangeError,
      ).toBe('Search date range cannot be more than 1 year(s).');
    });

    it('accepts a window of exactly the cap', () => {
      // The off-by-one boundary: `<` not `<=`, so exactly one year is allowed.
      expect(
        validateReportDateRange('2025-01-01', '2026-01-01', 'submit', { maxYears: 1 }).rangeError,
      ).toBeNull();
    });

    it('reports inverted-order in preference to the cap when both could apply', () => {
      // An inverted window can never also be "too long"; the clearer message must win.
      expect(
        validateReportDateRange('2026-01-01', '2020-01-01', 'submit', { maxYears: 1 }).rangeError,
      ).toBe('To Date must be on or after From Date.');
    });

    it('honours a cap other than one year', () => {
      expect(
        validateReportDateRange('2020-01-01', '2024-01-02', 'submit', { maxYears: 4 }).rangeError,
      ).toBe('Search date range cannot be more than 4 year(s).');
    });
  });

  describe('unparseable values', () => {
    it('flags an unparseable date on submit', () => {
      // Defence-in-depth: the Carbon DatePicker discards text it cannot parse, so a typing user never
      // reaches this — it guards a value arriving from elsewhere (e.g. a URL parameter).
      const errors = validateReportDateRange('not-a-date', '2024-12-31', 'submit');
      expect(errors.fromError).toBe('From Date must be a valid date.');
    });

    it('does not treat an unparseable date as a range failure', () => {
      expect(validateReportDateRange('not-a-date', '2024-12-31', 'submit').rangeError).toBeNull();
    });

    it('withholds the invalid-date message until submit, as legacy did', () => {
      // Legacy let the user type an impossible date and reported it when they tried to submit. Every
      // other form here does the same (`useMaintenanceCrud` defaults `revalidateOnChange` to false), so
      // the report screens follow suit rather than nagging mid-entry.
      expect(validateReportDateRange('not-a-date', '', 'change').fromError).toBeNull();
      expect(validateReportDateRange('not-a-date', '', 'submit').fromError).toBe(
        'From Date must be a valid date.',
      );
    });

    /**
     * The regression that motivated the strict parser. The old local parser was
     * `new Date(value + 'T00:00:00') + isNaN`, which rejects only an out-of-range MONTH — V8 rolls a day
     * overflow over instead, so these silently became 1 Oct / 2 Mar / 1 Mar and were sent to the report
     * engine as a window the user never asked for.
     */
    it.each([
      ['2026-09-31', 'September 31'],
      ['2026-02-30', 'February 30'],
      ['2026-02-29', 'February 29 in a non-leap year'],
      ['2026-04-31', 'April 31'],
    ])('rejects %s (%s) on submit instead of rolling it over', (value) => {
      expect(validateReportDateRange(value, '', 'submit').fromError).toBe(
        'From Date must be a valid date.',
      );
    });

    it('still accepts a real leap day', () => {
      expect(validateReportDateRange('2024-02-29', '', 'submit').fromError).toBeNull();
    });
  });

  describe('custom field labels', () => {
    it('names the fields it was given', () => {
      // The Mark Site Designation report has TWO windows, so a generic "To Date" message could not tell
      // the user which of them is wrong.
      expect(
        validateReportDateRange('2024-12-31', '2024-01-01', 'submit', {
          fromLabel: 'Effective Date (From)',
          toLabel: 'Effective Date (To)',
        }).rangeError,
      ).toBe('Effective Date (To) must be on or after Effective Date (From).');
    });

    it('uses custom labels for the required and validity messages too', () => {
      const errors = validateReportDateRange('', '', 'submit', {
        required: true,
        fromLabel: 'From Scale Date',
        toLabel: 'To Scale Date',
      });

      expect(errors.fromError).toBe('From Scale Date is required.');
      expect(errors.toError).toBe('To Scale Date is required.');
    });
  });
});

describe('hasReportDateErrors', () => {
  it('is false when nothing failed', () => {
    expect(hasReportDateErrors({ fromError: null, toError: null, rangeError: null })).toBe(false);
  });

  it('is true for a field error, a range error, or both', () => {
    expect(hasReportDateErrors({ fromError: 'x', toError: null, rangeError: null })).toBe(true);
    expect(hasReportDateErrors({ fromError: null, toError: 'x', rangeError: null })).toBe(true);
    expect(hasReportDateErrors({ fromError: null, toError: null, rangeError: 'x' })).toBe(true);
  });
});
