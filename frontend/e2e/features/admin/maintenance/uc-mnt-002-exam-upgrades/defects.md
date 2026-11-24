# UC-MNT-002 Maintain Exams / Upgrades — Defect Log

> How this log works (registers, statuses, tags): [defects-guide.md](../../../../defects-guide.md).

## Divergence

### Divergence #1 — delete-with-dependents returns a generic 500, not a meaningful message
- **What's wrong (plain):** When an administrator tries to delete an exam/upgrade that is still
  referenced by scaler-training records, the app shows a generic error — *"An unexpected error occurred.
  Please try again later."* — instead of telling them *why* (that it has dependent records and can't be
  deleted). The delete is correctly prevented (the record survives), so the RULE is fine; only the
  message is wrong.
- **Expected vs actual:**
  - *Expected* (legacy S04 intent + the sibling Maintain Appointment Types screen): a clear message like
    "…has dependent records and cannot be deleted" (HTTP 400), so the user knows to expire it instead.
  - *Actual:* `DELETE /api/exam-upgrades/{class}/{typeId}` → **HTTP 500** `{"code":"INTERNAL_SERVER_ERROR",
    "message":"An unexpected error occurred. Please try again later."}`; the row survives.
- **How we caught it:** delete.feature `@S04 @discovered-divergence` asserts the record still exists
  (passes) and that a meaningful "cannot be deleted" message is shown (RED — the generic text is shown
  instead). Reproduced directly: `DELETE /api/exam-upgrades/EXM/2` → 500, `GET` still 200.
- **Supporting detail:** FK `SRTR_SCTY_FK` (SCALER_TRAINING → SCALER_TRAINING_TYPE) is NO ACTION, so the
  DB raises ORA-02292 on delete; the backend does not translate it into a domain 400 (contrast
  AppointmentTypes' `AppointmentTypeService`, which returns a clean 400). This is the same class as
  backend tech-debt **H-3** (sanitize Oracle/SP errors — stop returning raw/opaque errors to clients).
- **Severity/priority:** @p1. **Environment:** local mock-auth stack, seeded Docker DB, 2026-07-22.
  **Data fixture:** `DEPENDENT_EXAM_UPGRADE = (EXM, 2)` (33 dependent scaler_training rows).
- **Status:** **CLOSED — FIXED** 2026-07-28 in nr-scs `ExamUpgradeService.deleteExamUpgrade`
  (wraps the repo delete in `try/catch (DataIntegrityViolationException)` → `BadRequestException("Exam /
  upgrade has dependent records and cannot be deleted.")`, mirroring `AuthorizationClauseService`).
  Verified live: `DELETE /api/exam-upgrades/EXM/2` → **HTTP 400** `{"code":"BAD_REQUEST","message":"Exam /
  upgrade has dependent records and cannot be deleted."}`, row survives. E2E `delete.feature @S04`
  re-grounded green (no longer `@discovered-divergence`). Covered by unit test
  `ExamUpgradeServiceTest.delete_withDependents_*`.

## Bug / Regression
_None found._

## Coverage gap

### Coverage gap #1 — S05 list filter by class code
- `@p2` list filter, not automated. Status: OPEN.

### Coverage gap #2 — S10 / S11 reset create/edit form
- `@p2` UI niceties, not automated. Status: OPEN.

### Coverage gap #3 — S12 unauthorized access
- Blocked by single-role mock auth (no non-admin session). Status: OPEN.

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — S07 date format / S09 description length not reachable in the new UI
- **What:** Legacy S07 (invalid date format) and S09 (description exceeds max length) are submit-time
  validations in the source. The new app prevents them at the control: dates use a Carbon date picker
  (no free-text bad format) and `validateForm` has no description-length branch (server-only if enforced
  at all). So neither is reproducible as a client-side submit error.
- **Status:** OPEN — informational; the `.feature` intentionally omits S07/S09 client scenarios.

## Verified — not a defect
- **FK protects the parent** — `DELETE` of a dependent-having type does not cascade or orphan; the row
  survives (verified live). The rule is correct; only the surfaced message is the divergence (see #1).
