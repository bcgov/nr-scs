# UC-SSC-001 Maintain Authorization Clauses — Defect Log

> How this log works (registers, statuses, tags): [defects-guide.md](../../../../defects-guide.md).

## Divergence

### Divergence #1 — over-length clause returns a generic 500, not a max-length message — FIXED
- **Resolution (2026-07-24):** Fixed in `nr-scs` (`AuthorizationClauses/index.tsx` `validate()`): a clause
  whose trimmed length exceeds the `VARCHAR2(200)` column limit now sets a clean field-level error,
  "Clause can not be greater than 200 characters.", so the save is blocked client-side and no request is
  sent — the DB-level 500 is never reached through the UI. The E2E scenario flipped from a
  `@discovered-divergence` red to green (create.feature `@S08 @p1`, now also asserts zero create POSTs).
  (The backend still returns a raw 500 if an over-length request somehow bypasses the client — broader
  defense-in-depth debt under H-3, left as a separate backend concern; not reachable via the UI.)
- **What's wrong (plain, original):** When an administrator saved an authorization clause whose text is longer than
  the database column allows (200 chars), the app shows a generic *"An error occurred while processing
  your request."* instead of telling them the clause is too long. There is also no character limit
  enforced in the form itself, so nothing stops the user typing past 200 characters.
- **Expected vs actual:**
  - *Expected* (legacy S08 / tech ERR-004): a clear field-level message — "Clause can not be greater than
    200 characters." — before or on save, so the user can shorten it.
  - *Actual:* the client `validate()` has **no length check**, so the create/update POSTs; the backend
    `AuthorizationClauseService.validateRequestCommon` has **no length check** either; the Oracle column
    length rejects the row and surfaces as **HTTP 500** `{"code":"DATABASE_ERROR","message":"An error
    occurred while processing your request."}`. The modal shows only the generic save-failure banner.
- **How we caught it:** create.feature `@S08 @discovered-divergence` enters a 201-char clause, saves, and
  asserts the clean max-length message (RED — the generic banner is shown instead). Reproduced directly:
  `POST /api/auth-clauses` with a 201-char `scalerAuthorizationClause` → **HTTP 500 DATABASE_ERROR**; the
  row is not persisted (list count unchanged), so no data corruption — only the message + missing guard.
- **Supporting detail:** same class as backend tech-debt **H-3** (sanitize Oracle/SP errors — stop
  returning raw/opaque errors to clients) and consistent with UC-MNT-002 Divergence #1. A client-side
  `maxLength`/`validate` branch + a backend length check returning a clean 400 would resolve it.
- **Severity/priority:** @p1. **Environment:** local mock-auth stack, seeded Docker DB, 2026-07-24.
  **Data fixture:** ad-hoc 201-char clause on scale method `P` (no persisted row to pin).
- **Status:** CLOSED (fixed in this branch, 2026-07-24 — client-side length validation blocks the save
  with the clean max-length message). Optional follow-up: a backend length guard returning a clean 400
  (H-3 family) for API robustness; not required for the UI.

## Bug / Regression
_None found._

## Coverage gap

### Coverage gap #1 — S04 filter list by scale method
- `@p2` list filter. Deferred: asserting a filtered list by UI is pagination-fragile under `fullyParallel`
  (own-seeded rows can land on a later page). The filter control + `crud.reload({scaleMethodTypeCode})`
  path is exercised indirectly by the app's own unit/browser tests. Status: OPEN.

### Coverage gap #2 — S05 abandon edits via Back
- `@p2` UI nicety (modal Back = `crud.cancelEdit`, edit→view without saving). Not automated. Status: OPEN.

### Coverage gap #3 — S09 unauthorized access
- Blocked by single-role mock auth (no non-admin session). Status: OPEN.

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — S07 date-format validation not reachable in the new UI
- **What:** Legacy S07 (invalid date format, tech ERR-005/006 "…must be in the format 'yyyyMMdd'") is a
  submit-time validation in the source. The new app prevents it at the control: dates use a Carbon date
  picker (no free-text bad format) and are transported as ISO `LocalDate` — neither the client `validate()`
  nor `AuthorizationClauseService` has a format branch. So it is not reproducible as a client-side error.
- **Status:** OPEN — informational; the `.feature` intentionally omits an S07 scenario.

## Verified — not a defect
- **Expiry ≥ Effective is enforced** — the new app adds a client rule "Expiry Date must be on or after
  Effective Date." (not in the legacy slices). Covered green in create.feature `@p1`; correct behavior.
- **Clauses have no dependent-child guard** — unlike Conditions, a created clause is always deletable
  (no `checkDependents` in the CRUD config); the delete happy path removes its own seeded row cleanly.
