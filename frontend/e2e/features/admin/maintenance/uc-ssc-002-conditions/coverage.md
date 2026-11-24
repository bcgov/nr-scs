# UC-SSC-002 Maintain Conditions — Coverage Matrix

> How to read this: [coverage-guide.md](../../../../coverage-guide.md). Ids/values cite the fixture
> (`fixtures/admin/maintenance/condition-test-data.ts`).

**App:** `nr-scs/frontend/src/pages/Administration/Maintenance/Conditions` (route
`/maintenance/conditions`); backend `/api/conditions` (GET list · GET/{class}/{id} · POST · PUT · DELETE).
Composite key (condition class code + server-generated id). List + Carbon Modal (create/edit/view) +
shared ConfirmDeleteModal. Dependent-child guard: `dependentChildExists` → delete blocked with a warning.
Large list (159 rows) — list-open scenarios seed **MSD** and reach the row via class filter + page-size 50.

## Source item → enforcement → scenario → status

| Source item | Source | App enforcement | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 create SIA (happy, with Site Type) | slices S01 | `onSave` create → forwards to view; POST | create.feature `@S01 @p0` | covered |
| S01 create MSD (Site Type hidden) | slices S01 / S06 MSD | client hides Site Type for MSD; server allows empty | create.feature `@S01 @p1` | covered |
| S02 edit existing condition | slices S02 | `onSave` update (Type read-only in edit); PUT | update.feature `@S02 @p0` | covered |
| S02 — read-only detail view | slices S02 entry | view modal | view.feature `@S02 @p1` | covered |
| S03 delete without dependents | slices S03 | ConfirmDeleteModal → DELETE; read-back proves gone | delete.feature `@S03 @p0` | covered |
| S04 filter list by type | slices S04 | list Select `#condition-filter` + `crud.reload({scaleConditionClassCode})` | (exercised as the reach-mechanism in openViewInClass, not asserted) | deferred (@p2; Coverage gap #1) |
| S05 required — Title (ERR-001) | slices S05 / tech ERR-001 | client `validate`: "Title is required." | create.feature `@S05` outline + update.feature `@S08` | covered |
| S05 required — Condition Text (ERR-002) | slices S05 / tech ERR-002 | "Condition Text is required." | create.feature `@S05` outline | covered |
| S05 required — Mandatory? (ERR-003) | slices S05 / tech ERR-003 | "Mandatory? is required." | create.feature `@S05` outline | covered |
| S05 required — Sort Order (ERR-004) | slices S05 / tech ERR-004 | "Sort Order is required." | create.feature `@S05` outline | covered |
| S05 required — Effective Date (ERR-005) | slices S05 / tech ERR-005 | "Effective Date is required." | create.feature `@S05` outline | covered |
| S05 required — Type | slices S05 | "Type is required." | create.feature `@S05` outline | covered |
| S06 SIA requires Site Type (ERR-008) | slices S06 / tech ERR-008 | "Site Type is required." (client, non-MSD) | create.feature `@S05` outline (Site Type case) | covered |
| S06 MSD + Site Type invalid (ERR-009) | slices S06 / tech ERR-009 | client HIDES + clears Site Type for MSD — case unreachable | create.feature `@S01 @p1` (MSD, no Site Type) | not-applicable (re-grounded — client prevents) |
| S06 SCA + Site Type invalid (ERR-010) | slices S06 / tech ERR-010 | client now HIDES Site Type for SCA (like MSD) + sends null; server forbids one → SCA creatable without a Site Type (fixed 2026-07-24) | create.feature `@S06 @p1` | covered (green — was Divergence #1, now CLOSED) |
| S07 expiry before effective (ERR-013) | slices S07 / tech ERR-013 | client `validate`: "Expiry Date must be on or after Effective Date." | create.feature `@S07 @p1` | covered |
| S08 update — required field (Title cleared) | slices S08 | client `validate` on update; no PUT | update.feature `@S08 @p1` | covered |
| S08 sort order negative / >9999 (ERR-006/007) | slices S08 / tech ERR-006,007 | client `validate`: "Sort Order must be between 0 and 9999." (single range branch) | create.feature `@S08 @p1` | covered (negative asserted; >9999 = same branch) |
| S08 invalid date format (ERR-011/012) | slices S08 / tech ERR-011,012 | Carbon date picker — no free-text; ISO `LocalDate` | — | not-applicable (re-grounded; Spec gap #1) |
| S09 reset edit form | slices S09 | Reset button = `crud.resetForm` | — | deferred (@p2; Coverage gap #2) |
| S10 back from edit | slices S10 | Back button = `crud.cancelEdit` | — | deferred (@p2; Coverage gap #2) |
| S11 delete blocked by dependents (ERR-015) | slices S11 / tech ERR-015,STA-005 | `checkDependents` → `deleteBlocked` → warning replaces Delete | delete.feature `@S11 @p1` (real MSD/188) | covered |
| S12 condition load fails — empty id (ERR-014) | slices S12 / tech ERR-014 | modal opens from a row button — id always present; no empty-id path | — | not-applicable (re-grounded; Spec gap #1) |

## Symmetry check
- create × update validation: required-field enforced on both; create covers the full set (S05 outline),
  update covers the Title-cleared representative. Type is read-only in edit (can't be cleared/changed).
- class symmetry (SIA/MSD/SCA) on Site Type: SIA requires it (covered), MSD hides it (covered green), SCA
  hides it (covered green — fixed; was the divergence). All three arms accounted for + green.
- create × update forward-to-view: both covered (S01 view + read-back; S02 read-back).

## Role / permission coverage
- Automated: none (mock auth = single `SCS_SYS_ADMIN`).
- Blocked: STA-001..004 permission gates (create/update/delete/filter WebADE actions). Logged in Coverage gaps.
