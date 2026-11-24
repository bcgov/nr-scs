import { describe, expect, it } from 'vitest';

import {
  toOutcome,
  validateCancellationPair,
  validateDateRange,
  validateScaleSiteAuthorizationBasics,
  validateScalerAuthorization,
  validateScalerAuthorizationBasics,
  type ScalerAuthorizationValues,
  type ScaleSiteAuthorizationValues,
} from './authorizationValidation';

const scalerValues = (
  overrides: Partial<ScalerAuthorizationValues> = {},
): ScalerAuthorizationValues => ({
  scalerLicenceNo: 'S1234',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  regDist: '43',
  districtWideInd: 'Y',
  selectedJobFunctions: [{ code: 'A' }],
  scaleSites: [],
  selectedForestProducts: [],
  ...overrides,
});

const siteValues = (
  overrides: Partial<ScaleSiteAuthorizationValues> = {},
): ScaleSiteAuthorizationValues => ({
  scaleSiteNumber: 'SS-1',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  expectedAnnualScaleVolume: '1000',
  ...overrides,
});

describe('toOutcome', () => {
  it('is ok when there are no errors', () => {
    expect(toOutcome({})).toEqual({ ok: true, nextErrors: {}, formError: null });
  });

  it('is not ok when any error is present', () => {
    expect(toOutcome({ a: 'bad' }).ok).toBe(false);
  });
});

describe('validateDateRange', () => {
  it('accepts expiry after effective', () => {
    const errors: Record<string, string> = {};
    validateDateRange('2026-01-01', '2026-12-31', errors);

    expect(errors).toEqual({});
  });

  it('rejects expiry before effective', () => {
    const errors: Record<string, string> = {};
    validateDateRange('2026-12-31', '2026-01-01', errors);

    expect(errors.expiryDate).toBe('Expiry Date must be after Effective Date.');
  });

  it('rejects expiry equal to effective — "after" is strict', () => {
    const errors: Record<string, string> = {};
    validateDateRange('2026-01-01', '2026-01-01', errors);

    expect(errors.expiryDate).toBe('Expiry Date must be after Effective Date.');
  });

  it('reports an unparseable effective date', () => {
    const errors: Record<string, string> = {};
    validateDateRange('not-a-date', '2026-12-31', errors);

    expect(errors.effectiveDate).toBe('Effective Date is not a valid date.');
    // With effective unusable there is no ordering to check, so expiry stays clean.
    expect(errors.expiryDate).toBeUndefined();
  });

  it('reports an unparseable expiry date', () => {
    const errors: Record<string, string> = {};
    validateDateRange('2026-01-01', 'not-a-date', errors);

    expect(errors.expiryDate).toBe('Expiry Date is not a valid date.');
  });

  it('stays silent when either date is absent, leaving "required" to speak', () => {
    const errors: Record<string, string> = {};
    validateDateRange('', '2026-12-31', errors);
    validateDateRange('2026-01-01', '', errors);
    validateDateRange('   ', '   ', errors);

    expect(errors).toEqual({});
  });

  it('adds to the map it is given rather than replacing it', () => {
    const errors: Record<string, string> = { scalerLicenceNo: 'Licence # is required' };
    validateDateRange('2026-12-31', '2026-01-01', errors);

    expect(errors.scalerLicenceNo).toBe('Licence # is required');
    expect(errors.expiryDate).toBeDefined();
  });
});

describe('validateScalerAuthorizationBasics', () => {
  it('accepts a complete set of basics', () => {
    expect(validateScalerAuthorizationBasics(scalerValues()).ok).toBe(true);
  });

  it('reports each missing field with the legacy message', () => {
    const { nextErrors } = validateScalerAuthorizationBasics({
      scalerLicenceNo: '',
      effectiveDate: '',
      expiryDate: '',
      regDist: '',
      districtWideInd: '',
    });

    expect(nextErrors).toEqual({
      // Note: no trailing period on this one, matching the legacy text.
      scalerLicenceNo: 'Licence # is required',
      effectiveDate: 'Effective Date is required.',
      expiryDate: 'Expiry Date is required.',
      regDist: 'Reg / Dist is required.',
      districtWideInd: 'District Wide is required.',
    });
  });

  it('treats whitespace as missing', () => {
    const { nextErrors } = validateScalerAuthorizationBasics(
      scalerValues({ scalerLicenceNo: '   ' }),
    );

    expect(nextErrors.scalerLicenceNo).toBe('Licence # is required');
  });

  it('does not apply the job function or scale site rules', () => {
    // The basics gate opening the Conditions section, before those are chosen.
    const { ok } = validateScalerAuthorizationBasics(
      scalerValues({ districtWideInd: 'N' }),
    );

    expect(ok).toBe(true);
  });

  it('still checks the date range', () => {
    const { nextErrors } = validateScalerAuthorizationBasics(
      scalerValues({ effectiveDate: '2026-12-31', expiryDate: '2026-01-01' }),
    );

    expect(nextErrors.expiryDate).toBe('Expiry Date must be after Effective Date.');
  });
});

describe('validateScalerAuthorization', () => {
  it('accepts a complete authorization', () => {
    expect(validateScalerAuthorization(scalerValues()).ok).toBe(true);
  });

  it('requires at least one job function', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ selectedJobFunctions: [] }),
    );

    expect(nextErrors.jobFunctions).toBe('At least one Job Function is required.');
  });

  it('treats a null job function list as empty', () => {
    expect(
      validateScalerAuthorization(scalerValues({ selectedJobFunctions: null })).nextErrors
        .jobFunctions,
    ).toBeDefined();
  });

  it('requires a scale site when District Wide is No', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ districtWideInd: 'N', scaleSites: [] }),
    );

    expect(nextErrors.scaleSites).toBe(
      'At least one Scale Site is required when District Wide is No.',
    );
  });

  it('accepts District Wide No once a site is named', () => {
    const { ok } = validateScalerAuthorization(
      scalerValues({ districtWideInd: 'N', scaleSites: [{ scaleSiteIdNmbr: 'SS-1' }] }),
    );

    expect(ok).toBe(true);
  });

  it('does not require a scale site when District Wide is Yes', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ districtWideInd: 'Y', scaleSites: [] }),
    );

    expect(nextErrors.scaleSites).toBeUndefined();
  });

  it('requires a forest product when the Special Forest Product job function is chosen', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ selectedJobFunctions: [{ code: 'S' }], selectedForestProducts: [] }),
    );

    expect(nextErrors.sfpProducts).toBe(
      'At least one Special Forest Product is required when Special Forest Product is selected.',
    );
  });

  it('accepts the SFP job function once a product is chosen', () => {
    const { ok } = validateScalerAuthorization(
      scalerValues({
        selectedJobFunctions: [{ code: 'S' }],
        selectedForestProducts: [{ code: 'CEDAR' }],
      }),
    );

    expect(ok).toBe(true);
  });

  it('finds the SFP job function among several', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ selectedJobFunctions: [{ code: 'A' }, { code: 'S' }] }),
    );

    expect(nextErrors.sfpProducts).toBeDefined();
  });

  it('does not require a forest product for other job functions', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ selectedJobFunctions: [{ code: 'A' }] }),
    );

    expect(nextErrors.sfpProducts).toBeUndefined();
  });

  it('tolerates a job function with no code at all', () => {
    const { nextErrors } = validateScalerAuthorization(
      scalerValues({ selectedJobFunctions: [{}, { code: null }] }),
    );

    expect(nextErrors.sfpProducts).toBeUndefined();
    expect(nextErrors.jobFunctions).toBeUndefined();
  });

  it('reports the basics and the business rules together', () => {
    const { nextErrors } = validateScalerAuthorization({
      scalerLicenceNo: '',
      effectiveDate: '',
      expiryDate: '',
      regDist: '',
      districtWideInd: 'N',
      selectedJobFunctions: [],
      scaleSites: [],
      selectedForestProducts: [],
    });

    // districtWideInd is absent: 'N' is a valid choice, it just brings the scale site rule with it.
    expect(Object.keys(nextErrors).sort()).toEqual([
      'effectiveDate',
      'expiryDate',
      'jobFunctions',
      'regDist',
      'scaleSites',
      'scalerLicenceNo',
    ]);
  });
});

describe('validateScaleSiteAuthorizationBasics', () => {
  it('accepts a complete set', () => {
    expect(validateScaleSiteAuthorizationBasics(siteValues()).ok).toBe(true);
  });

  it('reports each missing field with the legacy message', () => {
    const { nextErrors } = validateScaleSiteAuthorizationBasics({
      scaleSiteNumber: '',
      effectiveDate: '',
      expiryDate: '',
      expectedAnnualScaleVolume: '',
    });

    expect(nextErrors).toEqual({
      scaleSiteNumber: 'Scale Site # is required.',
      effectiveDate: 'Effective Date is required.',
      expiryDate: 'Expiry Date is required.',
      expectedAnnualScaleVolume: 'Expected Annual Scale Volume is required.',
    });
  });

  it('rejects a non-numeric expected volume', () => {
    const { nextErrors } = validateScaleSiteAuthorizationBasics(
      siteValues({ expectedAnnualScaleVolume: 'lots' }),
    );

    expect(nextErrors.expectedAnnualScaleVolume).toBe(
      'Expected Annual Scale Volume must be a number.',
    );
  });

  it('rejects a negative expected volume', () => {
    const { nextErrors } = validateScaleSiteAuthorizationBasics(
      siteValues({ expectedAnnualScaleVolume: '-1' }),
    );

    expect(nextErrors.expectedAnnualScaleVolume).toBe(
      'Expected Annual Scale Volume must be 0 or greater.',
    );
  });

  it('accepts zero — the rule is 0 or greater, not strictly positive', () => {
    expect(validateScaleSiteAuthorizationBasics(
      siteValues({ expectedAnnualScaleVolume: '0' }),
    ).ok).toBe(true);
  });

  it('accepts a decimal volume', () => {
    expect(validateScaleSiteAuthorizationBasics(
      siteValues({ expectedAnnualScaleVolume: '1234.5' }),
    ).ok).toBe(true);
  });

  it('reports a blank volume as required rather than as not-a-number', () => {
    const { nextErrors } = validateScaleSiteAuthorizationBasics(
      siteValues({ expectedAnnualScaleVolume: '  ' }),
    );

    expect(nextErrors.expectedAnnualScaleVolume).toBe(
      'Expected Annual Scale Volume is required.',
    );
  });

  it('still checks the date range', () => {
    const { nextErrors } = validateScaleSiteAuthorizationBasics(
      siteValues({ effectiveDate: '2026-12-31', expiryDate: '2026-01-01' }),
    );

    expect(nextErrors.expiryDate).toBe('Expiry Date must be after Effective Date.');
  });
});

describe('validateCancellationPair', () => {
  it('accepts both fields empty', () => {
    expect(validateCancellationPair('', '')).toEqual({});
  });

  it('accepts both fields filled', () => {
    expect(validateCancellationPair('2026-06-01', 'Licence surrendered')).toEqual({});
  });

  const pairMessage =
    'If either Cancellation Date or Cancellation Reason is entered then both are required.';

  it('demands a reason when only the date is given', () => {
    expect(validateCancellationPair('2026-06-01', '')).toEqual({
      cancellationReasonTxt: pairMessage,
    });
  });

  it('demands a date when only the reason is given', () => {
    expect(validateCancellationPair('', 'Licence surrendered')).toEqual({
      cancellationDate: pairMessage,
    });
  });

  it('treats whitespace as empty', () => {
    expect(validateCancellationPair('   ', 'Licence surrendered')).toEqual({
      cancellationDate: pairMessage,
    });
  });
});
