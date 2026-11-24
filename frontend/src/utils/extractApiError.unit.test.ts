import { describe, expect, it } from 'vitest';

import {
  extractApiError,
  extractApiErrorAsync,
  extractFieldErrors,
  extractFieldErrorsAsync,
} from './extractApiError';

const FALLBACK = 'Something went wrong.';

describe('extractApiError', () => {
  it('prefers the backend response.data.message', () => {
    const err = { response: { data: { message: 'Code already exists', error: 'Conflict' } } };
    expect(extractApiError(err, FALLBACK)).toBe('Code already exists');
  });

  it('falls back to response.data.error when message is absent', () => {
    const err = { response: { data: { error: 'Conflict' } } };
    expect(extractApiError(err, FALLBACK)).toBe('Conflict');
  });

  it('falls back to response.data.code when message and error are absent', () => {
    const err = { response: { data: { code: 'RESOURCE_CONFLICT' } } };
    expect(extractApiError(err, FALLBACK)).toBe('RESOURCE_CONFLICT');
  });

  it('falls back to the Error message when the response carries no message/error', () => {
    const err = Object.assign(new Error('Network Error'), { response: { data: {} } });
    expect(extractApiError(err, FALLBACK)).toBe('Network Error');
  });

  it('uses the fallback when a response exists but carries nothing useful', () => {
    expect(extractApiError({ response: { data: {} } }, FALLBACK)).toBe(FALLBACK);
  });

  it('returns a plain Error message when there is no response', () => {
    expect(extractApiError(new Error('boom'), FALLBACK)).toBe('boom');
  });

  it('returns the fallback for an unknown error shape', () => {
    expect(extractApiError('weird', FALLBACK)).toBe(FALLBACK);
  });
});

describe('extractFieldErrors', () => {
  it('returns the structured fieldErrors from the backend error body', () => {
    const err = {
      response: {
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed for one or more fields.',
          fieldErrors: [
            { field: 'previousInspectionId', message: 'Inspection # 5 does not exist.' },
          ],
        },
      },
    };
    expect(extractFieldErrors(err)).toEqual([
      { field: 'previousInspectionId', message: 'Inspection # 5 does not exist.' },
    ]);
  });

  it('returns an empty array when the error carries no fieldErrors', () => {
    expect(extractFieldErrors({ response: { data: { message: 'Boom' } } })).toEqual([]);
  });

  it('skips malformed entries that are missing field or message', () => {
    const err = {
      response: {
        data: {
          fieldErrors: [
            { field: 'previousInspectionId', message: 'Inspection # 5 does not exist.' },
            { field: 'previousInspectionId' },
            { message: 'no field here' },
            'not-an-object',
          ],
        },
      },
    };
    expect(extractFieldErrors(err)).toEqual([
      { field: 'previousInspectionId', message: 'Inspection # 5 does not exist.' },
    ]);
  });

  it('returns an empty array for an unknown error shape', () => {
    expect(extractFieldErrors('weird')).toEqual([]);
    expect(extractFieldErrors(new Error('boom'))).toEqual([]);
  });
});

describe('extractApiErrorAsync', () => {
  it('parses a JSON error body delivered as a Blob (responseType: blob)', async () => {
    const blob = new Blob([JSON.stringify({ message: 'Letter not found' })], {
      type: 'application/json',
    });
    const err = { response: { data: blob } };
    await expect(extractApiErrorAsync(err, FALLBACK)).resolves.toBe('Letter not found');
  });

  it('defers to extractApiError for non-Blob errors', async () => {
    const err = { response: { data: { error: 'Bad request' } } };
    await expect(extractApiErrorAsync(err, FALLBACK)).resolves.toBe('Bad request');
  });

  it('uses the fallback when the Blob body is not valid JSON', async () => {
    const blob = new Blob(['<html>500</html>'], { type: 'text/html' });
    const err = { response: { data: blob } };
    await expect(extractApiErrorAsync(err, FALLBACK)).resolves.toBe(FALLBACK);
  });
});

describe('extractFieldErrorsAsync', () => {
  it('parses the field errors out of a JSON error body delivered as a Blob (responseType: blob)', async () => {
    const blob = new Blob([JSON.stringify({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed for one or more fields.',
      fieldErrors: [{ field: 'mark1', message: 'A Timbermark for ZZ9 does not exist in the system.' }],
    })], { type: 'application/json' });
    await expect(extractFieldErrorsAsync({ response: { data: blob } })).resolves.toEqual([
      { field: 'mark1', message: 'A Timbermark for ZZ9 does not exist in the system.' },
    ]);
  });

  it('defers to extractFieldErrors for non-Blob errors', async () => {
    const err = { response: { data: { fieldErrors: [{ field: 'a', message: 'b' }] } } };
    await expect(extractFieldErrorsAsync(err)).resolves.toEqual([{ field: 'a', message: 'b' }]);
  });

  it('returns no field errors when the Blob body is not valid JSON', async () => {
    const blob = new Blob(['<html>500</html>'], { type: 'text/html' });
    await expect(extractFieldErrorsAsync({ response: { data: blob } })).resolves.toEqual([]);
  });
});
