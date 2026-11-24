import { describe, expect, it } from 'vitest';

import { mapInspectionServerFieldErrors } from './fieldErrors';

/** Shapes an axios-style error carrying the backend's structured fieldErrors. */
const apiError = (fieldErrors: Array<{ field: string; message: string }>) => ({
  response: { data: { code: 'VALIDATION', message: 'Invalid', fieldErrors } },
});

describe('mapInspectionServerFieldErrors', () => {
  it('returns nothing mapped for an error with no field errors', () => {
    expect(mapInspectionServerFieldErrors(new Error('Network Error'))).toEqual({
      errors: {},
      firstFieldId: null,
      firstMessage: null,
      unmapped: [],
    });
  });

  it('maps a known inspection field to an inline error', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([{ field: 'inspectionDate', message: 'Date is in the future.' }]),
    );

    expect(result.errors).toEqual({ inspectionDate: 'Date is in the future.' });
    expect(result.unmapped).toEqual([]);
  });

  it('maps General Comments to the comments textarea', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([{ field: 'comments', message: 'Too long.' }]),
    );

    expect(result.errors).toEqual({ comments: 'Too long.' });
    expect(result.firstFieldId).toBe('inspection-comments');
    expect(result.unmapped).toEqual([]);
  });

  it('reports the DOM id of the mapped field so the page can scroll to it', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([{ field: 'inspectionDate', message: 'Date is in the future.' }]),
    );

    expect(result.firstFieldId).toBe('inspection-date');
    expect(result.firstMessage).toBe('Date is in the future.');
  });

  it('picks the topmost field on the form, not the first the backend listed', () => {
    // previousInspectionId sits above inspectionDate on the form.
    const result = mapInspectionServerFieldErrors(
      apiError([
        { field: 'inspectionDate', message: 'Date problem.' },
        { field: 'previousInspectionId', message: 'Previous inspection problem.' },
      ]),
    );

    expect(result.firstFieldId).toBe('previous-inspection-id');
    expect(result.firstMessage).toBe('Previous inspection problem.');
  });

  it('keeps the first message when the backend repeats a field', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([
        { field: 'inspectionDate', message: 'First message.' },
        { field: 'inspectionDate', message: 'Second message.' },
      ]),
    );

    expect(result.errors.inspectionDate).toBe('First message.');
  });

  it('collects an unknown field into unmapped rather than dropping it', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([{ field: 'somethingElse', message: 'Backend says no.' }]),
    );

    expect(result.errors).toEqual({});
    expect(result.unmapped).toEqual(['Backend says no.']);
    expect(result.firstFieldId).toBeNull();
  });

  it('splits known and unknown fields from one response', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([
        { field: 'inspectionDate', message: 'Date problem.' },
        { field: 'mystery', message: 'And this too.' },
      ]),
    );

    expect(result.errors).toEqual({ inspectionDate: 'Date problem.' });
    expect(result.unmapped).toEqual(['And this too.']);
  });

  it('ignores an unknown field carrying no message', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([{ field: 'mystery', message: '' }]),
    );

    expect(result.unmapped).toEqual([]);
  });

  it('maps both known fields when both fail', () => {
    const result = mapInspectionServerFieldErrors(
      apiError([
        { field: 'previousInspectionId', message: 'Not found.' },
        { field: 'inspectionDate', message: 'Too early.' },
      ]),
    );

    expect(result.errors).toEqual({
      previousInspectionId: 'Not found.',
      inspectionDate: 'Too early.',
    });
  });
});
