import { describe, expect, it } from 'vitest';

import {
  buildCreateRequest,
  buildIssueTypeOptions,
  buildUpdateRequest,
  createEmptyPerformanceRemarkFormValues,
  mapDetailToFormValues,
  mapServerFieldErrors,
  validatePerformanceRemarkForm,
  type PerformanceRemarkFormValues,
} from './performanceRemarkFormUtils';

import type { ScalerPerformanceRemarkDetail } from '@/services/scalerPerformanceRemarks.types';

const validValues = (
  overrides: Partial<PerformanceRemarkFormValues> = {},
): PerformanceRemarkFormValues => ({
  ...createEmptyPerformanceRemarkFormValues(),
  loggedTimestamp: '2025-01-10',
  scalerPerformanceActnCode: 'W',
  performanceRemarkDesc: 'Late submission',
  ...overrides,
});

describe('buildIssueTypeOptions', () => {
  it('maps static LOV rows to value/text options and drops rows without a code', () => {
    const options = buildIssueTypeOptions([
      { code: 'W', description: 'Warning' },
      { code: 'S', description: null },
      { code: null, description: 'ignored' },
    ]);

    expect(options).toEqual([
      { value: 'W', text: 'Warning' },
      { value: 'S', text: 'S' },
    ]);
  });
});

describe('validatePerformanceRemarkForm', () => {
  it('accepts a valid remark with an action', () => {
    expect(validatePerformanceRemarkForm(validValues())).toEqual({});
  });

  it('requires the date of incident', () => {
    const errors = validatePerformanceRemarkForm(validValues({ loggedTimestamp: '' }));
    expect(errors.loggedTimestamp).toBe('Date of Incident is required.');
  });

  it('rejects a future date of incident', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const future = nextYear.toISOString().slice(0, 10);

    const errors = validatePerformanceRemarkForm(validValues({ loggedTimestamp: future }));
    expect(errors.loggedTimestamp).toBe('Date of Incident cannot be in the future.');
  });

  it('requires an action code when the Action issue type is selected', () => {
    const errors = validatePerformanceRemarkForm(
      validValues({ issueType: 'ACTION', scalerPerformanceActnCode: '' }),
    );
    expect(errors.scalerPerformanceActnCode).toBe('Action is required.');
    expect(errors.scalerPerformanceOutcmCode).toBeUndefined();
  });

  it('requires an outcome code when the Outcome issue type is selected', () => {
    const errors = validatePerformanceRemarkForm(
      validValues({
        issueType: 'OUTCOME',
        scalerPerformanceActnCode: '',
        scalerPerformanceOutcmCode: '',
      }),
    );
    expect(errors.scalerPerformanceOutcmCode).toBe('Outcome is required.');
    expect(errors.scalerPerformanceActnCode).toBeUndefined();
  });

  it('ignores the action code when the Outcome issue type is selected', () => {
    const errors = validatePerformanceRemarkForm(
      validValues({ issueType: 'OUTCOME', scalerPerformanceOutcmCode: 'R' }),
    );
    expect(errors).toEqual({});
  });

  it('requires a description', () => {
    const errors = validatePerformanceRemarkForm(validValues({ performanceRemarkDesc: '   ' }));
    expect(errors.performanceRemarkDesc).toBe('Description is required.');
  });

  it('rejects a suspension start date after the end date', () => {
    const errors = validatePerformanceRemarkForm(
      validValues({ suspendStartDate: '2025-03-01', suspendEndDate: '2025-02-01' }),
    );
    expect(errors.suspendEndDate).toContain('on or before the suspension end date');
  });

  it('rejects a non-numeric check scale number', () => {
    const errors = validatePerformanceRemarkForm(validValues({ checkScaleId: 'abc' }));
    expect(errors.checkScaleId).toBe('Associated Check Scale # must be a positive number.');
  });

  it('rejects a zero check scale number', () => {
    const errors = validatePerformanceRemarkForm(validValues({ checkScaleId: '0' }));
    expect(errors.checkScaleId).toBe('Associated Check Scale # must be a positive number.');
  });

  it('rejects a malformed / non-existent calendar date of incident', () => {
    expect(
      validatePerformanceRemarkForm(validValues({ loggedTimestamp: '2026-02-30' })).loggedTimestamp,
    ).toBe('Date of Incident must be a valid date (YYYY-MM-DD).');
    expect(
      validatePerformanceRemarkForm(validValues({ loggedTimestamp: '07/07/2026' })).loggedTimestamp,
    ).toBe('Date of Incident must be a valid date (YYYY-MM-DD).');
  });
});

describe('mapServerFieldErrors', () => {
  it('maps field-scoped backend errors onto their form field key', () => {
    const { errors, banner } = mapServerFieldErrors([
      { field: 'checkScaleId', message: 'A check scale could not be found for 1121.' },
      { field: 'loggedTimestamp', message: 'Date of incident cannot be in the future.' },
    ]);

    expect(errors.checkScaleId).toBe('A check scale could not be found for 1121.');
    expect(errors.loggedTimestamp).toBe('Date of incident cannot be in the future.');
    expect(banner).toBeNull();
  });

  it('routes unmapped / field-less errors to the banner', () => {
    const { errors, banner } = mapServerFieldErrors([
      { field: 'issueType', message: 'Either an action or an outcome must be selected, but not both.' },
      { field: null, message: 'Something general went wrong.' },
    ]);

    expect(errors).toEqual({});
    expect(banner).toBe(
      'Either an action or an outcome must be selected, but not both. Something general went wrong.',
    );
  });

  it('returns empty errors and no banner when there are no field errors', () => {
    expect(mapServerFieldErrors(null)).toEqual({ errors: {}, banner: null });
    expect(mapServerFieldErrors([])).toEqual({ errors: {}, banner: null });
  });
});

describe('buildCreateRequest', () => {
  it('omits blank optional fields and converts the check scale number', () => {
    const request = buildCreateRequest(
      validValues({ checkScaleId: '55001', outcomeDesc: '  resolved  ' }),
    );

    expect(request).toEqual({
      loggedTimestamp: '2025-01-10',
      scalerPerformanceActnCode: 'W',
      scalerPerformanceOutcmCode: undefined,
      performanceRemarkDesc: 'Late submission',
      outcomeDesc: 'resolved',
      suspendStartDate: undefined,
      suspendEndDate: undefined,
      checkScaleId: 55001,
    });
  });

  it('sends only the outcome code when the Outcome issue type is selected', () => {
    const request = buildCreateRequest(
      validValues({
        issueType: 'OUTCOME',
        scalerPerformanceActnCode: 'W',
        scalerPerformanceOutcmCode: 'R',
      }),
    );

    expect(request.scalerPerformanceActnCode).toBeUndefined();
    expect(request.scalerPerformanceOutcmCode).toBe('R');
  });
});

describe('buildUpdateRequest', () => {
  it('produces the same editable payload as buildCreateRequest', () => {
    const values = validValues({ checkScaleId: '55001', outcomeDesc: 'resolved' });
    expect(buildUpdateRequest(values)).toEqual(buildCreateRequest(values));
  });
});

describe('mapDetailToFormValues', () => {
  const detail = (
    overrides: Partial<ScalerPerformanceRemarkDetail> = {},
  ): ScalerPerformanceRemarkDetail => ({
    scalerPerformanceRemarkId: 1001,
    scalerLicenceNo: '1234',
    loggedTimestamp: '2025-01-10',
    performanceRemarkDesc: 'Late submission',
    scalerPerformanceActnCode: 'W',
    scalerPerformanceOutcmCode: null,
    outcomeDesc: null,
    suspendStartDate: null,
    suspendEndDate: null,
    checkScaleId: null,
    ...overrides,
  });

  it('seeds ACTION issue type from a row carrying an action code', () => {
    const values = mapDetailToFormValues(detail());
    expect(values.issueType).toBe('ACTION');
    expect(values.scalerPerformanceActnCode).toBe('W');
    expect(values.scalerPerformanceOutcmCode).toBe('');
    expect(values.loggedTimestamp).toBe('2025-01-10');
    expect(values.performanceRemarkDesc).toBe('Late submission');
  });

  it('seeds OUTCOME issue type from a row carrying an outcome code', () => {
    const values = mapDetailToFormValues(
      detail({ scalerPerformanceActnCode: null, scalerPerformanceOutcmCode: 'R' }),
    );
    expect(values.issueType).toBe('OUTCOME');
    expect(values.scalerPerformanceOutcmCode).toBe('R');
    expect(values.scalerPerformanceActnCode).toBe('');
  });

  it('normalizes null optional fields to empty strings and stringifies the check scale id', () => {
    const values = mapDetailToFormValues(
      detail({
        checkScaleId: 55001,
        suspendStartDate: '2025-02-01',
        suspendEndDate: '2025-03-01',
        outcomeDesc: 'resolved',
      }),
    );
    expect(values.checkScaleId).toBe('55001');
    expect(values.suspendStartDate).toBe('2025-02-01');
    expect(values.suspendEndDate).toBe('2025-03-01');
    expect(values.outcomeDesc).toBe('resolved');
  });

  it('round-trips through buildUpdateRequest back to the source codes', () => {
    const source = detail({ checkScaleId: 55001 });
    const request = buildUpdateRequest(mapDetailToFormValues(source));
    expect(request.scalerPerformanceActnCode).toBe('W');
    expect(request.checkScaleId).toBe(55001);
    expect(request.performanceRemarkDesc).toBe('Late submission');
  });
});
