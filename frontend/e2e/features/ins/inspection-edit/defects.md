# Defects — Edit Site Inspection (app-only)

> How this log works, and what each register and tag means: [defects-guide.md](../../../defects-guide.md)

**Nothing is wrong with the app.** All thirteen scenarios are normal green assertions — no divergences, no
bugs, no `@discovered-*` reds. The entries below are two open **coverage gaps** (rules the app really does
enforce, which a browser test cannot reach), one **closed** gap kept for the lesson in why it was
mis-diagnosed, a pointer to a gap owned by the sibling suite, and one note about a stale statement in
the neighbouring ledgers.

## Coverage gaps

### CG-1 — CLOSED — "Answer is required" *can* be triggered on the edit form after all

- **What's wrong:** Nothing — and nothing was ever wrong in the app. This gap was opened and then
  closed the same day, and it is kept here because the reason it was opened was a **wrong reading of the
  app**, which is worth not repeating.
  - **What we first believed:** that on the *edit* form a question's answer could not be cleared, because
    every row arrives already answered and the Answer dropdown only lists that question's real answer
    options — so the *"Answer is required."* message looked unreachable without poking the page's
    internals, and it was logged as deferred.
  - **What is actually true:** the Answer dropdown renders a blank **"Select"** entry above the real
    options (`components/Form/ScaleSiteInspectionQuestions/index.tsx:248`), so choosing "no answer" is an
    ordinary thing a user can do on the edit form. The rule is therefore fully testable through the UI.
  - **How we caught the mistake:** while preparing a component-level unit test to compensate for the
    supposed gap, we read the dropdown's markup and found the blank option. The E2E scenario was written
    instead, and it passes.
  - **Resolution:** covered by
    [`validation.feature`](./validation.feature) — "Clearing a question's answer is rejected before any
    write" (`@S10 @p1`), which asserts the message *and* proves no update request was sent.
  - **Register / classification:** Coverage gap · closed by a new test
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** none — app-only capability
  - **Environment / build:** nr-scs `main` @ `53221c5`, local seeded Docker DB (`DBDOCK_01`)
  - **Data fixture:** `fixtures/ins/ins-test-data.ts`
  - **Status:** CLOSED (test written 2026-09-09) · **Found:** 2026-09-09
  - **Test:** `features/ins/inspection-edit/validation.feature` ("Clearing a question's answer is
    rejected before any write", `@S10 @p1`)

### CG-2 — the inline (field-level) server error on Inspection Date is not reachable in a browser

- **What's wrong:** Nothing in the app — in fact both halves work. The server rejects a future
  inspection date and returns it as an error attached specifically to the *Inspection Date* field, and
  the page knows how to show that error inline on the field. But the page's **own** check catches a
  future date first, so the server never gets the chance, and the inline path never runs in real use.
  - **Expected vs actual:** Expected (to test it): submit a future date and watch the *server's*
    field-scoped error appear inline. Actual: the client blocks the same input before any request is
    sent, so only the client's own message is ever seen.
  - **How we caught it:** Probed the endpoint directly on 2026-09-09. `PUT /api/scale-sites/inspection/{id}`
    with a future `inspectionDate` returns **HTTP 400** with
    `{"code":"VALIDATION_ERROR","message":"Validation failed for one or more fields.",`
    `"fieldErrors":[{"field":"inspectionDate","message":"Inspection Date cannot be in the future."}]}`
    — so the server behaviour is confirmed real. Then confirmed the client rule
    (`index.tsx:200-202`, `isFutureDateOnly`) fires first, making the inline branch unreachable via the UI.
  - **Why (technical):** `components/Form/ScaleSiteInspectionDetails/fieldErrors.ts` maps a backend
    `FieldValidationException` on `inspectionDate` to that input's DOM id and scrolls to it
    (`updateMutation.onError`, `index.tsx:426-434`). Only the **generic** banner branch of that same
    handler is browser-reachable, and that branch **is** covered — see
    [`not-found.feature`](./not-found.feature) `@S09 @p1`, which reaches it by deleting the record
    out-of-band and then saving.
  - **Recommended next step:** none required. The mapper is unit-tested at the right level
    (`nr-scs/frontend/src/components/Form/ScaleSiteInspectionDetails/fieldErrors.unit.test.ts`), which is
    cheaper and more precise than a browser test would be.
  - **Register / classification:** Coverage gap · not-an-app-defect (not UI-reachable; covered at unit level)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** none — app-only capability
  - **Environment / build:** nr-scs `main` @ `53221c5`, local seeded Docker DB (`DBDOCK_01`)
  - **Data fixture:** `fixtures/ins/ins-test-data.ts` + `fixtures/common/dates.ts` (`daysAhead`)
  - **Status:** OPEN · **Found:** 2026-09-09
  - **Test:** none — recorded as Coverage gap #2 in [`coverage.md`](./coverage.md).

### CG-3 — the "all questions must be answered" server rule is not reachable in a browser

- **What's wrong:** Nothing in the app. The server refuses an update that leaves out any of the
  inspection's questions, but the form always sends every question it displayed, so a partial
  submission cannot happen from the screen.
  - **Expected vs actual:** Expected (to test it): submit only some questions and be refused. Actual: the
    form has no way to omit a question.
  - **How we caught it:** Probed directly on 2026-09-09 — a PUT carrying 1 of the inspection's 4
    questions returns **HTTP 400** *"Question responses must include all required inspection questions."*
    Confirmed real; simply not producible through the UI.
  - **Why (technical):** `InspectionValidator` (`:108-111`) compares the submitted question ids against
    the required set; `buildUpdateRequest` maps over the full `formValues.questionResponses`.
  - **Recommended next step:** none required — backend-only rule, covered by
    `nr-scs/backend/src/test/java/ca/bc/gov/nrs/scs/backend/service/inspection/InspectionValidatorTest.java`.
  - **Register / classification:** Coverage gap · not-an-app-defect (backend-only; covered at unit level)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** none — app-only capability
  - **Environment / build:** nr-scs `main` @ `53221c5`, local seeded Docker DB (`DBDOCK_01`)
  - **Status:** OPEN · **Found:** 2026-09-09
  - **Test:** none — recorded as Coverage gap #3 in [`coverage.md`](./coverage.md).

### CG-4 — the "Edit Record" button's visibility per role is untested

Same root cause, same recommended fix, and the same single owner as the Delete button beside it — so it
is written up **once**, in
[`../inspection-delete/defects.md`](../inspection-delete/defects.md) **CG-1**, rather than duplicated
here. Recorded as Coverage gap #4 in [`coverage.md`](./coverage.md).

## Verified — not a defect

### VN-1 — the neighbouring INS ledgers still say per-element permissions don't exist

- **What's wrong:** Nothing in the app; two of our own older documents are out of date and would mislead
  the next reader.
  - **Expected vs actual:** [`../uc-ins-001-create/coverage.md`](../uc-ins-001-create/coverage.md) and
    [`../uc-ins-002-view/coverage.md`](../uc-ins-002-view/coverage.md) state that there is "no
    per-element permission mechanism in the new app — these controls always render", and that role
    coverage is "blocked by mock auth (grants only `SCS_SYS_ADMIN`)". Both were true when written
    (2026-07-15/16). Neither is true now: `PermissionGate` gates individual controls, and the eleven-role
    model with a mock role-picker has since shipped.
  - **How we caught it:** Cross-checking those ledgers' role/permission lines while writing this suite's
    own, 2026-09-09.
  - **Why (technical):** the eleven-role roll-out (`context/auth/permissions.ts`,
    `PermissionGate`, `@RequiresPermission`) landed after those two ledgers were authored, and the
    per-role suites under `features/security/` were built on it.
  - **Action taken:** a dated correction note was added to both files pointing here and to
    `features/security/`. The scenario tables themselves were **not** rewritten — re-reconciling those
    two UCs against the new role model is its own task, not a side effect of this one.
  - **Register / classification:** Verified — not a defect · stale documentation (ours)
  - **Severity/Priority:** sev3 / p2
  - **Environment / build:** nr-scs `main` @ `53221c5`
  - **Status:** CLOSED (both files corrected 2026-09-09) · **Found:** 2026-09-09
  - **Test:** n/a — documentation.
