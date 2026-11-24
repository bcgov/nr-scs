# Coverage — UC-SCA-002 Update Scaler Authorization

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCA-002-S01..S10.feature` + `UC-SCA-002-slices.md`, against the edit write
path (`pages/Edit/ScalerAuthorization/index.tsx` `validate`; PUT `/api/scaler-authorizations/{id}`;
`ScalerAuthorizationService.validateUpdateRequest` → delegates to `validateCreateRequest`; letter-lock branch
skips validation and writes expiry only). Route `/scaler-authorizations/edit/{id}`. Each scenario API-SEEDS a
fresh record (licence 8437, District Wide=Y) then edits it — independent + self-cleaning (DELETE teardown).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 edit fields + save → view (SUC-001) | S01 | `onSave` → PUT → read-back | update.feature `@S01 @p0` (expiry change reads back) | covered | — |
| S02 required field missing | S02; ERR-001 | `validate` L215-222 | update.feature `@S02 @p1` (clear expiry → "Expiry Date is required." + no PUT) | covered | — |
| S06 reset discards unsaved changes | S06 | `onReset` restores snapshot | update.feature `@S06 @p2` (expiry restored + no PUT) | covered | — |
| S10 District Wide toggle shows/hides Scale Sites (STA-005/006) | S10 | `districtWideInd` onChange | update.feature `@S10 @p2` (N → Scale Sites shown) | covered | — |
| S07 letter-lock: only Cancellation editable; delete-alert (STA-002/003) | S07 | `validate` letterExists → expiry-only; fields `disabled={letterExists}` | — | deferred | defects.md Coverage gap #1 (no letterExists=true record) |
| S04 max-authorization-years (ERR-004) | S04 | (none — not ported to `validateUpdateRequest`) | — | not-applicable | Coverage gap #2 (legacy validation not ported) |
| S05 add site outside district (ERR-006) | S05 | (none — no site-within-district check) | — | not-applicable | Coverage gap #2 |
| S03 date FORMAT (yyyyMMdd) (ERR-002) | S03 | (none — typed DateInput/API) | — | not-applicable | Coverage gap #2 |
| S08 out-of-district → Edit/Delete/Create-Letter hidden (STA-004) | S08 | (none — no district gating) | — | not-applicable | Coverage gap #3 (district scoping deferred) |
| S09 lacks `scalerAuthorizationUpdate` → not authorized (ERR-009) | S09 | `@IsScsEditor` (endpoint); single mock role | — | blocked | Coverage gap #3 (mock auth) |

**Symmetry check:** create/update mirror — the required-field + business-rule validators are the same
(`validate` delegates like create's); update covers the S01 happy save, the S02 required-field block, the
S06 reset, and the S10 District-Wide toggle. The date-order + job-function + scale-site + SFP rules are the
same code as create (covered once on create; the update validator is `validateCreateRequest`). The one arm
not exercised is the **letter-lock** (S07) — deferred on the no-`letterExists=true`-record data blocker
(shared with UC-SCA-003/004), not dropped.

**Role / permission coverage:** S09 blocked by single-role mock auth; S08 district hiding has no new-app
equivalent (org-unit scoping deferred). See Coverage gap #3.

**Coverage gate (excluding not-applicable/blocked/deferred):** S01 + S02 + S06 + S10 — all covered.
**P0 100% · P1 100% · P2 100%.**

**Status values:** `covered` · `not-applicable` (legacy validation not ported) · `deferred` · `blocked`.
No divergence red.
