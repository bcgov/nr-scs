# Defects & Findings — UC-SCA-001 Create Scaler Authorization

> How this log works (registers, statuses, glossary): [`defects-guide.md`](../../../defects-guide.md) at the e2e root.

Environment: frontend `:3000` + backend `:8080` (mock auth `SCS_SYS_ADMIN`) + seeded Docker DB
`THE/…@localhost:1525/DBDOCK_01`. Data pinned in `fixtures/sca/sca-test-data.ts` (licence 8437, Reg/Dist
1831, job function "Piece Scale", scale site 520). Ground-truthed 2026-08-05. No `@discovered-*` red tests —
the create behaves as the re-grounded expectations.

---

## Divergence

_None kept as a red test._ The create validation is re-grounded (see Verified below) and behaves correctly.

---

## Coverage gaps

### Coverage gap #1 — S05 not-authorized (`scalerAuthorizationCreate`) — `blocked` by mock auth
- Legacy forwarded a user lacking the create permission to a Not-Authorized page (ERR-013). Mock auth grants
  only `SCS_SYS_ADMIN` and every authenticated user satisfies the endpoint's `@IsScsEditor`, so the denied
  branch is unreachable from the browser. **Status:** OPEN — `blocked`. Revisit with multi-role auth.

### Coverage gap #2 — legacy validations not ported (site-within-district, yyyyMMdd date format) — `not-applicable`
- Legacy ERR-012 splits in the new app. The **not-found** half IS enforced client-side (`onAddScaleSite`
  searches the site and renders `Scale site {id} was not found.`) and is now covered — validation.feature
  `@S03`. Only the **site-within-district** half is unported, plus the S02 ERR-006/007 `yyyyMMdd`
  date-format checks: `ScalerAuthorizationService.validateCreateRequest` does not check a scale-site↔district
  relationship (org-unit scoping deferred), and the create form uses a typed DateInput + the API takes typed
  dates (no free-text format to validate). Nothing to assert against for those two.
  **Status:** OPEN (documented, permanent) — excluded from the coverage denominator. Flag to BA/QA if the
  district-boundary rule is required.

### Coverage gap #3 — S06 server SCSException (ERR-011) — `deferred`
- Legacy S06 covers the save throwing an unexpected server exception. The message is legacy-`[UNKNOWN]` and
  there is no deterministic way to force a server 500 on the create from the browser without fault injection.
  Deferred. **Status:** OPEN — `deferred`.

---

## Verified — not a defect

### V1 — create validation messages are re-grounded, and correct
- Legacy S02 wording (`Authorized Scaler Licence # is required.`, `yyyyMMdd` format errors) re-grounds to the
  new app's client-side messages: `Licence # is required` (no trailing period), `Effective/Expiry Date is
  required.`, `Reg / Dist is required.`, `District Wide is required.`, `Expiry Date must be after Effective
  Date.`, and the business-rule messages `At least one Job Function is required.` / `At least one Scale Site
  is required when District Wide is No.` / `At least one Special Forest Product is required when Special
  Forest Product is selected.` Asserted directly (pinned in the fixture). Recorded so they are not
  re-investigated. Every negative proves no create request fired (`scalerAuthCreateCalls === 0`).
