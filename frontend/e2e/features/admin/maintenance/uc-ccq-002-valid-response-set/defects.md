# Defects — UC-CCQ-002 Maintain Valid Response Set

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:** _none._ (No standalone screen exists; the shared save→modal-closes divergence is logged
under UC-CCQ-001 Divergence #1.)

**Coverage gaps (not tested yet — no app problem):**

_All three gaps below are now CLOSED (2026-09-08). Kept, not deleted, so the reasoning stays auditable._

- **#1 — `QuestionsModal` reset (CCQ-002 S05) not separately tested. — CLOSED 2026-09-08.**
  - **Why it was open:** judged a low-value modal nicety; UC-CCQ-001 exercised create/update/delete and
    validation but never the Reset control.
  - **How it is covered now:** `uc-ccq-001-maintain-questions/navigation.feature` @S05 — edits Sort Order
    on the edit form, clicks Reset, and asserts the field is restored to the **seeded** value (comparand
    is the pre-edit snapshot, so a Reset that merely blanked the field would fail).
  - **Status:** CLOSED. Found 2026-07-17; closed 2026-09-08.
- **#2 — Back / close-without-saving (CCQ-002 S06) not separately tested. — CLOSED 2026-09-08.**
  - **Why it was open:** judged a low-value nicety; the happy paths already asserted the modal closes on
    save.
  - **Worth noting for the next reader:** Back does **not** close the modal — `useMaintenanceCrud.cancelEdit`
    re-applies the loaded record and sets `modalMode: 'view'`, so it returns to the read-only view. The
    first draft of this scenario asserted a closed modal and failed; the app is right and the assertion
    was wrong. (Contrast the Templates screen, whose create-mode Back *does* close — different mode,
    different handler.)
  - **How it is covered now:** `navigation.feature` @S06 asserts three things, since any one alone is also
    satisfied by a save that succeeded: the view redraws the pre-edit values, the update spy counted zero
    PUTs, and an API read-back shows all five scalar fields unchanged.
  - **Status:** CLOSED. Found 2026-07-17; closed 2026-09-08.
- **#3 — Question not-found on view load (CCQ-002 S07) not separately tested. — CLOSED 2026-09-08 (split).**
  - **Why it was open:** the not-found branch was untested; "the list only links real ids" made it look
    unreachable and low value.
  - **How it is covered now — server half:** `not-found.feature` @S07 asserts
    `GET /api/inspection-questions/999999999` returns HTTP 404 with `code: NOT_FOUND` — the endpoint the
    view modal itself calls. This catches a regression to a 500, an empty 200, or a leaked Oracle message.
  - **UI half — `not-applicable`, not deferred:** legacy had a per-id route (`.maintainQuestionsView.do?id=`)
    a user could mistype or bookmark. The new app is a single route with an in-page modal, so no such URL
    exists to drive. That is the app having no such path by design — recorded as `not-applicable` in
    `coverage.md`, which is a different disposition from "we haven't tested it".
  - **Status:** CLOSED. Found 2026-07-17; closed 2026-09-08.

**Spec gaps:** _none._

**Verified — not a defect:**

- **CCQ-002 has no standalone screen in the new app — it *is* the Maintain Inspection Question screen
  (UC-CCQ-001).** Legacy modelled "valid response set" maintenance as its own thing; the new app makes a
  question's valid responses a multi-select on the question form. A source sweep of `nr-scs/frontend`
  found no route/page/endpoint for a response set. So CCQ-002's substantive slices are **covered by
  UC-CCQ-001** (see `coverage.md`), and no duplicate suite is warranted. (Verified 2026-07-17.)

**Where CCQ-002's scenarios live.** S05/S06/S07 are authored in the **UC-CCQ-001 folder**
(`navigation.feature`, `not-found.feature`) because that is the screen they act on, and they carry
`@UC-CCQ-002` alongside `@UC-CCQ-001`. This folder stays the accounting home; a tag search from either UC
finds them.

**⚑ Scope note for BA/QA:** if a *dedicated* valid-response-set admin screen is ever built (separate from
the question form), this UC gets its own suite then. Until then it is covered via UC-CCQ-001. This is the
author's disposition — BA/QA to confirm.
