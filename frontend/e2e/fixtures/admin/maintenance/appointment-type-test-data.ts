import { daysAgo, daysAhead } from '../../common/dates';

/**
 * Known-good test data for Maintain Appointment Types (UC-MNT-003), pinned from the seeded local Docker
 * Oracle DB (localhost:1525 / DBDOCK_01 / THE) on 2026-07-22. Nothing here is fabricated.
 *
 * Provenance (queried via the seeded-SCS-DB container's sqlplus):
 *  - `scaler_appointment_type` holds 7 real codes: A, BEEP, C, F, O, V, X. No code starts with 'Z',
 *      so a `Z###` code is a collision-free namespace for records this suite creates.
 *  - Dependent children live in `scaler_valid_licence_attribute` (FK `SVDL_SAPT_FK`, delete_rule =
 *      NO ACTION — NO cascade). Codes A / C / F / O each have 3 child rows (delete-blocked); V / X /
 *      BEEP are childless. Because the FK has no cascade, a DELETE of a dependent-having code is
 *      rejected by the backend (HTTP 400) and the parent row survives — so opening `A` and attempting
 *      to delete it is a read-only, parallel-safe operation (nothing is mutated on rejection).
 *
 * DATES ARE TODAY-RELATIVE (see daysAgo/daysAhead), never hardcoded literals. Appointment types have no
 * "must not be future" rule; only Expiry >= Effective is enforced (ScalerAppointmentType validator).
 * A far-future expiry keeps every test window valid without a calendar-cliff.
 */

/** A real appointment type WITH dependent scaler_valid_licence_attribute rows — used by the
 *  delete-blocked scenario. Its DELETE is rejected (400) and the row survives, so this is read-only. */
export const DEPENDENT_APPOINTMENT_TYPE_CODE = 'A';

export type AppointmentTypeBody = {
  code: string;
  description: string;
  actingInd: 'Y' | 'N';
  effectiveDate: string;
  expiryDate: string;
}

/**
 * A parallel-safe, collision-free 4-char PK (the column is `maxlength=4`): `Z` + the Playwright worker
 * index (base36, 1 char, distinct per worker) + 2 random base36 chars. 'Z' avoids the 7 real codes;
 * the worker char avoids cross-worker collisions; the random tail avoids within-worker repeats. Each
 * created code is registered for cleanup, so the namespace never fills up.
 */
function uniqueCode(): string {
  const worker = Number(process.env.TEST_WORKER_INDEX ?? 0);
  const workerChar = worker.toString(36).toUpperCase().slice(-1);
  const rand = Math.floor(Math.random() * 36 * 36)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0');
  return `Z${workerChar}${rand}`.slice(0, 4);
}

/** A fully valid create/update body with a fresh unique code. */
export function buildAppointmentTypeBody(label = 'create'): AppointmentTypeBody {
  return {
    code: uniqueCode(),
    description: `E2E MNT ${label}`.slice(0, 120),
    actingInd: 'N',
    effectiveDate: daysAgo(1),
    expiryDate: daysAhead(3650), // ~10 years out — cannot age out mid-suite
  };
}
