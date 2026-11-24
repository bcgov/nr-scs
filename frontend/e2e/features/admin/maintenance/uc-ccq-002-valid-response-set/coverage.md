# Coverage — UC-CCQ-002 Maintain Valid Response Set

> New to these files? See [`coverage-guide.md`](../../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

**Outcome: no separate suite — this UC is the *same screen* as UC-CCQ-001, re-sliced from the
"valid responses" angle, and its substantive slices are covered there.** The new app has **no standalone
"valid response set" screen**: a question's valid responses are a `FilterableMultiSelect` on the Maintain
Inspection Question form (`QuestionsModal`), not a separately-maintained entity (source sweep of
`nr-scs/frontend` found no route/page/endpoint for a response set). So authoring a CCQ-002 suite would
duplicate CCQ-001. This folder records where each slice is covered (or the small gap), so the CCQ domain's
accounting is complete and no UC looks silently forgotten.

Verified 2026-07-17: CCQ-002's own `-slices.md` describes editing valid responses **on an inspection
question** (S01 "updates valid responses for an unused question", S02 "fewer than 2 valid responses",
S04 "question used → valid responses locked") — i.e. the CCQ-001 screen.

| CCQ-002 slice | What it is | Covered by | Status |
|---|---|---|---|
| S01 — update valid responses (unused question), happy path | set/change `validResponseCodes` and save | CCQ-001 `update.feature @S03` (updates an unused question; its body sets the valid responses) | covered elsewhere |
| S02 — validation: fewer than 2 valid responses | the new-app "at least **two**" rule | CCQ-001 `create.feature @S05b` (Save blocked when too few Valid Responses) | covered elsewhere |
| S03 — validation: required question fields missing/invalid | required-field blocks on save | CCQ-001 `create.feature @S05a` + `update.feature @S03-validation` | covered elsewhere |
| S04 — question used in inspection → valid responses locked (read-only) | used-question edit restriction | CCQ-001 `update.feature @S07` (update restricted to Sort Order / Expiry when used) | covered elsewhere |
| S08 — unauthorized access to maintain-questions actions | wrong-role denied | the security suite: `features/security/*/api-access.feature` + `*/url-access.feature` (endpoint + route, per role) and `features/security/maintenance-controls/maintenance-control-sweep.feature` (Add/Edit/Delete withheld) | covered elsewhere |
| S05 — reset the edit form | `MaintenanceFormModal` Reset -> `useMaintenanceCrud.resetForm` | `uc-ccq-001-maintain-questions/navigation.feature` @S05 @p2 | covered |
| S06 — navigate back without saving | `MaintenanceFormModal` Back -> `useMaintenanceCrud.cancelEdit` (returns to the read-only view, does NOT close the modal) | `uc-ccq-001-maintain-questions/navigation.feature` @S06 @p2 | covered |
| S07 — question record not found (server half) | `GET /api/inspection-questions/{id}` -> 404 `NOT_FOUND` | `uc-ccq-001-maintain-questions/not-found.feature` @S07 @p2 | covered |
| S07 — question record not found (UI half) | no per-id route exists: the new app is one route + an in-page modal, and the list only links ids it just fetched | — | not-applicable |

**Net (updated 2026-09-08): every CCQ-002 slice is now accounted for and nothing is deferred.** The
substantive slices (the at-least-two rule, required-field validation, used-question lock) are covered by
UC-CCQ-001; role-denial is covered by the cross-cutting security suite; and S05/S06/S07 — the three that
were deferred — are now authored as `navigation.feature` and `not-found.feature` **in the UC-CCQ-001
folder**, because that is the screen they act on. They carry `@UC-CCQ-002` so a source-tag search finds
them from here.

S07 is the one split row: its *rule* is alive server-side and asserted, but its legacy trigger (a
hand-edited `.maintainQuestionsView.do?id=` URL) has no equivalent to drive, so the UI half is
`not-applicable` rather than deferred — the app cannot reach that state by design, which is a different
thing from us not having tested it.

**Status values:** `covered` (a scenario asserts it, named above) · `covered elsewhere` (tested by
UC-CCQ-001 or the security suite) · `not-applicable` (the new app has no such path). No `blocked` or
`deferred` rows remain. Still no standalone suite — the screen has no separate existence in the new app.
