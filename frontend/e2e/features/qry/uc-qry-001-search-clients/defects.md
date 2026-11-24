# Defects — UC-QRY-001 Search Clients

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

## Divergences

### Divergence #1 — an empty client search runs an unfiltered full-table query instead of being rejected
- **What's wrong:** on the Client Search screen you can click **Search** with every field left blank, and
  the app runs the search anyway and lists the entire client table. The old system deliberately blocked
  this — it made you enter at least one search value first.
- **Expected vs actual:** *Expected* (legacy rule ERR-001): with all fields blank, no search runs and the
  message "Please provide some search criteria." is shown. *Actual*: the search runs and returns the full
  client list (first row `00000001 / 00`), with no message.
- **How we caught it:** ground-truthed against the live backend on 2026-07-23 —
  `GET /api/clients/search` with **no parameters** returns **HTTP 200** and the complete client list.
- **Why (technical, optional):** neither layer enforces the legacy `ClientVwDto.checkNullable()` guard —
  `pages/Queries/Client/index.tsx` `doSearch()` builds params with every field `undefined` and fires the
  request; `ClientController → ClientService → ClientRepository.searchClients` passes straight through to
  SP `scs_client_vw_pkg` with all-null criteria. Performance risk: an unbounded client-table scan.
- **Resolution:** REVIEWED AND ACCEPTED as an intentional product change — "blank = browse all" is the
  intended new-app behaviour; the legacy ERR-001 blank-guard is deliberately not carried forward. No app
  change required. (Performance note above left for BA/PO to weigh if the full-table scan becomes a concern.)
- **Register / classification:** Divergence · accepted-intentional-change (legacy business rule
  intentionally dropped).
- **Severity/Priority:** sev3 / p3
- **UC / Gherkin slice:** UC-QRY-001-S02 — UC-QRY-001-S02
- **Environment / build:** commit `760fdda` (+ untracked QRY e2e work), branch `dev/erik`; local seeded DB `real-data-seeded-scs-db` (:1525), frontend :3000 / backend :8080 (mock auth).
- **Data values:** asserted as a Gherkin literal in `validation.feature` (`00000001 / 00`, the unfiltered-list first row — not a fixture export).
- **Status:** ACCEPTED (log-only). **Found:** 2026-07-23. **Accepted:** 2026-07-31.
- **Test:** `features/qry/uc-qry-001-search-clients/validation.feature` (`@S02 @ERR-001`) now asserts the ACTUAL new-app behaviour (a request fires and the full list renders) — GREEN, no longer `@discovered-divergence`.

## Coverage gaps

- **Legacy "Back" button — no new-app equivalent (single-page layout)**
  - **What's wrong:** nothing is wrong. Legacy S01/S03/S04 each end by clicking a **Back** button to
    return from the results screen (P004) to the search screen (P003). The new app renders the form and
    results on ONE page (`/client`), so there is no Back button and nothing to test.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only mechanic).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `not-applicable` (permanent). **Found:** 2026-07-23.

- **Max 5,000-record threshold + warning (ERR-002 `message.maxrecs`) — no new-app equivalent, not reproducible**
  - **What's wrong:** nothing testable. Legacy S03 warns when a search returns exactly 5,000 rows
    (`ClientSearchAction` `readResults.size()==5000`). The new app has no such cap or warning banner, and
    even if it did, reproducing it needs a criterion matching 5,000+ real clients — not available/stable
    in the extract, and the DB is immutable.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only + not reproducible).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `not-applicable`. **Found:** 2026-07-23.

- **CIMS unreachable → CIMSException (S05) — not browser-reproducible**
  - **What's wrong:** nothing testable from the browser. S05 requires the CIMS Oracle stored procedure /
    client view to be **unavailable**. We cannot take the SP down (the DB is immutable, and the seeded
    container serves it), so the exception path can't be driven in an E2E test. (The app does have an
    error state — `mutation.isError` — but its trigger isn't reachable here; it belongs to a backend
    integration/unit test with a mocked DAO.)
  - **Register / classification:** Coverage gap · blocked (env — un-triggerable dependency).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `blocked`. Revisit if a CIMS-fault harness exists. **Found:** 2026-07-23.

- **Sort ordering (primary/secondary) not asserted**
  - **What's wrong:** nothing is wrong. The form exposes primary/secondary **Sort** options (a new-app
    `SortOptions` control; the legacy form carried the same primarySort/secondarySort params). The result
    **ordering** those produce is not asserted — only that searches return the right rows. A UI nicety,
    not a legacy S01-S05 requirement.
  - **Register / classification:** Coverage gap · deferred (UI nicety, low value).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `deferred`. **Found:** 2026-07-23.

- **Role gating (District Scaling Manager) — blocked by mock auth**
  - **What's wrong:** nothing testable today. Every legacy slice gates this screen on
    `UserRole.isDistrictScalingManager`. Mock auth grants only `SCS_SYS_ADMIN`, so the role branch is
    unreachable from the browser. The screen is fully exercised under the single available role.
  - **Register / classification:** Coverage gap · blocked (mock auth grants only SCS_SYS_ADMIN).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `blocked`. Revisit with multi-role auth. **Found:** 2026-07-23.
