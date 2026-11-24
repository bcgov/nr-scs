# Defects — UC-SST-006 Maintain Scale Site Contacts

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

_No divergences or bugs found._ The contact CRUD behaves as the (re-grounded) spec expects. The one
notable app behaviour — the client-contact search hard-filtering `bus_contact_code = 'SI'` so only
site-information contacts are attachable — is intentional (the legacy CIMS lookup is scoped to SI
contacts) and is handled by pinning an SI contact; it is **not** a defect (recorded in coverage.md's
test-data note).

## Coverage gaps

- **S03 — CIMS client-contact search modal not automated**
  - **What's wrong (test coverage, not the app):** The create form can populate the Client Contact ID via
    a Search modal (`ContactSearchModal`, `GET /client-contacts/search`). The tests enter the id directly
    (both paths converge on the same create), so the modal's search/select UI is not exercised.
  - **Action:** add a scenario that opens Search, queries by the owner client, and selects a row — once a
    client with resolvable SI contacts under the seeded owner is pinned.
  - **Register / classification:** Coverage gap · deferred
  - **Status:** OPEN · **Found:** 2026-08-12

- **S08 — reset on the UPDATE form not automated**
  - **What's wrong (test coverage):** Reset is covered on the create form (S07); the edit form's Reset
    (`ContactsEdit.handleReset`, re-seeds from the loaded contact) is the analogous mirror and is not
    separately asserted.
  - **Register / classification:** Coverage gap · deferred (low value — same handler shape as create-reset)
  - **Status:** OPEN · **Found:** 2026-08-12

- **Server-side conflict / existence paths not automated**
  - **What's wrong (test coverage):** Three server rules are not driven end-to-end: `clientContactExists`
    404 (a numeric-but-unknown / non-SI id), primary-uniqueness 409 (the "Add Primary Contact" button is
    **disabled** once a primary exists — STA-008 — so the 409 is unreachable through normal UI), and
    duplicate-contact 409 (same contact added twice). The client-side validator + the disabled-button
    gating are the reachable surface and are covered.
  - **Action:** optionally add API-level assertions for the 404/409 rejects, and a UI assertion that "Add
    Primary Contact" is disabled when a primary exists.
  - **Register / classification:** Coverage gap · deferred
  - **Status:** OPEN · **Found:** 2026-08-12

- **S12 — permission-gated controls (restricted actor) not automated**
  - **What's wrong (test coverage):** Legacy S12 hides Add/Edit/Delete for an actor lacking
    `contactCreate/Update/Delete`. Mock auth grants only `SCS_SYS_ADMIN` (passes `@IsScsEditor`), so the
    restricted state is unreachable.
  - **Action:** revisit with the RBAC rework.
  - **Register / classification:** Coverage gap · blocked-by-mock-auth
  - **Status:** OPEN · **Found:** 2026-08-12
