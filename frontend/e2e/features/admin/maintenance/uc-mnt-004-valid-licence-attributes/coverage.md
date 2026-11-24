# UC-MNT-004 Maintain Valid Licence Attributes — Coverage Matrix

> How to read this: [coverage-guide.md](../../../../coverage-guide.md). Ids/values cite the fixture
> (`fixtures/admin/maintenance/valid-licence-attribute-test-data.ts`).

**App:** `nr-scs/frontend/src/pages/Administration/Maintenance/ValidLicenceAttributes` (route
`/maintenance/valid-licence-attributes`); backend `/api/valid-licence-attributes` (GET list ·
GET/{grading}/{appt} · POST · PUT · DELETE). Generic Maintenance stack (list + MaintenanceFormModal +
useMaintenanceCrud). Composite key (grading system code + appointment type).

**Data constraint (drives scope):** all 8 valid C/I × A/C/F/O combos already exist as VLAs (plus NA×…),
and every existing combo has dependents. So create happy-path uses the only free UI combo — grading
system **B (Both)** + appointment type A — and edit/delete-happy are deferred (no childless real combo
exists; self-seeded B/NA rows render with an empty/ambiguous list link and can't be reliably reopened).

## Source item → enforcement → scenario → status

| Source item | Source | App enforcement | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 create (happy) + forward to view | slices S01 | `onSave` create → view; POST | create.feature `@S01 @p0` | covered |
| S02 edit (dates only) | slices S02 | `onSave` update; PUT | — | deferred (list-open of self-seeded record impractical; Coverage gap #1) |
| S03 delete without dependents | slices S03 | ConfirmDeleteModal → DELETE | — | deferred (no childless real combo; list-open impractical; Coverage gap #1) |
| S04 filter list by grading system | slices S04 | list Select + Refresh | — | deferred (@p2 list filter; Coverage gap #2) |
| S05 required — Grading System Code | slices S05 | `validate`: "Grading System Code is required." | validation.feature `@S05` outline | covered |
| S05 required — Appointment Type | slices S05 | "Appointment Type is required." | validation.feature `@S05` outline | covered |
| S05 required — Effective Date | slices S05 | "Effective Date is required." | validation.feature `@S05` outline | covered |
| S06 invalid date format | slices S06 | Carbon date picker — no free-text; no format branch | — | not-applicable (re-grounded; Spec gap #1) |
| S07 expiry before effective | slices S07 | `validate`: "Expiry Date must be on or after Effective Date." | validation.feature `@S07 @p1` | covered |
| S08 duplicate combination | slices S08 | backend 400 "…already exists." (server reject; write IS sent) | validation.feature `@S08 @p1` | covered |
| S09 delete blocked by dependents | slices S09 | CLIENT pre-check (`dependentChildExists`) → "Cannot delete" warning + Delete button hidden | delete.feature `@S09 @p1` | covered |
| S10 cancel edit via Back | slices S10 | Back button | — | deferred (@p2 nicety; requires edit-open; Coverage gap #2) |
| S11 not authorized (role) | slices S11 | `SCS_SYS_ADMIN` role gate | — | blocked (mock auth single role; Coverage gap #3) |

## Symmetry check
- create validation set fully covered (S05 required + S07 order + S08 duplicate). Update-side validation
  (S02) deferred with create/update parity noted (the update path only edits dates; same `validate`).
- delete: blocked-path (S09) covered client-side; happy-path (S03) deferred (data constraint).

## Role / permission coverage
- Automated: none (mock auth = single `SCS_SYS_ADMIN`).
- Blocked: S11 not-authorized. Logged in Coverage gaps.
