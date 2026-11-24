import type { ScalerCreateRequest, ScalerDetail } from '@/services/scalers.service';
import { dateOnlyFieldError, isValidDateOnly } from '@/utils/dateOnly';

export const FIXED_CLIENT_LOC = '00';

export type ScalerFormMode = 'create' | 'edit';

export interface ScalerAppointmentOption {
  value: string;
  text: string;
  scalerAppointmentType: string;
  scaleGradingSystemCode: string;
}

export interface ScalerTrainingOption {
  value: string;
  text: string;
}

export interface ScalerFormValues {
  client: string;
  loc: string;
  regDist: string;
  licenceScaling: boolean;
  licenceWaste: boolean;
  effectiveDate: string;
  expiryDate: string;
  oathTaken: '' | 'Yes' | 'No';
  appointment: string;
  provinceWide: '' | 'Yes' | 'No';
  appointmentEffectiveDate: string;
  appointmentExpiryDate: string;
  examUpgrade: string;
  completedBy: string;
}

export interface ScalerFormValidationResult {
  ok: boolean;
  nextErrors: Record<string, string>;
  formError: string | null;
}

export const createEmptyScalerFormValues = (): ScalerFormValues => ({
  client: '',
  loc: FIXED_CLIENT_LOC,
  regDist: '',
  licenceScaling: true, // create mode has no licence-type controls; SCS is implicit
  licenceWaste: false,
  effectiveDate: '',
  expiryDate: '',
  oathTaken: '',
  appointment: '',
  provinceWide: '',
  appointmentEffectiveDate: '',
  appointmentExpiryDate: '',
  examUpgrade: '',
  completedBy: '',
});

/**
 * Seeds edit-mode values from the persisted record. The appointment/exam sections stay empty on
 * purpose — on the legacy update screen they are "add new" sections, never prefilled
 * (ScalerAction.viewUpdate populates only the core fields and licence-type checkboxes).
 */
export const toScalerFormValues = (detail: ScalerDetail): ScalerFormValues => ({
  ...createEmptyScalerFormValues(),
  client: detail.clientNumber ?? '',
  regDist: detail.orgUnitNo != null ? String(detail.orgUnitNo) : '',
  licenceScaling: (detail.licenceTypes ?? []).includes('SCS'),
  licenceWaste: (detail.licenceTypes ?? []).includes('WA'),
  effectiveDate: detail.issuedDate ?? '',
  expiryDate: detail.expiryDate ?? '',
  oathTaken: detail.oathTakenInd === 'Y' ? 'Yes' : detail.oathTakenInd === 'N' ? 'No' : '',
});

const sectionPresence = (values: ScalerFormValues) => {
  const hasAppointment =
    values.appointment.trim() !== '' ||
    values.provinceWide.trim() !== '' ||
    values.appointmentEffectiveDate.trim() !== '' ||
    values.appointmentExpiryDate.trim() !== '';
  const hasExam = values.examUpgrade.trim() !== '' || values.completedBy.trim() !== '';
  return { hasAppointment, hasExam };
};

export const computeActiveBranchKeys = (values: ScalerFormValues): string[] => {
  const { hasAppointment, hasExam } = sectionPresence(values);
  if (hasAppointment && !hasExam) {
    return ['appointment', 'provinceWide', 'appointmentEffectiveDate', 'appointmentExpiryDate'];
  }
  if (hasExam && !hasAppointment) {
    return ['examUpgrade', 'completedBy'];
  }
  return [
    'appointment',
    'provinceWide',
    'appointmentEffectiveDate',
    'appointmentExpiryDate',
    'examUpgrade',
    'completedBy',
  ];
};

export interface ValidateScalerFormOptions {
  /**
   * Edit mode only: legacy enforces the appointment-XOR-exam rule only when the scaler has no
   * prior appointment or exam (ScalerBo.appointmentOrExamExists). When false, both sections are
   * optional (a filled one adds a new row; appointment wins server-side if both are filled).
   */
  enforceApptExamXor?: boolean;
}

/**
 * Mode-aware validation. Create mode preserves the shipped SCL-3 messages verbatim; edit mode
 * uses the legacy update-screen texts (UC-SCL-003 ERR-001..009 + ScalerAssignedLicTypeBo).
 */
export const validateScalerForm = (
  values: ScalerFormValues,
  mode: ScalerFormMode,
  options: ValidateScalerFormOptions = {},
): ScalerFormValidationResult => {
  const nextErrors: Record<string, string> = {};
  const required = (key: string, ok: boolean, message: string) => {
    if (!ok) {
      nextErrors[key] = message;
    }
  };
  // Every date field is format-checked client-side, keyed to its own form field and labelled with its
  // own name. Without this the malformed value reached the server, which rejected it under the request
  // DTO's field name (e.g. `issuedDate` -> "Issued Date"), so the message named the wrong field, the
  // appointment/effective collision on `issuedDate` highlighted the wrong input, and fields with no
  // server->form mapping (`appointmentExpiryDate`, `completedBy`) failed silently or banner-only.
  // Blank is not a validity error here — `dateOnlyFieldError` returns null so the `required` rule owns
  // the empty case and nothing gets overwritten.
  const dateField = (key: string, value: string, label: string) => {
    const message = dateOnlyFieldError(value, label);
    if (message) {
      nextErrors[key] = message;
    }
  };
  const edit = mode === 'edit';
  const enforceXor = edit ? options.enforceApptExamXor !== false : true;

  if (!edit) {
    required('client', values.client.trim().length > 0, 'Client is required.');
    required('loc', values.loc.trim() === FIXED_CLIENT_LOC, 'Location must be 00.');
  }
  required(
    'district',
    values.regDist.trim().length > 0,
    edit ? 'Reg / Dist is required.' : 'District is required.',
  );
  required('effectiveDate', values.effectiveDate.trim().length > 0, 'Effective Date is required.');
  dateField('effectiveDate', values.effectiveDate, 'Effective Date');
  required(
    'oathTaken',
    values.oathTaken === 'Yes' || values.oathTaken === 'No',
    edit ? 'Scaler Oath Taken? is required.' : 'Scaler Oath Taken is required.',
  );

  if (edit) {
    required(
      'licenceTypes',
      values.licenceScaling || values.licenceWaste,
      'You must select at least 1 Licence Type.',
    );
    required(
      'expiryDate',
      !values.licenceWaste || values.expiryDate.trim() !== '',
      'Expiry Date is required if Licence Type Waste is selected.',
    );
    dateField('expiryDate', values.expiryDate, 'Expiry Date');
    // Only compare once both sides are real dates — otherwise a malformed value produces a misleading
    // "on or before" complaint instead of the "not a valid date" one, and the string `<` is meaningless.
    if (
      isValidDateOnly(values.effectiveDate) &&
      isValidDateOnly(values.expiryDate) &&
      values.expiryDate < values.effectiveDate
    ) {
      nextErrors.expiryDate = 'Scaler effective date must be on or before the licence expiry date.';
    }
  }

  const { hasAppointment, hasExam } = sectionPresence(values);

  // "Not both" applies regardless of the XOR gate: the server persists only one section per
  // save (appointment wins), so letting both through silently drops the exam.
  if (hasAppointment && hasExam) {
    return {
      ok: false,
      nextErrors,
      formError: edit
        ? 'Either the Appointment section or the Exam section is required but not both.'
        : 'Please complete either the Appointment section or the Exam / Upgrade section (not both).',
    };
  }

  if (enforceXor && values.licenceScaling && !hasAppointment && !hasExam) {
    return {
      ok: false,
      nextErrors,
      formError: edit
        ? 'You must select an Appointment or an Exam.'
        : 'Please complete either the Appointment section or the Exam / Upgrade section.',
    };
  }

  if (hasAppointment) {
    required('appointment', values.appointment.trim() !== '', 'Appointment is required.');
    required(
      'provinceWide',
      values.provinceWide === 'Yes' || values.provinceWide === 'No',
      'Province Wide is required.',
    );
    required(
      'appointmentEffectiveDate',
      values.appointmentEffectiveDate.trim() !== '',
      'Appointment Effective Date is required.',
    );
    dateField('appointmentEffectiveDate', values.appointmentEffectiveDate, 'Appointment Effective Date');
    dateField('appointmentExpiryDate', values.appointmentExpiryDate, 'Appointment Expiry Date');
    delete nextErrors.examUpgrade;
    delete nextErrors.completedBy;
  }

  if (hasExam) {
    required('examUpgrade', values.examUpgrade.trim() !== '', 'Exam / Upgrade is required.');
    required('completedBy', values.completedBy.trim() !== '', 'Completed By is required.');
    dateField('completedBy', values.completedBy, 'Completed By');
    delete nextErrors.appointment;
    delete nextErrors.provinceWide;
    delete nextErrors.appointmentEffectiveDate;
  }

  return { ok: Object.keys(nextErrors).length === 0, nextErrors, formError: null };
};

const buildSections = (values: ScalerFormValues, appointmentOptions: ScalerAppointmentOption[]) => {
  const selected = appointmentOptions.find((option) => option.value === values.appointment);
  return {
    appointment: values.appointment
      ? {
          scalerAppointmentType: selected?.scalerAppointmentType ?? '',
          scaleGradingSystemCode: selected?.scaleGradingSystemCode ?? '',
          provinceWideInd: (values.provinceWide === 'Yes' ? 'Y' : 'N') as 'Y' | 'N',
          issuedDate: values.appointmentEffectiveDate,
          expiryDate: values.appointmentExpiryDate || undefined,
        }
      : undefined,
    exam: values.examUpgrade
      ? {
          // Class code is derived server-side from the training type — not sent.
          scalerTrainingTypeId: values.examUpgrade,
          completionDate: values.completedBy,
        }
      : undefined,
  };
};

export const buildCreateRequest = (
  values: ScalerFormValues,
  appointmentOptions: ScalerAppointmentOption[],
): ScalerCreateRequest => ({
  clientNumber: values.client.trim(),
  orgUnitNo: Number(values.regDist),
  issuedDate: values.effectiveDate,
  oathTakenInd: values.oathTaken === 'Yes' ? 'Y' : 'N',
  licenceTypes: ['SCS'],
  ...buildSections(values, appointmentOptions),
});

/** `licenceCancelledDate` is never sent — read-only via the general update. */
export const buildUpdateRequest = (
  values: ScalerFormValues,
  appointmentOptions: ScalerAppointmentOption[],
): ScalerCreateRequest => ({
  clientNumber: values.client.trim(),
  orgUnitNo: Number(values.regDist),
  issuedDate: values.effectiveDate,
  expiryDate: values.expiryDate || undefined,
  oathTakenInd: values.oathTaken === 'Yes' ? 'Y' : 'N',
  licenceTypes: [
    ...(values.licenceScaling ? (['SCS'] as const) : []),
    ...(values.licenceWaste ? (['WA'] as const) : []),
  ],
  ...buildSections(values, appointmentOptions),
});
