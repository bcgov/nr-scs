import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useLovOptionsMock = vi.fn();

vi.mock('@/hooks/useLovOptions', () => ({
  useLovOptions: (...args: unknown[]) => useLovOptionsMock(...args),
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({ userToken: vi.fn().mockResolvedValue('test-token') }),
}));

vi.mock('@/services/APIs', () => ({
  default: {
    lov: {
      getGradingCodeAppointmentTypeLov: vi.fn().mockResolvedValue([]),
      getScalerTrainingTypeLov: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  EDIT_VISIBLE_FIELD_KEYS,
  resolveServerErrors,
  useScalerFormLovOptions,
} from './support';

const withFieldErrors = (fieldErrors: Array<{ field?: string | null; message?: string | null }>) => ({
  response: { data: { fieldErrors } },
});

describe('resolveServerErrors', () => {
  it('maps a known server field onto its form key', () => {
    const result = resolveServerErrors(
      withFieldErrors([{ field: 'clientNumber', message: 'Unknown client.' }]),
      'Save failed.',
    );

    expect(result.fieldErrors).toEqual({ client: 'Unknown client.' });
    expect(result.formError).toBeNull();
  });

  it('maps every known field name', () => {
    const result = resolveServerErrors(
      withFieldErrors([
        { field: 'clientNumber', message: 'a' },
        { field: 'orgUnitNo', message: 'b' },
        { field: 'issuedDate', message: 'c' },
        { field: 'expiryDate', message: 'd' },
        { field: 'oathTakenInd', message: 'e' },
      ]),
      'Save failed.',
    );

    expect(result.fieldErrors).toEqual({
      client: 'a',
      district: 'b',
      effectiveDate: 'c',
      expiryDate: 'd',
      oathTaken: 'e',
    });
  });

  it('banners an unmapped field rather than dropping its message', () => {
    const result = resolveServerErrors(
      withFieldErrors([{ field: 'somethingNew', message: 'Backend says no.' }]),
      'Save failed.',
    );

    expect(result.fieldErrors).toEqual({});
    expect(result.formError).toBe('Backend says no.');
  });

  it('banners a mapped field that has no visible slot in the current mode', () => {
    // In edit mode the client renders read-only, so an inline error there would be invisible.
    const result = resolveServerErrors(
      withFieldErrors([{ field: 'clientNumber', message: 'Unknown client.' }]),
      'Save failed.',
      EDIT_VISIBLE_FIELD_KEYS,
    );

    expect(result.fieldErrors).toEqual({});
    expect(result.formError).toBe('Unknown client.');
  });

  it('keeps a mapped field inline when it does have a visible slot', () => {
    const result = resolveServerErrors(
      withFieldErrors([{ field: 'expiryDate', message: 'Too early.' }]),
      'Save failed.',
      EDIT_VISIBLE_FIELD_KEYS,
    );

    expect(result.fieldErrors).toEqual({ expiryDate: 'Too early.' });
    expect(result.formError).toBeNull();
  });

  it('splits inline and banner errors from the same response', () => {
    const result = resolveServerErrors(
      withFieldErrors([
        { field: 'expiryDate', message: 'Too early.' },
        { field: 'mystery', message: 'And also this.' },
      ]),
      'Save failed.',
      EDIT_VISIBLE_FIELD_KEYS,
    );

    expect(result.fieldErrors).toEqual({ expiryDate: 'Too early.' });
    expect(result.formError).toBe('And also this.');
  });

  it('joins several banner messages', () => {
    const result = resolveServerErrors(
      withFieldErrors([
        { field: 'x', message: 'First.' },
        { field: 'y', message: 'Second.' },
      ]),
      'Save failed.',
    );

    expect(result.formError).toBe('First. Second.');
  });

  it('falls back to the extracted API message when there are no field errors', () => {
    const result = resolveServerErrors(
      { response: { data: { message: 'Conflict detected.' } } },
      'Save failed.',
    );

    expect(result.fieldErrors).toEqual({});
    expect(result.formError).toBe('Conflict detected.');
  });

  it('falls back to the supplied message when the error carries nothing useful', () => {
    expect(resolveServerErrors({}, 'Save failed.').formError).toBe('Save failed.');
    expect(resolveServerErrors(null, 'Save failed.').formError).toBe('Save failed.');
  });

  it('uses a plain Error message over the fallback', () => {
    expect(resolveServerErrors(new Error('Network Error'), 'Save failed.').formError).toBe(
      'Network Error',
    );
  });

  it('falls back when the field errors array is present but empty', () => {
    const result = resolveServerErrors(withFieldErrors([]), 'Save failed.');

    expect(result.formError).toBe('Save failed.');
  });

  it('falls back when a field error carries neither a mapping nor a message', () => {
    const result = resolveServerErrors(
      withFieldErrors([{ field: 'mystery', message: null }]),
      'Save failed.',
    );

    expect(result.formError).toBe('Save failed.');
  });
});

describe('EDIT_VISIBLE_FIELD_KEYS', () => {
  it('excludes the fields that render read-only in edit mode', () => {
    expect(EDIT_VISIBLE_FIELD_KEYS.has('client')).toBe(false);
    expect(EDIT_VISIBLE_FIELD_KEYS.has('loc')).toBe(false);
  });

  it('includes the editable fields', () => {
    ['district', 'effectiveDate', 'expiryDate', 'oathTaken', 'appointment'].forEach((key) => {
      expect(EDIT_VISIBLE_FIELD_KEYS.has(key)).toBe(true);
    });
  });
});

describe('useScalerFormLovOptions', () => {
  beforeEach(() => {
    useLovOptionsMock.mockReset();
  });

  /** Both LOV hooks are called in order: appointment types first, then training types. */
  const stubLovs = (appointmentTypes: unknown[], trainingTypes: unknown[], errors: [unknown, unknown] = [null, null]) => {
    useLovOptionsMock
      .mockReturnValueOnce({ data: appointmentTypes, error: errors[0] })
      .mockReturnValueOnce({ data: trainingTypes, error: errors[1] });
  };

  it('maps appointment types into select options', () => {
    stubLovs(
      [
        {
          code: 'A1',
          description: 'Appointment one',
          scalerAppointmentType: 'PERM',
          scaleGradingSystemCode: 'BC',
        },
      ],
      [],
    );

    const { result } = renderHook(() => useScalerFormLovOptions());

    expect(result.current.appointmentOptions).toEqual([
      {
        value: 'A1',
        text: 'Appointment one',
        scalerAppointmentType: 'PERM',
        scaleGradingSystemCode: 'BC',
      },
    ]);
  });

  it('defaults the optional appointment attributes to empty strings', () => {
    stubLovs([{ code: 'A1', description: 'Appointment one' }], []);

    const { result } = renderHook(() => useScalerFormLovOptions());

    expect(result.current.appointmentOptions[0]).toMatchObject({
      scalerAppointmentType: '',
      scaleGradingSystemCode: '',
    });
  });

  it('drops entries missing a code or a description, which would render as blank rows', () => {
    stubLovs(
      [
        { code: 'A1', description: 'Keep me' },
        { code: '', description: 'No code' },
        { code: 'A3', description: '' },
        { code: 'A4' },
      ],
      [],
    );

    const { result } = renderHook(() => useScalerFormLovOptions());

    expect(result.current.appointmentOptions).toHaveLength(1);
    expect(result.current.appointmentOptions[0].value).toBe('A1');
  });

  it('maps training types into value/text options only', () => {
    stubLovs([], [{ code: 'T1', description: 'Exam' }]);

    const { result } = renderHook(() => useScalerFormLovOptions());

    expect(result.current.trainingOptions).toEqual([{ value: 'T1', text: 'Exam' }]);
  });

  it('surfaces each load error separately, so one failing LOV does not hide the other', () => {
    stubLovs([], [], ['appointments down', 'training down']);

    const { result } = renderHook(() => useScalerFormLovOptions());

    expect(result.current.appointmentTypesError).toBe('appointments down');
    expect(result.current.trainingTypesError).toBe('training down');
  });

  it('asks for the LOVs under stable cache keys', () => {
    stubLovs([], []);

    renderHook(() => useScalerFormLovOptions());

    expect(useLovOptionsMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      expect.objectContaining({ cacheKey: 'grading-code-appointment-type-lov' }),
    );
    expect(useLovOptionsMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      expect.objectContaining({ cacheKey: 'scaler-training-type-lov' }),
    );
  });
});
