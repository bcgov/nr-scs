import { daysAgo, daysAhead } from '../common/dates';
import { districtOrgUnitNo } from './scaler-test-data';

/**
 * SCL Add-Appointment — DB-grounded values for UC-SCL-004. Appointments are CHILD records of a scaler,
 * managed on the View Scaler screen's Appointments tab: "Add Appointment" opens the "Scaler Appointment -
 * Create" modal (ScalerAppointmentForm), saved with POST /api/scalers/{no}/appointments.
 *
 * Two data shapes:
 *  1. A READ-ONLY ANCHOR scaler (reused from scaler-edit-test-data: `anchorScalerLicenceNo`) — the
 *     validation slices open its Add modal and are blocked CLIENT-SIDE (no POST fires), so nothing mutates.
 *  2. A fresh unconsumed client the happy-path slices seed their OWN parent scaler on (via seedScaler),
 *     add an appointment, then tear down (added appointment DELETEd first, then the scaler).
 *
 * Discovered 2026-08-04 (real extract; RE-VERIFY on re-extract):
 *   - grading-code-appointment-type-lov: {code:'5', description:'Acting - Interior', type:'A', grading:'I'}
 *     — DISTINCT (type,grading) from the seed scaler's intrinsic appointment (A/C, 'Acting - Coastal'), so
 *     the read-back can identify the ADDED appointment by grading 'I'. Type 'A' (Acting) caps at 1 year,
 *     which drives the S06 duration-exceeded check.
 *   - No duplicate-appointment constraint in the new backend (a 2nd A/C add returns 201) — confirmed live.
 *   - A scaler with ADDED appointments returns 400 on delete (ORA-02292); deleting the added appointments
 *     FIRST restores deletability (the intrinsic appointment cascades) — drives the cleanup order.
 */

/** Fresh unconsumed client the add-appointment happy paths seed a parent scaler on. add.feature is
 *  @mode:serial (seeds via POST /api/scalers), so ONE client suffices (seed → add → teardown per scenario).
 *  API-verified scaler-free 2026-08-04. Distinct from the UC-SCL-002/003 client set. */
export const appointmentSeedClientNumber = '00001055';

/** The appointment type ADDED by the slices — 'Acting - Interior' (code 5, type A / grading I). Distinct
 *  from the seed scaler's intrinsic A/C appointment, so the read-back finds the added one by grading. */
export const addAppointmentTypeLabel = 'Acting - Interior';
/** The type/grading the added appointment persists as — the read-back comparands. */
export const addAppointmentType = 'A';
export const addAppointmentGrading = 'I';

/** A real Reg/Dist the appointment DistrictSelect offers (option value = org-unit-no string), for the
 *  district-specific (Province Wide = No) slice. Reuses the scaler-create district pin. */
export const appointmentDistrictOrgUnitNo = districtOrgUnitNo; // '1831'

// Province Wide select values (ScalerAppointmentForm: SelectItem value 'Y' / 'N').
export const PW_YES = 'Y';
export const PW_NO = 'N';

// --- Add-appointment validation messages (new app; appointmentFormUtils.validateAppointmentForm 'create',
// confirmed 2026-08-04). ---
export const appointmentRequiredMessage = 'Appointment is required.';
export const provinceWideRequiredMessage = 'Province Wide is required.';
export const effectiveDateRequiredMessage = 'Effective Date is required.';
export const districtRequiredMessage = 'District is required when the appointment is not province-wide.';
export const expiryBeforeEffectiveMessage =
  'Appointment effective date must be on or before the appointment expiry date.';
/** Acting (type A) caps at 1 year — the message embeds the max years and the type letter. */
export const durationExceedsMaxMessage =
  'Appointment expiry date cannot be more than 1 year(s) after the appointment effective date for appointment type A.';

/** Short label → { form action, message } for the S03 required-field outline. */
export const REQUIRED_APPOINTMENT_FIELD: Record<
  string,
  { omit: 'appointment' | 'provinceWide' | 'effectiveDate'; message: string }
> = {
  Appointment: { omit: 'appointment', message: appointmentRequiredMessage },
  'Province Wide': { omit: 'provinceWide', message: provinceWideRequiredMessage },
  'Effective Date': { omit: 'effectiveDate', message: effectiveDateRequiredMessage },
};

/** Today-relative date inputs. Effective = yesterday; a valid short expiry within the 1-year Acting cap. */
export const appointmentEffectiveDate = daysAgo(1);
export const appointmentValidExpiryDate = daysAhead(300); // < 1yr after effective → within the Acting cap
/** Expiry earlier than effective → trips the expiry-before-effective rule (S05). */
export const expiryBeforeEffectiveDates = { effectiveDate: daysAgo(0), expiryDate: daysAgo(1) };
/** Expiry > 1 year after effective for an Acting (type A) appointment → trips the duration cap (S06). */
export const durationExceededDates = { effectiveDate: daysAgo(0), expiryDate: daysAhead(730) };

// --- UC-SCL-005 Update Appointment ---------------------------------------------------------------

/** Distinct fresh client for the UPDATE happy path's seeded scaler — must differ from the ADD seed client
 *  (00001055) so add.feature + update.feature (both @mode:serial, both seed) never collide on SCLR_UK when
 *  run together. Untouched by prior UCs; also guarded by the SCL preflight. */
export const appointmentUpdateSeedClientNumber = '00001012';

/** The new Expiry Date the S01 update sets on the seeded scaler's intrinsic appointment. The seed's
 *  appointment is issued daysAgo(1) / expires daysAhead(300); 200 days out is a real CHANGE, still after the
 *  effective date, and within the 1-year Acting (type A) cap. */
export const updatedExpiryDate = daysAhead(200);

// Edit-only cancellation validation messages (appointmentFormUtils.applyCancellationValidation).
export const cancellationPairMessage =
  'Cancellation date and reason must either both be provided or both be omitted.';
export const cancellationBeforeEffectiveMessage =
  'Cancellation date must be on or after the appointment effective date.';
export const cancellationAfterExpiryMessage =
  'Cancellation date must be on or before the appointment expiry date.';

/** A cancellation reason used when exercising the pair rule (S07). */
export const cancellationReasonText = 'Retired';

// --- UC-SCL-006 Delete Appointment ---------------------------------------------------------------

/** Distinct fresh client for the DELETE happy path's seeded scaler — differs from the ADD (00001055) and
 *  UPDATE (00001012) seed clients so all three appointment features can run together without SCLR_UK
 *  contention. API-verified scaler-free 2026-08-05; also guarded by the SCL preflight. */
export const appointmentDeleteSeedClientNumber = '00001058';

/** The delete-confirmation dialog text (legacy CNF-001; new app renders it as the Carbon modal heading). */
export const deleteConfirmMessage = 'Are you sure you want to delete this record?';
/** The empty-state message shown once a scaler has no appointments (legacy S03). */
export const emptyAppointmentsMessage = 'No appointments found for this scaler.';

/** S08 (before-effective arm): a known appointment window (effective today, expiry +10d — within any
 *  type's cap) with a cancellation date BEFORE the effective date. Overriding effective+expiry keeps the
 *  duration rule from also firing, so ONLY the cancellation-before-effective error shows. */
export const cancellationOutOfRangeDates = {
  effectiveDate: daysAgo(0),
  expiryDate: daysAhead(10),
  cancellationDate: daysAgo(1),
};
