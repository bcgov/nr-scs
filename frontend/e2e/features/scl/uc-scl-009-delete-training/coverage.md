# Coverage — UC-SCL-009 Delete Scaler Training

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `UC-SCL-009-slices.md` (S01..S06) + `UC-SCL-009-technical.md`, against the app's
delete-training path (`ExamUpgradesTab.tsx` row **"Delete"** → confirm modal → `deleteMutation` →
`ScalerExamController.deleteScalerExam`, **DELETE /api/scalers/{no}/exams/{scalerTrainingTypeId}**).

**Re-grounding.** The legacy `.scalerTrainingList` per-row Delete + JS `confirm()` is the new app's
Exams / Upgrades tab: a row's **danger--ghost "Delete"** raises a Carbon **confirmation modal** (legacy
CNF-001 "Are you sure you want to delete this record?"); **"Confirm Delete"** issues the DELETE, **"Cancel"**
dismisses it. On success `deleteMutation` invalidates the list query and the row disappears; deleting the
last row shows the empty state **"No exams / upgrades found for this scaler."**.

**Scope note:** the two slices split by data shape. **S01 (delete)** SEEDS its own scaler + one training row
(type 5 'Acting Scaler Exam', via the API `seedExam` fixture), deletes it through the UI, and proves removal
by the empty state + a positive delete-spy (`=== 1`); it lives in `delete.feature` (`@mode:serial`, seed
client `00001066`). A 0-row scaler is still deletable, so ordinary `seedScaler` cleanup suffices. **S02
(cancel)** is **read-only on anchor scaler `5828`** (2 training rows): clicking Delete on the "Interior
Grading 1" row (type 1, class UPG, in the active LOV) opens the confirm, Cancel dismisses it — asserted on
the still-2-row list + delete-spy `=== 0`, nothing mutates. Values pinned in
`fixtures/scl/scaler-exam-test-data.ts`. Verified against the local Docker DB 2026-08-12.

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Delete training row (S01) | slices.md S01 | `deleteScalerExam` (DELETE) + list invalidate/re-render | delete.feature `@S01 @p0` | covered | — |
| Confirmation dialog CNF-001 | technical.md CNF-001 | confirm modal "Are you sure you want to delete this record?" | delete.feature `@S01` / cancel.feature `@S02` | covered | — |
| Training list empty after last delete (SUC-001) | slices.md S01 | "No exams / upgrades found for this scaler." after last delete | delete.feature `@S01` (empty-state assertion) | covered | — |
| Actor cancels confirmation (S02) | slices.md S02 | modal "Cancel" → no DELETE | cancel.feature `@S02 @p1` | covered | — |
| Filter list before deleting (S03) | slices.md S03 | client-side class filter, then the S01 delete path | — | covered (elsewhere) | Coverage gap #1 |
| Delete controls hidden — no permission (S04) | slices.md S04 / STA-002 | Delete wrapped in `<PermissionGate SCALER_EXAM_DELETE>` (`ExamUpgradesTab.tsx`) + `@IsScsEditor`; renders because mock `SCS_SYS_ADMIN` holds every permission | — | blocked | Coverage gap #2 |
| Delete blocked by DB referential integrity (S05) | slices.md S05 | `deleteMutation.onError` → banner (child-record message) | — | not-applicable | Coverage gap #3 |
| Unauthorized direct DELETE (S06) | slices.md S06 / ERR-001 | route / `@IsScsEditor` guard | — | blocked | Coverage gap #2 |

**Symmetry check:** the confirm dialog's two arms — Confirm (S01, deletes) and Cancel (S02, no delete) — are
both covered, and the post-delete empty-list state (SUC-001) is asserted. The filter-then-delete variation
(S03) adds no new enforcement (see gap #1). The permission/role branches (S04/S06) are uniformly blocked by
mock auth; the DB-constraint exception (S05) has no deterministic UI trigger.

**Role / permission coverage:** blocked by mock auth (S04/S06) — see Coverage gap #2.

**Coverage gap #1 — filter-then-delete (S03) covered elsewhere.** The class Filter is exercised by
UC-SCL-007 S03 (`filter.feature`) and the delete path by S01 here. Filtering is a client-side narrowing of
the loaded rows and does not change the delete request path, so a combined slice would add no new enforcement
point — no separate scenario authored.

**Coverage gap #2 — permission / role branches (S04, S06) blocked by mock auth.** Mock auth grants only
`SCS_SYS_ADMIN`, which maps to every permission. The new app DOES have a per-element gate — Delete is wrapped
in `<PermissionGate SCALER_EXAM_DELETE>` (`ExamUpgradesTab.tsx`, keyed off `context/auth/permissions.ts`) and
the endpoint carries `@IsScsEditor` — but the button renders because the mock role holds all permissions, not
because no gate exists, so S04 (Delete hidden) and S06 (unauthorized direct DELETE) are unreachable from the
browser. OPEN — revisit once the harness can inject a lower-privilege role.

**Coverage gap #3 — DB child-constraint on delete (S05) not-applicable.** `SCALER_TRAINING` has **zero** child
foreign keys (DB-confirmed 2026-08-12), so a training delete can never be refused by a child constraint —
there is no deterministic UI trigger to raise the error banner (same class as UC-SCL-006 S05). See defects.md.

**Status values:** `covered` · `covered (elsewhere)` · `not-applicable` (no deterministic trigger) · `blocked` (env/auth).
