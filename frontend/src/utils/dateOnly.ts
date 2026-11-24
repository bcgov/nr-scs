/**
 * Helpers for calendar-only (`YYYY-MM-DD`) date strings as produced by the shared DateInput.
 * Centralizes the parse/compare/validate logic that was previously duplicated across the scaler
 * form-util modules (performance remarks, appointments, contacts).
 */

/**
 * Parses a strict `YYYY-MM-DD` string into a local Date, or returns null when the string is not a
 * real calendar date. Values JS would silently roll over (e.g. `2026-02-30` -> Mar 2) are rejected
 * by requiring the constructed date's components to round-trip.
 */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Whether a string is a valid strict `YYYY-MM-DD` calendar date. */
export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null;
}

/**
 * Compares two `YYYY-MM-DD` strings: negative if left is earlier, positive if later, 0 if equal.
 * Returns 0 when either side is not a valid date (callers guard validity separately).
 */
export function compareDateOnly(left: string, right: string): number {
  const leftDate = parseDateOnly(left);
  const rightDate = parseDateOnly(right);
  if (!leftDate || !rightDate) {
    return 0;
  }
  return leftDate.getTime() - rightDate.getTime();
}

/**
 * Whether a `YYYY-MM-DD` string is after the local calendar today. Uses local midnight (not
 * `toISOString()`, which is UTC and rolls the date over in the evening for Pacific users, wrongly
 * letting "tomorrow" pass). Returns false for a non-date string (callers guard validity separately).
 */
export function isFutureDateOnly(value: string): boolean {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() > today.getTime();
}

/**
 * Validation message for a date-only field, or null when the value is acceptable.
 *
 * Blank is acceptable here — whether a date is *required* is the caller's rule, not this one; this
 * only answers "is what they typed a real calendar date". Wording matches the API's own response for
 * the same input (`GlobalApiExceptionHandler`), so a value rejected client-side and the same value
 * rejected server-side read identically.
 *
 * Needed because the forms compared dates with `new Date(value)` and skipped the comparison when the
 * result was `Invalid Date` — so `2026-02-30` produced no error at all and was sent to the API.
 */
export function dateOnlyFieldError(value: string | null | undefined, label: string): string | null {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') {
    return null;
  }
  return isValidDateOnly(trimmed) ? null : `${label} is not a valid date.`;
}

/**
 * Normalise what a user typed into a date field, as applied when they click off the field.
 *
 * This only ever reshapes text — it never rejects. Anything it cannot confidently reshape is returned
 * unchanged so it stays on screen exactly as typed, and `isValidDateOnly` reports it when the form is
 * submitted. That split is deliberate: the field is forgiving while you type, strict when you send.
 *
 * Dashed input must be structurally right, and is completed as far as the user got:
 *   `2026-1-5` → `2026-01-05`   `26-01-05` → `2026-01-05`   `2026-1-` → `2026-01-`
 * A two-digit year becomes `20YY`; a single-digit month or day is zero-padded. Structural nonsense
 * (`YYY-M-`, `20-26-01-05`, a three-digit month) is left alone for submit to reject.
 *
 * Digits-only input is ALWAYS positional `YYYYMMDD` — the 20YY shorthand above applies to dashed entry
 * only, so a digits-only string has exactly one reading:
 *   `20260105` → `2026-01-05`     `260105` → `2601-05`     `2026` → `2026`
 *   more than 8 digits → the first 8 are used and the rest dropped
 * Separators appear only as far as the digits reach; nothing is padded or invented.
 *
 * Note it does NOT check whether the result is a real date: `20260732` becomes `2026-07-32` and is shown
 * that way. Displaying what the user meant and explaining it on submit beats silently inventing 1 August.
 */
export function normalizeDateInput(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') {
    return '';
  }

  const isDigits = (part: string) => /^\d+$/.test(part);

  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length > 3) {
      return trimmed;
    }
    const [year = '', month = '', day = ''] = parts;
    if ([year, month, day].some((part) => part !== '' && !isDigits(part))) {
      return trimmed;
    }
    const normalisedYear = year.length === 2 ? `20${year}` : year;
    if (normalisedYear !== '' && normalisedYear.length !== 4) {
      return trimmed;
    }
    const pad = (part: string) => (part.length === 1 ? `0${part}` : part);
    const normalisedMonth = pad(month);
    const normalisedDay = pad(day);
    if (
      (normalisedMonth !== '' && normalisedMonth.length !== 2)
      || (normalisedDay !== '' && normalisedDay.length !== 2)
    ) {
      return trimmed;
    }
    // Rebuild only as many segments as the user actually typed, so a half-finished entry stays half
    // finished rather than sprouting separators they did not ask for.
    return [normalisedYear, normalisedMonth, normalisedDay].slice(0, parts.length).join('-');
  }

  if (isDigits(trimmed)) {
    // Always positional YYYYMMDD — never a shorthand. The separators are inserted at the fixed 4/2/2
    // boundaries and only as far as the digits reach, so `260105` is a four-digit year plus a month
    // (`2601-05`), not a two-digit year. Digits-only entry therefore has exactly one reading, and a
    // half-typed value keeps the digits the user actually pressed rather than acquiring invented ones.
    const digits = trimmed.length > 8 ? trimmed.slice(0, 8) : trimmed;
    const segments = [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(
      (segment) => segment !== '',
    );
    return segments.join('-');
  }

  return trimmed;
}
