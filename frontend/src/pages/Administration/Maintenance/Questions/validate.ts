import type { FormErrors } from '@/hooks/useMaintenanceCrud';
import { compareDateOnly, dateOnlyFieldError } from '@/utils/dateOnly';

import type { QuestionFormState } from './QuestionsModal';

// Mirror the backend request-schema constraints (InspectionQuestionCreateRequest.yaml)
// so the offending field is named inline before the request is ever sent — otherwise a
// too-long question surfaces only the generic "One or more fields are invalid." banner and
// an out-of-range sort order a misleading "Request body is required." (the integer overflows
// the DTO on deserialization). The question message matches the legacy wording.
export const QUESTION_MAX_LENGTH = 200;
export const SORT_ORDER_MAX = 9999;

export const validate = (form: QuestionFormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.questionText.trim()) {
    errors.questionText = 'Question is required.';
  } else if (form.questionText.trim().length > QUESTION_MAX_LENGTH) {
    errors.questionText = `Question cannot be greater than ${QUESTION_MAX_LENGTH} characters.`;
  }
  if (!form.commentRequiredInd) {
    errors.commentRequiredInd = 'Comment required is required.';
  }
  if (!form.sortOrderNo.trim()) {
    errors.sortOrderNo = 'Sort order is required.';
  } else if (!Number.isInteger(Number(form.sortOrderNo))) {
    errors.sortOrderNo = 'Sort order must be a whole number.';
  } else if (Number(form.sortOrderNo) < 0 || Number(form.sortOrderNo) > SORT_ORDER_MAX) {
    errors.sortOrderNo = `Sort order must be between 0 and ${SORT_ORDER_MAX}.`;
  }
  if (!form.effectiveDate) {
    errors.effectiveDate = 'Effective date is required.';
  }
  if (!form.expiryDate) {
    errors.expiryDate = 'Expiry date is required.';
  }
  // A calendar-invalid entry produced no error at all: `new Date` returned Invalid Date and the NaN
  // guards skipped the ordering rule, so the value was submitted.
  const effectiveDateError = dateOnlyFieldError(form.effectiveDate, 'Effective date');
  if (effectiveDateError) {
    errors.effectiveDate = effectiveDateError;
  }
  const expiryDateError = dateOnlyFieldError(form.expiryDate, 'Expiry date');
  if (expiryDateError) {
    errors.expiryDate = expiryDateError;
  }
  if (form.effectiveDate && form.expiryDate && !effectiveDateError && !expiryDateError
      && compareDateOnly(form.expiryDate, form.effectiveDate) < 0) {
    errors.expiryDate = 'Expiry date must be on or after Effective date.';
  }
  if ((form.inspectionTypeCodes ?? []).length < 1) {
    errors.inspectionTypeCodes = 'Select at least one inspection type.';
  }
  if ((form.scalingMethodTypeCodes ?? []).length < 1) {
    errors.scalingMethodTypeCodes = 'Select at least one scaling method.';
  }
  if ((form.validResponseCodes ?? []).length < 2) {
    errors.validResponseCodes = 'Select at least two valid responses.';
  }
  return errors;
};
