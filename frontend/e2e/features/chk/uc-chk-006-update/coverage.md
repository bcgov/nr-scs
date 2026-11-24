# Coverage — UC-CHK-006 Update Summary Check Scale

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-CHK-006-S01..S10.feature` + `UC-CHK-006-slices.md` (control/message
matrix) + `UC-CHK-006-technical.md` (ERR-001..019 catalog), against the new app's write path:
`pages/Update/SummaryCheckScale/index.tsx`, `components/Form/SummaryCheckScaleForm/summaryCheckScaleViewModel.ts`
(`validateHeader` / `validateSpgRow`), and `services/summaryCheckScales.service.ts`
(PUT `/{id}`, POST/DELETE `/{id}/spg-rows`, DELETE `/{id}`).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Header edit + save persists | S01 | `updateSummaryCheckScale` PUT + read-back | update-header `@S01 @p0` | covered | — |
| Reset discards unsaved edits | S05 | `onReset` refetch (index.tsx:333) | update-header `@S05 @p1` | covered | — |
| Add a new SPG row | S02 | `addSpgRow` POST spg-rows | update-spg `@S02 @p1` | covered | — |
| Delete an SPG row (2+ rows) | S03 | `deleteSpgRow` DELETE spg-rows — was **regressed** by PR #265's query-param trimming (blanked single-space grade bound as null before the handler ran); fixed by moving the composite key into the request body, verified green 2026-09-03 | update-spg `@S03 @p1` (regression guard for that fix) | covered | Bug #1 CLOSED |
| Last SPG row cannot be deleted (STA-004) | S03 / STA-004 | `canDelete = rows>1` (index.tsx:176) | update-spg `@S03 @p2` | covered | — |
| Delete whole record → create form | S04 | `deleteSummaryCheckScale` → nav `/create` | update-delete `@S04 @p1` | covered | — |
| Return Type locked when rows exist (STA-003) | S01 / STA-003 | `returnTypeLocked` (index.tsx:181) | update-navigation `@S01 @p2` | covered | — |
| Back gating by tombstone (STA-005) | S01 / STA-005 | `hasTombstone` (index.tsx:60) | update-navigation `@S01 @p2` (both arms) | covered | — |
| Action row present (Reset/Save/Delete/Letter) | S01 controls | action row (index.tsx:472-494) | update-navigation `@S01 @p2` | covered | — |
| Required blank — Check Scaler Licence (ERR-011) | S06 / technical:129 | `validateHeader` (viewModel:346) | update-validation `@S06 @p1` outline | covered | — |
| Required blank — Original Scaler Licence (ERR-012) | technical:130 | `validateHeader` (viewModel:347) | update-validation `@S06 @p1` outline | covered (+ spec-gap) | spec gap #1 |
| Required blank — Timber Mark (ERR-010) | S06 / technical:128 | `validateHeader` (viewModel:348) | update-validation `@S06 @p1` outline | covered | — |
| Required blank — Scale Site # (ERR-005) | S06 / technical:123 | `validateHeader` (viewModel:349) | update-validation `@S06 @p1` outline | covered | — |
| Required blank — Original/Check Scale Return (ERR-006/007) | technical:124-125 | `validateHeader` (viewModel:383-384) | update-validation `@S06 @p1` outline | covered (+ spec-gap) | spec gap #1 |
| Required blank — Original/Check Date of Scale (ERR-008/009) | technical:126-127 | `validateHeader` (viewModel:374-375) | update-validation `@S06 @p1` outline | covered (+ spec-gap) | spec gap #1 |
| Required blank — Check Scale Type (ERR-001) | S06 / technical:119 | `validateHeader` (viewModel:345) | — | not-applicable (UI) | coverage gap #1 |
| Required blank — Followed Good Practices (ERR-003) | S06 / technical:121 | `validateHeader` (viewModel:350) | — | not-applicable (UI) | coverage gap #1 |
| Required blank — Original within Standard / Check Replaces Original / Partial Load (ERR-004/013/014) | technical:122/131/132 | `validateHeader` (viewModel:351-354) | — | not-applicable (UI) | coverage gap #1 |
| Invalid date format `yyyyMMdd` (ERR-015) | S07 / technical:133 | (none — date picker, no format field) | — | not-applicable (legacy) | coverage gap #2 |
| Future scale date rejected (re-grounded) | S07 (re-ground) | `isFutureDate` (viewModel:377-382) | update-validation `@S07 @p1` | covered | — |
| SPG add — Species required (ERR-016) | S08 / technical:134 | `validateSpgRow` (viewModel:411) | update-validation `@S08 @p1` | covered | — |
| SPG add — Original Pieces integer (ERR-017) | S08 / technical:135 | `validateSpgRow` (viewModel:418) | update-validation `@S08 @p1` | covered | — |
| SPG add — Net Volume/Value numeric matrix (ERR-018 + rest) | technical:136-137 | `validateSpgRow` (viewModel:420-423) | (covered on create) UC-CHK-005-S03 | covered elsewhere | — |
| Delete/Letter hidden without permission (S09/STA-001/002) | S09 / technical:114-115 | no per-element permission mechanism — all controls always render | update-navigation `@S09 @skip` (placeholder) | not-applicable | coverage gap #3 |
| Unauthorized (no Check Scaler role) → not authorized (S10) | S10 / technical:200 | `ProtectedRoute` + `@RequiresPermission(SUMMARY_CHECK_SCALE_UPDATE)` | `sec/check-scaler-role/url-access` + `api-access` (and the same route rows in the other ten role suites) | covered elsewhere | coverage gap #4 CLOSED (scenario REMOVED 2026-09-02) |

**Symmetry check:** create/update mirror — create covered by UC-CHK-005, update here (S01). SPG
add/delete both have scenarios (S02/S03) — add is green, delete is a genuinely-failing `@discovered-bug`
(Bug #1), so the pair is covered but half of it is red on purpose. SPG numeric matrix (pieces/volume/value × original/check) covered on
create (UC-CHK-005-S03) via the shared `validateSpgRow`; not re-duplicated on update.

**Role / permission coverage (re-homed 2026-09-02).** Both S09 and S10 were permanent `@skip`
placeholders resting on "mock auth grants only SCS_SYS_ADMIN", untrue since PR #240. Removed, for
different reasons: **S10 (wrong-role denial) → `covered elsewhere`**, asserted per role across the
eleven `sec` suites at both the route and endpoint levels — a role × level property that does not belong
in a per-screen UC. **S09 (Delete / Create Letter hidden) → `not-applicable`**: this screen gates no
controls, and `sec`'s sweep is tab-scoped so it does not reach the summary update screen either. The one
open product question — should controls be hidden for a role lacking the permission — is recorded once,
in `uc-chk-004-delete/defects.md` gap #3, and if answered yes the work belongs in `sec` (extend the
control sweep from tabs to detail screens).

**Status values:** `covered` · `covered (+ spec-gap)` · `covered elsewhere` · `not-applicable` (legacy-only /
not UI-reachable / no control gating on this screen) · `blocked` (env/auth) · `bug/regression` (a
previously-green behaviour now broken, carried as a genuinely-failing `@discovered-bug` test). No row
carries that status now — Bug #1, the one that did, is CLOSED.
