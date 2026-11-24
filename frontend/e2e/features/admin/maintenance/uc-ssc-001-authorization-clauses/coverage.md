# UC-SSC-001 Maintain Authorization Clauses — Coverage Matrix

> How to read this: [coverage-guide.md](../../../../coverage-guide.md). Ids/values cite the fixture
> (`fixtures/admin/maintenance/authorization-clause-test-data.ts`).

**App:** `nr-scs/frontend/src/pages/Administration/Maintenance/AuthorizationClauses` (route
`/maintenance/authorization-clauses`); backend `/api/auth-clauses` (GET list · GET/{method}/{id} · POST ·
PUT · DELETE). Composite key (scale method code + server-generated clause id). List + Carbon Modal
(create/edit/view) + shared ConfirmDeleteModal. No dependent-child guard — clauses are always deletable.

## Source item → enforcement → scenario → status

| Source item | Source | App enforcement | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 create (happy) | slices S01 | `onSave` create → forwards to view; POST | create.feature `@S01 @p0` | covered |
| S01 — forwards to view showing new record | re-grounded | `setModalMode('view')` | create.feature `@S01` | covered |
| S02 edit existing clause | slices S02 | `onSave` update; PUT | update.feature `@S02 @p0` | covered |
| S02 — read-only detail view | slices S02 entry | view modal | view.feature `@S02 @p1` | covered |
| S03 delete existing clause | slices S03 | ConfirmDeleteModal → DELETE; read-back proves gone | delete.feature `@S03 @p0` | covered |
| S04 filter list by scale method | slices S04 | list Select `#auth-clause-filter` + `crud.reload({scaleMethodTypeCode})` | — | deferred (@p2; Coverage gap #1) |
| S05 abandon edits (Back) | slices S05 | modal Back = `crud.cancelEdit` (edit→view) | — | deferred (@p2; Coverage gap #2) |
| S06 required — Scale Method (ERR-001) | slices S06 / tech ERR-001 | client `validate`: "Scale method is required." | create.feature `@S06` outline | covered |
| S06 required — Clause (ERR-002) | slices S06 / tech ERR-002 | "Clause is required." | create.feature `@S06` outline + update.feature `@S02` (edit side) | covered |
| S06 required — Effective Date (ERR-003) | slices S06 / tech ERR-003 | "Effective Date is required." | create.feature `@S06` outline | covered |
| S07 invalid date format (ERR-005/006) | slices S07 / tech ERR-005,006 | Carbon date picker — no free-text; dates are ISO `LocalDate`, no format branch client or server | — | not-applicable (re-grounded; Spec gap #1) |
| S08 clause > 200 chars (ERR-004) | slices S08 / tech ERR-004 | client `validate`: "Clause can not be greater than 200 characters." (VARCHAR2(200) limit); no request sent (fixed 2026-07-24) | create.feature `@S08 @p1` | covered (green — was Divergence #1, now CLOSED) |
| S09 unauthorized access (ERR-007) | slices S09 / tech ERR-007 | `SCS_SYS_ADMIN` role gate | — | blocked (mock auth single role; Coverage gap #3) |
| Expiry ≥ Effective (new-app rule) | app `validate` | "Expiry Date must be on or after Effective Date." | create.feature `@p1` | covered (extra — not in legacy slices) |

## Symmetry check
- create × update validation: required-field enforced on both; create covers the full set (S06 outline),
  update covers the Clause-cleared representative. Scale Method is editable on both (not a PK in the form).
- create × update forward-to-view: both covered (S01 view assertion + read-back; S02 read-back).

## Role / permission coverage
- Automated: none (mock auth = single `SCS_SYS_ADMIN`).
- Blocked: S09 unauthorized access. Logged in Coverage gaps.
