import { describe, expect, it } from 'vitest';

import type { CheckScaleApiModel } from '@/services/checkScales.service';
import type { StaticLov } from '@/services/lov.service';
import {
  buildHeaderValues,
  codeDescLabel,
  mapServerFieldErrors,
  toYesNoInd,
  validateHeader,
  validateSpgRow,
  EMPTY_HEADER_VALUES,
  EMPTY_SPG_ROW,
} from './summaryCheckScaleViewModel';

const apiModel = (overrides: Partial<CheckScaleApiModel> = {}): CheckScaleApiModel =>
  ({ checkScaleId: 1, ...overrides }) as CheckScaleApiModel;

const isoDaysFromToday = (days: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/** A header that passes every rule, so each test can break exactly one thing. */
const validHeader = () => ({
  ...EMPTY_HEADER_VALUES,
  checkScaleType: 'F',
  checkScalerLicence: 'C123',
  originalScalerLicence: 'O123',
  timberMark: 'TM123',
  scaleSiteNumber: 'SS-1',
  followedGoodPractices: 'Yes' as const,
  originalWithinStandard: 'No' as const,
  checkReplacesOriginal: 'No' as const,
  partialLoad: 'No' as const,
  loadArrivalNumber: 'LA-1',
  weighSlipNumber: '',
  originalDateOfScale: '2026-01-01',
  checkDateOfScale: '2026-01-02',
  originalScaleReturn: '1',
  checkScaleReturn: '2',
});

const validSpgRow = () => ({
  ...EMPTY_SPG_ROW,
  speciesCode: 'FIR',
  productCode: 'XM',
  gradeCode: '1',
  originalPieces: '10',
  checkPieces: '11',
  originalNetVolume: '1.234',
  checkNetVolume: '1.235',
  originalNetValue: '100.00',
  checkNetValue: '101.00',
});

describe('codeDescLabel', () => {
  it('joins code and description the way the legacy dropdowns did', () => {
    expect(codeDescLabel({ code: 'FIR', description: 'Douglas Fir' } as StaticLov)).toBe(
      'FIR - Douglas Fir',
    );
  });

  it('falls back to the description alone when there is no code', () => {
    expect(codeDescLabel({ code: '', description: 'Douglas Fir' } as StaticLov)).toBe('Douglas Fir');
  });

  it('falls back to the code alone when there is no description', () => {
    expect(codeDescLabel({ code: 'FIR', description: '' } as StaticLov)).toBe('FIR');
  });

  it('yields an empty label rather than a stray separator when both are missing', () => {
    expect(codeDescLabel({} as StaticLov)).toBe('');
  });
});

describe('toYesNoInd', () => {
  it('maps Yes to Y and everything else to N', () => {
    expect(toYesNoInd('Yes')).toBe('Y');
    expect(toYesNoInd('No')).toBe('N');
    expect(toYesNoInd('')).toBe('N');
  });
});

describe('buildHeaderValues', () => {
  it.each([
    ['LTSCS', 'Log Tally'],
    ['SLTSCS', 'Sample Log Tally'],
    ['SFPSCS', 'Special Forest Product'],
  ])('maps ckscType %s to the %s return type', (ckscType, expected) => {
    expect(buildHeaderValues(apiModel({ ckscType })).returnType).toBe(expected);
  });

  it('falls back to Special Forest Product for an unknown or missing ckscType', () => {
    expect(buildHeaderValues(apiModel({ ckscType: 'MYSTERY' })).returnType).toBe(
      'Special Forest Product',
    );
    expect(buildHeaderValues(apiModel({ ckscType: null })).returnType).toBe(
      'Special Forest Product',
    );
  });

  it.each([
    ['Y', 'Yes'],
    ['N', 'No'],
    [null, ''],
    ['', ''],
    ['X', ''],
  ])('turns the %s indicator into the %s radio value', (ind, expected) => {
    const values = buildHeaderValues(
      apiModel({
        followedGoodPracticeInd: ind,
        originalWithinStandardInd: ind,
        checkReplacesOriginalInd: ind,
        partialInd: ind,
      }),
    );

    expect(values.followedGoodPractices).toBe(expected);
    expect(values.originalWithinStandard).toBe(expected);
    expect(values.checkReplacesOriginal).toBe(expected);
    expect(values.partialLoad).toBe(expected);
  });

  it('renders numbers as strings so they can go straight into text inputs', () => {
    const values = buildHeaderValues(
      apiModel({ weighSlipNumber: 4021, originalScaleReturnNo: 7, chkScaleReturnNo: 0 }),
    );

    expect(values.weighSlipNumber).toBe('4021');
    expect(values.originalScaleReturn).toBe('7');
    // 0 is a real return number, not an absent one.
    expect(values.checkScaleReturn).toBe('0');
  });

  it('turns null and undefined into empty strings, never the text "null"', () => {
    const values = buildHeaderValues(apiModel({ timberMark: null, scaleSiteIdNmbr: undefined }));

    expect(values.timberMark).toBe('');
    expect(values.scaleSiteNumber).toBe('');
  });
});

describe('mapServerFieldErrors', () => {
  it('returns empty results for null or empty input', () => {
    expect(mapServerFieldErrors(null)).toEqual({ errors: {}, banner: null });
    expect(mapServerFieldErrors(undefined)).toEqual({ errors: {}, banner: null });
    expect(mapServerFieldErrors([])).toEqual({ errors: {}, banner: null });
  });

  it('keys a known server field by its form field name', () => {
    const result = mapServerFieldErrors([
      { field: 'originalScalerLicenceNo', message: 'Not a valid licence.' },
      { field: 'scaleSiteIdNmbr', message: 'Unknown site.' },
    ]);

    expect(result.errors).toEqual({
      originalScalerLicence: 'Not a valid licence.',
      scaleSiteNumber: 'Unknown site.',
    });
    expect(result.banner).toBeNull();
  });

  it('collects an unmapped field into the banner rather than dropping it', () => {
    const result = mapServerFieldErrors([{ field: 'someNewField', message: 'Backend says no.' }]);

    expect(result.errors).toEqual({});
    expect(result.banner).toBe('Backend says no.');
  });

  it('joins several unmapped messages into one banner', () => {
    const result = mapServerFieldErrors([
      { field: 'a', message: 'First problem.' },
      { field: 'b', message: 'Second problem.' },
    ]);

    expect(result.banner).toBe('First problem. Second problem.');
  });

  it('handles a message with no field at all', () => {
    expect(mapServerFieldErrors([{ message: 'General failure.' }]).banner).toBe('General failure.');
  });

  it('drops an entry that carries neither a mapping nor a message', () => {
    expect(mapServerFieldErrors([{ field: 'unknown', message: null }])).toEqual({
      errors: {},
      banner: null,
    });
  });

  it('splits mapped and unmapped errors from the same response', () => {
    const result = mapServerFieldErrors([
      { field: 'timberMark', message: 'Expired.' },
      { field: 'mystery', message: 'Something else.' },
    ]);

    expect(result.errors).toEqual({ timberMark: 'Expired.' });
    expect(result.banner).toBe('Something else.');
  });
});

describe('validateHeader', () => {
  it('accepts a complete header', () => {
    const result = validateHeader(validHeader());

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.formError).toBeFalsy();
  });

  it('rejects both Load Arrival # and Weigh Slip # being filled', () => {
    const result = validateHeader({ ...validHeader(), weighSlipNumber: '4021' });

    expect(result.ok).toBe(false);
    expect(result.formError).toBe('Enter only one of Load Arrival # or Weigh Slip #.');
    expect(result.errors.loadArrivalNumber).toBe('Enter only one.');
    expect(result.errors.weighSlipNumber).toBe('Enter only one.');
  });

  it('rejects neither being filled', () => {
    const result = validateHeader({
      ...validHeader(),
      loadArrivalNumber: '',
      weighSlipNumber: '',
    });

    expect(result.formError).toBe('Either Load Arrival # or Weigh Slip # is required.');
    expect(result.errors.loadArrivalNumber).toBe('Required.');
  });

  it('accepts a weigh slip on its own', () => {
    const result = validateHeader({
      ...validHeader(),
      loadArrivalNumber: '',
      weighSlipNumber: '4021',
    });

    expect(result.ok).toBe(true);
  });

  it('rejects a non-numeric weigh slip, rather than letting it coerce to null server-side', () => {
    const result = validateHeader({
      ...validHeader(),
      loadArrivalNumber: '',
      weighSlipNumber: 'ABC',
    });

    expect(result.errors.weighSlipNumber).toBe('Weigh Slip # must be a number.');
  });

  it('rejects a scale date in the future', () => {
    const tomorrow = isoDaysFromToday(1);
    const result = validateHeader({
      ...validHeader(),
      originalDateOfScale: tomorrow,
      checkDateOfScale: tomorrow,
    });

    expect(result.errors.originalDateOfScale).toBe('Scale dates cannot be in the future.');
    expect(result.errors.checkDateOfScale).toBe('Scale dates cannot be in the future.');
  });

  it('accepts today as a scale date — the rule is "future", not "before today"', () => {
    const today = isoDaysFromToday(0);
    const result = validateHeader({
      ...validHeader(),
      originalDateOfScale: today,
      checkDateOfScale: today,
    });

    expect(result.ok).toBe(true);
  });

  it('reports a missing date as required without also calling it a future date', () => {
    const result = validateHeader({ ...validHeader(), originalDateOfScale: '' });

    expect(result.errors.originalDateOfScale).toBe('Original Date of Scale is required.');
  });

  it('reports an unparseable date as invalid rather than ignoring it', () => {
    // Changed deliberately: this used to assert NO error, which meant an unusable date passed client
    // validation silently. It is reported as invalid now, and still not mislabelled as a future date.
    const result = validateHeader({ ...validHeader(), originalDateOfScale: 'not-a-date' });

    expect(result.errors.originalDateOfScale).toBe('Original Date of Scale is not a valid date.');
  });

  /**
   * `isFutureDate` parses with `new Date(value + 'T00:00:00')`, which rolls a day overflow over instead
   * of rejecting it — so February 30 was read as 2 March and the not-in-the-future rule was evaluated
   * against a date the user never typed. Calendar validity is checked first now.
   */
  it.each(['2026-02-30', '2026-09-31', '2026-04-31'])(
    'rejects %s instead of silently rolling it into the next month',
    (value) => {
      const result = validateHeader({ ...validHeader(), originalDateOfScale: value });

      expect(result.errors.originalDateOfScale).toBe('Original Date of Scale is not a valid date.');
      expect(result.ok).toBe(false);
    },
  );

  it('applies the same check to the Check Date of Scale', () => {
    const result = validateHeader({ ...validHeader(), checkDateOfScale: '2026-02-30' });

    expect(result.errors.checkDateOfScale).toBe('Check Date of Scale is not a valid date.');
  });

  it('reports every missing required field at once', () => {
    const result = validateHeader(EMPTY_HEADER_VALUES);

    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors)).toEqual(
      expect.arrayContaining([
        'checkScaleType',
        'checkScalerLicence',
        'originalScalerLicence',
        'timberMark',
        'scaleSiteNumber',
        'followedGoodPractices',
        'originalWithinStandard',
        'checkReplacesOriginal',
        'originalDateOfScale',
        'checkDateOfScale',
        'originalScaleReturn',
        'checkScaleReturn',
      ]),
    );
  });

  it('treats whitespace-only text as missing', () => {
    const result = validateHeader({ ...validHeader(), timberMark: '   ' });

    expect(result.errors.timberMark).toBe('Timber Mark is required.');
  });

  it('requires Partial Load only for Special Forest Product returns', () => {
    const header = { ...validHeader(), partialLoad: '' as const };

    expect(validateHeader(header).errors.partialLoad).toBe('Partial Load is required.');
    expect(
      validateHeader({ ...header, returnType: 'Log Tally' }).errors.partialLoad,
    ).toBeUndefined();
  });
});

describe('validateSpgRow precision rules', () => {
  it('accepts a row inside the legacy column precision', () => {
    expect(validateSpgRow('Special Forest Product', validSpgRow()).ok).toBe(true);
  });

  it('rejects a net volume with too many digits before the decimal', () => {
    // NUMBER(7,3): 4 before the point, 3 after.
    const result = validateSpgRow('Special Forest Product', {
      ...validSpgRow(),
      originalNetVolume: '12345.1',
    });

    expect(result.errors.originalNetVolume).toContain('4 digits before the decimal place');
  });

  it('rejects a net volume with too many decimal places', () => {
    const result = validateSpgRow('Special Forest Product', {
      ...validSpgRow(),
      checkNetVolume: '1.2345',
    });

    expect(result.errors.checkNetVolume).toContain('3 after');
  });

  it('rejects a net value with too many decimal places', () => {
    // NUMBER(8,2): 6 before the point, 2 after.
    const result = validateSpgRow('Special Forest Product', {
      ...validSpgRow(),
      originalNetValue: '100.123',
    });

    expect(result.errors.originalNetValue).toContain('2 after');
  });

  it('ignores a leading sign when counting digits', () => {
    const result = validateSpgRow('Special Forest Product', {
      ...validSpgRow(),
      originalNetValue: '-100.00',
    });

    expect(result.errors.originalNetValue).toBeUndefined();
  });

  it('reports a non-numeric volume as not-a-number, not as a precision overflow', () => {
    const result = validateSpgRow('Special Forest Product', {
      ...validSpgRow(),
      originalNetVolume: 'abc',
    });

    expect(result.errors.originalNetVolume).toBe('Original Net Volume must be a number.');
  });

  it('reports a non-integer piece count as an integer error', () => {
    const result = validateSpgRow('Special Forest Product', {
      ...validSpgRow(),
      originalPieces: '10.5',
    });

    expect(result.errors.originalPieces).toBe('Original Pieces must be an integer.');
  });

  it('requires a product only for Special Forest Product returns', () => {
    const row = { ...validSpgRow(), productCode: '' };

    expect(validateSpgRow('Special Forest Product', row).errors.productCode).toBe(
      'Product is required.',
    );
    expect(validateSpgRow('Log Tally', row).errors.productCode).toBeUndefined();
  });
});

// The rules below shipped in d40c6b0 with no coverage. The Scale Return # rule in particular had a
// near-miss: the only integer assertion in this file targets originalPieces, an SPG row field, so
// the header's own return-number rule was unverified.
describe('validateHeader — Scale Return # must be an integer', () => {
  // Legacy rejected a non-numeric return number outright; the rebuild only checked presence, so a
  // value like "test" reached the DB.
  it.each(['test', '1.5', '1a', '-', ''])(
    'rejects %j in Original Scale Return #',
    (value) => {
      const result = validateHeader({ ...validHeader(), originalScaleReturn: value });

      expect(result.ok).toBe(false);
      expect(result.errors.originalScaleReturn).toBeTruthy();
    },
  );

  it('rejects a non-integer Check Scale Return # with legacy wording', () => {
    const result = validateHeader({ ...validHeader(), checkScaleReturn: 'test' });

    expect(result.ok).toBe(false);
    expect(result.errors.checkScaleReturn).toBe('Scale Return # must be an integer.');
  });

  it('flags both return fields independently', () => {
    const result = validateHeader({
      ...validHeader(),
      originalScaleReturn: 'x',
      checkScaleReturn: 'y',
    });

    expect(result.errors.originalScaleReturn).toBe('Scale Return # must be an integer.');
    expect(result.errors.checkScaleReturn).toBe('Scale Return # must be an integer.');
  });

  it('accepts surrounding whitespace and negative integers', () => {
    const result = validateHeader({
      ...validHeader(),
      originalScaleReturn: '  12  ',
      checkScaleReturn: '-3',
    });

    expect(result.errors.originalScaleReturn).toBeUndefined();
    expect(result.errors.checkScaleReturn).toBeUndefined();
  });
});

describe('validateHeader — Check Scaler Comment length', () => {
  // CHK_SCALER_COMMENT_TXT is VARCHAR2(4000); caught client-side so the round trip is skipped.
  it('accepts a comment of exactly 4000 characters', () => {
    const result = validateHeader({ ...validHeader(), checkScalerComment: 'a'.repeat(4000) });

    expect(result.errors.checkScalerComment).toBeUndefined();
  });

  it('rejects 4001 characters against the field, not the banner', () => {
    const result = validateHeader({ ...validHeader(), checkScalerComment: 'a'.repeat(4001) });

    expect(result.ok).toBe(false);
    expect(result.errors.checkScalerComment).toBe(
      'Check Scaler Comment can not be greater than 4000 characters.',
    );
  });
});

describe('mapServerFieldErrors — chkScalerCommentTxt', () => {
  it('keys the comment column to the textarea instead of the page banner', () => {
    // Before the mapping was added, the backend's 4000-character message fell through to the
    // unmapped-field banner at the top of the page, which named no field.
    const result = mapServerFieldErrors([
      { field: 'chkScalerCommentTxt', message: 'Comment is too long.' },
    ]);

    expect(result.errors).toEqual({ checkScalerComment: 'Comment is too long.' });
    expect(result.banner).toBeNull();
  });
});
