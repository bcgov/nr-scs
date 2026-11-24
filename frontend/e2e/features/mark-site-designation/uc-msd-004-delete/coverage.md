# Coverage — UC-MSD-004 Delete Mark Site Designation

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-MSD-004-S01..S06.feature` + `UC-MSD-004-slices.md` (control/message
matrix) + `UC-MSD-004-technical.md` (STA/CNF/ERR catalog), against the app's actual delete path
(`pages/View/MarkSiteDesignation/index.tsx` `handleDelete` L195-214; `MarkSiteDesignationService.removeMarkSiteDesignationFromWorkbench`
→ `repository.setExpiryNotificationInd(id,'Y')`; controller `POST /api/mark-site-designations/{id}/workbench/remove`, `@IsScsEditor`).

**Scope note — the delete was fundamentally re-grounded.** The legacy UC is a **hard cascade-delete** of the
MSD and its children, gated by three blocking rules (scale-sites-present advisory, letter-exists advisory,
server-side letter guard) plus the `markSiteDelete` permission. The **new app has no hard delete**: the View
screen's "Delete" button pops a `window.confirm` and, on accept, does a **soft workbench-remove** (sets the
expiry-notification indicator) then navigates to `/welcome` — with **no** letter/scale-site/role gating. So
the legacy delete operation + its S03/S04/S05 blocking rules have **no new-app equivalent** (filed as
defects.md Divergence #1, suspected-intentional — this UC owns the deferral flagged in UC-MSD-003 Divergence
#1). S01 API-seeds its own letterless / no-scale-site MSD (self-cleaning at the DB; no DELETE endpoint) and
S02 opens a discovered real record read-only (cancel mutates nothing). Ground-truthed against the live stack
2026-07-22. The confirm text is pinned inline (identical to legacy CNF-001).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Delete via `/markSiteDelete` (S01, BR-MSD-004-01) | slices.md S01; technical.md:151-155 | re-grounded: `handleDelete` → `POST …/workbench/remove` → /welcome | delete.feature `@S01 @p1` (workbench-remove sent + on /welcome) | covered | Divergence #1 (soft-remove ≠ hard delete) |
| Confirm dialog text (CNF-001) | slices.md S01/S02; technical.md:75 | `handleDelete` `globalThis.confirm('Are you sure you want to delete this record?')` | delete.feature `@S01 @S02` (asserted verbatim) | covered | — |
| Success → navigate to welcome (SUC-001) | slices.md S01; technical.md:79 | `handleDelete` `navigate('/welcome')` | delete.feature `@S01` | covered | — |
| Record + children removed / cascade delete | slices.md S01; technical.md:157 | (none — workbench-remove is a soft flag flip; record persists) | delete.feature `@S01` asserts the record STILL EXISTS | divergence | Divergence #1 (log-only) |
| Cancel the confirm dialog (S02) | slices.md S02; technical.md:139-145 | `globalThis.confirm` returns false → `handleDelete` early-returns (no POST) | delete.feature `@S02 @p2` (no workbench-remove + stay on view) | covered | — |
| Delete blocked — scale sites present, advisory alert (S03 · STA-004) | slices.md S03; technical.md:73 | (none — Delete is unconditional; no scale-site gate) | — | not-applicable | Divergence #1 (no new-app equivalent) |
| Delete blocked — letter exists, client advisory (S04 · STA-005) | slices.md S04; technical.md:74 | (none — Delete is unconditional; no letter gate) | — | not-applicable | Divergence #1 (no new-app equivalent) |
| Delete blocked — letter exists, server guard (S05 · ERR-001) | slices.md S05; technical.md:76 | (none — `removeFromWorkbench` has no letter check) | — | not-applicable | Divergence #1 (no new-app equivalent) |
| Not authorized to delete (S06 · ERR-003) | slices.md S06; technical.md:329 | `@IsScsEditor` (endpoint); button not role-gated; single mock role | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check:** the meaningful mirror on a confirm-gated action is **accept vs cancel** — both arms
covered (S01 accept → workbench-remove + welcome; S02 cancel → nothing sent + stay on view). The three
legacy blocking states (scale-sites / letter-client / letter-server) collapse to a single unconditional
workbench-remove in the new app → logged as Divergence #1, not silently dropped.

**Role / permission coverage:** the not-authorized branch (S06) is **blocked** by single-role mock auth
(`SCS_SYS_ADMIN` only). The frontend does not gate the Delete button by role at all; the backend enforces
`@IsScsEditor` on the workbench-remove endpoint, which the single mock role always satisfies — so the denied
branch is unreachable from the browser. See Coverage gap #1.

**Status values:** `covered` · `not-applicable` (legacy-only / no new-app equivalent) · `blocked` (env/auth) · `divergence` (log-only entry or a genuinely-failing `@discovered-divergence` test — see this UC's `defects.md`).
