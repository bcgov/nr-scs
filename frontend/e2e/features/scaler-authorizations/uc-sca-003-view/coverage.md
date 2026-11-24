# Coverage — UC-SCA-003 View Scaler Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCA-003-S01..S08.feature` + `UC-SCA-003-slices.md`, against the read path
(`pages/View/ScalerAuthorization/index.tsx`; GET `/api/scaler-authorizations/{id}`; route
`/scaler-authorizations/view/{id}`). Read-only screen: Authorized Scaler tombstone + authorization fields +
Job Functions / Special Forest Products / Scale Sites tables + read-only conditions + Edit Record / Delete /
Create-Letter actions. Scenarios API-SEED a fresh record (licence 8437) and clean it up via DELETE on
teardown — read-only open, parallel-safe. Data pinned in `fixtures/sca/sca-test-data.ts`.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 read-only render (tombstone licence, status, district-wide, job function, action buttons) | S01 | `View/…index.tsx` readOnly fields + tables + actions | view.feature `@S01 @p0` | covered | — |
| S01 letter button reads "Create Letter" when letterExists=false | S01; STA-009 | `record?.letterExists ? 'View Letter' : 'Create Letter'` | view.feature `@S01` ("Create Letter" shown) | covered | — |
| S05 District Wide=Y suppresses the Scaling Sites section | S05; STA-008 | Scale Sites section rendered only when NOT district-wide | view.feature `@S01` (Scale Sites not shown) | covered | — |
| S01/S05 District Wide=N shows the Scale Sites section + site | S01/S05 | Scale Sites `TableResource` | view.feature `@S05 @p1` (site 520) | covered | — |
| ERR-001 not-found (invalid/absent id) → load error | S03/S08 area; view load error | GET 404 → `setError` → error notification, no fields | view.feature `@S01 @p1` (id 99999999 → load error) | covered | — |
| S07 letterExists=true → "View Letter" replaces "Create Letter", Delete is alert-only | S07; STA-009 | letter toggle + `handleDelete` alert branch | — | deferred | defects.md Coverage gap #2 (no letterExists=true record obtainable) |
| S06 out-of-district → Edit/Delete/Create-Letter hidden (STA-002) | S06 | (none — new app never role/district-gates the view buttons) | — | not-applicable / blocked | Coverage gap #1 (district scoping deferred) |
| S08 unauthorized direct URL → not-authorized (ERR-001) | S08 | route-level `ProtectedRoute` (single mock role) | — | blocked | Coverage gap #1 (mock auth) |
| STA-007 condition # link gated on `scalerConditionView` | S01 | shared conditions section render | — | not-applicable | new app renders conditions read-only unconditionally |

**Symmetry check:** the `letterExists` toggle mirror — the "Create Letter" (letterless) arm is covered;
the "View Letter" (letter-issued) arm is `deferred` (no obtainable letterExists=true record — see below).
District Wide Y (Scale Sites hidden) / N (Scale Sites shown) both covered. Job Functions render is covered;
the SFP table only renders when SFP rows exist (seeded records have none) → not separately asserted.

**Role / permission coverage:** blocked by single-role mock auth (S08); the new app does not district-gate
the view buttons (S06 has no equivalent — org-unit scoping deferred). See Coverage gap #1.

**Coverage gate (excluding not-applicable/blocked/deferred):** S01 render + letter-button(create) +
district-wide-Y-hidden, S05 district-wide-N-shown, not-found — all covered. **P0 100% · P1 100%.**

**Status values:** `covered` · `not-applicable` · `deferred` · `blocked`. No divergence red.
