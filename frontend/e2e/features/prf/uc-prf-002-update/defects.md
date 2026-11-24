# Defects — UC-PRF-002 Update Scaler Performance Remark

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).
> BA/QA own triage and Jira. Ids/values cite `fixtures/prf/performance-remark-test-data.ts`.

## Divergences

_None found._ Update uses the same validator, fields and messages as create; all behave correctly. The
message re-grounding and the structurally-impossible "both selected" case are documented once in
UC-PRF-001's defects.md (Verified — not a defect #1 and #2) and apply here identically.

## Bug / Regression

_None found._

## Coverage gaps

- **URL-tamper / permission-absent edit (ERR-009 notAuthorized) is not testable yet**
  - **What's wrong:** Legacy S11 covered navigating directly to the update URL without the
    `scalerPerformanceRemarkUpdate` permission → notAuthorized page. Not reproducible in this environment.
  - **Expected vs actual:** N/A (not an app defect) — no per-element permission mechanism exists in the new
    app, and LOCAL mock auth authorizes every request as the single role `SCS_SYS_ADMIN`.
  - **How we caught it:** Reconciling S11 against the app (no frontend gate; single-role mock).
  - **Register / classification:** Coverage gap · blocked
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-PRF-002-S11
  - **Status:** OPEN · **Found:** 2026-08-17 — revisit with the coming RBAC rework.
  - **Test:** none (state not reproducible under single-role mock auth).

## Spec gaps

_None._

## Verified — not a defect

- **Update re-grounding is shared with create — see UC-PRF-001 defects.md**
  - **What's wrong:** Nothing. The re-grounded message text (Verified-not-defect #1) and the
    structurally-impossible "both Action and Outcome selected" case (Verified-not-defect #2) are properties of
    the shared `PerformanceRemarksForm` + `validatePerformanceRemarkForm`, so they hold on the edit form too.
    Recorded once in `features/prf/uc-prf-001-record/defects.md` to avoid duplication.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-PRF-002-S05..S10
  - **Status:** verified 2026-08-17
  - **Test:** `features/prf/uc-prf-002-update/validation.feature` (the edit validation outline).
