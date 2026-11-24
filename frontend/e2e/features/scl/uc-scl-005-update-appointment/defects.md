# Defect log — UC-SCL-005 Update Scaler Appointment

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment: branch `test/scl-appointments`, frontend `http://localhost:3000` + backend `:8080` (mock auth
`SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB `THE/…@localhost:1525/DBDOCK_01`. No seed
patch needed. Ground-truthed live 2026-08-05. Re-verify pinned anchors on any DB re-extract.

---

## Divergence

_None identified for the authored slices — the app matched the re-grounded expectations for
S01/S04/S07/S08/S11._

---

## Coverage gap

### Coverage gap #1 — Invalid date format (legacy S05) is UI-unreachable
- **What's not tested (plain):** legacy S05 (a non-`yyyyMMdd` string in a date field → format error).
- **Why:** the edit form's date fields are Carbon `DatePicker`s that emit `YYYY-MM-DD`; the `isValidDateOnly`
  guard exists but a user can't type an invalid format.
- **Status:** OPEN — `not-applicable` (legacy free-text-only mechanic).

### Coverage gap #2 — role / permission (legacy S12 Not Authorized) blocked by mock auth
- **What's not tested (plain):** S12 (a user without update permission is refused). Mock auth grants only
  `SCS_SYS_ADMIN`.
- **Status:** OPEN — `blocked` by mock auth. Revisit if the harness gains multi-role auth.

---

## Verified — not a defect

### V1 — the core appointment validation is mode-independent, so S02/S03/S06/S09/S10 are covered by UC-SCL-004
- `validateAppointmentForm` runs `applyCoreValidation` (required fields, invalid-date, expiry-before-effective,
  province-wide/reg-dist, duration-cap) in BOTH create and edit modes; only `applyCancellationValidation` is
  edit-only. So the legacy update slices S02/S03/S06/S09/S10 exercise the identical code UC-SCL-004 already
  covers on the add form. This UC therefore covers the EDIT-ONLY cancellation rules (S07/S08) + one
  representative core check (S04) proving the edit modal wires that validation and blocks the PUT. Recorded so
  the "covered elsewhere" rows in coverage.md aren't mistaken for gaps.

### V2 — the S08 after-expiry arm is the same code path as the before-effective arm
- `applyCancellationValidation` checks cancellation < effective (before-effective) and cancellation > expiry
  (after-expiry) with the same mechanism; only the comparison direction differs. The authored S08 covers the
  before-effective arm; the after-expiry arm is the mirror and adds no distinct logic. Recorded so the single
  arm isn't read as an omission.
