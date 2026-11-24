import { describe, expect, it } from 'vitest';

import { validate } from './validate';
import type { QuestionFormState } from './QuestionsModal';

const validForm: QuestionFormState = {
  questionText: 'Is the load secure?',
  commentRequiredInd: 'Y',
  sortOrderNo: '10',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  inspectionTypeCodes: ['A'],
  scalingMethodTypeCodes: ['B'],
  validResponseCodes: ['Y', 'N'],
};

describe('Questions validate', () => {
  it('accepts a valid form', () => {
    expect(validate(validForm)).toEqual({});
  });

  it('flags a question longer than 200 characters with a field-specific message', () => {
    const errors = validate({ ...validForm, questionText: 'x'.repeat(201) });
    expect(errors.questionText).toBe('Question cannot be greater than 200 characters.');
  });

  it('accepts a question of exactly 200 characters', () => {
    const errors = validate({ ...validForm, questionText: 'x'.repeat(200) });
    expect(errors.questionText).toBeUndefined();
  });

  it('still flags a blank question as required', () => {
    const errors = validate({ ...validForm, questionText: '   ' });
    expect(errors.questionText).toBe('Question is required.');
  });

  it('flags a sort order above 9999 (more than four digits) with a range message', () => {
    const errors = validate({ ...validForm, sortOrderNo: '12345' });
    expect(errors.sortOrderNo).toBe('Sort order must be between 0 and 9999.');
  });

  it('accepts a sort order of exactly 9999', () => {
    const errors = validate({ ...validForm, sortOrderNo: '9999' });
    expect(errors.sortOrderNo).toBeUndefined();
  });

  it('flags a negative sort order', () => {
    const errors = validate({ ...validForm, sortOrderNo: '-1' });
    expect(errors.sortOrderNo).toBe('Sort order must be between 0 and 9999.');
  });

  it('flags a non-whole-number sort order', () => {
    const errors = validate({ ...validForm, sortOrderNo: '12.5' });
    expect(errors.sortOrderNo).toBe('Sort order must be a whole number.');
  });
});
