# Coverage — UC-SCL-008 Update Scaler Training

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `UC-SCL-008-slices.md` (S01..S07) + `UC-SCL-008-technical.md`, against the app's
update-training write path (`ExamUpgradesTab.tsx` → `ScalerExamController.updateScalerExam` behind
**PUT /api/scalers/{no}/exams/{scalerTrainingTypeId}**).

**Re-grounding.** The legacy `.scalerTrainingUpdate` (`/scalerTrainingUpdate.do`) Struts page is the new
app's **Exams / Upgrades** tab in EDIT mode. A row's **"Edit"** reopens the SAME modal titled
**"Exams / Upgrades - Edit"**: the type Select `#exam-training-type` is **disabled** (the immutable composite
PK — legacy carried it as a hidden field), and only the Completed By date `#exam-completion-date` (Carbon
`DatePicker`, `Y-m-d`, commits on blur) is editable. **Save Record** → `updateMutation` → the PUT with body
`{ scalerTrainingTypeId, completionDate: <blank ? null : value> }`, which invalidates the list query and
closes the modal on success (`ExamUpgradesTab.tsx:174-198, 229-237, 277-288`). **Reset** reverts the form to
the loaded record (`resetEditorForm`, :265-275 — no request); **Back** discards and closes (`closeEditor` —
no request). The completion date is **optional**: clearing it persists `null`, and the list cell renders the
em dash `—` (`asText`, same as UC-SCL-007 S02). There is no free-text date-format path (Carbon DatePicker).

**Scope note:** the two happy paths (S01/S07) **SEED their own scaler + one training row** (type 5
'Acting Scaler Exam', seeded via the API `seedExam` fixture) and edit it IN PLACE — S01 changes the
completion date, S07 clears it — proven by the list cell + a positive update-spy (`=== 1`); the seeded row
is DELETEd before the scaler (teardown order avoids ORA-02292). They live in `update.feature`
(`@mode:serial`, one shared seed client `00001065` reused seed → clean → re-seed). The Reset (S03) and Back
(S04) slices are **read-only on anchor scaler `5828`** (its editable row is type 1 "Interior Grading 1",
class UPG, persisted completion `1989-06-08`): both are no-write paths, asserted on the reverted/closed form
+ update-spy `=== 0`. Values pinned in `fixtures/scl/scaler-exam-test-data.ts`. Verified against the local
Docker DB 2026-08-11.

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy — update completion date (S01) | slices.md S01 | `updateMutation` PUT → `invalidateQueries` → list re-render (ExamUpgradesTab.tsx:174-198) | update.feature `@S01 @p0` | covered | — |
| Empty completion date accepted — optional (S07) | slices.md S07 | `buildPayload` sends `completionDate: null` when blank (ExamUpgradesTab.tsx:229-237); cell renders `—` | update.feature `@S07 @p1` | covered | — |
| Validation fails — invalid date format (S02) | slices.md S02 / ERR-001 | Carbon `DatePicker` emits `Y-m-d` (DateInput.tsx); no free-text date parse/validation | — | not-applicable | Coverage gap #1 |
| Reset reverts to original values (S03) | slices.md S03 | `resetEditorForm` reverts `formValues` to `editingExam` (ExamUpgradesTab.tsx:265-275); no request | validation.feature `@S03 @p2` | covered | — |
| Back without saving (S04) | slices.md S04 | modal "Back" → `closeEditor` (ExamUpgradesTab.tsx:479, no PUT) | validation.feature `@S04 @p2` | covered | — |
| Edit/Delete/Add controls visible to DSM (S05) | slices.md S05 / STA-001..003 | Edit/Delete/Add each wrapped in `<PermissionGate>` (`ExamUpgradesTab.tsx`); render because mock `SCS_SYS_ADMIN` holds every permission | — | blocked | Coverage gap #2 |
| Unauthorized access to update (S06) | slices.md S06 / ERR-005 | endpoint auth (`@IsScsEditor`) + `<PermissionGate SCALER_EXAM_UPDATE>` on Edit | — | blocked | Coverage gap #2 |

**Symmetry check:** update *with* a new date (S01) and *clearing* the optional date (S07) are both covered —
the pair that matters for this single-editable-field UC. The two no-write exits (Reset S03, Back S04) are
both covered. The immutable-PK type Select and the derived class code are not user-editable, so there is no
"change the type" slice (legacy PK fields were hidden; the new app disables the Select). Create and Delete
training are **separate UCs** (UC-SCL-007 / -009, per slices.md "Deliberately excluded") and are out of scope
here.

**Role / permission coverage:** the legacy permission gates (`scalerTrainingUpdate`, S05 controls / S06 Not
Authorized) can't be exercised — mock auth grants only `SCS_SYS_ADMIN`, which maps to every permission. The
new app DOES have a per-element gate (`<PermissionGate>` around Edit/Delete/Add in `ExamUpgradesTab.tsx`, keyed
off `context/auth/permissions.ts`); the controls render because the mock role holds all permissions, not
because no gate exists — so both are `blocked` (Coverage gap #2), revisitable once the harness can inject a
lower-privilege role. Endpoint enforcement is also present (`@IsScsEditor` on the mutating controller); a gate
should treat these as **waived**, not failing.

**Status values:** `covered` · `not-applicable` · `blocked`.
