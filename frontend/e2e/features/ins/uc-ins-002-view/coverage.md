# Coverage — UC-INS-002 View Site Inspection Details

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

> **Correction (2026-09-09).** Coverage gaps #1/#2 below ("no per-element permission mechanism in the new
> app — these controls always render", and the S04 permission-gated Add / Send-View Report / Delete row)
> are **stale**: the inspection view now wraps each action in a `PermissionGate`
> (`SCALE_SITE_INSPECTION_UPDATE` for Edit Record, `REPORT_READ` for Send / View Report,
> `SCALE_SITE_INSPECTION_DELETE` for Delete), and per-role entitlement is proven in
> [`features/security/`](../../security/). One genuine hole remains — no suite asserts those three
> buttons are *hidden* for a restricted role — logged as
> [`../inspection-delete/defects.md`](../inspection-delete/defects.md) **CG-1**. The delete behaviour
> itself is now covered by [`../inspection-delete/`](../inspection-delete/). The scenario table below has
> **not** been re-reconciled against the role model; that is its own task.

Sources reconciled: `gherkin/UC-INS-002-S01..S06.feature` + `UC-INS-002-slices.md` (control/message/field
matrix) + `UC-INS-002-detailed.md` (ERR/STA catalog), against the new app's read-only view path:
`pages/View/ScaleSiteInspection/index.tsx`, `components/Form/ScaleSiteInspectionDetails` (mode="view"),
`components/Form/ScaleSiteInspectionQuestions` (mode="view"),
`pages/View/ScaleSite/components/tabs/InspectionsTab.tsx` (the list),
`services/scaleSiteInspections.service.ts` (GET `/scale-sites/inspection/{id}`,
GET `/scale-sites/{id}/inspections`). The detail/list endpoints + the not-found path were ground-truthed
against the running app on 2026-07-16.

**Test data (real, see `fixtures/ins/ins-test-data.ts`):** the record under test is **seeded via the
create API** (`seedInspection`) on site **520** (owner in `forest_client`, so the read-back's INNER JOIN
resolves) with inspector GUID `SEEDED.inspectorGuid` (present in `scs_user_info_vw`), type **MIN** + site type
**W**, answers **Y**. The displayed values are checked against those *seeded inputs* (deterministic), so
the assertion never depends on DB-derived date/name formatting. S05 uses site **16H** (also
forest_client-backed, never mutated) for a reliably empty list. Every seeded record is DELETEd on
teardown (`createdInspectionIds`), so the suite leaves the seeded DB as found and stays parallel-safe.

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy-path view — header details read-only | S01 | `ScaleSiteInspectionDetails` mode="view" (all readOnly TextInputs) | view `@S01 @p0` | covered | — |
| Question responses rendered read-only (BR-INS-002-01) | S01 / S06 | `ScaleSiteInspectionQuestions` mode="view" (one table per response) | view `@S01 @p0` (≥1 table + no editable control) | covered | — |
| No editable inputs anywhere on the view (BR-INS-002-01) | S01 | view content has 0 `<select>` + every input/textarea `readonly` | view `@S01 @p0` (`expectAllFieldsReadOnly`) | covered | — |
| Inspections list — columns + clickable Inspection # link → detail hop | S01 list (steps 5-6) | InspectionsTab `RouterLink` per row → view route | view `@S01 @p1` (populated list: asserts the row's type/site-type/inspector, then clicks the link → view loads) | covered | — |
| Back returns to the inspections list | S01 step 11 | view Back → `/scale-sites/view/{id}?tab=inspections` | view `@S01 @p1` | covered (re-ground) | — |
| Inspection record not found → user is told | S02 / ERR-001 | detail GET non-OK → "Could not load inspection" empty section | not-found `@S02 @p1` | covered (re-ground) | Re-ground #1 |
| Recovery — a valid inspection still opens after a not-found | S02 (2nd scenario) | direct client-side navigation to a valid id | not-found `@S02 @p2` | covered (re-ground) | Re-ground #1 |
| Inspections list empty → empty state, no error | S05 | InspectionsTab `EmptySection` "No inspections found" | empty-list `@S05 @p1` | covered (re-ground) | Re-ground #2 |
| Check-Scaler side menu shows full field-ops menus (STA-001) | S03 | no Struts side-menu equivalent in the new React shell | — (no equivalent) | not-applicable (re-ground) | Coverage gap #1 |
| Add Inspection / Send-View Report / Delete hidden when permission denied (S04 / STA-002/004/005) | S04 | no per-element permission mechanism in the new app — these controls always render | — (no equivalent) | not-applicable | Coverage gap #2 |
| Inspection with NO question responses → Questions section behaviour (S06) | S06 | not producible: every type×site-type combo has ≥1 active question and create enforces `validateQuestionCoverage` | — (state not reproducible) | blocked | Coverage gap #3 |
| Send / View Report control (compliance report) | S04 controls | no compliance-report entity/endpoint in the new backend | — (no equivalent) | not-applicable (re-ground) | see UC-INS-003 |

**Re-grounding notes (behaviour differs from legacy but is correct — logged in defects.md):**
- **#1 Not-found** — legacy forwarded back to the list with "The selected record could not be found.";
  the new view stays put and shows a "Could not load inspection" empty section. Same intent (user is told
  the record is unavailable), different surface. Recovery is opening a valid inspection directly.
- **#2 Empty list** — legacy rendered an empty table body; the new tab shows a "No inspections found"
  empty section + the Add Inspection button, no error.

**Coverage gaps (not tested — no app problem):**
- **#1 (S03 menu)** — the Struts role-filtered side menu has no direct equivalent in the new React nav;
  not an INS-view concern.
- **#2 (S04 permission-gated buttons)** — no per-element permission mechanism + mock auth grants only
  `SCS_SYS_ADMIN`, so the "hidden" state cannot be produced (same limit as UC-INS-001 gaps #1/#2).
- **#3 (S06 no question responses)** — **not reproducible**: verified against the app's own create-init
  (authoritative) that every valid type × site-type combo returns ≥1 question (min REG+C = 1; AUT is
  Weight-Scale-only), and `createScaleSiteInspection` calls `validateQuestionCoverage`, so a supported
  create can never yield an empty response set. A data-gap patch was considered and rejected (only an
  app-wide LOV/schema change could force an empty combo; a zero-response seed wouldn't exercise it
  because the view reconstructs question shells when responses are empty). The view *would* render the
  "Questions" heading + a "No question responses" empty section — best covered as a component (Vitest)
  test. Logged, not silently dropped. See defects.md gap #3.

**Status values:** `covered` · `covered (re-ground)` · `not-applicable` (legacy-only / no equivalent) ·
`blocked` (env/auth / state not reproducible). **No divergences (reds)** found for UC-INS-002 — the two
behaviour differences are benign re-groundings asserted green against the app's real behaviour.
