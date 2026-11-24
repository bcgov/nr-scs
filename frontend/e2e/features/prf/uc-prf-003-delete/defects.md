# Defects — UC-PRF-003 Delete Scaler Performance Remark

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).
> BA/QA own triage and Jira. Ids/values cite `fixtures/prf/performance-remark-test-data.ts`.

## Divergences

_None found._ Delete-after-confirm and cancel-keeps-record both behave correctly.

## Bug / Regression

_None found._

## Coverage gaps

- **Session-tombstone-null "LicenceNo not found" (ERR-001) has no equivalent in the stateless new app**
  - **What's wrong:** Legacy S03 covered loading the summary with no scaler tombstone → "LicenceNo not found".
  - **Expected vs actual:** N/A (not an app defect) — the scaler licence is a URL path param, so there is no
    session tombstone to lose.
  - **Register / classification:** Coverage gap · not-applicable (re-ground)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-PRF-003-S03
  - **Status:** OPEN · **Found:** 2026-08-17
  - **Test:** none (legacy session-state mechanic has no new-app equivalent).

- **Permission-gated delete (URL-tamper S04 / hidden controls S05) is not testable yet**
  - **What's wrong:** Legacy S04 (direct-URL delete without permission → notAuthorized) and S05 (Delete/Edit/Add
    buttons hidden without permission) can't be exercised.
  - **Expected vs actual:** N/A (not an app defect) — no per-element permission mechanism exists, and LOCAL
    mock auth authorizes every request as the single role `SCS_SYS_ADMIN`.
  - **How we caught it:** Reconciling S04/S05 against the app (no frontend gate; single-role mock).
  - **Register / classification:** Coverage gap · blocked
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-PRF-003-S04, UC-PRF-003-S05
  - **Status:** OPEN · **Found:** 2026-08-17 — revisit with the coming RBAC rework.
  - **Test:** none (state not reproducible under single-role mock auth).

## Spec gaps

_None._

## Verified — not a defect

- **Delete confirmation re-grounds from a browser `confirm()` to a Carbon Modal (CNF-001 text preserved)**
  - **What's wrong:** Nothing. Legacy delete raised a browser `confirm()` ("Are you sure you want to delete
    this record?") then navigated to `/scalerPerformanceRemarkDelete.do`. The new app renders a Carbon confirm
    `Modal` with the same heading text, a "Confirm Delete" primary and "Cancel" secondary, and calls
    `DELETE /scalers/{lic}/performance-remarks/{id}`. Behaviour (confirm deletes, cancel keeps) is preserved.
  - **Expected vs actual:** Confirm/cancel semantics preserved; only the dialog mechanism changed (native →
    in-app modal). The tests drive the modal buttons, not a `page.on('dialog')` handler.
  - **Register / classification:** Verified — not a defect · suspected-intentional-change (re-ground)
  - **UC / Gherkin slice:** UC-PRF-003-S01 (CNF-001)
  - **Status:** verified 2026-08-17
  - **Test:** `features/prf/uc-prf-003-delete/delete.feature` (S01 confirm, S02 cancel).
