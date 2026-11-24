# Coverage — UC-CHK-005 Create Summary Check Scale

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `UC-CHK-005-S01..S08.feature` + `UC-CHK-005-slices.md` (control/message matrix) +
`UC-CHK-005-technical.md` (ERR catalog), against the new app's write path — `summaryCheckScaleViewModel`
(client-side validation), the create controller/service, and `scs_check_scale_pkg` (persist).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Valid create → forward to update | S01 | create service + `scs_check_scale_pkg` | `@S01 @p0` (create.feature) | covered | — |
| Species required | S02 / ERR-001 | `validateSpgRow` speciesCode | `@S02 @p1` (validation.feature) | covered | — |
| SPG numeric required (6 fields) | S02 / ERR-002..007 | `validateSpgRow` int/numField | `@S02 @p1` (validation.feature) | covered | — |
| Original Pieces non-integer | S03 / ERR-011 | `validateSpgRow` intField | `@S03 @p1` (validation.feature) | covered | — |
| Original Net Volume non-number | S03 / ERR-012 | `validateSpgRow` numField | `@S03 @p1` | covered | — |
| Check Scale Pieces non-integer | S03 / ERR-014 | `validateSpgRow` intField | `@S03 @p1` | covered | — |
| Check Scale Net Volume non-number | slices.md:190-202 / ERR-015 | `validateSpgRow` numField:421 | `@S03 @p1` | covered (+ spec-gap) | Spec gap: ERR-015 dropped from `.feature` (defects.md) |
| Original / Check Net Value non-number | technical.md:101-104 / ERR-013,016 | `validateSpgRow` numField:422-423 | `@S03 @p1` | covered (beyond slice) | — |
| Return-type gating (SFP/LT/SLT) | S05 | view-model gating (product/grade/partial) | `@S05 @p2` (return-type.feature) | covered | — |
| Server error on save → banner, stay | S06 | API 5xx → InlineNotification | `@S06 @p1` (server-error.feature) | covered | — |
| Retry after error → success | S06 (2nd scenario) | create service on retry | `@S06 @p2` | covered | — |
| Back button by scaler tombstone | S04 / S08 | create page route-state `{scalerName,backTo}` | `@S04 @p2`, `@S08 @p2` (navigation.feature) | covered | — |
| SLT auto-sets `partialInd='Y'` | S05 note | `ReturnType.resolvePartialInd` | (verified via API) | covered (verified-not-defect) | defects.md "Verified — not a defect" |
| Unauthorized (wrong-role) → not-authorized | S07 / ERR-017 | `ProtectedRoute` + `@RequiresPermission(SUMMARY_CHECK_SCALE_CREATE)` | `sec/check-scaler-role/url-access` + `api-access` (and the same route rows in the other ten role suites) — `/summary-check-scales/create` refused per role | covered elsewhere | scenario REMOVED 2026-09-02 (was a permanent `@skip`) |
| List → create navigation | S01 scenario 1 | (no list route in new app) | — | not-applicable | Coverage gap (legacy-only) |
| Licence pre-fill from session tombstone | S01 scenario 2 | (no session tombstone in new app) | — | not-applicable | Coverage gap (legacy-only) |

**Role / permission coverage (re-homed 2026-09-02):** no longer blocked — the role switcher (PR #240)
retired the single-role limitation, and route + endpoint denial for this screen is asserted per role in
the `sec` suites, so S07 is `covered elsewhere` and its `@skip` placeholder was removed. Historical note
on what the row used to say: the wrong-role branch (S07)
is deferred to a `ProtectedRoute` Vitest test — see defects.md Coverage gaps.

**Status values:** `covered` · `covered (+ spec-gap)` · `covered elsewhere` (asserted in the `sec` role suites) · `not-applicable` (legacy-only) · `deferred` · `divergence`. **No `@skip` scenarios remain.**
