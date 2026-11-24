import { describe, expect, it } from 'vitest';

import {
  FOLLOW_UP_ACTION_MAX_LENGTH,
  INSPECTION_COMMENTS_MAX_LENGTH,
  maxLengthError,
  QUESTION_COMMENTS_MAX_LENGTH,
} from './limits';

describe('inspection field limits', () => {
  it('carries the legacy lengths', () => {
    expect(INSPECTION_COMMENTS_MAX_LENGTH).toBe(2000);
    expect(QUESTION_COMMENTS_MAX_LENGTH).toBe(4000);
    expect(FOLLOW_UP_ACTION_MAX_LENGTH).toBe(4000);
  });

  it('accepts a value at the limit', () => {
    expect(maxLengthError('x'.repeat(2000), 2000, 'General Comments')).toBeUndefined();
  });

  it('names the field and limit when the value is too long', () => {
    expect(maxLengthError('x'.repeat(2001), 2000, 'General Comments')).toBe(
      'General Comments must be 2000 characters or fewer.',
    );
  });
});
