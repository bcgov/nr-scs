# Coverage — UC-SCL-007 Record Scaler Training

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCL-007-S01..S08.feature` + `UC-SCL-007-slices.md` + `UC-SCL-007-technical.md`,
against the app's record-training write path (`ExamUpgradesTab.tsx` →
`ScalerExamController.createScalerExam` behind `POST /api/scalers/{no}/exams`).

**Re-grounding.** The legacy `.scalerTrainingList` / `.scalerTrainingCreate` Struts pages are the new app's
**Exams / Upgrades** tab on the View Scaler screen (`ExamUpgradesTab`). "Add Exam / Upgrade" opens the
**"Exams / Upgrades - Create"** passive modal (type Select `#exam-training-type` + Carbon DatePicker
`#exam-completion-date`), saved with **POST /api/scalers/{no}/exams**. The list has a class **Filter**
Select that narrows the loaded rows client-side. Required-type validation is **client-side**
(`handleSave` → `editorError`); the only server-side rejection reachable from the UI is the DB **unique-key**
collision on a duplicate `(scalerLicenceNo, scalerTrainingTypeId)`.

**Scope note:** the two happy paths (S01/S02) **SEED their own scaler** (which has no training rows, so any
type is free), add `Acting Scaler Exam`, and prove it via the new list row + a positive create-spy
(`=== 1`); the added row is DELETEd before the scaler (teardown order avoids ORA-02292). They live in
`record.feature` (`@mode:serial`, one shared seed client reused seed → clean → re-seed). The filter (S03),
required (S05), Back (S04), and duplicate (S07-DUP) slices are **read-only on anchor scaler `5828`** (2
training rows on the local DB): filter + required block client-side (create-spy `=== 0`); the duplicate POST
is *sent and 400s* (asserted on the surfaced error + unchanged row count of 2, and any stray success is
cleaned up so the anchor is never polluted). Values pinned in `fixtures/scl/scaler-exam-test-data.ts`.
Verified against the local Docker DB 2026-08-11.

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy — create training with type + date (S01) | slices.md S01 | `createMutation` POST → list re-render (ExamUpgradesTab.tsx:152-172) | record.feature `@S01 @p0` | covered | — |
| Create training without the optional date (S02) | slices.md S02 | `buildPayload` sends `completionDate: null` when blank (ExamUpgradesTab.tsx:229-237); cell renders `—` | record.feature `@S02 @p1` | covered | — |
| Filter list by class before creating (S03) | slices.md S03 | `filteredExams` client-side filter on `scalerTrainingClassCode` (ExamUpgradesTab.tsx:132-140) | filter.feature `@S03 @p2` | covered (re-ground) | reload → client-side filter, no request |
| Back from create form without saving (S04) | slices.md S04 | modal "Back" → `closeEditor` (ExamUpgradesTab.tsx:479, no POST) | validation.feature `@S04 @p2` | covered | — |
| Required — Exam / Upgrade type not selected (S05) | slices.md S05 / FLD-001 | `handleSave` blank-type guard → `editorError` "Exam / Upgrade is required." (ExamUpgradesTab.tsx:277-281) | validation.feature `@S05 @p1` | covered | — |
| Completed By date in wrong format (S06) | slices.md S06 / FLD-002 | Carbon `DatePicker` emits `Y-m-d` (DateInput.tsx); no free-text date validation | — | not-applicable | Coverage gap #1 |
| Duplicate `(licence, type)` rejected — DB unique key | new-app server behaviour | `createMutation.onError` → `extractApiError` → `editorError` banner "A record already exists with the same unique key." (ExamUpgradesTab.tsx:167-171); list unchanged | validation.feature `@S07-DUP @p1` | covered (verified-not-defect) | generic UK banner — same as legacy `errors.db.uk`; defects.md V1 |
| Not authorized to create training (S07) | slices.md S07 / ERR-001 | endpoint auth (`@IsScsEditor`) + `<PermissionGate SCALER_EXAM_CREATE>` on Add | — | blocked | Coverage gap #2 |
| Permission-gated controls visible to DSM (S08) | slices.md S08 / STA-002..004 | Add/Edit/Delete each wrapped in `<PermissionGate>` (`ExamUpgradesTab.tsx`); render because mock `SCS_SYS_ADMIN` holds every permission | — | blocked | Coverage gap #2 |

**Symmetry check:** create *with* the optional date (S01) and *without* it (S02) are both covered — the pair
that matters for this create-only UC. Update/Delete training are **separate UCs** (UC-SCL-008 / -009,
per slices.md "Deliberately excluded") and are out of scope here.

**Role / permission coverage:** the legacy permission gates (`scalerTrainingCreate/Update/Delete`, S07/S08)
can't be exercised — mock auth grants only `SCS_SYS_ADMIN`, which maps to every permission. The new app DOES
have a per-element gate (`<PermissionGate>` around Add/Edit/Delete in `ExamUpgradesTab.tsx`, keyed off the
`context/auth/permissions.ts` matrix); the controls render because the mock role holds all permissions, not
because no gate exists — so both are `blocked` (Coverage gap #2), revisitable once the harness can inject a
lower-privilege role. Endpoint enforcement is also present (`@IsScsEditor` on the mutating controller); a gate
should treat these as **waived**, not failing.

**Status values:** `covered` · `covered (re-ground)` · `covered (verified-not-defect)` · `not-applicable` · `blocked`.
