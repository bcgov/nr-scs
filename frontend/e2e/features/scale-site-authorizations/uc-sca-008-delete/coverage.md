# Coverage — UC-SCA-008 Delete Scale Site Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `delete.feature` + `UC-SCA-008-*` against the delete path
(`pages/View/ScaleSiteAuthorization` `handleDelete` → `window.confirm` → `DELETE /api/scale-site-authorizations/{id}`
→ navigate `/scale-sites/view/{scaleSiteIdNmbr}?tab=authorizations`). The server deletes child conditions
explicitly then the parent (HTTP 204). Each scenario API-seeds its own record (site 520); S01 seeds it WITH
an SIA child condition so the cascade is exercised.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Confirm delete → record removed → return to tab | UC-SCA-008 S01 | `window.confirm` accept → DELETE → nav | delete.feature `@S01 @p1 @CNF-001` | covered | proves gone (GET → 404) + lands on tab; record seeded WITH a child condition → cascade exercised |
| Cancel delete → no request, stay on view | UC-SCA-008 S02 | `window.confirm` dismiss → no DELETE | delete.feature `@S02 @p2 @CNF-001` | covered | proves scaleSiteAuthDeleteCalls === 0 |
| Delete blocked when a letter exists | UC-SCA-008 | `handleDelete` `window.alert` (letterExists) | — | deferred | CG#1 — no letterExists=true record obtainable (letters env-blocked) |
| Unauthorized delete | UC-SCA-008 | server `@RequiresPermission`; no UI gate | — | blocked | CG#2 (mock auth) |

**Symmetry check:** the confirm dialog's two arms — Confirm (deletes, 404) and Cancel (no delete, stays) —
are both covered, with the confirm message asserted (CNF-001). The child-condition cascade is server-side
(explicit delete-then-parent) and is exercised by **S01**, which seeds its record WITH an SIA condition
(`siaConditionBody`) before confirming the delete: the GET → 404 proves the parent is gone, and the cleanup
teardown would 404-fail loudly had the child row blocked the parent delete.

**Role / permission coverage:** blocked by mock auth (single `SCS_SYS_ADMIN`) — see CG#2.

**Status values:** `covered` · `deferred` (see Coverage gaps) · `blocked` (env/auth).
