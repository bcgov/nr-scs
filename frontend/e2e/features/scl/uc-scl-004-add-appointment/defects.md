# Defect log — UC-SCL-004 Add Scaler Appointment

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment for all entries below: branch `test/scl-appointments`, frontend `http://localhost:3000` +
backend `:8080` (mock auth `SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB
`THE/…@localhost:1525/DBDOCK_01`. Add-appointment needs **no seed patch** — real extracted data satisfies
it. Ground-truthed live 2026-08-04. Real data is non-deterministic — re-verify pinned anchors on any DB
re-extract.

---

## Bug / Regression

### Bug #1 — Appointment dropdown served a stale LOV after a maintenance edit (QA DEV) — fixed elsewhere
- **Symptom seen here:** an attribute newly added in Maintain Valid Licence Attributes was missing
  from this screen's Appointment dropdown (QA repro: grading system **Both** + appointment type
  **F** → expected "Forest Services - Both").
- **Root cause is not in this UC** — the dropdown was correct, its data source was stale. Three
  uninvalidated caches sat in front of `GET /api/grading-code-appointment-type-lov`. Full write-up
  and fix: [UC-MNT-004 Bug #2](../../admin/maintenance/uc-mnt-004-valid-licence-attributes/defects.md),
  which owns the write that must invalidate them.
- **ACTION:** none here. **Status:** CLOSED (fixed under UC-MNT-004).

---

## Divergence

_None identified for the authored slices — the app matched the re-grounded expectations for
S01/S02/S03/S05/S06/S07/S09._

---

## Coverage gap

### Coverage gap #1 — Effective Date invalid format (legacy S04 / ERR-004) is UI-unreachable
- **What's not tested (plain):** legacy S04 (a non-`yyyyMMdd` string in Effective Date → format error).
- **Why:** the app uses a Carbon `DatePicker` (`#appointment-issued-date`) that emits `YYYY-MM-DD`; the
  `isValidDateOnly` guard (`appointmentFormUtils.ts:187-189`) exists but a user can't type an invalid format.
- **Status:** OPEN — `not-applicable` (legacy free-text-only mechanic).

### Coverage gap #2 — Province Wide = Yes with a Reg/Dist selected (legacy S07 arm a / ERR-006) is UI-unreachable
- **What's not tested (plain):** the "Reg/Dist is invalid for Province Wide" arm — selecting a district
  while Province Wide = Yes.
- **Why:** selecting Province Wide = Yes both **disables** the district select
  (`ScalerAppointmentForm.tsx:43`) AND **auto-clears** any value already in it (`AppointmentsTab.tsx:220-222`),
  so the field can never carry a value while Yes is selected. The server guard
  (`appointmentFormUtils.ts:181-183`, "District must be omitted when the appointment is province-wide.")
  is unreachable from the UI. Only the mirror arm (S07 arm b, district-required-when-not-province-wide) is
  reachable and is covered.
- **Status:** OPEN — `not-applicable` (UI-unreachable by design).

### Coverage gap #3 — role / permission (legacy S08 Not Authorized, ERR-010) blocked by mock auth
- **What's not tested (plain):** S08 (a user without `scalerAppointmentCreate` permission is refused; the
  "Add Appointment" button is hidden / direct access is blocked). Mock auth grants only `SCS_SYS_ADMIN`.
- **Status:** OPEN — `blocked` by mock auth. Revisit if the harness gains multi-role auth.

---

## Spec gap (gherkin-incorrect-vs-source)

### Spec gap #1 — the slice catalog's "duplicate appointment" exclusion misattributes a maintenance-screen rule
- **What's wrong (plain):** `UC-SCL-004-slices.md` (Gap Analysis) excludes a "Duplicate appointment
  (DB-level `errors.licence_attribute_exists`) — database stored-procedure enforcement; deferred TODO". That
  is a **misattribution** — there is no such rule on scaler appointments in EITHER app:
  - The DB insert proc **both** apps call — `scs_scaler_licence_attribt_pkg.insert_rec` (immutable) — is a
    plain `INSERT … RETURNING` with NO duplicate/overlap/uniqueness check. There is no unique constraint on
    `scaler_licence_attribute` for (scaler, type, grading) either (a 2nd identical add returns **201**, not
    ORA-00001; confirmed live 2026-08-04).
  - `errors.licence_attribute_exists` ("Valid Licence Attribute already exists for this Grading System and
    Appointment Type") is raised only in legacy `ScalerValidLicenceAttributeBo` — the **Valid Licence
    Attribute *maintenance*** screen (UC-MNT-004), enforcing uniqueness on the REFERENCE table, NOT on a
    scaler's appointments.
- **Consequence:** adding a duplicate appointment is **NOT a divergence** — legacy allows it too. So this is
  not a `not-applicable` app-behaviour gap; it is a **source error in the slice catalog** (a UC-MNT-004 rule
  copied onto UC-SCL-004).
- **Status:** OPEN — `spec gap`. **ACTION: BA to correct `UC-SCL-004-slices.md`** — drop the
  "duplicate appointment / `errors.licence_attribute_exists`" exclusion (or re-file it under UC-MNT-004).

---

## Verified — not a defect

### V1 — the slices add a DISTINCT appointment type only for read-back identification (not a uniqueness rule)
- The happy paths add an 'Acting - Interior' (A/I) appointment — distinct from the seed scaler's intrinsic
  A/C — solely so the API read-back can identify the ADDED row by grading. It is NOT because a same-type add
  would be rejected: neither app enforces appointment uniqueness (see Spec gap #1). Recorded so the choice of
  a distinct type isn't mistaken for a constraint.

### V2 — a scaler with ADDED appointments returns 400 on delete (drives the cleanup order)
- The scaler DELETE cascades only the scaler's INTRINSIC appointment; a scaler that has appointments added
  via the appointments endpoint returns **400 (ORA-02292 child record)** until those added appointments are
  deleted first. This matches the legacy "cascade does not clear dependent records" behaviour and is not a
  defect. The suite's `createdScalerAppointmentIds` cleanup therefore DELETEs added appointments **before**
  the parent scaler (it depends on `createdScalerLicenceNos` so its teardown runs first). Recorded because a
  naive "just delete the scaler" teardown would fail-loud here.

---

## Testing note (not a product finding)

- **`--repeat-each` seed contention.** `add.feature` is `@mode:serial` and its happy paths seed a scaler on
  ONE shared client. Under `--repeat-each` the parallel repeat copies seed that same client concurrently and
  the 2nd collides on `SCLR_UK` (400 "already exists") — a test-data contention artifact, NOT a logic flake
  (the normal suite runs each scenario once, seed→clean→seed, and never contends). Flakiness is instead
  verified by stressing the non-seeding validation slices (`--repeat-each=5` → 35/35 green) plus a clean
  normal run (9/9). No residue leaks even on the contended run (the seed client is left scaler-free).
