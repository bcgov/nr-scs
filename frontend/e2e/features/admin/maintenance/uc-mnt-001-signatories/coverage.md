# UC-MNT-001 Maintain Signatories / Signature Blocks — Coverage Matrix

> How to read this: [coverage-guide.md](../../../../coverage-guide.md). Ids/values cite the fixture
> (`fixtures/admin/maintenance/signature-block-test-data.ts`).

**App:** `nr-scs/frontend/src/pages/Administration/Maintenance/SignatureBlocks` (route
`/maintenance/signatories`); backend `/api/signature-blocks` (GET list · GET/{id} · POST · PUT · DELETE).
Single route: list + Carbon Modal (create/edit/view) + shared ConfirmDeleteModal. PK
`scaleSignatoryBlockId` is server-generated.

## Source item → enforcement → scenario → status

| Source item | Source | App enforcement | Scenario (tags) | Status |
|---|---|---|---|---|
| S01 add signatory (happy) | slices S01 | `onSave` create → forwards to view; POST `/signature-blocks` | create.feature `@S01 @p0` | covered |
| S01 — forwards to view showing new record | slices S01 outcome | `setModalMode('view')` in `onSave` | create.feature `@S01` (view shown) | covered |
| S02 edit signatory (happy) | slices S02 | `onSave` update; PUT `/signature-blocks/{id}` | update.feature `@S02 @p0` | covered |
| S02 — read-only detail view | slices S02 entry | view modal (read-only fields) | view.feature `@S02 @p1` | covered |
| S03 delete signatory | slices S03 | ConfirmDeleteModal → DELETE; row removed | delete.feature `@S03 @p0` | covered |
| S04 filter list by Reg/Dist | slices S04 | list RegDistSelect + Refresh → search param | — | deferred (@p2 list filter; Coverage gap #1) |
| S05 required missing — First Name | slices S05 | `validateForm`: "First Name is required." | create.feature `@S05` outline | covered |
| S05 required missing — Last Name | slices S05 | "Last Name is required." | create.feature `@S05` outline + update.feature `@S05` (edit side) | covered |
| S05 required missing — Position | slices S05 | "Position is required." | create.feature `@S05` outline | covered |
| S05 required missing — Reg / Dist | slices S05 | "Reg / Dist is required." | create.feature `@S05` outline | covered |
| S06 field exceeds max length (40) | slices S06 | `validateForm` length check (no input maxLength cap here) | create.feature `@S06 @p1` (First Name 41 chars) | covered (First Name as the representative; same `checkLength` for all name/position fields) |
| S07 reset edit form | slices S07 | Reset button re-applies original/empty | — | deferred (@p2 nicety; Coverage gap #2) |
| S08 back from edit (cancel) | slices S08 | Back → view (edit) / close (create) | — | deferred (@p2 nicety; Coverage gap #2) |
| S09 delete cancelled | slices S09 | ConfirmDeleteModal Cancel → no DELETE | delete.feature `@S09 @p2` | covered |
| S10 delete button hidden — no WebADE permission | slices S10 | `appointTypeDelete`-style permission gate | — | blocked (mock auth single role; Coverage gap #3) |

## Symmetry check
- create × update validation: required-field enforced on both; create covers the full required set (S05
  outline), update covers the representative Last-Name-cleared (same `validateForm` runs for both).
- length: `checkLength` applies identically to First/Middle/Last/Position; First Name is the covered
  representative (the others share the exact code path).

## Role / permission coverage
- Automated: none (mock auth = single `SCS_SYS_ADMIN`).
- Blocked: S10 delete-permission gating — no non-admin session reachable. Logged in Coverage gaps.
