import { daysAgo, daysAhead } from '../common/dates';

/**
 * SCL (Scaler) UPDATE — DB-grounded known values for UC-SCL-003. The new app edits a scaler via the
 * "Scaler Record - Edit" modal on the View page (ScalerEditModal → ScalerForm mode="edit"), saving with
 * PUT /api/scalers/{no}. Two data shapes are needed:
 *
 *  1. A READ-ONLY ANCHOR — a REAL existing scaler the validation + address slices open but never persist
 *     to (their saves are blocked CLIENT-SIDE, so no PUT fires and nothing mutates). Parallel-safe.
 *  2. FRESH UNCONSUMED CLIENTS — the happy-path + reset slices seed their OWN scaler via the API
 *     (seedScaler → POST /api/scalers), edit it, and DELETE it on teardown. Distinct from the UC-SCL-002
 *     clients so the seeds never collide on the SCALER.CLIENT_NUMBER unique key (SCLR_UK).
 *
 * Re-verify on any DB re-extract (real data is non-deterministic).
 *
 * Discovered 2026-07-31 (real extract; RE-VERIFY on re-extract):
 *   -- read-only anchor: an existing scaler with a Scaling licence
 *   SELECT scaler_licence_no, client_number, oath_taken_ind, org_unit_no FROM the.scaler ORDER BY scaler_licence_no;
 *   -- + GET /api/scalers/001A -> {licenceTypes:['SCS'], oathTakenInd:'Y', orgUnitNo:1902, appointment:present}
 *   -- fresh unconsumed clients (loc 00, ACT, no scaler), excluding the UC-SCL-002 set:
 *   SELECT cl.client_number FROM the.client_location cl JOIN the.forest_client fc
 *     ON fc.client_number=cl.client_number
 *    WHERE cl.client_locn_code='00' AND fc.client_status_code='ACT'
 *      AND cl.client_number NOT IN ('00001481','00001490','00001500','00001543')
 *      AND NOT EXISTS (SELECT 1 FROM the.scaler s WHERE s.client_number=cl.client_number);
 */

/**
 * A REAL existing scaler used READ-ONLY by the validation + address slices (they open its edit modal /
 * Address tab and assert client-side behaviour; no save persists). The anchor must satisfy FOUR things —
 * check all of them when re-pinning, not just "it exists":
 *   1. >=1 appointment  — the UC-SCL-005/006 slices click a per-ROW Edit/Delete (preflight guards this).
 *   2. >=1 licence type — UC-SCL-003 S03 clears "both licence types" and expects the at-least-one error.
 *   3. an appointment or exam — the app only enforces the appointment-XOR-exam rule when the scaler has
 *      NEITHER (`enforceApptExamXor = !appointment && !exam`); an anchor with neither raises an extra
 *      error that breaks the S02/S06 single-error assertions.
 *   4. CLIMS address data — the Address-tab slice asserts the contact table renders, which only happens
 *      when GET /api/scalers/{no}/address returns a populated record.
 *
 * 5828 = client 00034698, licenceTypes ['SCS'], oath Y, org unit 1834, licence not cancelled,
 * 2 uncancelled appointments (ids 990 / 989), address lastName GIEBNER / firstName DONAL.
 * Re-grounded 2026-08-07 via GET /api/scalers/5828{,/appointments,/address}.
 *
 * WAS 001A (client 00001110) until 2026-08-07: still present, but its `scaler_licence_attribute` rows had
 * been deleted from the local container (0 appointments, no licence types), so it failed criteria 1-3 —
 * caught by the SCL preflight, not mid-suite. The extract itself is fine (100 appointment rows across ~60
 * scalers); nothing in the suite deletes the anchor's appointment (the UC-SCL-006 delete slice seeds and
 * deletes its OWN scaler; the cancel slice only cancels), so treat this as out-of-band local mutation —
 * if it recurs on a fresh container, that assumption is wrong and the cause needs a proper hunt.
 *
 * Re-pin query (a scaler with appointments, ordered by how many):
 *   SELECT scaler_licence_no, COUNT(*) FROM the.scaler_licence_attribute GROUP BY scaler_licence_no
 *     ORDER BY COUNT(*) DESC;
 * then confirm licenceTypes / address / not-cancelled via the three GETs above. Prefer a scaler no other
 * suite pins (382E is referenced by the CHK fixtures; 9710 by the RSK ones).
 */
export const anchorScalerLicenceNo = '5828';

/**
 * A fresh unconsumed client the mutating slices seed their scaler on. ONE client suffices: update.feature
 * is @mode:serial and each scenario seeds → edits → DELETEs (freeing the client) before the next runs, so
 * they never overlap on the SCALER.CLIENT_NUMBER unique key (SCLR_UK). Distinct from the UC-SCL-002 set.
 * 00001034 = BRENDAL.
 */
export const updateSeedClientNumber = '00001034';

/**
 * A second real district (option value = org-unit-no string) to CHANGE Reg/Dist TO on the identity happy
 * path. The seed files the scaler under 1831; 56 = "RCB - 100 Mile House Natural Resource District".
 * Confirmed 2026-07-31: GET /api/region-district-lov includes {code:'56',…}. (The seed's own district is
 * pinned as `districtOrgUnitNo` in scaler-test-data.ts.)
 */
export const changedDistrictOrgUnitNo = '56';

/** An Expiry Date to set on the licence-fields happy path (well after the seed's effective date). */
export const licenceExpiryDate = daysAhead(365);

// --- Edit-mode validation messages (new app; ScalerForm/index.tsx validateScalerForm mode='edit',
// confirmed 2026-07-31). These are the legacy update-screen texts, NOT the create-mode copy. ---
export const regDistRequiredMessage = 'Reg / Dist is required.';
export const effectiveDateRequiredMessage = 'Effective Date is required.';
export const oathRequiredMessage = 'Scaler Oath Taken? is required.'; // edit copy keeps the "?" (create drops it)
export const licenceTypeRequiredMessage = 'You must select at least 1 Licence Type.';
export const wasteExpiryRequiredMessage = 'Expiry Date is required if Licence Type Waste is selected.';
export const expiryBeforeEffectiveMessage =
  'Scaler effective date must be on or before the licence expiry date.';
export const xorBothMessage =
  'Either the Appointment section or the Exam section is required but not both.';

/** Short field label → { form action, message } for the S02 edit required-field Scenario Outline. */
export const REQUIRED_EDIT_FIELD: Record<string, { clear: 'district' | 'effectiveDate' | 'oath'; message: string }> = {
  'Reg / Dist': { clear: 'district', message: regDistRequiredMessage },
  'Effective Date': { clear: 'effectiveDate', message: effectiveDateRequiredMessage },
  Oath: { clear: 'oath', message: oathRequiredMessage },
};

/** An effective/expiry pair that trips the edit-only expiry-before-effective rule (expiry earlier than effective). */
export const expiryBeforeEffectiveDates = { effectiveDate: daysAgo(0), expiryDate: daysAgo(1) };
