import { daysAgo, daysAhead } from '../../common/dates';

/**
 * Known-good test data for Maintain Valid Licence Attributes (UC-MNT-004), pinned from the seeded local
 * Docker Oracle DB + the running app's LOVs on 2026-07-22. Nothing here is fabricated.
 *
 * Provenance & constraints (they shape the achievable scope — see coverage.md):
 *  - The record key is COMPOSITE — (scaleGradingSystemCode, scalerAppointmentType).
 *  - The valid combos (grading-code-appointment-type LOV) are C|I × A|C|F|O (8). The grading-system LOV
 *      adds B=Both / C=Coastal / I=Interior. ALL 8 C/I combos ALREADY EXIST as valid_licence_attribute
 *      rows (plus NA×A/C/F/O). So a happy-path CREATE must use a FREE combo: grading system **B (Both)**
 *      + appointment type A is not taken and is UI-selectable (verified live → HTTP 201).
 *  - Every existing combo reports `dependentChildExists = true` ("associated to a Scaler"), so C/A is
 *      used READ-ONLY for both the delete-blocked warning (S09) and the duplicate-create rejection (S08).
 *  - In the LIST, a B/NA-grading row used to render an EMPTY grading-system-name link; fixed 2026-09-10
 *      (defects.md Bug #1) — B now shows as "Both". Names are still shared across the four appointment
 *      types of a grading system, so a self-seeded record is only reliably re-openable while it is the
 *      only row of its grading system; edit/delete-happy stay deferred (see defects.md Coverage gaps).
 *
 * DATES today-relative (daysAgo/daysAhead). Only Expiry >= Effective is enforced.
 */

/** A free, UI-selectable combo for the create happy path (grading system B = "Both"). */
export const VLA_CREATE = { gradingSystemCode: 'B', gradingSystemName: 'Both', appointmentType: 'A' } as const;

/** A real, EXISTING + dependent-having combo — used read-only for duplicate-create (S08) and
 *  delete-blocked (S09). "Coastal" is its list grading-system name. */
export const VLA_EXISTING = { gradingSystemCode: 'C', gradingSystemName: 'Coastal', appointmentType: 'A' } as const;

export interface VlaBody {
  gradingSystemCode: string;
  appointmentType: string;
  effectiveDate: string;
  expiryDate: string;
}

/** A fully valid create body for the free B/A combo. */
export function buildVlaBody(): VlaBody {
  return {
    gradingSystemCode: VLA_CREATE.gradingSystemCode,
    appointmentType: VLA_CREATE.appointmentType,
    effectiveDate: daysAgo(1),
    expiryDate: daysAhead(3650),
  };
}
