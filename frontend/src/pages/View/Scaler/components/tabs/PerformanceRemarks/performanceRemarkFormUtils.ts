import type { StaticLov } from '@/services/lov.service';
import type {
  ScalerPerformanceRemarkCreateRequest,
  ScalerPerformanceRemarkDetail,
  ScalerPerformanceRemarkUpdateRequest,
} from '@/services/scalerPerformanceRemarks.types';
import { compareDateOnly, isValidDateOnly, parseDateOnly } from '@/utils/dateOnly';
import { toValueTextOptions, type ValueTextOption } from '@/utils/lovOptions';

export type IssueTypeOption = ValueTextOption;

// The legacy "Issue Type" is either an Action or an Outcome — never both. The user picks which one
// applies, then supplies the matching code.
export type PerformanceRemarkIssueType = 'ACTION' | 'OUTCOME';

export interface PerformanceRemarkFormValues {
  loggedTimestamp: string;
  issueType: PerformanceRemarkIssueType;
  scalerPerformanceActnCode: string;
  scalerPerformanceOutcmCode: string;
  performanceRemarkDesc: string;
  outcomeDesc: string;
  suspendStartDate: string;
  suspendEndDate: string;
  checkScaleId: string;
}

export type PerformanceRemarkFormErrors = Partial<
  Record<keyof PerformanceRemarkFormValues, string>
>;

export function buildIssueTypeOptions(items: StaticLov[]): IssueTypeOption[] {
  return toValueTextOptions(items);
}

export function createEmptyPerformanceRemarkFormValues(): PerformanceRemarkFormValues {
  return {
    loggedTimestamp: '',
    issueType: 'ACTION',
    scalerPerformanceActnCode: '',
    scalerPerformanceOutcmCode: '',
    performanceRemarkDesc: '',
    outcomeDesc: '',
    suspendStartDate: '',
    suspendEndDate: '',
    checkScaleId: '',
  };
}

export function validatePerformanceRemarkForm(
  values: PerformanceRemarkFormValues,
): PerformanceRemarkFormErrors {
  const errors: PerformanceRemarkFormErrors = {};

  if (!values.loggedTimestamp) {
    errors.loggedTimestamp = 'Date of Incident is required.';
  } else if (!isValidDateOnly(values.loggedTimestamp)) {
    errors.loggedTimestamp = 'Date of Incident must be a valid date (YYYY-MM-DD).';
  } else if (isFutureDate(values.loggedTimestamp)) {
    errors.loggedTimestamp = 'Date of Incident cannot be in the future.';
  }

  // Only the code matching the selected Issue Type is required (and the only one submitted).
  if (values.issueType === 'ACTION') {
    if (!values.scalerPerformanceActnCode) {
      errors.scalerPerformanceActnCode = 'Action is required.';
    }
  } else if (!values.scalerPerformanceOutcmCode) {
    errors.scalerPerformanceOutcmCode = 'Outcome is required.';
  }

  if (!values.performanceRemarkDesc.trim()) {
    errors.performanceRemarkDesc = 'Description is required.';
  }

  if (values.suspendStartDate && !isValidDateOnly(values.suspendStartDate)) {
    errors.suspendStartDate = 'Suspension Start Date must be a valid date (YYYY-MM-DD).';
  }
  if (values.suspendEndDate && !isValidDateOnly(values.suspendEndDate)) {
    errors.suspendEndDate = 'Suspension End Date must be a valid date (YYYY-MM-DD).';
  }

  if (
    !errors.suspendStartDate &&
    !errors.suspendEndDate &&
    values.suspendStartDate &&
    values.suspendEndDate &&
    compareDateOnly(values.suspendStartDate, values.suspendEndDate) > 0
  ) {
    errors.suspendEndDate =
      'Suspension start date must be on or before the suspension end date.';
  }

  if (values.checkScaleId.trim() && !isPositiveInteger(values.checkScaleId)) {
    errors.checkScaleId = 'Associated Check Scale # must be a positive number.';
  }

  return errors;
}

export interface ServerFieldError {
  field?: string | null;
  message?: string | null;
}

// Backend field-scoped validation errors (FieldValidationException) use field names that match the
// form value keys, so they map straight onto the inline error record. Anything unmapped (or a
// form-level error with no field) falls back to the banner.
const SERVER_FIELD_KEYS = new Set<string>([
  'loggedTimestamp',
  'performanceRemarkDesc',
  'suspendStartDate',
  'suspendEndDate',
  'checkScaleId',
]);

export function mapServerFieldErrors(
  fieldErrors: ServerFieldError[] | null | undefined,
): { errors: PerformanceRemarkFormErrors; banner: string | null } {
  const errors: PerformanceRemarkFormErrors = {};
  const unmapped: string[] = [];
  (fieldErrors ?? []).forEach((fieldError) => {
    const message = fieldError.message ?? '';
    if (fieldError.field && SERVER_FIELD_KEYS.has(fieldError.field)) {
      errors[fieldError.field as keyof PerformanceRemarkFormValues] = message;
    } else if (message) {
      unmapped.push(message);
    }
  });
  return { errors, banner: unmapped.length > 0 ? unmapped.join(' ') : null };
}

export function buildCreateRequest(
  values: PerformanceRemarkFormValues,
): ScalerPerformanceRemarkCreateRequest {
  return {
    loggedTimestamp: values.loggedTimestamp,
    scalerPerformanceActnCode:
      values.issueType === 'ACTION' ? values.scalerPerformanceActnCode || undefined : undefined,
    scalerPerformanceOutcmCode:
      values.issueType === 'OUTCOME' ? values.scalerPerformanceOutcmCode || undefined : undefined,
    performanceRemarkDesc: values.performanceRemarkDesc.trim(),
    outcomeDesc: values.outcomeDesc.trim() || undefined,
    suspendStartDate: values.suspendStartDate || undefined,
    suspendEndDate: values.suspendEndDate || undefined,
    checkScaleId: values.checkScaleId.trim() ? Number(values.checkScaleId) : undefined,
  };
}

// The update payload carries the same editable fields as create — the id travels in the URL path.
export function buildUpdateRequest(
  values: PerformanceRemarkFormValues,
): ScalerPerformanceRemarkUpdateRequest {
  return buildCreateRequest(values);
}

// Seeds the edit form from the row the tab already loaded. The legacy "Issue Type" is whichever of
// Action / Outcome carries a code on the record; a row with neither defaults to Action (matching the
// empty-create default) so the form is always in a valid one-of state.
export function mapDetailToFormValues(
  remark: ScalerPerformanceRemarkDetail,
): PerformanceRemarkFormValues {
  // Trim before deciding so a space-padded code from a fixed-width column doesn't read as truthy
  // and flip the type (the backend trims codes similarly on write).
  const issueType: PerformanceRemarkIssueType = remark.scalerPerformanceOutcmCode?.trim()
    ? 'OUTCOME'
    : 'ACTION';
  return {
    loggedTimestamp: remark.loggedTimestamp ?? '',
    issueType,
    scalerPerformanceActnCode: remark.scalerPerformanceActnCode ?? '',
    scalerPerformanceOutcmCode: remark.scalerPerformanceOutcmCode ?? '',
    performanceRemarkDesc: remark.performanceRemarkDesc ?? '',
    outcomeDesc: remark.outcomeDesc ?? '',
    suspendStartDate: remark.suspendStartDate ?? '',
    suspendEndDate: remark.suspendEndDate ?? '',
    checkScaleId: remark.checkScaleId != null ? String(remark.checkScaleId) : '',
  };
}

function isPositiveInteger(value: string): boolean {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0;
}

function isFutureDate(value: string): boolean {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() > today.getTime();
}
