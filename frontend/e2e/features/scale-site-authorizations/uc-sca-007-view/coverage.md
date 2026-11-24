# Coverage — UC-SCA-007 View Scale Site Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `view.feature` + `UC-SCA-007-*` against the read-only view
(`pages/View/ScaleSiteAuthorization`; `GET /api/scale-site-authorizations/{id}`; the Scale Site block is
resolved via `searchScaleSites`). The scenario API-seeds a record (site 520) and cleans up via DELETE.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Read-only detail renders record fields | UC-SCA-007 | `GET .../{id}` → read-only fields (`#scale-site-number`, `#status`, …) | view.feature `@S01 @p0` | covered | asserts Scale Site # + Status |
| Non-existent id → load error | UC-SCA-007 | view load error (`GET` non-200 → notification, no fields) | view.feature `@S01 @p1` | covered | — |
| Conditions table (read-only) | UC-SCA-007 | read-only `AuthorizationConditionsSection` | — | deferred | CG#1 (rendered from the same read-back already asserted; low value) |
| Edit / Delete / Letter action buttons present | UC-SCA-007 | view actions | — | deferred | CG#2 — Edit exercised by UC-SCA-006, Delete by UC-SCA-008 |
| Unauthorized view | UC-SCA-007 | server `@RequiresPermission`; no UI gate | — | blocked | CG#3 (mock auth) |

**Role / permission coverage:** blocked by mock auth (single `SCS_SYS_ADMIN`) — see CG#3.

**Status values:** `covered` · `deferred` (see Coverage gaps) · `blocked` (env/auth).
