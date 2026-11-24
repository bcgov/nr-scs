# Defect log — UC-SCL-007 Record Scaler Training

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment: branch `test/scl-training`, frontend `http://localhost:3000` + backend `:8080` (mock auth
`SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB `THE/…@localhost:1525/DBDOCK_01`. No seed
patch needed. Ground-truthed live 2026-08-11. Re-verify pinned anchors on any DB re-extract.

---

## Divergence

_No behavioral divergence affecting the authored slices — the app matched the re-grounded expectations for
S01/S02/S03/S04/S05 and the duplicate-key rejection (S07-DUP)._

**Observation (display; non-blocking; legacy comparison UNCONFIRMED).** On the Exams / Upgrades list the
**Type** column renders the training-type *description* only for types present in the active
scaler-training-type LOV (`GET /api/scaler-training-type-lov`); a **retired** type absent from that LOV
falls back to its **raw code** — e.g. anchor 5828's EXM row shows `2`, not "Licensing Exam" (its active UPG
type 1 renders "Interior Grading 1" normally). Historical records referencing retired types therefore
display a bare numeric code. Whether legacy `.scalerTrainingList` (`scs:description` from
`LOV_SCALER_TRAINING_TYPE`) resolved retired types is **not confirmed**, so this is logged as an observation
for BA review, **not** asserted as a defect. The class **filter** is unaffected (it filters on
`scalerTrainingClassCode`), so S03 asserts the surviving row by its always-rendered class Description
("Exam" / "Upgrade"). Discovered live 2026-08-11.

---

## Coverage gap

### Coverage gap #1 — Completed By wrong-format (legacy S06 / FLD-002) is UI-unreachable
- **What's not tested (plain):** legacy S06 (a non-`yyyyMMdd` string in the Completed By field → format
  error `Completed By must be in the format 'yyyyMMdd'`).
- **Why:** the create form's Completed By field is a Carbon `DatePicker` (`dateFormat="Y-m-d"`, DateInput.tsx)
  that emits a `YYYY-MM-DD` string; there is no free-text date parse and no client date-format validation, so
  a user can't submit a mis-formatted date. The date is also *optional* (S02).
- **Status:** OPEN — `not-applicable` (legacy free-text-only mechanic).

### Coverage gap #2 — role / permission (legacy S07 Not Authorized, S08 permission-gated controls) blocked by mock auth
- **What's not tested (plain):** S07 (a user without `scalerTrainingCreate` is refused) and S08 (all three
  per-row/permission-gated controls render for a fully-permissioned DSM).
- **Why:** mock auth grants only `SCS_SYS_ADMIN`, which maps to **every** permission. The app DOES have a
  per-element gate — Add / Edit / Delete are each wrapped in `<PermissionGate>` (`ExamUpgradesTab.tsx`) keyed
  off the `context/auth/permissions.ts` role→permission matrix — so the controls render only because the mock
  role holds all permissions, not because no gate exists. It can't be varied with a single role.
- **Status:** OPEN — `blocked` by single-role mock auth (not by an absent model). Revisit when the harness can
  inject a lower-privilege role. Enforcement (the gate + `@IsScsEditor`) IS present, so treat as **waived**, not failing.

---

## Verified — not a defect

### V1 — a duplicate `(scalerLicenceNo, scalerTrainingTypeId)` create is rejected with the generic DB unique-key message, matching legacy
- Adding a training type the scaler already has POSTs to `POST /api/scalers/{no}/exams` and the DB unique
  key rejects it with **HTTP 400 `{"message":"A record already exists with the same unique key."}`**. The app
  surfaces that server message **verbatim** in the create modal's `InlineNotification` (title "Please fix the
  exam / upgrade form."): `createMutation.onError` → `extractApiError(error, …)` reads `response.data.message`
  → `editorError` (ExamUpgradesTab.tsx:167-171, 422-430). The modal stays open (no `closeEditor` on error) and
  the list is unchanged (no `invalidateQueries` on error), so `validation.feature @S07-DUP` asserts the banner
  text + that the list still shows 2 rows — **not** "no request sent" (the request IS sent and fails).
- This is **not training-specific** copy — it's the generic DB unique-key banner, the same collision the
  legacy app surfaced via its generic `errors.db.uk` message (no training-specific text). New app == legacy →
  **no divergence**. Recorded so the "covered (verified-not-defect)" coverage row isn't mistaken for a gap.
- **Anchor safety:** should the 400 ever succeed on a drifted DB (5828 no longer has the type), the
  `createdScalerExamCapture` fixture registers the stray 201 and the teardown DELETEs it, so the read-only
  anchor is never polluted; the assertions would then fail loud (no banner / 3 rows), correctly flagging the
  drift for a fixture re-ground.

### V2 — Update / Delete training are separate UCs, not gaps here
- The Exams / Upgrades tab also offers per-row Edit and Delete, but recording (create) is UC-SCL-007; update
  and delete are **UC-SCL-008 / UC-SCL-009** (slices.md "Deliberately excluded"). Their absence from this UC's
  suite is by scope, not an omission. Recorded so the create-only coverage isn't read as half-covering CRUD.
