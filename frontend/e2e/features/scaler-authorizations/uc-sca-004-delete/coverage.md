# Coverage — UC-SCA-004 Delete Scaler Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCA-004-S01..S06.feature` + `UC-SCA-004-slices.md`, against the delete path
(`pages/View/ScalerAuthorization/index.tsx` `handleDelete`; DELETE `/api/scaler-authorizations/{id}`;
controller `@IsScsEditor`). Delete is a confirm-gated hard delete triggered from the read-only view: a
letterless record pops `window.confirm` (CNF-001) → DELETE → navigate `/scalers/view/{licence}?tab=authorizations`.
Each scenario API-SEEDS a fresh record (licence 8437) and registers it for DELETE teardown (idempotent).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 confirm delete → record removed → back to scaler's authorizations tab | S01; CNF-001 | `handleDelete` confirm → DELETE → navigate | delete.feature `@S01 @p1` (confirm text + tab URL + GET 404) | covered | — |
| CNF-001 confirm text | S01/S02 | `window.confirm('Are you sure you want to delete this record?')` | delete.feature `@S01 @S02` (asserted verbatim) | covered | — |
| S02 cancel the confirm → no-op | S02 | confirm dismissed → early return | delete.feature `@S02 @p2` (no DELETE + stay on view) | covered | — |
| S03 letter exists → Delete is UI alert-only (no submit) | S03; STA-002 | `handleDelete` `record.letterExists` → `window.alert` | — | deferred | defects.md Coverage gap #1 (no letterExists=true record) |
| S04 letter created between load/submit → server error | S04; ERR-001 | `deleteScalerAuthorization` server letter guard | — | deferred | defects.md Coverage gap #1 (letterExists=true not obtainable) |
| S05 out-of-district → Delete hidden (STA-001) | S05 | (none — new app never district-gates the button) | — | not-applicable | Coverage gap #2 (district scoping deferred) |
| S06 lacks `scalerAuthorizationDelete` → not authorized (ERR-002) | S06 | `@IsScsEditor` (endpoint); button not role-gated; single mock role | — | blocked | Coverage gap #2 (mock auth) |

**Symmetry check:** the confirm-gated accept vs cancel mirror — both arms covered (S01 accept → DELETE +
navigate + gone; S02 cancel → nothing sent + stay). The letter-block arms (S03/S04) collapse on the same
data blocker (no `letterExists=true` record) → deferred, not dropped.

**Role / permission coverage:** S06 blocked by single-role mock auth (`SCS_SYS_ADMIN` satisfies
`@IsScsEditor`); S05 has no new-app equivalent (district scoping deferred).

**Coverage gate (excluding not-applicable/blocked/deferred):** S01 (confirm/CNF-001/tab/gone) + S02 (cancel)
— both covered. **P1 100% · P2 100%.**

**Status values:** `covered` · `not-applicable` · `deferred` · `blocked`. No divergence red.
