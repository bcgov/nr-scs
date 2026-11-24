# Defects — UC-SCA-005 Create Scale Site Authorization

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

## Divergences

- **The create form rejects an expiry date equal to the effective date; the server would accept it**
  - **What's wrong:** Not broken — a client/server rule mismatch to flag. The React form requires the
    Expiry Date to be **strictly after** the Effective Date ("Expiry Date must be after Effective Date."),
    but the backend rule is **on or before** ("Effective Date must be on or before Expiry Date." —
    equal dates allowed). So a user can never set effective == expiry even though the API would persist it.
  - **Expected vs actual:** Server allows a same-day (0-day) authorization; the UI blocks it.
  - **How we caught it:** `pages/Create/ScaleSiteAuthorization` validateBasics (`exp <= eff` → error) vs
    `ScaleSiteAuthorizationService.validateForSave` (`requireDateOrder`, effective ≤ expiry).
  - **Action:** BA/QA to confirm which rule is intended (likely the UI's stricter "must be after" is the
    desired business rule). Logged as **suspected-intentional-change → the client rule is what the test
    asserts**: validation.feature `@S05` is a Scenario Outline whose **`equal to` row** drives expiry ==
    effective (the only case the two rules disagree) and asserts the client's "Expiry Date must be after
    Effective Date." — a GREEN test of the intended-stricter UI rule, not a failing `@discovered-divergence`.
    (The `before` row covers the expiry-strictly-before case, which both client and server reject.)
  - **Register / classification:** Divergence · suspected-intentional-change
  - **Severity/Priority:** sev3 / p1
  - **UC / Gherkin slice:** UC-SCA-005-S05
  - **Environment / build:** local seeded Docker DB (:1525); nr-scs `main`; branch `test/e2e-scale-site-auth-crud`
  - **Data fixture:** `fixtures/sca/sca-test-data.ts` (`scaleSiteAuthExpiryEqualsEffective` — the divergent case; `scaleSiteAuthExpiryBeforeEffective` — the both-reject case)
  - **Status:** OPEN · **Found:** 2026-08-19

## Coverage gaps

- **CG#3 — "Template is required." guard is unreachable (Apply button disabled).** The legacy S10 error is
  never triggerable in the new app: the conditions section disables the Apply button until a template is
  selected (better UX than an error). `not-applicable`. OPEN · 2026-08-19.
- **CG#6 — S08 permission (Add Authorization hidden / notAuthorized) blocked by mock auth.** The harness
  grants only `SCS_SYS_ADMIN` and there is no per-element UI gate, so the deny path is unreachable from the
  browser. Endpoint enforcement (`@RequiresPermission`) is present → treat as waived. `blocked`. OPEN · 2026-08-19.
- **CG#1 — Back-to-list (S04) not tested.** `Back` is `navigate(-1)`; nav-only, no persistence effect. `deferred`. OPEN · 2026-08-19.
- **CG#2 — Duplicate-condition add (ERR-012) not tested.** The add-guard dedupes; low value. `deferred`. OPEN · 2026-08-19.
- **CG#4 — Happy template-apply (S10) not tested.** Applying a selected template adds its conditions; low value beyond the condition-add already covered. `deferred`. OPEN · 2026-08-19.
- **CG#5 — Mandatory-condition-cannot-be-removed (S09) not tested.** No mandatory SIA condition
  (`ministryStandardInd='Y'`) exists in the extract to auto-load and attempt to remove, so the guard has no
  deterministic trigger. `deferred` (revisit if the extract gains a mandatory SIA condition). OPEN · 2026-08-19.
