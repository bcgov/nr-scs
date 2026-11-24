# UC-MNT-003 Maintain Appointment Types — Coverage Matrix

> How to read this: [coverage-guide.md](../../../../coverage-guide.md). Ids/values cite the fixture
> (`fixtures/admin/maintenance/appointment-type-test-data.ts`) — do not hardcode them here.

**App:** `nr-scs/frontend/src/pages/Administration/Maintenance/AppointmentTypes` (route
`/maintenance/appointment-types`); backend `/api/appointment-types` (GET list · POST create · PUT/DELETE
by code). Single route: list + Carbon Modal (create/edit/view) + confirm-delete modal.

## Source item → enforcement → scenario → status

| Source item | Source | App enforcement | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 view list + read-only detail | slices S01 | `openView` → view modal (read-only fields) | view.feature `@S01 @p1` | covered |
| S02 create happy path | slices S02 | `onSave` create → forwards to view; POST `/appointment-types` | create.feature `@S02 @p0` | covered |
| S02 — forwards to view after save | re-grounded (aligned) | `setModalMode('view')` in `onSave` | create.feature `@S02` (view shown) | covered |
| S03 edit existing | slices S03 | `onSave` update (PK disabled in edit); PUT `/appointment-types/{code}` | update.feature `@S03 @p0` | covered |
| S04 delete without dependents | slices S04 | confirm-delete → DELETE; row removed | delete.feature `@S04 @p0` | covered |
| S05 required missing — Code (ERR-001) | slices S05 | `validateForm`: "Code is required." | create.feature `@S05` outline | covered |
| S05 required missing — Description (ERR-003) | slices S05 | "Description is required." | create.feature `@S05` outline | covered |
| S05 required missing — Acting (ERR-005) | slices S05 | "Acting indicator is required." | create.feature `@S05` outline | covered |
| S05 required missing — Effective Date (ERR-006) | slices S05 | "Effective date is required." | create.feature `@S05` outline | covered |
| S05 required missing — Expiry Date (ERR-008) | slices S05 | "Expiry date is required." | create.feature `@S05` outline | covered |
| S06 code length > 4 (ERR-002) | slices S06 | input `maxLength=4` — over-length impossible to type | — | not-applicable (re-grounded; see Spec/coverage note #1) |
| S06 description length > 120 (ERR-004) | slices S06 | textarea `maxLength=120` — same | — | not-applicable |
| S06 date format invalid (ERR-007/009) | slices S06 | Carbon date picker — no free-text bad format; `validateForm` has no format check | — | not-applicable |
| S07 Effective > Expiry (ERR-010) | slices S07 | `validateForm`: "Expiry date cannot be before effective date." | create.feature `@S07 @p1` | covered |
| S08 edit required cleared (Description) | slices S08 | `validateForm` on update path | update.feature `@S08 @p1` | covered |
| S09 delete blocked by dependents (STA-005) | slices S09 | backend 400 "Appointment type has dependent records and cannot be deleted."; FK `SVDL_SAPT_FK` NO ACTION | delete.feature `@S09 @p1` | covered |
| S10 cancel create/edit via Back | slices S10 | Reset/Back/close in modal | — | deferred (@p2 nicety; see Coverage gap #1) |
| S11 unauthorized access (role) | slices S11 | `SCS_SYS_ADMIN` role gate | — | blocked (mock auth = single role; see Coverage gap #2) |

## Symmetry check
- create × update validation: required-field + date-order enforced on create (S05/S07); update path
  re-checks required (S08 covers Description as the representative). Same `validateForm` runs for both, so
  the full create matrix is not duplicated per the source's own symmetry note.
- happy path × forward-to-view: create (S02) and update (S03) both forward to the view — both asserted.

## Role / permission coverage
- Automated: none (mock auth grants only `SCS_SYS_ADMIN`).
- Blocked: S11 unauthorized-access and the create/delete button-hiding (STA-001/002) — single-role mock
  auth cannot reach a non-admin session. Logged in Coverage gaps.
