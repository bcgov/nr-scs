# Defect log — UC-SCL-009 Delete Scaler Training

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment: branch `test/scl-training`, frontend `http://localhost:3000` + backend `:8080` (mock auth
`SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB `THE/…@localhost:1525/DBDOCK_01`. No seed
patch needed. Ground-truthed live 2026-08-12. Re-verify pinned anchors on any DB re-extract.

---

## Divergence

_None identified for the authored slices — the app matched the re-grounded expectations for S01/S02._

---

## Coverage gap

### Coverage gap #1 — filter-then-delete (legacy S03) covered elsewhere
- **What's not tested (plain):** S03 (filter the training list by class, then delete a row). The class Filter
  is already covered by UC-SCL-007 S03 (`filter.feature`); the delete path by S01 here. The filter narrows
  the loaded rows client-side and does not change the delete request path.
- **Status:** OPEN — `covered (elsewhere)`. No separate slice: the combination adds no new enforcement point.

### Coverage gap #2 — permission / role branches (legacy S04, S06) blocked by mock auth
- **What's not tested (plain):** S04 (Delete controls hidden without `scalerTrainingDelete`), S06
  (unauthorized direct DELETE to the training-delete path). Mock auth grants only `SCS_SYS_ADMIN`, which maps
  to every permission, so every user is fully authorized. The app DOES gate the control — Delete is wrapped in
  `<PermissionGate SCALER_EXAM_DELETE>` (`ExamUpgradesTab.tsx`) and the endpoint carries `@IsScsEditor` — but
  it renders because the mock role holds all permissions, not because no gate exists, so these branches are
  unreachable from the browser.
- **Status:** OPEN — `blocked` by single-role mock auth (not by an absent model). Revisit once the harness can inject a lower-privilege role.

### Coverage gap #3 — DB child-constraint on delete (legacy S05) not-applicable
- **What's not tested (plain):** S05 (the delete is refused because the training row has associated child
  records → error banner via `deleteMutation.onError`). **`SCALER_TRAINING` has zero child foreign keys**
  (DB-confirmed 2026-08-12), so no other table references a training row — a delete can never be blocked by a
  child constraint. There is no deterministic UI path to raise the error banner (same class as UC-SCL-006 S05).
- **Status:** OPEN — `not-applicable` (no deterministic trigger; the referential-integrity precondition cannot
  exist for this table).

---

## Verified — not a defect

### V1 — a scaler with zero training rows is still deletable
- Deleting a scaler's only (seeded) training row leaves it with 0 rows, and the scaler still DELETEs cleanly
  in teardown (`seedScaler` cleanup). So the S01 happy path can delete the single seeded row and rely on the
  ordinary scaler cleanup — no special teardown needed (added training rows are DELETEd before the parent
  scaler to avoid ORA-02292, but a row already deleted by the UI is a no-op 404 in teardown, which is OK).
