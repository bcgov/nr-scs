import { describe, expect, it } from 'vitest';

import {
  MARK_SITE_DESIGNATION_TEXT_LIMITS,
  type MarkSiteDesignationTextValues,
  validateMarkSiteDesignationTextLengths,
} from './markSiteDesignationLengths';

const emptyValues = (): MarkSiteDesignationTextValues => ({
  geographicLocation: '',
  timberDescription: '',
  transportationDateDesc: '',
  otherRequirements: '',
});

describe('validateMarkSiteDesignationTextLengths', () => {
  it('reports nothing when every field is empty', () => {
    expect(validateMarkSiteDesignationTextLengths(emptyValues())).toEqual({});
  });

  it.each(MARK_SITE_DESIGNATION_TEXT_LIMITS)(
    'accepts $label at exactly $max characters and rejects one more',
    ({ key, label, max }) => {
      expect(
        validateMarkSiteDesignationTextLengths({ ...emptyValues(), [key]: 'X'.repeat(max) }),
      ).toEqual({});

      expect(
        validateMarkSiteDesignationTextLengths({ ...emptyValues(), [key]: 'X'.repeat(max + 1) }),
      ).toEqual({ [key]: `${label} can not be greater than ${max} characters.` });
    },
  );

  it('reports every over-length field at once, not just the first', () => {
    expect(
      validateMarkSiteDesignationTextLengths({
        geographicLocation: 'X'.repeat(41),
        timberDescription: 'X'.repeat(41),
        transportationDateDesc: '',
        otherRequirements: '',
      }),
    ).toEqual({
      geographicLocation: 'Geographic Location can not be greater than 40 characters.',
      timberDescription: 'Timber Description can not be greater than 40 characters.',
    });
  });

  it('measures the trimmed value, matching what the payload sends', () => {
    // 40 real characters plus surrounding whitespace is not an overflow: the payload trims before
    // sending, so the column only ever sees 40.
    expect(
      validateMarkSiteDesignationTextLengths({
        ...emptyValues(),
        geographicLocation: `   ${'X'.repeat(40)}   `,
      }),
    ).toEqual({});
  });
});
