# Coverage — UC-SCA-006 Update Scale Site Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `update.feature` + `UC-SCA-006-*` against the new-app write path
(`pages/Edit/ScaleSiteAuthorization` client-side; `ScaleSiteAuthorizationService.validateCreateRequest`
[shared with create] server-side; `PUT /api/scale-site-authorizations/{id}`; read-back `GET .../{id}`).
Each scenario API-seeds its own record (site 520, no letter) and cleans up via DELETE.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy — edit + save a field (expiry) | UC-SCA-006 | `PUT .../{id}` → read-back | update.feature `@S01 @p0` | covered | — |
| Conditions survive an unrelated-field edit (destructive delete-then-add) | UC-SCA-006 (server `updateScaleSiteAuthorization`: `deleteSiteAuthorizationConditions` → `addConditions`) | `PUT .../{id}` → read-back conditions | update.feature `@S01 @p1` | covered | guards a data-loss risk (edit form omits `loadDefaults={false}` → conditions-section mount races the record load); confirmed green 2026-08-21 (condition survives the edit — no data loss); a regression = **sev2 data-loss**, see defects.md |
| Max authorization length (SALM) on save | server `validateMaxAuthorizationLength` (shared `validateCreateRequest`) | `PUT .../{id}` → HTTP 400 | — | covered elsewhere | same shared rule exercised in UC-SCA-005 validation `@S07`; edit window pinned inside the cap |
| Required-field re-validation on save | UC-SCA-006 (shared validateBasics) | `validateBasics` (expiry required) | update.feature `@S02 @p1` | covered | proves no PUT (scaleSiteAuthUpdateCalls === 0) |
| Reset restores loaded values | UC-SCA-006 | edit `Reset` (snapshot restore) | update.feature `@S06 @p2` | covered | — |
| Cancellation date/reason edit (always editable) | UC-SCA-006 detailed | `#cancellation-date` / `#cancellation-reason` | — | deferred | CG#1 (cancel flow; low value here) |
| Letter-lock — only cancellation editable when `letterExists` | UC-SCA-006 | edit short-circuits to cancellation | — | deferred | CG#2 — no letterExists=true record obtainable (letters env-blocked) |
| Unauthorized update | UC-SCA-006 | server `@RequiresPermission`; no UI gate | — | blocked | CG#3 (mock auth) |

**Symmetry check:** save-succeeds (S01) and save-blocked-by-missing-field (S02) are both covered, as are the
two no-write exits' analogue (Reset). The date-order/volume client rules are shared with create (covered in
UC-SCA-005) — the edit form runs the same `validateBasics`. The new S01 `@p1` closes a blind spot: because
`buildScaleSiteAuthCreateBody` previously seeded zero conditions, no UC-SCA-006/007/008 scenario ever touched
conditions, so the destructive delete-then-add update path was untested — S01 `@p1` now seeds a record WITH
condition 462 and proves it survives an unrelated edit.

**SALM (max authorization length):** the edit's "later date" target is pinned to ~240 days and the seed to
~180 days — both well inside the server's `validateMaxAuthorizationLength` cap — so a future SALM reduction
can't silently 400 every edit. The cap rule itself (shared `validateCreateRequest`) is exercised in
UC-SCA-005 validation `@S07`.

**Role / permission coverage:** blocked by mock auth (single `SCS_SYS_ADMIN`; no per-element gate) — see CG#3.

**Status values:** `covered` · `covered elsewhere` (tested by another UC's suite) · `deferred` (see Coverage gaps) · `blocked` (env/auth).
