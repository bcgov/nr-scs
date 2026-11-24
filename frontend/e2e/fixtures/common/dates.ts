/**
 * Cross-domain date helpers — no domain vocabulary. Promoted out of fixtures/chk/chk-test-data.ts once
 * more domains (CCQ, INS) needed the same today-relative pattern. SCS enforces non-future
 * scale/inspection dates and effective/expiry windows on reference data, so test dates MUST be
 * today-relative — never hardcoded literals that silently age into "future date" or out-of-window
 * failures. Every SCS screen with a date field is a candidate (CHK scale dates, INS inspection/follow-up
 * dates, …).
 */

/**
 * Local (not UTC) `YYYY-MM-DD` for `n` days before today — avoids a timezone off-by-one near midnight
 * and keeps the value non-future. SCS treats these dates as plain LocalDate, so local is correct.
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Today-relative future date (`n` days ahead) for the re-grounded "date cannot be in the future" checks. */
export function daysAhead(n: number): string {
  return daysAgo(-n);
}
