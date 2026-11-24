import { parseDateOnly } from '@/utils/dateOnly';

/**
 * Shared date-window validation for the Reports screens.
 *
 * WHY THIS EXISTS. The two District Performance screens each carried their own copy of this logic — twice
 * over, in fact (a `validateDates` callback plus a duplicated `rangeError` useMemo) — while the six other
 * report screens had no date validation at all, so an inverted window (From later than To) was accepted and
 * sent to the report engine. Rather than add six more copies, all eight screens now call this one helper.
 *
 * The rule set is deliberately tiered, because the screens genuinely differ:
 *   • ORDERING ("To Date must be on or after From Date.") applies to every screen with a date window.
 *   • REQUIRED and the ONE-YEAR CAP apply only to the District Performance reports, which is where the
 *     legacy spec put them. The register/exception reports accept an open-ended window on purpose — a
 *     multi-year register report is a legitimate request, so `required`/`maxYears` are opt-in.
 *   • PAIRING ("enter both or neither") applies only to the Mark Site Designation report, the one screen
 *     where legacy enforced it (`MarkSiteDesignationReportBo.validateDates`, messages
 *     `errors.mark_site_eff_date_both` / `errors.mark_site_exp_date_both`). It is distinct from `required`:
 *     an empty window is still perfectly legal, it is a HALF-filled one that is rejected.
 *
 * Message wording matches what the District Performance screens already showed, so all eight report screens
 * report the same rule with the same words. (The legacy system phrased the ordering rule as "From Date must
 * be less than or equal the To Date."; the new app's wording is the canonical one — a documented
 * re-grounding, the same treatment the email-validation messages already get.)
 */

/** Which validations run. `change` fires as the user edits; `submit` adds the rules that only gate sending. */
export type ReportDateValidationMode = 'change' | 'submit';

export type ReportDateRangeOptions = {
  /** District Performance only: both dates must be supplied before the report can be sent. */
  required?: boolean;
  /**
   * Mark Site Designation report only: the two dates are all-or-nothing. Leaving BOTH blank is fine (the
   * window is simply not filtered on); filling exactly one is rejected. Orthogonal to `required`, which
   * demands both unconditionally — do not set both on the same window.
   */
  pairedRequired?: boolean;
  /** District Performance only: cap the window (1 = "cannot be more than 1 year(s)"). */
  maxYears?: number;
  /**
   * Field names used in the messages. Defaults suit a screen with a single "From Date"/"To Date" pair; the
   * Mark Site Designation report passes its own, because it has TWO windows (effective and expiry) and a
   * generic "To Date" message could not tell the user which one is wrong.
   */
  fromLabel?: string;
  toLabel?: string;
};

export type ReportDateRangeErrors = {
  /** Field-level message for the From input (`invalid`/`invalidText`), or null. */
  fromError: string | null;
  /** Field-level message for the To input, or null. */
  toError: string | null;
  /**
   * Which cross-field rule failed (ordering or the one-year cap), or null. Screens do NOT render this
   * directly — it is mirrored onto `toError` below and shown as the To field's own requirement text, so the
   * message appears exactly once and stays attached to an input. It is kept as a distinct field because
   * `hasReportDateErrors` and the unit tests need to tell a cross-field failure from a per-field one.
   */
  rangeError: string | null;
};

const NO_ERRORS: ReportDateRangeErrors = { fromError: null, toError: null, rangeError: null };


/**
 * Validate a report's date window.
 *
 * Note on invalid text: this helper now parses STRICTLY, via `utils/dateOnly`. It previously used a local
 * `new Date(value + 'T00:00:00') + isNaN` parser, which looks like a validity check but is not: V8 rolls a
 * day overflow over rather than rejecting it, so `2026-09-31` became 1 October and `2026-02-30` became
 * 2 March — silently — and the cross-field ordering/maxYears rules below then compared the rolled-over
 * date. Only an out-of-range MONTH (`2026-13-01`) was ever caught. Report screens are also the one place
 * the backend cannot rescue: they request `responseType: 'blob'`, and the Axios interceptor de-blobs only
 * 5xx, so a 400's field message arrives as an unreadable Blob and surfaces as "Request failed with status
 * code 400". This helper is therefore the only line of defence for a report date.
 */
export function validateReportDateRange(
  fromDate: string,
  toDate: string,
  mode: ReportDateValidationMode = 'change',
  options: ReportDateRangeOptions = {},
): ReportDateRangeErrors {
  const {
    required = false,
    pairedRequired = false,
    maxYears,
    fromLabel = 'From Date',
    toLabel = 'To Date',
  } = options;

  let fromError: string | null = null;
  let toError: string | null = null;
  let rangeError: string | null = null;

  // Required-ness and unparseable values only block SENDING — nagging while the user is still typing the
  // first of two dates would flag a form they have not finished filling in.
  if (mode === 'submit') {
    if (required && !fromDate) {
      fromError = `${fromLabel} is required.`;
    }
    if (required && !toDate) {
      toError = `${toLabel} is required.`;
    }
    // Pairing: exactly one of the two supplied. Legacy raised the SAME message in both directions and hung
    // it on the FROM field either way (`Constants.MARK_SITE_DESIGNATION_REPORT_EFF_FROM_DATE`, even when it
    // was the To date that was missing), so the message lands there here too rather than on whichever input
    // happens to be empty — the screenshot QA files against is the From-field one.
    if (pairedRequired && Boolean(fromDate) !== Boolean(toDate)) {
      fromError = `If a value is entered in either ${fromLabel} or ${toLabel}, then a value must be entered in both.`;
    }
    // Calendar validity is reported on SUBMIT, matching legacy: the user is free to type an impossible
    // date and is told about it when they try to send, not while they are mid-entry. That is also what
    // every other form in the app does (`useMaintenanceCrud` defaults `revalidateOnChange` to false, and
    // the check-scale header validates in its save handler), so the report screens stay consistent with
    // both. The value itself survives on screen either way - `DateInput` keeps unparseable text in the
    // field - so the message lands next to what the user actually typed.
    if (fromDate && !parseDateOnly(fromDate)) {
      fromError = `${fromLabel} must be a valid date.`;
    }
    if (toDate && !parseDateOnly(toDate)) {
      toError = `${toLabel} must be a valid date.`;
    }
  }

  // Cross-field rules run in BOTH modes, so an impossible window is called out as soon as the second date
  // is entered rather than only on submit.
  const parsedFrom = parseDateOnly(fromDate);
  const parsedTo = parseDateOnly(toDate);

  if (parsedFrom && parsedTo) {
    if (parsedFrom > parsedTo) {
      rangeError = `${toLabel} must be on or after ${fromLabel}.`;
    } else if (maxYears !== undefined) {
      const maxRange = new Date(parsedFrom);
      maxRange.setFullYear(maxRange.getFullYear() + maxYears);
      // `<` not `<=`: a window of EXACTLY maxYears is allowed.
      if (maxRange < parsedTo) {
        rangeError = `Search date range cannot be more than ${maxYears} year(s).`;
      }
    }
  }

  if (rangeError) {
    // The To field is where a cross-field failure is REPORTED: `DateInput` renders `invalidText` as the
    // field's requirement text, which puts the message directly below the input and associates it via
    // `aria-describedby`. The screens deliberately render it only here — an earlier version also showed a
    // separate form-level banner, which duplicated the same sentence on the page.
    toError = rangeError;
  }

  return { fromError, toError, rangeError };
}

/** True when nothing failed — lets a `handleSend` bail out without inspecting each field. */
export function hasReportDateErrors(errors: ReportDateRangeErrors): boolean {
  return Boolean(errors.fromError || errors.toError || errors.rangeError);
}

export { NO_ERRORS as noReportDateErrors };
