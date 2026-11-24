# UC-MNT-003 Maintain Appointment Types — Defect Log

> How this log works (registers, statuses, tags): [defects-guide.md](../../../../defects-guide.md).

## Divergence
_None._ The one behavioral difference from legacy — delete-blocked is enforced **server-side** (a clean
HTTP 400 + message) instead of legacy's client-side JS alert (STA-005) — still upholds the rule (a
dependent-having appointment type cannot be deleted), so it is a re-grounding, not a divergence. Covered
green by delete.feature `@S09`.

## Bug / Regression
_None found._

## Coverage gap

### Coverage gap #1 — S10 cancel-create / cancel-edit (Back) not automated
- **What:** The Back/Reset/close cancel flows (S10) are not yet automated.
- **Why deferred:** `@p2` UI nicety with no persistence effect (Back on create returns to the list; Back
  on edit returns to the unchanged view). Lower risk than the CRUD + validation paths shipped here.
- **Status:** OPEN — write when expanding `@p2` coverage.

### Coverage gap #2 — S11 unauthorized access + create/delete button gating (STA-001/002)
- **What:** Role-restricted access (non-`SCS_SYS_ADMIN` → not-authorized) and the create/delete button
  hiding cannot be exercised.
- **Why blocked:** the local stack's mock auth (`VITE_MOCK_USER=true`) grants only a single
  `SCS_SYS_ADMIN` role, so no non-admin session is reachable. Same limitation logged across the suite.
- **Status:** OPEN — revisit if multi-role auth becomes available in the test env.

## Spec gap (gherkin-incomplete-vs-source)

### Spec gap #1 — S06 length/format not reproducible through the new UI
- **What:** The legacy S06 slice enumerates over-length (ERR-002 code>4, ERR-004 desc>120) and bad
  date-format (ERR-007/009) submit-time errors. The new React app prevents the bad input at the control
  instead of rejecting it on submit: the code field is `maxLength=4`, the description `maxLength=120`, and
  the dates use a Carbon date picker (no free-text). `validateForm` therefore has no length/format branch.
- **Impact:** none on the rule (still capped at the DB/model); the enforcement moved from submit-time to
  input-time. Logged so a BA knows the `.feature` intentionally omits S06 submit-time length/format
  scenarios (they are not reachable in the new UI), rather than it being an accidental drop.
- **Status:** OPEN — informational; no action needed unless the input caps are removed.

## Verified — not a defect
- **Delete-blocked message** — `DELETE /api/appointment-types/{code}` for a code with dependent
  `scaler_valid_licence_attribute` rows returns HTTP 400 `{"message":"Appointment type has dependent
  records and cannot be deleted."}` and the row survives (FK `SVDL_SAPT_FK` = NO ACTION). Confirmed live
  2026-07-22. This is correct behavior; asserted by delete.feature `@S09`.
