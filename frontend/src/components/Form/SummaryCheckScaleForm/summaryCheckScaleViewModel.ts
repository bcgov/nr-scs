import type { CheckScaleApiModel } from '@/services/checkScales.service';
import type { SpeciesProductGradeXref, StaticLov } from '@/services/lov.service';
import { dateOnlyFieldError } from '@/utils/dateOnly';
import type {
  SummaryCheckScaleReturnType,
  SummaryCheckScaleSpgRowRequest,
  YesNoInd,
} from '@/services/summaryCheckScales.service';

/** User-facing return-type labels (the radio values), mapped to/from the API enum + legacy cksc_type. */
export type ReturnTypeLabel = 'Log Tally' | 'Sample Log Tally' | 'Special Forest Product';
export type YesNoOption = '' | 'Yes' | 'No';

/** Editable header fields shared by the Create and Update summary check scale pages. */
export interface SummaryCheckScaleHeaderValues {
  returnType: ReturnTypeLabel;
  checkScaleType: string;
  checkScalerLicence: string;
  originalScalerLicence: string;
  loadArrivalNumber: string;
  weighSlipNumber: string;
  timberMark: string;
  scaleSiteNumber: string;
  followedGoodPractices: YesNoOption;
  originalWithinStandard: YesNoOption;
  checkReplacesOriginal: YesNoOption;
  partialLoad: YesNoOption;
  originalDateOfScale: string;
  checkDateOfScale: string;
  originalScaleReturn: string;
  checkScaleReturn: string;
  checkScalerComment: string;
}

/** One SPG roll-up row's input fields (the create single row, or the update add-row block). */
export interface SummaryCheckScaleSpgRowValues {
  speciesCode: string;
  productCode: string;
  gradeCode: string;
  originalPieces: string;
  checkPieces: string;
  originalNetVolume: string;
  checkNetVolume: string;
  originalNetValue: string;
  checkNetValue: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  formError: string | null;
}

export const EMPTY_HEADER_VALUES: SummaryCheckScaleHeaderValues = {
  returnType: 'Special Forest Product',
  checkScaleType: '',
  checkScalerLicence: '',
  originalScalerLicence: '',
  loadArrivalNumber: '',
  weighSlipNumber: '',
  timberMark: '',
  scaleSiteNumber: '',
  followedGoodPractices: '',
  originalWithinStandard: '',
  checkReplacesOriginal: '',
  partialLoad: '',
  originalDateOfScale: '',
  checkDateOfScale: '',
  originalScaleReturn: '',
  checkScaleReturn: '',
  checkScalerComment: '',
};

export const EMPTY_SPG_ROW: SummaryCheckScaleSpgRowValues = {
  speciesCode: '',
  productCode: '',
  gradeCode: '',
  originalPieces: '',
  checkPieces: '',
  originalNetVolume: '',
  checkNetVolume: '',
  originalNetValue: '',
  checkNetValue: '',
};

export const RETURN_TYPE_API: Record<ReturnTypeLabel, SummaryCheckScaleReturnType> = {
  'Log Tally': 'LOG_TALLY',
  'Sample Log Tally': 'SAMPLE_LOG_TALLY',
  'Special Forest Product': 'SPECIAL_FOREST_PRODUCT',
};

const CKSC_TYPE_TO_LABEL: Record<string, ReturnTypeLabel> = {
  LTSCS: 'Log Tally',
  SLTSCS: 'Sample Log Tally',
  SFPSCS: 'Special Forest Product',
};

const asString = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const ynToOption = (value?: string | null): YesNoOption => {
  if (value === 'Y') {
    return 'Yes';
  }
  if (value === 'N') {
    return 'No';
  }
  return '';
};

export const toYesNoInd = (value: YesNoOption): YesNoInd => (value === 'Yes' ? 'Y' : 'N');

/** Legacy SPG dropdowns display "code - description" (displayCodeAndDescription). */
export const codeDescLabel = (option: StaticLov): string => {
  const code = option.code ?? '';
  const description = option.description ?? '';
  return code && description ? `${code} - ${description}` : description || code;
};

export const isSpecialForestProduct = (returnType: ReturnTypeLabel): boolean =>
  returnType === 'Special Forest Product';

export const partialLoadVisible = (returnType: ReturnTypeLabel): boolean => isSpecialForestProduct(returnType);

// Product/Grade gating (legacy createSummaryCheckScale.jsp): Product enables for SFP once a species
// is chosen; Grade enables for LT/SLT, or for SFP only when the product is XM.
export const productEnabled = (returnType: ReturnTypeLabel, speciesCode: string): boolean =>
  isSpecialForestProduct(returnType) && speciesCode !== '';

export const gradeEnabled = (returnType: ReturnTypeLabel, speciesCode: string, productCode: string): boolean =>
  speciesCode !== '' && (isSpecialForestProduct(returnType) ? productCode === 'XM' : true);

/**
 * Builds the API SPG-row request from a row's input values, applying the product/grade gating
 * (blank product/grade for the cases the return type doesn't use). Shared by the Create save and
 * the Update add-row flows so the payload is assembled in one place.
 */
export const buildSpgRowRequest = (
  returnType: ReturnTypeLabel,
  row: SummaryCheckScaleSpgRowValues,
): SummaryCheckScaleSpgRowRequest => {
  const productOn = productEnabled(returnType, row.speciesCode);
  const gradeOn = gradeEnabled(returnType, row.speciesCode, row.productCode);
  return {
    scaleSpeciesCode: row.speciesCode,
    scaleProductCode: productOn ? row.productCode || null : null,
    scaleGradeCode: gradeOn ? row.gradeCode || null : null,
    originalScalePieceCnt: Number(row.originalPieces),
    originalScaleNetVolume: Number(row.originalNetVolume),
    originalScaleNetValue: Number(row.originalNetValue),
    checkScalePieceCnt: Number(row.checkPieces),
    checkScaleNetVolume: Number(row.checkNetVolume),
    checkScaleNetValue: Number(row.checkNetValue),
  };
};

// --- Species → Product/Grade option filtering ---------------------------------------------
// Legacy createSummaryCheckScale.jsp (filterDropList/isValidSpeciesGradeProduct) narrows the Product
// and Grade lists to the valid combinations in SPECIES_PRODUCT_GRADE_XREF; per-rule details inline below.

/** A non-blank code; legacy treats `" "` (single space) and `""` as the "no value" sentinel. */
const xrefCode = (value?: string | null): string => {
  const code = (value ?? '').trim();
  return code;
};

const addTo = (map: Map<string, Set<string>>, key: string, value: string): void => {
  if (!key || !value) {
    return;
  }
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
};

export interface SpeciesXrefIndex {
  /** species → valid product codes (SFP product list). */
  productsBySpecies: Map<string, Set<string>>;
  /** species → valid grade codes across any product (LT/SLT grade list). */
  gradesBySpecies: Map<string, Set<string>>;
  /** species → valid grade codes for the XM product (SFP/XM grade list). */
  xmGradesBySpecies: Map<string, Set<string>>;
}

/** Builds the species lookup maps from the flat xref LOV (memoize at the call site). */
export const buildSpeciesXrefIndex = (xref: SpeciesProductGradeXref[] | null | undefined): SpeciesXrefIndex => {
  const productsBySpecies = new Map<string, Set<string>>();
  const gradesBySpecies = new Map<string, Set<string>>();
  const xmGradesBySpecies = new Map<string, Set<string>>();
  (xref ?? []).forEach((row) => {
    const species = xrefCode(row.scaleSpeciesCode);
    const product = xrefCode(row.scaleProductCode);
    const grade = xrefCode(row.scaleGradeCode);
    if (!species) {
      return;
    }
    addTo(productsBySpecies, species, product);
    addTo(gradesBySpecies, species, grade);
    if (product === 'XM') {
      addTo(xmGradesBySpecies, species, grade);
    }
  });
  return { productsBySpecies, gradesBySpecies, xmGradesBySpecies };
};

/** Narrows the Product options to those valid for the selected species (no species ⇒ unfiltered). */
export const filterProductOptions = (
  productLov: StaticLov[],
  index: SpeciesXrefIndex,
  speciesCode: string,
): StaticLov[] => {
  if (speciesCode === '') {
    return productLov;
  }
  const valid = index.productsBySpecies.get(speciesCode) ?? new Set<string>();
  return productLov.filter((option) => valid.has(option.code ?? ''));
};

/** Narrows the Grade options per legacy: XM grades for SFP, species grades for LT/SLT. */
export const filterGradeOptions = (
  gradeLov: StaticLov[],
  index: SpeciesXrefIndex,
  returnType: ReturnTypeLabel,
  speciesCode: string,
  productCode: string,
): StaticLov[] => {
  if (speciesCode === '') {
    return gradeLov;
  }

  let valid: Set<string> | undefined;
  if (!isSpecialForestProduct(returnType)) {
    // Log Tally / Sample Log Tally: grades valid for the species (any product).
    valid = index.gradesBySpecies.get(speciesCode);
  } else if (productCode === 'XM') {
    // SFP + XM (Christmas trees): grades valid for this species' XM product.
    valid = index.xmGradesBySpecies.get(speciesCode);
  } else {
    // SFP + non-XM product: Grade is disabled / not selectable — leave the list untouched.
    valid = undefined;
  }

  if (!valid) {
    return gradeLov;
  }
  return gradeLov.filter((option) => valid.has(option.code ?? ''));
};

/**
 * Applies one SPG field change and clears the now-invalid downstream selections, mirroring legacy
 * speciesSelected()/productSelected(): changing Species resets Product+Grade; changing Product away
 * from XM (SFP) resets Grade. Keeps Carbon `<Select>` from holding a value no longer in its options.
 */
export const nextSpgRowAfterChange = (
  prev: SummaryCheckScaleSpgRowValues,
  field: keyof SummaryCheckScaleSpgRowValues,
  value: string,
  returnType: ReturnTypeLabel,
): SummaryCheckScaleSpgRowValues => {
  const next = { ...prev, [field]: value };
  if (field === 'speciesCode') {
    next.productCode = '';
    next.gradeCode = '';
  } else if (field === 'productCode' && isSpecialForestProduct(returnType) && value !== 'XM') {
    next.gradeCode = '';
  }
  return next;
};

/** Hydrate the header fields from a loaded record (Update page). Return type comes from cksc_type. */
export const buildHeaderValues = (m: CheckScaleApiModel): SummaryCheckScaleHeaderValues => ({
  returnType: CKSC_TYPE_TO_LABEL[m.ckscType ?? ''] ?? 'Special Forest Product',
  checkScaleType: asString(m.checkScaleTypeCode),
  checkScalerLicence: asString(m.checkScalerLicenceNo),
  originalScalerLicence: asString(m.originalScalerLicenceNo),
  loadArrivalNumber: asString(m.loadArrivalNumber),
  weighSlipNumber: asString(m.weighSlipNumber),
  timberMark: asString(m.timberMark),
  scaleSiteNumber: asString(m.scaleSiteIdNmbr),
  followedGoodPractices: ynToOption(m.followedGoodPracticeInd),
  originalWithinStandard: ynToOption(m.originalWithinStandardInd),
  checkReplacesOriginal: ynToOption(m.checkReplacesOriginalInd),
  partialLoad: ynToOption(m.partialInd),
  originalDateOfScale: asString(m.originalScaleDate),
  checkDateOfScale: asString(m.chkScaleDate),
  originalScaleReturn: asString(m.originalScaleReturnNo),
  checkScaleReturn: asString(m.chkScaleReturnNo),
  checkScalerComment: asString(m.chkScalerCommentTxt),
});

/** Maps backend request field names (in `Error.fieldErrors`) to the form's field keys. */
const SERVER_FIELD_TO_FORM: Record<string, string> = {
  originalScalerLicenceNo: 'originalScalerLicence',
  checkScalerLicenceNo: 'checkScalerLicence',
  timberMark: 'timberMark',
  scaleSiteIdNmbr: 'scaleSiteNumber',
  checkScaleTypeCode: 'checkScaleType',
  // Without this the backend's 4000-character message fell through to the unmapped-field banner at the
  // top of the page, which named no field. It belongs under the textarea like every other rule.
  chkScalerCommentTxt: 'checkScalerComment',
};

export interface ServerFieldError {
  field?: string | null;
  message?: string | null;
}

/**
 * Translates a backend `Error.fieldErrors[]` into inline form-field errors. Fields with a known
 * mapping become inline errors keyed by the form field; any unmapped field's message is collected
 * into a banner string so nothing is silently dropped. Returns `null` field-errors/banner when the
 * input is empty.
 */
export const mapServerFieldErrors = (
  fieldErrors: ServerFieldError[] | null | undefined,
): { errors: Record<string, string>; banner: string | null } => {
  const errors: Record<string, string> = {};
  const unmapped: string[] = [];
  (fieldErrors ?? []).forEach((fe) => {
    const message = fe.message ?? '';
    const formKey = fe.field ? SERVER_FIELD_TO_FORM[fe.field] : undefined;
    if (formKey) {
      errors[formKey] = message;
    } else if (message) {
      unmapped.push(message);
    }
  });
  return { errors, banner: unmapped.length > 0 ? unmapped.join(' ') : null };
};

/** CHK_SCALER_COMMENT_TXT is VARCHAR2(4000). */
const COMMENT_MAX_LENGTH = 4000;

const isInt = (v: string): boolean => /^-?\d+$/.test(v.trim());
const isNum = (v: string): boolean => v.trim() !== '' && !Number.isNaN(Number(v));

/** True when an ISO date string (yyyy-MM-dd) falls after today, compared date-only. */
const isFutureDate = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return false;
  }
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() > today.getTime();
};

/**
 * Legacy OAValidator.checkPrecision parity: a number may have at most {@code intDigits} digits before
 * the decimal point and {@code decDigits} after. Returns the legacy {@code errors.decimal} message
 * when it overflows, else null. Assumes the value is already a valid number.
 */
const precisionError = (value: string, label: string, intDigits: number, decDigits: number): string | null => {
  const v = value.trim().replace(/^[+-]/, '');
  const [intPart = '', decPart = ''] = v.split('.');
  if (intPart.length > intDigits || decPart.length > decDigits) {
    return `${label} is too long. Please shorten to ${intDigits} digits before the decimal place, and ${decDigits} after.`;
  }
  return null;
};

/** Validates the editable header fields (shared by create + update header save). */
export const validateHeader = (h: SummaryCheckScaleHeaderValues): ValidationResult => {
  const errors: Record<string, string> = {};
  const required = (key: string, ok: boolean, message: string) => {
    if (!ok) {
      errors[key] = message;
    }
  };

  required('checkScaleType', h.checkScaleType.trim().length > 0, 'Check Scale Type is required.');
  required('checkScalerLicence', h.checkScalerLicence.trim().length > 0, 'Check Scaler Licence # is required.');
  required('originalScalerLicence', h.originalScalerLicence.trim().length > 0, 'Original Scaler Licence # is required.');
  required('timberMark', h.timberMark.trim().length > 0, 'Timber Mark is required.');
  required('scaleSiteNumber', h.scaleSiteNumber.trim().length > 0, 'Scale Site # is required.');
  required('followedGoodPractices', h.followedGoodPractices === 'Yes' || h.followedGoodPractices === 'No', 'Followed Good Practices is required.');
  required('originalWithinStandard', h.originalWithinStandard === 'Yes' || h.originalWithinStandard === 'No', 'Original within Standard is required.');
  required('checkReplacesOriginal', h.checkReplacesOriginal === 'Yes' || h.checkReplacesOriginal === 'No', 'Check Replaces Original is required.');
  if (isSpecialForestProduct(h.returnType)) {
    required('partialLoad', h.partialLoad === 'Yes' || h.partialLoad === 'No', 'Partial Load is required.');
  }

  const hasLoadArrival = h.loadArrivalNumber.trim().length > 0;
  const hasWeighSlip = h.weighSlipNumber.trim().length > 0;
  let formError: string | null = null;
  if (hasLoadArrival === hasWeighSlip) {
    // Exactly one is required (legacy XOR): error when both or neither are filled.
    formError = hasLoadArrival
      ? 'Enter only one of Load Arrival # or Weigh Slip #.'
      : 'Either Load Arrival # or Weigh Slip # is required.';
    const fieldMessage = hasLoadArrival ? 'Enter only one.' : 'Required.';
    errors.loadArrivalNumber = fieldMessage;
    errors.weighSlipNumber = fieldMessage;
  }
  // Guard against a non-numeric weigh slip coercing to NaN -> null (misleading "exactly one" 400).
  if (hasWeighSlip && !hasLoadArrival && !isInt(h.weighSlipNumber)) {
    errors.weighSlipNumber = 'Weigh Slip # must be a number.';
  }

  required('originalDateOfScale', h.originalDateOfScale.trim().length > 0, 'Original Date of Scale is required.');
  required('checkDateOfScale', h.checkDateOfScale.trim().length > 0, 'Check Date of Scale is required.');
  // Calendar validity first: `isFutureDate` parses with `new Date(...T00:00:00)`, which rolls a day
  // overflow over instead of rejecting it, so `2026-02-30` was read as 2 March and compared against today
  // without ever being questioned. Check validity before the future rule so the more specific message wins.
  const originalDateError = dateOnlyFieldError(h.originalDateOfScale, 'Original Date of Scale');
  if (!errors.originalDateOfScale && originalDateError) {
    errors.originalDateOfScale = originalDateError;
  }
  const checkDateError = dateOnlyFieldError(h.checkDateOfScale, 'Check Date of Scale');
  if (!errors.checkDateOfScale && checkDateError) {
    errors.checkDateOfScale = checkDateError;
  }
  // Surface the legacy "not in the future" rule inline on the date field (backend enforces it too).
  if (!errors.originalDateOfScale && isFutureDate(h.originalDateOfScale)) {
    errors.originalDateOfScale = 'Scale dates cannot be in the future.';
  }
  if (!errors.checkDateOfScale && isFutureDate(h.checkDateOfScale)) {
    errors.checkDateOfScale = 'Scale dates cannot be in the future.';
  }
  required('originalScaleReturn', h.originalScaleReturn.trim().length > 0, 'Original Scale Return is required.');
  required('checkScaleReturn', h.checkScaleReturn.trim().length > 0, 'Check Scale Return is required.');
  // Legacy rejected a non-numeric return number outright; the rebuild only checked presence, so "test"
  // sailed through to the DB. Message wording is legacy's.
  if (!errors.originalScaleReturn && !isInt(h.originalScaleReturn)) {
    errors.originalScaleReturn = 'Scale Return # must be an integer.';
  }
  if (!errors.checkScaleReturn && !isInt(h.checkScaleReturn)) {
    errors.checkScaleReturn = 'Scale Return # must be an integer.';
  }
  // Checked here as well as server-side so an over-long comment is caught before the round trip; the
  // textarea also caps typing at the same length.
  if (h.checkScalerComment.length > COMMENT_MAX_LENGTH) {
    errors.checkScalerComment =
      `Check Scaler Comment can not be greater than ${COMMENT_MAX_LENGTH} characters.`;
  }

  return { ok: Object.keys(errors).length === 0, errors, formError };
};

/** Validates one SPG row's input fields (shared by create + update add-row). */
export const validateSpgRow = (returnType: ReturnTypeLabel, r: SummaryCheckScaleSpgRowValues): ValidationResult => {
  const errors: Record<string, string> = {};
  const intField = (key: string, value: string, label: string) => {
    if (value.trim().length === 0) {
      errors[key] = `${label} is required.`;
    } else if (!isInt(value)) {
      errors[key] = `${label} must be an integer.`;
    }
  };
  // intDigits/decDigits enforce the legacy column precision: Net Volume NUMBER(7,3) -> 4 before, 3
  // after; Net Value NUMBER(8,2) -> 6 before, 2 after.
  const numField = (key: string, value: string, label: string, intDigits: number, decDigits: number) => {
    if (value.trim().length === 0) {
      errors[key] = `${label} is required.`;
      return;
    }
    if (!isNum(value)) {
      errors[key] = `${label} must be a number.`;
      return;
    }
    const precision = precisionError(value, label, intDigits, decDigits);
    if (precision) {
      errors[key] = precision;
    }
  };

  if (r.speciesCode.trim().length === 0) {
    errors.speciesCode = 'Species is required.';
  }
  if (isSpecialForestProduct(returnType) && r.productCode.trim().length === 0) {
    errors.productCode = 'Product is required.';
  }
  if (gradeEnabled(returnType, r.speciesCode, r.productCode) && r.gradeCode.trim().length === 0) {
    errors.gradeCode = 'Grade is required.';
  }
  intField('originalPieces', r.originalPieces, 'Original Pieces');
  intField('checkPieces', r.checkPieces, 'Check Scale Pieces');
  numField('originalNetVolume', r.originalNetVolume, 'Original Net Volume', 4, 3);
  numField('checkNetVolume', r.checkNetVolume, 'Check Scale Net Volume', 4, 3);
  numField('originalNetValue', r.originalNetValue, 'Original Net Value', 6, 2);
  numField('checkNetValue', r.checkNetValue, 'Check Scale Net Value', 6, 2);

  return { ok: Object.keys(errors).length === 0, errors, formError: null };
};
