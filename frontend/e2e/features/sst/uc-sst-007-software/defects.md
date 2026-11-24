# Defects — UC-SST-007 Scale Site Software Inventory

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

_No divergences or bugs._ The Software tab is a read-only display and behaves as the (re-grounded) spec
expects for both the has-records and empty states.

## Coverage gaps

- **S03 / S04 — side-menu contents and Search-button permission not automated**
  - **What's wrong (test coverage, not the app):** Legacy S03 (the District-Scaling-Manager side menu
    includes Create/Queries) and S04 (the tombstone Search button is hidden without `scalerSiteSearch`
    permission) are role/permission-gated. Mock auth grants only `SCS_SYS_ADMIN`, so there is no restricted
    actor to observe the hidden/alternate state.
  - **Action:** revisit with the RBAC rework.
  - **Register / classification:** Coverage gap · blocked-by-mock-auth
  - **Status:** OPEN · **Found:** 2026-08-12

- **S05 — legacy session-tombstone-null path has no new-app equivalent**
  - **What's wrong (test coverage):** Legacy S05 asserts an empty list (no error) when the session
    tombstone is null. The new app has no session tombstone — the tab fetches by the route's
    `scaleSiteIdNmbr` — so the observable outcome collapses into the empty-state case already covered by S02.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only mechanic)
  - **Status:** OPEN · **Found:** 2026-08-12
