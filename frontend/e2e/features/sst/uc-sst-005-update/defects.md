# Defects — UC-SST-005 Update Scale Site

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

_No divergences or bugs unique to update._ The edit modal reuses the create validator, so the
negative-coordinate divergence and the concurrent-create PK race are the **same code** already filed under
`uc-sst-004-create/defects.md` (Divergence #1 and the Bug/Regression concurrency note). The seed here goes
through the same create endpoint and is hardened the same way (bounded retry + `@mode:serial`).

## Coverage gaps

- **S10 — district-scoping (Edit Record hidden for out-of-district site) not automated**
  - **What's wrong (test coverage, not the app):** Legacy S10 hides the Edit Record button when the site is
    outside the actor's district (`userHasAccess` false, ERR-011). Under mock auth the single `SCS_SYS_ADMIN`
    role always has access, and the server-side org-unit check is itself deferred in code
    (`ScaleSiteService` carries `// TODO: re-add OrgUnitUserValidator-style access check when the user-role
    model lands`). So there is no out-of-district state to reach.
  - **Action:** revisit with the RBAC rework; then drive a district-scoped session against a site outside it.
  - **Register / classification:** Coverage gap · blocked-by-mock-auth
  - **Status:** OPEN · **Found:** 2026-08-12

- **S11 — no-permission (unauthorized update) path not automated**
  - **What's wrong (test coverage):** Legacy S11 asserts a user lacking the update permission is refused.
    Mock auth grants only `SCS_SYS_ADMIN` (passes `@IsScsEditor`), so the deny branch is unreachable.
  - **Action:** revisit with the RBAC rework (viewer-role session → `PUT /api/scale-sites/{id}` expects 403).
  - **Register / classification:** Coverage gap · blocked-by-mock-auth
  - **Status:** OPEN · **Found:** 2026-08-12

- **S07 / S08 — site contacts covered under UC-SST-006**
  - **What's wrong (test coverage):** The legacy UC folds add-contact (S07) and edit-contact-validation
    (S08) into SST-005. The new app splits contacts into their own tab / UC (Maintain Scale Site Contacts).
  - **Action:** covered under **UC-SST-006** (in progress) — no duplicate coverage here by design.
  - **Register / classification:** Coverage gap · deferred (covered under sibling UC)
  - **Status:** OPEN · **Found:** 2026-08-12

- **S09 — authorized-scaler filter covered under UC-SST-008**
  - **What's wrong (test coverage):** Legacy S09 (Authorized Scalers tab filter) is a separate tab / UC
    (Maintain Assigned Scalers) in the new app.
  - **Action:** covered under **UC-SST-008** (in progress).
  - **Register / classification:** Coverage gap · deferred (covered under sibling UC)
  - **Status:** OPEN · **Found:** 2026-08-12
