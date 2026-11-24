# Defects — UC-CHK-003 View Detail Check Scale

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

Read-only UC. All scenarios open **permanent** seed records read-only (905001 / 905021 / 905002) — nothing
mutates, so they need no cleanup and are parallel-safe. 7 scenarios, all green.

**Bug / Regression:**

- **#1 — Variance % in the Check Scale Summary table was divided by the wrong total. FIXED.**
  - **What was wrong:** on the View Detail Check Scale screen, every cell of the **Variance %** row was
    computed as `Difference / Original x 100`. The old system computes it as `Difference / Check x 100`,
    so the same record showed different percentages in the two systems.
  - **Expected vs actual:** for Original 120 / Check 100 tops, expected `20.0` (20 / 100); the app showed
    `16.7` (20 / 120). The error grows with the gap between the two totals, and flips which total the
    percentage is relative to, so it is wrong in both directions.
  - **How we caught it:** reported by QA — opened the same check scale in the legacy test and new test
    systems and compared the Variance % row.
  - **Why (technical):** `pages/View/CheckScale/index.tsx` `buildAnalysis()` used the original total as the
    divisor. Legacy `CheckScaleVwBo` calls `TallyBo.getVariance(this.checkScale, this.difference)` — the
    **check** tally — and `TallyBo.getVariance`'s parameter is merely *named* `original`
    (`docs/nr-scs-2.20.2/.../domain/bo/TallyBo.java:142-174`), which is very likely how the wrong divisor
    was read off the legacy source in the first place.
  - **Action / Status:** fixed in the app on branch `bugfix/cs-variance-calc`; the divisor is now the check
    total, guarded for a zero check total. **Status: CLOSED** (pending BA/QA confirmation against legacy).
  - **Test:** unit — `src/pages/View/CheckScale/index.unit.test.tsx` ("divides the difference by the CHECK
    total for Variance %" + the zero-check-total case). Both go red against the old formula. Not covered
    at e2e level; see Coverage gap #5.

**Divergences:** _none._ Notably, the "record not found" path (S06) works correctly on the **view**
screen — it shows a clear "Could not retrieve check scale data." error — in contrast to the **edit**
screen's endless-spinner bug (UC-CHK-002 Divergence #1). Different component, different (correct) result.

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test the permission-hidden action buttons (S05).**
  - **What's missing:** the old system hid the Delete / Add Check Scale / Create Letter buttons from users
    without those permissions (legacy STA-002/005/006). The new view screen has **no per-element
    permission mechanism** — every action button renders for everyone — and the test login is always a
    full admin, so the "hidden" state can't be produced.
  - **What we did instead:** asserted the re-grounded behavior — all five buttons (Back, Edit Record,
    Create Letter, Add Check Scale, Delete) render, with Edit/Delete enabled for a non-legacy record.
  - **Future action:** revisit when per-element permissions are built.
  - **Status:** OPEN. Found 2026-07-09.
  - **Test (covers the re-grounded behavior):** `e2e/features/chk/uc-chk-003-view/check-scale-view-navigation.feature` (S05 `@p1`).

- **#2 — No equivalent of the legacy "scaler tombstone lost" case (S07).**
  - **What's missing:** legacy `.scalerCheckScales` relied on a session "tombstone"; navigating in without
    it rendered a blank list with no error (ERR-002). The new app has no session-tombstone mechanic — the
    check-scale list is a tab deep-linked by the scaler/site id in the URL; an unknown/empty id simply
    shows a "No check scales found" empty state. There is no lost-context state to reproduce.
  - **Verdict:** legacy-only mechanic, **not a defect**. No scenario authored.
  - **Future action:** none unless a session-context entry point is introduced.
  - **Status:** OPEN. Found 2026-07-09.

- **#3 — The "Who Did It" audit popup is not rendered on the new view (S01/S04).**
  - **What's missing:** legacy `viewCheckScale.jsp` rendered a `<scs:whoDidIt>` audit popup (entry/update
    user + timestamps). The new view screen does not render it, so there's nothing to assert.
  - **Verdict:** feature not present in the new app; **not a defect** for this UC.
  - **Future action:** revisit if an audit-popup affordance is added to the view.
  - **Status:** OPEN. Found 2026-07-09.

- **#4 — The Delete button on the view is not wired (relevant to the future Delete UC).**
  - **What's missing:** the view's Delete button opens a confirm modal whose confirm handler is an
    `alert('Delete action is not wired yet.')` stub — no delete is performed. UC-CHK-003 only asserts the
    button's presence and enabled/disabled state (a view concern); the actual delete behavior is
    **UC-CHK-004 (Delete Detail Check Scale)** scope.
  - **Verdict:** incomplete feature, **not a defect** for the view UC — flagged so the UC-CHK-004 author
    knows the wiring is a stub today.
  - **Status:** OPEN. Found 2026-07-09.

- **#5 — The Check Scale Summary table is asserted structurally, not by value.**
  - **What's missing:** S01/S02 assert only that the Original / Check / Difference / Variance % **rows are
    present**; no scenario checks the numbers in them. That is why Bug #1 (wrong Variance % divisor) was
    found by hand rather than by the suite.
  - **What we did instead:** pinned the arithmetic in a unit test (see Bug #1), which needs no seeded
    record and runs on every `npm run test:unit`.
  - **Future action:** to cover it end-to-end, assert the six Variance % cells for a seed record whose
    original and check totals differ (905001 has the totals; the expected values must be read off legacy or
    computed from the row above, not from the app).
  - **Status:** OPEN. Found 2026-09-21.

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The S01 `.feature` displays a
representative subset of the many read-only fields the technical Control Reference lists, but they are all
`bean:write` display-only fields (no validation); asserting the key identity fields + the two summary
tables structurally is sufficient view coverage, so no spec gap is raised.

**Verified — not a defect:**

- **Pieces Variance % uses real division on purpose — legacy truncates, the new app does not.** Legacy
  computes the Pieces cell with Java **integer** division (`TallyBo.java:165`:
  `difference.intValue() / original.intValue() * 100`), so it truncates to zero whenever the difference is
  smaller than the check total — Original 8 / Check 10 shows `0.0` in legacy, making the column read 0.0
  for most records. The new screen divides properly and shows `-20.0`. **Expect a legacy-vs-new mismatch on
  the Pieces column only**; it is the new value that is correct. Deliberate decision, 2026-09-21 — the
  formula fix in Bug #1 applies real division to all six columns. The other five columns already used real
  division in legacy and match exactly.

- **The legacy "list" screens are re-grounded to tabs.** Legacy `.scalerCheckScales` (P012) and
  `.scaleSiteCheckScales` (P057) are standalone screens; the new app renders the same check-scale list as
  the **Check Scales tab** inside the Scaler View (`/scalers/view/{lic}?tab=check-scales`) and Scale Site
  View (`/scale-sites/view/{site}?tab=check-scales`). The row's Check Scale # cell links to the same
  `/check-scales/view/{id}`. Deliberate re-grounding; the tests navigate via the tabs. (Verified 2026-07-09.)
- **Not-found error text was re-grounded on purpose.** Legacy threw `SCSException("check scale not found")`
  (ERR-001); the new view shows "Could not retrieve check scale data." The assertion matches the new text.
  (Verified 2026-07-09.)
