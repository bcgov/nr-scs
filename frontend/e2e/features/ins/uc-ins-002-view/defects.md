# Defects — UC-INS-002 View Site Inspection Details

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:** _none._ Every reconciled control/field/message maps to a green scenario or a logged
re-grounding/gap below; no `@discovered-divergence` tests were needed for UC-INS-002.

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Check-Scaler side menu (S03 / STA-001) has no new-app equivalent.**
  - **Why not:** legacy `MenuUtils.getCheckScalerMenus()` rendered a role-filtered Struts side menu
    (Create / Handheld Management / Queries / Reports / Administration). The new React shell has a
    different navigation model and no equivalent role-filtered menu to assert; it is not an INS-view
    concern.
  - **Future action:** cover navigation/nav-visibility under a SYS/SEC-domain suite if it becomes a
    requirement.
  - **Status:** OPEN. Found 2026-07-16. (No scenario authored — no equivalent.)

- **#2 — Permission-hidden controls (S04 — Add Inspection / Send-View Report / Delete).**
  - **Why not:** the legacy app hid these controls from users lacking `scaleSiteInspectionCreate` /
    `scaleSiteComplianceReport` / `scaleSiteComplianceReportDelete`. The new app has no per-element
    permission mechanism, and the mock login is always a full `SCS_SYS_ADMIN`, so the "hidden" state
    cannot be produced (same limitation as UC-INS-001 gaps #1/#2). "Send / View Report" additionally has
    no compliance-report entity/endpoint in the new backend at all (see UC-INS-003).
  - **Future action:** revisit when per-element permissions exist; meanwhile cover as component tests.
  - **Status:** OPEN. Found 2026-07-16. (No scenario authored — the state is not reproducible.)

- **#3 — Inspection with no question responses (S06) is not reproducible.**
  - **Why not:** verified against the app's own create-init endpoint (the authoritative applicability
    source — a raw-table SQL model was tried, disagreed, and was discarded) that EVERY valid inspection
    type × site-type combo returns ≥1 question: MIN {W:4, P:11, S:7, C:2}, MAJ {W:42, P:41, S:20, C:2},
    REG {W:34, P:33, S:18, C:1}, AUT {W:12} (AUT + P/S/C return 422 — Automated must use Weight Scale).
    The minimum is REG + C = 1; there is no zero-question combo. And
    `ScaleSiteInspectionService.createScaleSiteInspection` calls `InspectionValidator.validateQuestionCoverage`,
    which rejects a create whose responses don't cover the required questions. So no supported flow yields
    an inspection with an empty response set.
  - **Data-gap patch considered — rejected:** the only ways to force an empty applicable set are (a) add a
    new scale-method LOV code with zero question mappings, or (b) expire an existing combo's questions.
    Both are app-wide / cross-domain changes (the scale-method LOV feeds every site-type list — SST, SCA,
    the create checkbox group), disproportionate to a UI empty-state render and likely to destabilize
    other suites. A zero-response seed alone would NOT exercise the empty state either: the view's
    assembler falls back to reconstructing question shells when an inspection has no saved responses
    (`InspectionQuestionAssembler.buildQuestionEntries`), so the combo itself must be empty. Not worth it.
  - **Re-grounding:** the new view does NOT hide the Questions section when empty (the legacy JSP did) —
    it always renders the "Questions" heading + a "No question responses" empty section
    (`ScaleSiteInspectionQuestions` mode="view"). That empty-state render is best proven by a component
    (Vitest) test — the proportionate (lower) test level, since the state can't be produced end-to-end.
  - **Future action:** add a component test for the empty questionResponses render; revisit as E2E only
    if a zero-question inspection type/site-type combo is ever configured.
  - **Status:** OPEN. Found 2026-07-16. (No scenario authored — the state is not reproducible.)

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The S01–S06 `.feature` set,
its `-slices.md` control/message/field matrix, and the `-detailed.md` STA/ERR catalog were reconciled
against the app's read path; every rendered control/field/message maps to a scenario or a logged
re-grounding/gap (see `coverage.md`). No source-enumerated item was silently dropped.

**Verified — not a defect (looked different from legacy, confirmed correct / re-grounding):**

- **#1 — Not-found surfaces on the view, not back on the list.** Legacy caught `NullCimsRecordException`
  and forwarded BACK to `.scaleSiteInspections` with ERR-001 "The selected record could not be found."
  The new app's detail GET returns non-OK for a missing id, and the view renders a "Could not load
  inspection" empty section in place (no sticky list-error state). The user is still clearly told the
  record is unavailable — a benign UX re-grounding, asserted green in `not-found.feature`. Recovery is
  re-grounded to opening a valid inspection directly.
- **#2 — Empty list shows an empty section, not a bare empty table.** Legacy rendered the table header
  with zero rows; the new `InspectionsTab` shows a "No inspections found" empty section + the Add
  Inspection button and no error. Re-grounding, asserted green in `empty-list.feature`.
- **#3 — The "Inspection # link → detail" list hop is a single client-side route.** Legacy needed a
  `.do` list load then a row-link POST; the new app links each row straight to the view route. The
  row-link render is covered under UC-INS-001's InspectionsTab coverage; the view here is opened against
  a seeded id. Not a gap — the same navigation is exercised, just re-grounded to client-side routing.
