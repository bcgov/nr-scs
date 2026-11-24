import { describe, expect, it } from 'vitest';

import type { GradingCodeAppointmentTypeLov } from '@/services/lov.service';
import {
  buildAppointmentOptions,
  buildCreateRequest,
  buildUpdateRequest,
  createEmptyAppointmentFormValues,
  resolveAppointmentSelection,
  toAppointmentFormValues,
  validateAppointmentForm,
  type AppointmentOption,
  type ScalerAppointmentFormValues,
} from './appointmentFormUtils';

/** 'A' caps at 1 year, 'L' at 2, 'O' at 5; anything else is uncapped. */
const OPTIONS: AppointmentOption[] = [
  { value: 'ACT', text: 'Acting', scalerAppointmentType: 'A', scaleGradingSystemCode: 'BC' },
  { value: 'LIM', text: 'Limited', scalerAppointmentType: 'L', scaleGradingSystemCode: 'BC' },
  { value: 'ORD', text: 'Ordinary', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
  { value: 'UNC', text: 'Uncapped', scalerAppointmentType: 'Z', scaleGradingSystemCode: 'BC' },
];

const valid = (
  overrides: Partial<ScalerAppointmentFormValues> = {},
): ScalerAppointmentFormValues => ({
  appointmentCode: 'ORD',
  orgUnitNo: '',
  provinceWideInd: 'Y',
  issuedDate: '2026-01-01',
  expiryDate: '2026-12-31',
  cancellationDate: '',
  cancellationReasonTxt: '',
  ...overrides,
});

describe('buildAppointmentOptions', () => {
  it('maps a complete LOV item', () => {
    const items = [
      { code: 'ORD', description: 'Ordinary', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
    ] as GradingCodeAppointmentTypeLov[];

    expect(buildAppointmentOptions(items)).toEqual([
      { value: 'ORD', text: 'Ordinary', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
    ]);
  });

  it('drops an item missing any of the four fields, which would select nothing usable', () => {
    const items = [
      { code: '', description: 'd', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
      { code: 'A', description: '', scalerAppointmentType: 'O', scaleGradingSystemCode: 'BC' },
      { code: 'B', description: 'd', scalerAppointmentType: '', scaleGradingSystemCode: 'BC' },
      { code: 'C', description: 'd', scalerAppointmentType: 'O', scaleGradingSystemCode: '' },
    ] as GradingCodeAppointmentTypeLov[];

    expect(buildAppointmentOptions(items)).toEqual([]);
  });

  it('returns an empty list for an empty LOV', () => {
    expect(buildAppointmentOptions([])).toEqual([]);
  });
});

describe('createEmptyAppointmentFormValues', () => {
  it('starts every field blank', () => {
    expect(createEmptyAppointmentFormValues()).toEqual({
      appointmentCode: '',
      orgUnitNo: '',
      provinceWideInd: '',
      issuedDate: '',
      expiryDate: '',
      cancellationDate: '',
      cancellationReasonTxt: '',
    });
  });
});

describe('resolveAppointmentSelection', () => {
  it('finds the option matching the chosen code', () => {
    expect(resolveAppointmentSelection({ appointmentCode: 'LIM' }, OPTIONS)?.text).toBe('Limited');
  });

  it('returns undefined for a code that is not in the list', () => {
    expect(resolveAppointmentSelection({ appointmentCode: 'NOPE' }, OPTIONS)).toBeUndefined();
  });
});

describe('toAppointmentFormValues', () => {
  it('returns empty values for no detail', () => {
    expect(toAppointmentFormValues(null, OPTIONS)).toEqual(createEmptyAppointmentFormValues());
  });

  it('matches the option on type and grading system, not on the code', () => {
    // The stored record carries the type/grading pair; the form works in option codes.
    const values = toAppointmentFormValues(
      { scalerAppointmentType: 'L', scaleGradingSystemCode: 'BC' } as never,
      OPTIONS,
    );

    expect(values.appointmentCode).toBe('LIM');
  });

  it('leaves the code blank when nothing matches', () => {
    const values = toAppointmentFormValues(
      { scalerAppointmentType: 'X', scaleGradingSystemCode: 'ZZ' } as never,
      OPTIONS,
    );

    expect(values.appointmentCode).toBe('');
  });

  it('renders the org unit as a string and blanks a null one', () => {
    expect(toAppointmentFormValues({ orgUnitNo: 43 } as never, OPTIONS).orgUnitNo).toBe('43');
    expect(toAppointmentFormValues({ orgUnitNo: null } as never, OPTIONS).orgUnitNo).toBe('');
  });

  it('blanks a province-wide indicator that is neither Y nor N', () => {
    expect(
      toAppointmentFormValues({ provinceWideInd: 'X' } as never, OPTIONS).provinceWideInd,
    ).toBe('');
  });
});

describe('validateAppointmentForm — core rules', () => {
  it('accepts a valid province-wide appointment', () => {
    expect(validateAppointmentForm(valid(), OPTIONS, 'create')).toEqual({});
  });

  it('requires an appointment', () => {
    expect(
      validateAppointmentForm(valid({ appointmentCode: '' }), OPTIONS, 'create').appointmentCode,
    ).toBe('Appointment is required.');
  });

  it('rejects an appointment code that is not in the options', () => {
    expect(
      validateAppointmentForm(valid({ appointmentCode: 'NOPE' }), OPTIONS, 'create')
        .appointmentCode,
    ).toBe('Appointment is required.');
  });

  it('requires the province-wide choice', () => {
    expect(
      validateAppointmentForm(valid({ provinceWideInd: '' }), OPTIONS, 'create').provinceWideInd,
    ).toBe('Province Wide is required.');
  });

  it('requires a district when the appointment is not province-wide', () => {
    expect(
      validateAppointmentForm(valid({ provinceWideInd: 'N', orgUnitNo: '' }), OPTIONS, 'create')
        .orgUnitNo,
    ).toBe('District is required when the appointment is not province-wide.');
  });

  it('forbids a district when the appointment is province-wide', () => {
    expect(
      validateAppointmentForm(valid({ provinceWideInd: 'Y', orgUnitNo: '43' }), OPTIONS, 'create')
        .orgUnitNo,
    ).toBe('District must be omitted when the appointment is province-wide.');
  });

  it('requires an effective date', () => {
    expect(
      validateAppointmentForm(valid({ issuedDate: '' }), OPTIONS, 'create').issuedDate,
    ).toBe('Effective Date is required.');
  });

  it('rejects an unparseable effective date', () => {
    expect(
      validateAppointmentForm(valid({ issuedDate: 'nope' }), OPTIONS, 'create').issuedDate,
    ).toBe('Effective Date must be a valid date (YYYY-MM-DD).');
  });

  it('rejects an expiry date before the effective date', () => {
    expect(
      validateAppointmentForm(
        valid({ issuedDate: '2026-06-01', expiryDate: '2026-01-01' }),
        OPTIONS,
        'create',
      ).expiryDate,
    ).toBe('Appointment effective date must be on or before the appointment expiry date.');
  });

  it('accepts an expiry equal to the effective date', () => {
    expect(
      validateAppointmentForm(
        valid({ issuedDate: '2026-06-01', expiryDate: '2026-06-01' }),
        OPTIONS,
        'create',
      ).expiryDate,
    ).toBeUndefined();
  });
});

describe('validateAppointmentForm — maximum duration by appointment type', () => {
  it.each([
    ['ACT', 1],
    ['LIM', 2],
    ['ORD', 5],
  ])('%s allows exactly its %s year maximum', (code, years) => {
    const expiry = `${2026 + (years as number)}-01-01`;
    const errors = validateAppointmentForm(
      valid({ appointmentCode: code as string, issuedDate: '2026-01-01', expiryDate: expiry }),
      OPTIONS,
      'create',
    );

    expect(errors.expiryDate).toBeUndefined();
  });

  it.each([
    ['ACT', 1],
    ['LIM', 2],
    ['ORD', 5],
  ])('%s rejects a term one day beyond its %s year maximum', (code, years) => {
    const expiry = `${2026 + (years as number)}-01-02`;
    const errors = validateAppointmentForm(
      valid({ appointmentCode: code as string, issuedDate: '2026-01-01', expiryDate: expiry }),
      OPTIONS,
      'create',
    );

    expect(errors.expiryDate).toContain(`cannot be more than ${years} year(s)`);
  });

  it('leaves an appointment type with no configured maximum uncapped', () => {
    const errors = validateAppointmentForm(
      valid({ appointmentCode: 'UNC', issuedDate: '2026-01-01', expiryDate: '2099-01-01' }),
      OPTIONS,
      'create',
    );

    expect(errors.expiryDate).toBeUndefined();
  });
});

describe('validateAppointmentForm — cancellation, edit mode only', () => {
  const pairMessage =
    'Cancellation date and reason must either both be provided or both be omitted.';

  it('ignores cancellation fields in create mode', () => {
    const errors = validateAppointmentForm(
      valid({ cancellationDate: '2026-06-01' }),
      OPTIONS,
      'create',
    );

    expect(errors.cancellationDate).toBeUndefined();
  });

  it('demands both cancellation fields in edit mode when only the date is given', () => {
    const errors = validateAppointmentForm(
      valid({ cancellationDate: '2026-06-01' }),
      OPTIONS,
      'edit',
    );

    expect(errors.cancellationDate).toBe(pairMessage);
    expect(errors.cancellationReasonTxt).toBe(pairMessage);
  });

  it('demands both when only the reason is given', () => {
    const errors = validateAppointmentForm(
      valid({ cancellationReasonTxt: 'Surrendered' }),
      OPTIONS,
      'edit',
    );

    expect(errors.cancellationDate).toBe(pairMessage);
  });

  it('accepts both provided together', () => {
    const errors = validateAppointmentForm(
      valid({ cancellationDate: '2026-06-01', cancellationReasonTxt: 'Surrendered' }),
      OPTIONS,
      'edit',
    );

    expect(errors.cancellationDate).toBeUndefined();
  });

  it('rejects an unparseable cancellation date', () => {
    const errors = validateAppointmentForm(
      valid({ cancellationDate: 'nope', cancellationReasonTxt: 'Surrendered' }),
      OPTIONS,
      'edit',
    );

    expect(errors.cancellationDate).toBe('Cancellation date must be a valid date (YYYY-MM-DD).');
  });
});

describe('buildCreateRequest', () => {
  it('sends the type and grading system from the chosen option, not the option code', () => {
    expect(buildCreateRequest(valid(), OPTIONS)).toEqual({
      scalerAppointmentType: 'O',
      scaleGradingSystemCode: 'BC',
      orgUnitNo: undefined,
      provinceWideInd: 'Y',
      issuedDate: '2026-01-01',
      expiryDate: '2026-12-31',
    });
  });

  it('omits the district for a province-wide appointment', () => {
    expect(buildCreateRequest(valid({ provinceWideInd: 'Y', orgUnitNo: '43' }), OPTIONS).orgUnitNo)
      .toBeUndefined();
  });

  it('sends the district as a number when not province-wide', () => {
    expect(
      buildCreateRequest(valid({ provinceWideInd: 'N', orgUnitNo: '43' }), OPTIONS).orgUnitNo,
    ).toBe(43);
  });

  it('omits an absent expiry date', () => {
    expect(buildCreateRequest(valid({ expiryDate: '' }), OPTIONS).expiryDate).toBeUndefined();
  });

  it('refuses to build without a resolvable appointment', () => {
    expect(() => buildCreateRequest(valid({ appointmentCode: 'NOPE' }), OPTIONS)).toThrow(
      'Appointment form is incomplete.',
    );
  });

  it('refuses to build without the province-wide choice', () => {
    expect(() => buildCreateRequest(valid({ provinceWideInd: '' }), OPTIONS)).toThrow(
      'Appointment form is incomplete.',
    );
  });
});

describe('buildUpdateRequest', () => {
  it('adds the cancellation fields to the create payload', () => {
    const request = buildUpdateRequest(
      valid({ cancellationDate: '2026-06-01', cancellationReasonTxt: '  Surrendered  ' }),
      OPTIONS,
    );

    expect(request.cancellationDate).toBe('2026-06-01');
    expect(request.cancellationReasonTxt).toBe('Surrendered');
  });

  it('omits empty cancellation fields rather than sending blanks', () => {
    const request = buildUpdateRequest(valid(), OPTIONS);

    expect(request.cancellationDate).toBeUndefined();
    expect(request.cancellationReasonTxt).toBeUndefined();
  });

  it('omits a whitespace-only cancellation reason', () => {
    expect(
      buildUpdateRequest(valid({ cancellationReasonTxt: '   ' }), OPTIONS).cancellationReasonTxt,
    ).toBeUndefined();
  });
});
