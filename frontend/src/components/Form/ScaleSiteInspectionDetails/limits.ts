/**
 * Character limits for the free-text inspection fields, carried over from the legacy validators
 * (`SiteInspectionValidator.MAXLENGTH_COMMENTS`, `InspectionResponseValidator.MAXLENGTH_COMMENTS_TEXT`
 * / `MAXLENGTH_FOLLOW_UP_ACTION_TXT`) and mirrored as `maxLength` on the backend request schemas.
 */
export const INSPECTION_COMMENTS_MAX_LENGTH = 2000;
export const QUESTION_COMMENTS_MAX_LENGTH = 4000;
export const FOLLOW_UP_ACTION_MAX_LENGTH = 4000;

/** Returns an inline error when `value` is longer than `maxLength`, otherwise undefined. */
export const maxLengthError = (
  value: string,
  maxLength: number,
  label: string,
): string | undefined =>
  value.length > maxLength ? `${label} must be ${maxLength} characters or fewer.` : undefined;
