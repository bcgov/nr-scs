# Defects — UC-SST-008 Maintain Scale Site Assigned Scalers

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

_No divergences or bugs._ The Authorized Scalers tab is a read-only list with a client-side status filter
and behaves as the (re-grounded) spec expects.

## Coverage gaps

- **S04 / S06 — permission-gated controls and not-authorized page not automated**
  - **What's wrong (test coverage, not the app):** Legacy S04 (the "Add Authorization" button is hidden
    without `scalerAuthorizationCreate`) and S06 (direct URL access without the required role yields a
    not-authorized page) are role/permission-gated. Mock auth grants only `SCS_SYS_ADMIN`, so the restricted
    state is unreachable.
  - **Action:** revisit with the RBAC rework.
  - **Register / classification:** Coverage gap · blocked-by-mock-auth
  - **Status:** OPEN · **Found:** 2026-08-12

- **Cross-status non-empty filtering limited by the extract data**
  - **What's wrong (test coverage):** Every authorized scaler in the current extract has status "Expired",
    so filtering to Active/Cancelled empties the list. The filter is proven both ways (present status keeps
    rows — S02; absent status empties — S03), but a filter that switches between two *populated* statuses
    can't be demonstrated until the data carries other statuses.
  - **Action:** re-verify on any DB re-extract; add a mixed-status assertion if the data gains Active/Cancelled rows.
  - **Register / classification:** Coverage gap · not-applicable (data-limited, re-verify on re-extract)
  - **Status:** OPEN · **Found:** 2026-08-12

- **S05 — legacy list-param validator has no new-app equivalent**
  - **What's wrong (test coverage):** Legacy S05 exercises `ScaleSiteScalersVwValidator` on submitted list
    parameters (blank scaleSiteIdNmbr, field lengths, dates). The new tab has no submitted form — it GETs by
    the route's scaleSiteIdNmbr — so there is no user-submitted data to validate on this screen.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only mechanic)
  - **Status:** OPEN · **Found:** 2026-08-12
