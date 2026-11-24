import { compareDateOnly, dateOnlyFieldError } from '@/utils/dateOnly';

/**
 * Validation shared by the four authorization maintenance screens (Create/Edit × Scaler and
 * Scale Site). The rules and their exact messages are the legacy ones; they were copied
 * verbatim between the pages, so a change to one used to leave the other three behind.
 *
 * The Edit pages layer their own rules on top (a cancellation-date pairing, and a lock once a
 * letter has been generated), so these functions are plain and side-effect free: a page decides
 * when to call them and merges the result into its own error map.
 */

/** The shape every page's `validate`/`validateBasics` returns. */
export interface ValidationOutcome {
  ok: boolean;
  nextErrors: Record<string, string>;
  formError: string | null;
}

/** Wraps a collected error map into the outcome shape the pages expect. */
export const toOutcome = (nextErrors: Record<string, string>): ValidationOutcome => ({
  ok: Object.keys(nextErrors).length === 0,
  nextErrors,
  formError: null,
});

const requiredInto =
  (nextErrors: Record<string, string>) =>
  (key: string, ok: boolean, message: string): void => {
    if (!ok) {
      nextErrors[key] = message;
    }
  };

const isFilled = (value?: string | null): boolean => (value ?? '').trim().length > 0;

/**
 * Both dates must parse, and expiry must be strictly after effective. Only applied when both are
 * present — a missing date is already reported as required, and saying "not a valid date" on top
 * of that would be noise.
 */
export const validateDateRange = (
  effectiveDate: string,
  expiryDate: string,
  nextErrors: Record<string, string>,
): void => {
  if (!isFilled(effectiveDate) || !isFilled(expiryDate)) {
    return;
  }

  // `new Date('2026-02-30')` does NOT return Invalid Date - V8 rolls a day overflow over to
  // 2026-03-02 (only an out-of-range MONTH is rejected). So the NaN checks here caught `2026-13-01`
  // but waved `2026-02-30` through, and the ordering rule below then compared the silently corrected
  // date. dateOnlyFieldError/compareDateOnly parse strictly, so both cases are now rejected.
  const effectiveDateError = dateOnlyFieldError(effectiveDate, 'Effective Date');
  if (effectiveDateError) {
    nextErrors.effectiveDate = effectiveDateError;
  }
  const expiryDateError = dateOnlyFieldError(expiryDate, 'Expiry Date');
  if (expiryDateError) {
    nextErrors.expiryDate = expiryDateError;
  }
  if (!effectiveDateError && !expiryDateError
      && compareDateOnly(expiryDate, effectiveDate) <= 0) {
    nextErrors.expiryDate = 'Expiry Date must be after Effective Date.';
  }
};

/** The scaler authorization fields that gate opening the Conditions section. */
export interface ScalerAuthorizationBasicValues {
  scalerLicenceNo: string;
  effectiveDate: string;
  expiryDate: string;
  regDist: string;
  districtWideInd: '' | 'Y' | 'N';
}

/** A job function / forest product option; only its `code` matters to validation. */
export interface CodedOption {
  code?: string | null;
}

export interface ScalerAuthorizationValues extends ScalerAuthorizationBasicValues {
  selectedJobFunctions?: CodedOption[] | null;
  scaleSites?: Array<{ scaleSiteIdNmbr?: string | null }> | null;
  selectedForestProducts?: CodedOption[] | null;
}

const applyScalerBasics = (
  values: ScalerAuthorizationBasicValues,
  nextErrors: Record<string, string>,
): void => {
  const required = requiredInto(nextErrors);

  required('scalerLicenceNo', isFilled(values.scalerLicenceNo), 'Licence # is required');
  required('effectiveDate', isFilled(values.effectiveDate), 'Effective Date is required.');
  required('expiryDate', isFilled(values.expiryDate), 'Expiry Date is required.');
  required('regDist', isFilled(values.regDist), 'Reg / Dist is required.');
  required(
    'districtWideInd',
    values.districtWideInd === 'Y' || values.districtWideInd === 'N',
    'District Wide is required.',
  );
};

/** Lightweight validation used before opening the Conditions section. */
export const validateScalerAuthorizationBasics = (
  values: ScalerAuthorizationBasicValues,
): ValidationOutcome => {
  const nextErrors: Record<string, string> = {};
  applyScalerBasics(values, nextErrors);
  validateDateRange(values.effectiveDate, values.expiryDate, nextErrors);
  return toOutcome(nextErrors);
};

/** Job function code that makes at least one Special Forest Product mandatory. */
const SPECIAL_FOREST_PRODUCT_JOB_CODE = 'S';

/** Full save-time validation: the basics plus the legacy cross-field business rules. */
export const validateScalerAuthorization = (values: ScalerAuthorizationValues): ValidationOutcome => {
  const nextErrors: Record<string, string> = {};
  const required = requiredInto(nextErrors);
  const jobFunctions = values.selectedJobFunctions ?? [];

  applyScalerBasics(values, nextErrors);

  required('jobFunctions', jobFunctions.length > 0, 'At least one Job Function is required.');

  // District Wide = No means the authorization is scoped to named sites, so it needs at least one.
  if (values.districtWideInd === 'N') {
    required(
      'scaleSites',
      (values.scaleSites ?? []).length > 0,
      'At least one Scale Site is required when District Wide is No.',
    );
  }

  const hasSfpJob = jobFunctions.some(
    (job) => String(job?.code ?? '') === SPECIAL_FOREST_PRODUCT_JOB_CODE,
  );
  if (hasSfpJob) {
    required(
      'sfpProducts',
      (values.selectedForestProducts ?? []).length > 0,
      'At least one Special Forest Product is required when Special Forest Product is selected.',
    );
  }

  validateDateRange(values.effectiveDate, values.expiryDate, nextErrors);

  return toOutcome(nextErrors);
};

export interface ScaleSiteAuthorizationValues {
  scaleSiteNumber: string;
  effectiveDate: string;
  expiryDate: string;
  expectedAnnualScaleVolume: string;
}

export const validateScaleSiteAuthorizationBasics = (
  values: ScaleSiteAuthorizationValues,
): ValidationOutcome => {
  const nextErrors: Record<string, string> = {};
  const required = requiredInto(nextErrors);

  required('scaleSiteNumber', isFilled(values.scaleSiteNumber), 'Scale Site # is required.');
  required('effectiveDate', isFilled(values.effectiveDate), 'Effective Date is required.');
  required('expiryDate', isFilled(values.expiryDate), 'Expiry Date is required.');
  required(
    'expectedAnnualScaleVolume',
    isFilled(values.expectedAnnualScaleVolume),
    'Expected Annual Scale Volume is required.',
  );

  validateDateRange(values.effectiveDate, values.expiryDate, nextErrors);

  if (isFilled(values.expectedAnnualScaleVolume)) {
    const parsed = Number(values.expectedAnnualScaleVolume);
    if (!Number.isFinite(parsed)) {
      nextErrors.expectedAnnualScaleVolume = 'Expected Annual Scale Volume must be a number.';
    } else if (parsed < 0) {
      nextErrors.expectedAnnualScaleVolume = 'Expected Annual Scale Volume must be 0 or greater.';
    }
  }

  return toOutcome(nextErrors);
};

/**
 * Cancellation Date and Cancellation Reason must be entered together. These fields stay editable
 * even once a letter exists, so the Edit pages enforce this pairing on both paths.
 */
export const validateCancellationPair = (
  cancellationDate: string,
  cancellationReasonTxt: string,
): Record<string, string> => {
  const nextErrors: Record<string, string> = {};
  const hasCancellationDate = isFilled(cancellationDate);
  const hasCancellationReason = isFilled(cancellationReasonTxt);
  const cancellationPairMessage =
    'If either Cancellation Date or Cancellation Reason is entered then both are required.';

  if (hasCancellationDate !== hasCancellationReason) {
    if (!hasCancellationDate) {
      nextErrors.cancellationDate = cancellationPairMessage;
    }
    if (!hasCancellationReason) {
      nextErrors.cancellationReasonTxt = cancellationPairMessage;
    }
  }

  return nextErrors;
};
