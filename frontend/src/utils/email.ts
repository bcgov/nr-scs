/**
 * Single-address email format check.
 *
 * Deliberately stricter than the "something@something.something" shape: the local part is limited
 * to the characters an address may actually carry, the domain must be dot-separated labels ending
 * in an alphabetic TLD, and the whole string must match — an unanchored pattern accepts any text
 * with an address-like fragment buried in it (e.g. "email me at a@b.ca").
 */
const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

/** RFC 5321 §4.5.3.1 ceilings: 64 octets for the local part, 254 for the whole address. */
const MAX_ADDRESS_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;

/**
 * Whether `value` is a single, well-formed email address.
 *
 * Trims internally on purpose: callers are free to pass raw input, and the two `ReportPage` callers
 * that already hold a trimmed string do so for their own required-field check, not for this one.
 *
 * The length ceilings matter more here than they look. On the LETTER endpoints the server re-checks
 * the format (`LetterService.validateReportEmail`), but on the REPORT endpoints
 * `ReportEmailService` only rejects null/blank before handing the address to the mail client — so
 * for `/reports/*` this function is the only format guard in front of it, and an over-long address
 * would otherwise surface as a mail-send failure well after the user left the form.
 */
export const isValidEmail = (value: string): boolean => {
  const address = value.trim();
  // Keep the length ceilings ahead of the pattern test. Both repeated groups below are
  // unambiguous (each is prefixed by a literal the group itself cannot match), so there is no
  // catastrophic backtracking, but the dot-separated label parts still cost more than linear on a
  // long non-matching string. Capping the input first keeps that cost bounded.
  if (address.length > MAX_ADDRESS_LENGTH) {
    return false;
  }
  if (address.slice(0, address.lastIndexOf('@')).length > MAX_LOCAL_PART_LENGTH) {
    return false;
  }
  return EMAIL_PATTERN.test(address);
};
