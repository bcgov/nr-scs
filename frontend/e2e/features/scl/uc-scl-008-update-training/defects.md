# Defect log — UC-SCL-008 Update Scaler Training

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment: branch `test/scl-training`, frontend `http://localhost:3000` + backend `:8080` (mock auth
`SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB `THE/…@localhost:1525/DBDOCK_01`. No seed
patch needed. Ground-truthed live 2026-08-11. Re-verify pinned anchors on any DB re-extract.

---

## Divergence

_No behavioral divergence affecting the authored slices — the app matched the re-grounded expectations for
S01 (update date), S07 (clear date → `—`), S03 (Reset reverts to the persisted value), and S04 (Back closes
without a PUT)._

**Cross-reference (display; non-blocking).** UC-SCL-007's defects.md logs an observation that the Exams /
Upgrades list **Type** column renders a training-type description only for types in the active
scaler-training-type LOV and falls back to the raw code for a **retired** type (e.g. anchor 5828's EXM
type 2 shows `2`). This UC's read-only slices (S03/S04) target 5828's **type 1 "Interior Grading 1"** row,
which **is** in the active LOV, so its Type column renders the description normally — the observation does
**not** affect these slices (the row is identified by that rendered description). Recorded so the shared
anchor's known display quirk isn't mistaken for a gap here.

---

## Coverage gap

### Coverage gap #1 — invalid date format (legacy S02 / ERR-001) is UI-unreachable
- **What's not tested (plain):** legacy S02 (a non-`yyyyMMdd` string in the Completed By field → format
  error `Completed By must be in the format 'yyyyMMdd'`).
- **Why:** the edit form's Completed By field is a Carbon `DatePicker` (`dateFormat="Y-m-d"`, DateInput.tsx)
  that emits a `YYYY-MM-DD` string; there is no free-text date parse and no client date-format validation, so
  a user cannot submit a mis-formatted date. The date is also *optional* (S07). Identical mechanic to
  UC-SCL-007 S06 and UC-SCL-005 S05.
- **Status:** OPEN — `not-applicable` (legacy free-text-only mechanic).

### Coverage gap #2 — role / permission (legacy S05 controls visible, S06 Not Authorized) blocked by mock auth
- **What's not tested (plain):** S05 (Edit/Delete/Add render for a fully-permissioned District Scaling
  Manager) and S06 (a user without `scalerTrainingUpdate` is refused / a direct URL to the update action is
  forwarded to notAuthorized).
- **Why:** mock auth grants only `SCS_SYS_ADMIN`, which maps to **every** permission. The app DOES have a
  per-element gate — Edit / Delete / Add are each wrapped in `<PermissionGate>` (`ExamUpgradesTab.tsx`) keyed
  off the `context/auth/permissions.ts` role→permission matrix — so the controls render only because the mock
  role holds all permissions, not because no gate exists; it can't be varied with a single role. There is also
  no separate update URL to hit unauthorized (edit is an in-place modal).
- **Status:** OPEN — `blocked` by single-role mock auth (not by an absent model). Revisit when the harness can
  inject a lower-privilege role. Enforcement (the gate + `@IsScsEditor`) IS present, so treat as **waived**, not failing.

---

## Verified — not a defect

### V1 — the type Select is disabled in edit mode by design (immutable PK), so there is no "change type" slice
- In edit mode `#exam-training-type` is `disabled` (`ExamUpgradesTab.tsx:444`), pre-set to the row's type,
  and the PUT body carries the same `scalerTrainingTypeId` as the URL path — the composite PK cannot change.
  Legacy carried the type as hidden PK fields with the same intent (UC-SCL-008-technical.md). New app ==
  legacy → no divergence; only the completion date is editable, which is exactly what S01/S07 exercise.

### V2 — Create / Delete training are separate UCs, not gaps here
- The Exams / Upgrades tab also offers "Add Exam / Upgrade" (create) and a per-row Delete, but this UC is
  update-only; create is UC-SCL-007 and delete is UC-SCL-009 (slices.md "Deliberately excluded"). Their
  absence from this suite is by scope, not an omission.
