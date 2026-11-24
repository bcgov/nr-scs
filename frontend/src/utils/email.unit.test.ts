import { describe, expect, it } from 'vitest';

import { isValidEmail } from '@/utils/email';

describe('isValidEmail', () => {
  it.each([
    'someone@email.com',
    'reports@example.gov.bc.ca',
    'first.last@example.com',
    'first+tag@example.com',
    'user_name@sub-domain.example.io',
    'a@b.ca',
    '  padded@example.com  ',
  ])('accepts %s', (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each([
    '',
    '   ',
    'not-an-email',
    'nope',
    'someone@email',
    'someone@email.',
    'someone@.com',
    '@email.com',
    'someone@@email.com',
    'someone@email..com',
    '.someone@email.com',
    'someone.@email.com',
    'someone@-email.com',
    'someone@email.c',
    'someone@email.c0m',
    'someone @email.com',
    'someone@email .com',
    'someone@email.com someone.else@email.com',
    // An unanchored pattern would pass these on the strength of the fragment inside them.
    'email me at someone@email.com',
    'someone@email.com!!',
  ])('rejects %s', (value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  // RFC 5321 ceilings. These matter because on the /reports/* endpoints this check is the only format
  // guard in front of the mail client — ReportEmailService only rejects null/blank.
  describe('length ceilings', () => {
    const domain = '@example.com'; // 12 chars

    it('accepts a local part at the 64-character limit', () => {
      expect(isValidEmail(`${'a'.repeat(64)}${domain}`)).toBe(true);
    });

    it('rejects a local part one character over the limit', () => {
      expect(isValidEmail(`${'a'.repeat(65)}${domain}`)).toBe(false);
    });

    it('accepts a whole address at the 254-character limit', () => {
      // 64-char local part + '@' + a domain padded to bring the total to exactly 254.
      const local = 'a'.repeat(64);
      const label = 'b'.repeat(254 - local.length - 1 - '.com'.length);
      const address = `${local}@${label}.com`;
      expect(address).toHaveLength(254);
      expect(isValidEmail(address)).toBe(true);
    });

    it('rejects a whole address one character over the limit', () => {
      const local = 'a'.repeat(64);
      const label = 'b'.repeat(255 - local.length - 1 - '.com'.length);
      const address = `${local}@${label}.com`;
      expect(address).toHaveLength(255);
      expect(isValidEmail(address)).toBe(false);
    });

    it('measures the ceilings after trimming, not before', () => {
      const address = `${'a'.repeat(64)}${domain}`;
      expect(isValidEmail(`   ${address}   `)).toBe(true);
    });
  });
});
