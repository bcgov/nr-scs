# UC-MNT-002 Maintain Exams / Upgrades — Coverage Matrix

> How to read this: [coverage-guide.md](../../../../coverage-guide.md). Ids/values cite the fixture
> (`fixtures/admin/maintenance/exam-upgrade-test-data.ts`).

**App:** `nr-scs/frontend/src/pages/Administration/Maintenance/ExamUpgrades` (route
`/maintenance/exam-upgrades`); backend `/api/exam-upgrades` (GET list · GET/{class}/{typeId} · POST ·
PUT · DELETE). Composite key (Type class code + server-generated typeId). List + Carbon Modal + shared
ConfirmDeleteModal.

## Source item → enforcement → scenario → status

| Source item | Source | App enforcement | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 create (happy) | slices S01 | `onSave` create → forwards to view; POST | create.feature `@S01 @p0` | covered |
| S01 — forwards to view showing new record | re-grounded | `setModalMode('view')` | create.feature `@S01` | covered |
| S02 edit | slices S02 | `onSave` update (Type read-only in edit); PUT | update.feature `@S02 @p0` | covered |
| S02 — read-only detail view | slices S02 entry | view modal | view.feature `@S02 @p1` | covered |
| S03 delete without dependents | slices S03 | ConfirmDeleteModal → DELETE | delete.feature `@S03 @p0` | covered |
| S04 delete blocked by dependents | slices S04 | FK `SRTR_SCTY_FK` → `ExamUpgradeService` translates to a clean 400 "…cannot be deleted." (row survives) | delete.feature `@S04 @p1` | covered (Divergence #1 FIXED — was a generic 500) |
| S05 filter list by class code | slices S05 | list Select + Refresh | — | deferred (@p2 list filter; Coverage gap #1) |
| S06 required — Type | slices S06 | `validateForm`: "Type is required." | create.feature `@S06` outline | covered |
| S06 required — Licence Accredit? | slices S06 | "Licence Accredit? is required." | create.feature `@S06` outline | covered |
| S06 required — Description | slices S06 | "Description is required." | create.feature `@S06` outline + update.feature `@S06` (edit side) | covered |
| S06 required — Effective Date | slices S06 | "Effective Date is required." | create.feature `@S06` outline | covered |
| S07 invalid date format | slices S07 | Carbon date picker — no free-text; `validateForm` has no format branch | — | not-applicable (re-grounded; Spec gap #1) |
| S08 expiry before effective | slices S08 | `validateForm`: "Expiry Date must be on or after Effective Date." | create.feature `@S08 @p1` | covered |
| S09 description max length | slices S09 | `validateForm` has NO description-length branch (server-only if at all) | — | not-applicable (re-grounded; Spec gap #1) |
| S10 reset create form | slices S10 | Reset button | — | deferred (@p2 nicety; Coverage gap #2) |
| S11 reset edit form | slices S11 | Reset button | — | deferred (@p2 nicety; Coverage gap #2) |
| S12 unauthorized access | slices S12 | `SCS_SYS_ADMIN` role gate | — | blocked (mock auth single role; Coverage gap #3) |

## Symmetry check
- create × update validation: required-field enforced on both; create covers the full set (S06 outline),
  update covers the Description-cleared representative. Type is read-only in edit (can't be cleared).
- create × update forward-to-view: both covered (S01 view assertion; S02 read-back).

## Role / permission coverage
- Automated: none (mock auth = single `SCS_SYS_ADMIN`).
- Blocked: S12 unauthorized access. Logged in Coverage gaps.
