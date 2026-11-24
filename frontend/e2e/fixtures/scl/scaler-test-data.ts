import { daysAgo, daysAhead } from '../common/dates';

/**
 * SCL (Scaler) create — DB-grounded known values for UC-SCL-002. NO seed patch is needed: the create
 * write path is satisfied entirely by REAL extracted data (unlike MSD/CHK). Re-verify on any DB
 * re-extract (real data is non-deterministic).
 *
 * The create write path enforces (backend ScalerService.validateWrite / createScaler):
 *   - client must exist in the BC Forests client registry at location "00"  (else 400 "No client found…")
 *   - one scaler per client — UNIQUE key SCLR_UK on SCALER.CLIENT_NUMBER   (else 400 "A scaler already exists…")
 *   - Scaling (SCS) is always sent on create; exactly one of Appointment / Exam is required (XOR).
 * So a happy-path client must EXIST at loc "00" AND NOT already own a scaler.
 *
 * Discovered 2026-07-30 (real extract; RE-VERIFY on re-extract):
 *   SELECT cl.client_number, fc.client_name
 *     FROM the.client_location cl JOIN the.forest_client fc ON fc.client_number = cl.client_number
 *    WHERE cl.client_locn_code='00' AND fc.client_status_code='ACT'
 *      AND NOT EXISTS (SELECT 1 FROM the.scaler s WHERE s.client_number = cl.client_number);
 * → 00001481 · 00001490 DOMAN FOREST PRODUCTS · 00001500 DOWNIE STREET SAWMILLS · 00001543 HECATE LOGGING · …
 * If a happy path fails with 400 "A scaler already exists for this client", that client was consumed by a
 * leaked create (or a real extract now has a scaler for it) — re-run the query and re-pin.
 */

/** Client that OWNS no scaler yet — the Appointment happy path (S01) creates + cleans up on it. */
export const appointmentClientNumber = '00001481';
/** A different unconsumed client — the Exam happy path (S06) creates + cleans up on it (parallel-safe). */
export const examClientNumber = '00001490'; // DOMAN FOREST PRODUCTS LIMITED
/** A third unconsumed client — the duplicate-scaler rule test owns it (creates one, retries, cleans up). */
export const duplicateRuleClientNumber = '00001500'; // DOWNIE STREET SAWMILLS LTD.
/**
 * A valid, unconsumed client used to fill the client field on NEGATIVE/validation scenarios (S02/S03/S04)
 * that never persist (client-side validation blocks the POST), so it is never actually created on and does
 * not collide with the happy paths. Read-only usage → parallel-safe.
 */
export const negativeClientNumber = '00001543'; // HECATE LOGGING LTD.

/** Fixed client location — the form pins Loc to "00" (readOnly) and the registry check is at loc "00". */
export const clientLocation = '00';

/**
 * A client number provably ABSENT from the client registry, so the server rejects create with
 * `No client found for client number {n} at location 00.` (S08). 8 digits (field max) — confirmed
 * 2026-07-30: SELECT COUNT(*) FROM the.client_location WHERE client_number='99999999' → 0.
 */
export const absentClientNumber = '99999999';
/** The exact re-grounded server message for an unknown client (new app; replaces legacy ERR-004). */
export const clientNotFoundMessage = (client: string) =>
  `No client found for client number ${client} at location 00.`;
/** The exact re-grounded server message for the one-scaler-per-client uniqueness rule (SCLR_UK). */
export const duplicateScalerMessage = 'A scaler already exists for this client.';

/**
 * A Reg / Dist (org unit) value the DistrictSelect (`#district`) actually offers; the option value is the
 * org-unit number as a string. 1831 = "RKB - Rocky Mountain Natural Resource District". Confirmed
 * 2026-07-30: GET /api/region-district-lov includes {code:'1831',…}.
 */
export const districtOrgUnitNo = '1831';

/**
 * A real Appointment type the `#appointment` LOV offers. NOTE the select is fed by
 * GET /api/grading-code-appointment-type-lov (NOT appointment-type-lov) — option value=code,
 * text=description. Selected by visible label. "Acting - Coastal" (code '1') is scalerAppointmentType
 * 'A' (Acting) — duration cap ≤ 1 year, so the ~300-day appointment window below stays inside it.
 * Confirmed 2026-07-30: grading-code-appointment-type-lov includes
 * {code:'1',description:'Acting - Coastal',scalerAppointmentType:'A',scaleGradingSystemCode:'C'}.
 */
export const appointmentTypeLabel = 'Acting - Coastal';

/**
 * A real Exam / Upgrade type the `#exam-upgrade` LOV offers (GET /api/scaler-training-type-lov). Selected
 * by label. '5' = "Acting Scaler Exam" (class EXM). Confirmed 2026-07-30.
 */
export const examTypeLabel = 'Acting Scaler Exam';

/** Yes/No dropdown labels (oath, province-wide) — selected by visible label. */
export const YES = 'Yes';
export const NO = 'No';

/**
 * Valid core-section values for a create, minus the licence-type (create always sends ['SCS'] — the
 * Scaling/Waste checkboxes are edit-mode only). Dates are today-relative (never hardcoded literals):
 * effective yesterday. `client` is filled by the caller so each scenario owns its client.
 */
export const validCore = (client: string) => ({
  clientNumber: client,
  district: districtOrgUnitNo,
  effectiveDate: daysAgo(1),
  oathTaken: YES,
});

/**
 * A valid Appointment section (province-wide = No so the scaler's district applies; effective yesterday,
 * expiry ~300 days out — inside the type-A ≤1yr cap).
 */
export const validAppointment = () => ({
  appointmentType: appointmentTypeLabel,
  provinceWide: NO,
  effectiveDate: daysAgo(1),
  expiryDate: daysAhead(300),
});

/** A valid Exam section (an alternate to the appointment; completed yesterday). */
export const validExam = () => ({
  examType: examTypeLabel,
  completedBy: daysAgo(1),
});

// --- Client-side validation messages (new app; ScalerForm/index.tsx create-mode branch, confirmed 2026-07-30) ---
export const clientRequiredMessage = 'Client is required.';
export const districtRequiredMessage = 'District is required.';
export const effectiveDateRequiredMessage = 'Effective Date is required.';
export const oathRequiredMessage = 'Scaler Oath Taken is required.'; // create mode has no "?" (edit does)
export const xorBothMessage =
  'Please complete either the Appointment section or the Exam / Upgrade section (not both).';
export const xorNeitherMessage =
  'Please complete either the Appointment section or the Exam / Upgrade section.';

/** Short field label → { core key to blank, message shown } for the S02 required-field Scenario Outline. */
export const REQUIRED_CORE_FIELD: Record<
  string,
  { key: 'clientNumber' | 'district' | 'effectiveDate' | 'oathTaken'; message: string }
> = {
  Client: { key: 'clientNumber', message: clientRequiredMessage },
  District: { key: 'district', message: districtRequiredMessage },
  'Effective Date': { key: 'effectiveDate', message: effectiveDateRequiredMessage },
  Oath: { key: 'oathTaken', message: oathRequiredMessage },
};

/**
 * Full API create body (mirrors ScalerCreateRequest) to API-seed a scaler the duplicate-rule test then
 * collides with. Appointment type A / grading C (the "Acting - Coastal" option); the mapper derives the
 * appointment orgUnitNo from the scaler (province-wide N → scaler's orgUnitNo), so it is not sent here.
 */
export const buildScalerCreateBody = (client: string) => ({
  clientNumber: client,
  orgUnitNo: Number(districtOrgUnitNo),
  issuedDate: daysAgo(1),
  oathTakenInd: 'Y',
  licenceTypes: ['SCS'],
  appointment: {
    scalerAppointmentType: 'A',
    scaleGradingSystemCode: 'C',
    provinceWideInd: 'N',
    issuedDate: daysAgo(1),
    expiryDate: daysAhead(300),
  },
});
