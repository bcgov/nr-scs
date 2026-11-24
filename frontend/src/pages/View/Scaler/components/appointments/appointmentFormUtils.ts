import type { GradingCodeAppointmentTypeLov } from '@/services/lov.service';
import type {
  ProvinceWideIndicator,
  ScalerAppointmentCreateRequest,
  ScalerAppointmentDetail,
  ScalerAppointmentUpdateRequest,
} from '@/services/scalerAppointments.types';
import { compareDateOnly, isValidDateOnly, parseDateOnly } from '@/utils/dateOnly';

export type AppointmentFormMode = 'create' | 'edit';

export interface AppointmentOption {
  value: string;
  text: string;
  scalerAppointmentType: string;
  scaleGradingSystemCode: string;
}

export interface ScalerAppointmentFormValues {
  appointmentCode: string;
  orgUnitNo: string;
  provinceWideInd: '' | ProvinceWideIndicator;
  issuedDate: string;
  expiryDate: string;
  cancellationDate: string;
  cancellationReasonTxt: string;
}

export type AppointmentFormErrors = Partial<Record<keyof ScalerAppointmentFormValues, string>>;

export function buildAppointmentOptions(items: GradingCodeAppointmentTypeLov[]): AppointmentOption[] {
  return items
    .filter((item) => item.code && item.description && item.scalerAppointmentType && item.scaleGradingSystemCode)
    .map((item) => ({
      value: String(item.code ?? ''),
      text: String(item.description ?? ''),
      scalerAppointmentType: String(item.scalerAppointmentType ?? ''),
      scaleGradingSystemCode: String(item.scaleGradingSystemCode ?? ''),
    }));
}

export function createEmptyAppointmentFormValues(): ScalerAppointmentFormValues {
  return {
    appointmentCode: '',
    orgUnitNo: '',
    provinceWideInd: '',
    issuedDate: '',
    expiryDate: '',
    cancellationDate: '',
    cancellationReasonTxt: '',
  };
}

export function resolveAppointmentSelection(
  values: Pick<ScalerAppointmentFormValues, 'appointmentCode'>,
  appointmentOptions: AppointmentOption[],
): AppointmentOption | undefined {
  return appointmentOptions.find((option) => option.value === values.appointmentCode);
}

export function toAppointmentFormValues(
  detail: ScalerAppointmentDetail | null | undefined,
  appointmentOptions: AppointmentOption[],
): ScalerAppointmentFormValues {
  if (!detail) {
    return createEmptyAppointmentFormValues();
  }

  const selectedOption = appointmentOptions.find(
    (option) =>
      option.scalerAppointmentType === (detail.scalerAppointmentType ?? '') &&
      option.scaleGradingSystemCode === (detail.scaleGradingSystemCode ?? ''),
  );

  return {
    appointmentCode: selectedOption?.value ?? '',
    orgUnitNo: detail.orgUnitNo == null ? '' : String(detail.orgUnitNo),
    provinceWideInd:
      detail.provinceWideInd === 'Y' || detail.provinceWideInd === 'N' ? detail.provinceWideInd : '',
    issuedDate: detail.issuedDate ?? '',
    expiryDate: detail.expiryDate ?? '',
    cancellationDate: detail.cancellationDate ?? '',
    cancellationReasonTxt: detail.cancellationReasonTxt ?? '',
  };
}

export function validateAppointmentForm(
  values: ScalerAppointmentFormValues,
  appointmentOptions: AppointmentOption[],
  mode: AppointmentFormMode,
): AppointmentFormErrors {
  const errors: AppointmentFormErrors = {};
  const selectedAppointment = resolveAppointmentSelection(values, appointmentOptions);

  applyCoreValidation(errors, values, selectedAppointment);

  if (mode === 'edit') {
    applyCancellationValidation(errors, values);
  }

  return errors;
}

export function buildCreateRequest(
  values: ScalerAppointmentFormValues,
  appointmentOptions: AppointmentOption[],
): ScalerAppointmentCreateRequest {
  const selectedAppointment = resolveAppointmentSelection(values, appointmentOptions);
  if (!selectedAppointment || !values.provinceWideInd) {
    throw new Error('Appointment form is incomplete.');
  }

  return {
    scalerAppointmentType: selectedAppointment.scalerAppointmentType,
    scaleGradingSystemCode: selectedAppointment.scaleGradingSystemCode,
    orgUnitNo: values.provinceWideInd === 'N' ? toOptionalNumber(values.orgUnitNo) : undefined,
    provinceWideInd: values.provinceWideInd,
    issuedDate: values.issuedDate,
    expiryDate: values.expiryDate || undefined,
  };
}

export function buildUpdateRequest(
  values: ScalerAppointmentFormValues,
  appointmentOptions: AppointmentOption[],
): ScalerAppointmentUpdateRequest {
  return {
    ...buildCreateRequest(values, appointmentOptions),
    cancellationDate: values.cancellationDate || undefined,
    cancellationReasonTxt: values.cancellationReasonTxt.trim() || undefined,
  };
}

function validateAppointmentDuration(
  scalerAppointmentType: string,
  issuedDate: string,
  expiryDate: string,
): string | null {
  const maxYears = getMaxAppointmentYears(scalerAppointmentType);

  if (maxYears == null) {
    return null;
  }

  const issued = parseDateOnly(issuedDate);
  const expiry = parseDateOnly(expiryDate);
  if (!issued || !expiry) {
    return null;
  }

  const maxExpiry = new Date(issued);
  maxExpiry.setFullYear(maxExpiry.getFullYear() + maxYears);

  if (expiry.getTime() > maxExpiry.getTime()) {
    return (
      `Appointment expiry date cannot be more than ${maxYears} year(s) after the appointment effective date ` +
      `for appointment type ${scalerAppointmentType}.`
    );
  }

  return null;
}

function applyCoreValidation(
  errors: AppointmentFormErrors,
  values: ScalerAppointmentFormValues,
  selectedAppointment: AppointmentOption | undefined,
) {
  if (!values.appointmentCode || !selectedAppointment) {
    errors.appointmentCode = 'Appointment is required.';
  }

  if (!values.provinceWideInd) {
    errors.provinceWideInd = 'Province Wide is required.';
  }

  if (values.provinceWideInd === 'N' && !values.orgUnitNo.trim()) {
    errors.orgUnitNo = 'District is required when the appointment is not province-wide.';
  }

  if (values.provinceWideInd === 'Y' && values.orgUnitNo.trim()) {
    errors.orgUnitNo = 'District must be omitted when the appointment is province-wide.';
  }

  if (!values.issuedDate) {
    errors.issuedDate = 'Effective Date is required.';
  } else if (!isValidDateOnly(values.issuedDate)) {
    errors.issuedDate = 'Effective Date must be a valid date (YYYY-MM-DD).';
  }

  if (values.expiryDate && !isValidDateOnly(values.expiryDate)) {
    errors.expiryDate = 'Expiry Date must be a valid date (YYYY-MM-DD).';
  } else if (
    isValidDateOnly(values.issuedDate) &&
    isValidDateOnly(values.expiryDate) &&
    compareDateOnly(values.issuedDate, values.expiryDate) > 0
  ) {
    errors.expiryDate = 'Appointment effective date must be on or before the appointment expiry date.';
  }

  if (selectedAppointment && values.issuedDate && values.expiryDate) {
    const durationError = validateAppointmentDuration(
      selectedAppointment.scalerAppointmentType,
      values.issuedDate,
      values.expiryDate,
    );
    if (durationError) {
      errors.expiryDate = durationError;
    }
  }
}

function applyCancellationValidation(
  errors: AppointmentFormErrors,
  values: ScalerAppointmentFormValues,
) {
  const hasCancellationDate = Boolean(values.cancellationDate);
  const hasCancellationReason = Boolean(values.cancellationReasonTxt.trim());

  if (hasCancellationDate !== hasCancellationReason) {
    const message = 'Cancellation date and reason must either both be provided or both be omitted.';
    errors.cancellationDate = message;
    errors.cancellationReasonTxt = message;
  }

  if (hasCancellationDate && !isValidDateOnly(values.cancellationDate)) {
    errors.cancellationDate = 'Cancellation date must be a valid date (YYYY-MM-DD).';
    return;
  }

  if (
    hasCancellationDate &&
    isValidDateOnly(values.issuedDate) &&
    compareDateOnly(values.cancellationDate, values.issuedDate) < 0
  ) {
    errors.cancellationDate = 'Cancellation date must be on or after the appointment effective date.';
  }

  if (
    hasCancellationDate &&
    isValidDateOnly(values.expiryDate) &&
    compareDateOnly(values.cancellationDate, values.expiryDate) > 0
  ) {
    errors.cancellationDate = 'Cancellation date must be on or before the appointment expiry date.';
  }
}

function getMaxAppointmentYears(scalerAppointmentType: string): number | null {
  switch (scalerAppointmentType) {
    case 'A':
      return 1;
    case 'L':
      return 2;
    case 'O':
      return 5;
    default:
      return null;
  }
}


function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}


