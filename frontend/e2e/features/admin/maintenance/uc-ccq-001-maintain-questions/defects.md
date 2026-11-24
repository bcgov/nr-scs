# Defects — UC-CCQ-001 Maintain Inspection Question

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../../defects-guide.md)

**Bug / Regression:** _none._

**Divergences:**

- **#1 — Saving a question now forwards to the saved record's view (RESOLVED — app fixed 2026-07).**
  - **What it was:** After creating or updating an inspection question and clicking Save Record, the form
    closed back to the list instead of showing the saved record — the legacy system forwarded straight to
    a read-only view. Root cause: `saveMutation.onSuccess` called `setModalMode(null)` unconditionally,
    with no branch reopening in `'view'` mode (same handler served create and update).
  - **Resolution:** `saveMutation.onSuccess` now seeds the detail cache and calls `setModalMode('view')`,
    so a successful save forwards to the read-only view for both create and update
    (`nr-scs/frontend/src/pages/Administration/Maintenance/Questions/index.tsx`). This was applied as a
    consistency pass across **all** maintenance pages (Questions, AppointmentTypes, Templates fixed;
    ExamUpgrades / AuthorizationClauses / Conditions / SignatureBlocks / ValidLicenceAttributes already
    forwarded to view). Verified live in the UI.
  - **Now asserted GREEN** by `create.feature @S01`, `update.feature @S03` and `@S07` ("the question should
    be shown in the view" + a full API read-back). The former standalone `@discovered-divergence` scenario
    was folded into the `@S01` happy path and its tag removed — this is no longer a divergence.
  - **Priority / env:** p2 · local seeded DB · frontend `:3000` / backend `:8080` mock auth.
  - **Status:** RESOLVED (fixed in-app). Found 2026-07-15; resolved 2026-07 (no Jira required — corrected
    directly in the app during the maintenance-page forward-to-view alignment).
  - **Test:** `create.feature @S01`, `update.feature @S03`/`@S07` (all assert the view is shown after save).

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test "non-administrator is denied access" (S09, ERR-008). — CLOSED 2026-09-08.**
  - **Why it was open:** the local mock auth granted every request the single `SCS_SYS_ADMIN` role, so no
    lesser-privileged user could be produced to hit the (then) `@IsScsEditor`-gated endpoints or to be
    refused at `/maintenance/questions`.
  - **What changed:** the eleven-role permission roll-out. `@IsScsEditor` no longer exists — every handler
    now carries `@RequiresPermission`, and the mock picker can sign in as any of the eleven `SCS_` roles.
  - **How it is covered now:** the security suite asserts `/api/inspection-questions` per role in
    `features/security/*/api-access.feature` and the `/maintenance/questions` route in the matching
    `url-access.feature` files. No CCQ-local scenario was added — that would re-prove the same cells.
  - **Status:** CLOSED (covered elsewhere). Found 2026-07-15; closed 2026-09-08.

- **#2 — Can't test "Edit Record / Delete hidden without permission" (legacy STA-003/STA-004). — CLOSED 2026-09-08.**
  - **Why it was open:** legacy hid Edit Record and Delete for a user lacking the
    `maintainQuestionsUpdate`/`maintainQuestionsDelete` WebADE permissions, and the new app had no
    per-button check at all — the buttons always rendered.
  - **What changed:** per-element permissions now exist. `Questions/index.tsx` passes
    `addPermission` (`:194`), `editPermission` (`:215`) and `deletePermission` (`:216`) into the shared
    `MaintenanceListPage` / `MaintenanceFormModal`, which gate the three controls.
  - **How it is covered now:** `features/security/maintenance-controls/maintenance-control-sweep.feature`
    asserts all three **withheld** on Questions for `SCS_DIST_SCALING_MANAGER`,
    `SCS_REGIONAL_SCALING_MANAGER` and `SCS_CE_TECHNICIAN`, and **offered** for `SCS_SYS_ADMIN`.
  - **Status:** CLOSED (covered elsewhere). Found 2026-07-15; closed 2026-09-08.

**Related CCQ use cases:** the other two CCQ use cases now have their
own disposition folders (so the CCQ domain shows all three UCs accounted for, not silently absent):

- **UC-CCQ-002 Maintain Valid Response Set** — no standalone screen; it *is* this Maintain Inspection
  Question screen re-sliced from the valid-responses angle, so its substantive slices are **covered here**
  (e.g. the "at least two" rule = `create.feature @S05b`). Full mapping:
  [`../uc-ccq-002-valid-response-set/coverage.md`](../uc-ccq-002-valid-response-set/coverage.md).
- **UC-CCQ-003 Maintain Templates** — **corrected 2026-07-28; this pointer was stale until 2026-09-08.**
  The screen the UC's *gherkin* describes (Scale Authorization Templates, `/maintenance/templates`,
  binding conditions) **is built** and now has a full green suite. The "no template-maintenance screen"
  reading was about a *different* entity — the RSK **risk-questionnaire-template**, which bundles
  questions, is consumed read-only by `RiskQuestionnaireService`, and is genuinely data-managed with no
  UI. Both facts are true of two different "templates". Disposition + the merge-reconciliation note:
  [`../uc-ccq-003-risk-questionnaire-template/coverage.md`](../uc-ccq-003-risk-questionnaire-template/coverage.md).

**Spec gaps (the Gherkin is missing scenarios its own docs list):**

- **#1 — The at-least-one/at-least-two checkbox-group rules were excluded from the Gherkin pending confirmation, but are demonstrably enforced.**
  - **What's missing:** `UC-CCQ-001-slices.md`'s own Gap Analysis Summary excluded a slice for the
    Inspection Type / Scaling Methods / Valid Responses minimum-selection rules, noting *"the enforcement
    code path was not found in the [legacy] validator... excluded as a slice until the code path is
    confirmed"* (`-slices.md` Deliberately-excluded list; `-technical.md` Gaps/TODOs).
  - **The app is correct:** the new app demonstrably enforces all three (client `validateForm` +
    server `InspectionQuestionService.validateQuestionRequestParams`) — Inspection Type and Scaling
    Methods each require at least one selection; Valid Responses requires at least **two** (not one — a
    new-app-only rule with no legacy precedent to compare against). Covered anyway
    (`create.feature @S05b`).
  - **Future action:** a BA regenerates `UC-CCQ-001-slices.md`/its Gherkin to include this as a confirmed
    slice rather than a documented gap.
  - **Status:** OPEN. Found 2026-07-15.
  - **Test (covers it anyway):** `e2e/features/admin/maintenance/uc-ccq-001-maintain-questions/create.feature`
    (`@S05b` outline).

- **#2 — Expiry-before-Effective date ordering was excluded from the Gherkin pending confirmation, but is demonstrably enforced.**
  - **What's missing:** `-slices.md`'s Deliberately-excluded list also dropped "Expiry date before
    Effective date" — *"no cross-field date-order validation was found in `InspectionQuestionValidator`
    [legacy]... excluded pending live app confirmation."*
  - **The app is correct:** the new app enforces Expiry >= Effective, both client-side (`validateForm`)
    and server-side (`SCSUtils.requireDateOrder`). Covered anyway (`create.feature @S06-order`).
  - **Future action:** a BA regenerates the slice/Gherkin to include this as confirmed.
  - **Status:** OPEN. Found 2026-07-15.
  - **Test (covers it anyway):** `e2e/features/admin/maintenance/uc-ccq-001-maintain-questions/create.feature`
    (`@S06-order`).

**Verified — not a defect:**

- **`@IsScsEditor` is gone — its absence is not a missing guard.** Earlier revisions of this log cited it
  as the enforcement point for S09. It was removed app-wide because it hardcoded `SCS_SYS_ADMIN` and would
  have blocked the other ten roles from writes they are entitled to; every handler now carries
  `@RequiresPermission`, enforced by a build-failing convention test. Strictly more coverage than the
  annotation gave. (Verified 2026-09-08.)
- **The Question-text 200-character cap moved from client-side (legacy) to server-only enforcement.**
  Legacy validated this client-side (`OAValidator.validateLength`, ERR-007). The new `QuestionsModal` has
  no `maxLength`/length branch in `validateForm` at all, but the backend still rejects it
  (`@Size(max=200)` bean validation + `InspectionQuestionService`'s own length check). The rule still
  holds end-to-end, just enforced one layer later — not a defect, re-grounded as a server-side-rejection
  scenario (`create.feature @S06-len`). (Verified 2026-07-15.)
- **The Scaling Methods multi-select now offers a 4th option ("Cruise Based", code `C`) the legacy
  checkboxes never had (legacy only exposed Piece/Weigh/SFP).** The new app's `ActiveMultiSelect` simply
  lists whatever `GET /api/scale-method-type-lov` returns, unfiltered. Deliberate re-grounding, not a
  defect — the test picks "Piece Scale" (`P`), which exists in both. (Verified 2026-07-15.)
