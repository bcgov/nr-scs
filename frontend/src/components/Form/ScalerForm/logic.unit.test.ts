import { describe, expect, it } from 'vitest';

import { type ScalerAppointmentOption, type ScalerFormValues } from './index';
import { buildCreateRequest, buildUpdateRequest, computeActiveBranchKeys, createEmptyScalerFormValues, toScalerFormValues, validateScalerForm } from './logic';

const values = (overrides: Partial<ScalerFormValues> = {}): ScalerFormValues => ({
  ...createEmptyScalerFormValues(),
  client: '00012345',
  regDist: '43',
  effectiveDate: '2026-01-01',
  oathTaken: 'Yes',
  ...overrides,
});

const appointment = (overrides: Partial<ScalerFormValues> = {}) =>
  values({ appointment: 'A1', provinceWide: 'No', appointmentEffectiveDate: '2026-02-01', ...overrides });
const exam = (overrides: Partial<ScalerFormValues> = {}) =>
  values({ examUpgrade: 'T1', completedBy: '2026-03-01', ...overrides });

const options: ScalerAppointmentOption[] = [
  { value: 'A1', text: 'Official - Coastal', scalerAppointmentType: 'O', scaleGradingSystemCode: 'C' },
];

describe('toScalerFormValues', () => {
  it('seeds the core fields from the record and leaves the sections empty', () => {
    const v = toScalerFormValues({
      clientNumber: '00012345',
      orgUnitNo: 43,
      licenceTypes: ['SCS', 'WA'],
      issuedDate: '2026-01-01',
      expiryDate: '2027-01-01',
      oathTakenInd: 'Y',
    } as never);

    expect(v).toMatchObject({
      client: '00012345',
      regDist: '43',
      licenceScaling: true,
      licenceWaste: true,
      effectiveDate: '2026-01-01',
      expiryDate: '2027-01-01',
      oathTaken: 'Yes',
      appointment: '',
      examUpgrade: '',
    });
  });

  it('reads No and blank oath spellings and a sparse record', () => {
    expect(toScalerFormValues({ oathTakenInd: 'N' } as never).oathTaken).toBe('No');
    const sparse = toScalerFormValues({} as never);
    expect(sparse).toMatchObject({ client: '', regDist: '', licenceScaling: false, licenceWaste: false, effectiveDate: '', expiryDate: '', oathTaken: '' });
  });
});

describe('computeActiveBranchKeys', () => {
  it('names the section that is in use, or both when neither or both are', () => {
    expect(computeActiveBranchKeys(appointment())).toEqual([
      'appointment',
      'provinceWide',
      'appointmentEffectiveDate',
      'appointmentExpiryDate',
    ]);
    expect(computeActiveBranchKeys(exam())).toEqual(['examUpgrade', 'completedBy']);
    expect(computeActiveBranchKeys(values())).toHaveLength(6);
    expect(computeActiveBranchKeys(appointment({ examUpgrade: 'T1' }))).toHaveLength(6);
  });
});

describe('validateScalerForm — create', () => {
  it('names every missing core field', () => {
    const result = validateScalerForm(values({ client: ' ', loc: '01', regDist: '', effectiveDate: '', oathTaken: '' }), 'create');

    expect(result.ok).toBe(false);
    expect(result.nextErrors).toMatchObject({
      client: 'Client is required.',
      loc: 'Location must be 00.',
      district: 'District is required.',
      effectiveDate: 'Effective Date is required.',
      oathTaken: 'Scaler Oath Taken is required.',
    });
  });

  it('demands one of the two sections, but not both', () => {
    expect(validateScalerForm(values(), 'create').formError).toBe(
      'Please complete either the Appointment section or the Exam / Upgrade section.',
    );
    expect(validateScalerForm(appointment({ completedBy: '2026-03-01' }), 'create').formError).toBe(
      'Please complete either the Appointment section or the Exam / Upgrade section (not both).',
    );
  });

  it('completes the appointment section and drops any exam complaints', () => {
    const result = validateScalerForm(values({ appointmentExpiryDate: '2027-01-01' }), 'create');

    expect(result.ok).toBe(false);
    expect(result.formError).toBeNull();
    expect(result.nextErrors).toMatchObject({
      appointment: 'Appointment is required.',
      provinceWide: 'Province Wide is required.',
      appointmentEffectiveDate: 'Appointment Effective Date is required.',
    });
    expect(result.nextErrors).not.toHaveProperty('examUpgrade');
  });

  it('completes the exam section', () => {
    const result = validateScalerForm(values({ completedBy: '2026-03-01' }), 'create');

    expect(result.nextErrors).toMatchObject({ examUpgrade: 'Exam / Upgrade is required.' });
    expect(result.nextErrors).not.toHaveProperty('completedBy');
    expect(validateScalerForm(values({ examUpgrade: 'T1' }), 'create').nextErrors).toMatchObject({ completedBy: 'Completed By is required.' });
  });

  it('passes a complete appointment or exam form', () => {
    expect(validateScalerForm(appointment(), 'create')).toEqual({ ok: true, nextErrors: {}, formError: null });
    expect(validateScalerForm(exam(), 'create').ok).toBe(true);
  });

  // Each date field is format-checked client-side, keyed to its own field and labelled with its own
  // name — before the fix these were left to the server, which named the wrong field, highlighted the
  // wrong input, or dropped the error entirely.
  it('names the Effective Date field itself when it is not a real date', () => {
    const result = validateScalerForm(appointment({ effectiveDate: '9999-99-99' }), 'create');

    expect(result.ok).toBe(false);
    expect(result.nextErrors.effectiveDate).toBe('Effective Date is not a valid date.');
  });

  it('flags the Appointment Effective Date field, not the Effective Date, when the appointment date is bad', () => {
    const result = validateScalerForm(appointment({ appointmentEffectiveDate: '2026-02-30' }), 'create');

    expect(result.nextErrors.appointmentEffectiveDate).toBe('Appointment Effective Date is not a valid date.');
    expect(result.nextErrors).not.toHaveProperty('effectiveDate');
  });

  it('catches an invalid Appointment Expiry Date instead of failing silently', () => {
    const result = validateScalerForm(appointment({ appointmentExpiryDate: '2026-13-01' }), 'create');

    expect(result.ok).toBe(false);
    expect(result.nextErrors.appointmentExpiryDate).toBe('Appointment Expiry Date is not a valid date.');
  });

  it('gives Completed By its own inline error when it is not a real date', () => {
    const result = validateScalerForm(exam({ completedBy: 'not-a-date' }), 'create');

    expect(result.ok).toBe(false);
    expect(result.nextErrors.completedBy).toBe('Completed By is not a valid date.');
  });
});

describe('validateScalerForm — edit', () => {
  it('uses the legacy wording and skips the client checks', () => {
    const result = validateScalerForm(values({ client: '', regDist: '', oathTaken: '' }), 'edit');

    expect(result.nextErrors).not.toHaveProperty('client');
    expect(result.nextErrors).toMatchObject({ district: 'Reg / Dist is required.', oathTaken: 'Scaler Oath Taken? is required.' });
  });

  it('needs a licence type, and an expiry once Waste is ticked', () => {
    expect(validateScalerForm(values({ licenceScaling: false }), 'edit').nextErrors).toMatchObject({
      licenceTypes: 'You must select at least 1 Licence Type.',
    });
    expect(validateScalerForm(values({ licenceWaste: true }), 'edit').nextErrors).toMatchObject({
      expiryDate: 'Expiry Date is required if Licence Type Waste is selected.',
    });
    expect(validateScalerForm(values({ licenceWaste: true, expiryDate: '2027-01-01', appointment: 'A1', provinceWide: 'Yes', appointmentEffectiveDate: '2026-02-01' }), 'edit').ok).toBe(true);
  });

  it('keeps the expiry on or after the effective date', () => {
    expect(validateScalerForm(values({ expiryDate: '2025-12-31' }), 'edit').nextErrors).toMatchObject({
      expiryDate: 'Scaler effective date must be on or before the licence expiry date.',
    });
  });

  it('reports a malformed expiry as invalid rather than as an out-of-order date', () => {
    expect(validateScalerForm(values({ expiryDate: '9999-99-99' }), 'edit').nextErrors.expiryDate).toBe(
      'Expiry Date is not a valid date.',
    );
  });

  it('applies the section rule only while the scaler has neither yet', () => {
    expect(validateScalerForm(values(), 'edit').formError).toBe('You must select an Appointment or an Exam.');
    expect(validateScalerForm(values(), 'edit', { enforceApptExamXor: false }).ok).toBe(true);
    expect(validateScalerForm(appointment({ examUpgrade: 'T1' }), 'edit', { enforceApptExamXor: false }).formError).toBe(
      'Either the Appointment section or the Exam section is required but not both.',
    );
  });
});

describe('buildCreateRequest / buildUpdateRequest', () => {
  it('sends the appointment section resolved through the options', () => {
    const request = buildCreateRequest(appointment({ appointmentExpiryDate: '2027-01-01', oathTaken: 'Yes' }), options);

    expect(request).toMatchObject({
      clientNumber: '00012345',
      orgUnitNo: 43,
      issuedDate: '2026-01-01',
      oathTakenInd: 'Y',
      licenceTypes: ['SCS'],
      appointment: { scalerAppointmentType: 'O', scaleGradingSystemCode: 'C', provinceWideInd: 'N', issuedDate: '2026-02-01', expiryDate: '2027-01-01' },
    });
    expect(request.exam).toBeUndefined();
  });

  it('sends blanks for an appointment the options do not know, and no expiry when blank', () => {
    const request = buildCreateRequest(appointment({ appointment: 'ZZ', provinceWide: 'Yes', oathTaken: 'No' }), options);

    expect(request.appointment).toMatchObject({ scalerAppointmentType: '', scaleGradingSystemCode: '', provinceWideInd: 'Y' });
    expect(request.appointment?.expiryDate).toBeUndefined();
    expect(request.oathTakenInd).toBe('N');
  });

  it('sends the exam section on its own', () => {
    const request = buildCreateRequest(exam(), options);

    expect(request.appointment).toBeUndefined();
    expect(request.exam).toEqual({ scalerTrainingTypeId: 'T1', completionDate: '2026-03-01' });
  });

  it('sends the ticked licence types and the optional expiry on update', () => {
    expect(buildUpdateRequest(values({ licenceScaling: true, licenceWaste: true, expiryDate: '2027-01-01' }), options)).toMatchObject({
      licenceTypes: ['SCS', 'WA'],
      expiryDate: '2027-01-01',
    });
    const none = buildUpdateRequest(values({ licenceScaling: false, licenceWaste: false }), options);
    expect(none.licenceTypes).toEqual([]);
    expect(none.expiryDate).toBeUndefined();
  });
});
