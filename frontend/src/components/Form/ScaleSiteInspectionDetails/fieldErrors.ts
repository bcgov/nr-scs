import { extractFieldErrors } from '@/utils/extractApiError';

/**
 * The inspection detail fields the backend returns as field-scoped validation errors
 * (`FieldValidationException`). Ordered top-to-bottom as they appear on the form so the banner and
 * scroll target the topmost error. Each maps a backend/form field name to the DOM id of its input.
 */
const INSPECTION_FIELD_MAP = [
  { field: 'previousInspectionId', elementId: 'previous-inspection-id' },
  { field: 'inspectionDate', elementId: 'inspection-date' },
  { field: 'comments', elementId: 'inspection-comments' },
] as const;

export type InspectionFieldKey = (typeof INSPECTION_FIELD_MAP)[number]['field'];

export interface MappedInspectionFieldErrors {
  /** Inline errors keyed by field name, to merge into the page's form-error state. */
  errors: Partial<Record<InspectionFieldKey, string>>;
  /** DOM id of the topmost mapped field, for scroll-to-error. Null when nothing mapped. */
  firstFieldId: string | null;
  /** Message of the topmost mapped field, for the validation banner. Null when nothing mapped. */
  firstMessage: string | null;
  /**
   * Messages of field errors that are NOT one of the known inline fields (or form-level errors with
   * no field). Callers show these in the banner instead of a contentless generic message.
   */
  unmapped: string[];
}

/**
 * Splits an API error's structured `fieldErrors` into inline messages for the known inspection
 * detail fields and a list of leftover messages, so create/edit share one mapping (and a
 * non-inline field error still reaches the user via the banner rather than being swallowed).
 */
export function mapInspectionServerFieldErrors(error: unknown): MappedInspectionFieldErrors {
  const errors: Partial<Record<InspectionFieldKey, string>> = {};
  const unmapped: string[] = [];
  const known = new Set<string>(INSPECTION_FIELD_MAP.map((entry) => entry.field));

  for (const fieldError of extractFieldErrors(error)) {
    if (known.has(fieldError.field)) {
      const key = fieldError.field as InspectionFieldKey;
      // Keep the first message per field if the backend ever repeats one.
      errors[key] ??= fieldError.message;
    } else if (fieldError.message) {
      unmapped.push(fieldError.message);
    }
  }

  const first = INSPECTION_FIELD_MAP.find((entry) => errors[entry.field] !== undefined);
  return {
    errors,
    firstFieldId: first ? first.elementId : null,
    firstMessage: first ? (errors[first.field] ?? null) : null,
    unmapped,
  };
}
