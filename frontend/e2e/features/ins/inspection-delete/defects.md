# Defects — Delete Site Inspection (app-only)

> How this log works, and what each register and tag means: [defects-guide.md](../../../defects-guide.md)

**Nothing is wrong with the app.** Every scenario in this suite is a normal green assertion — no
divergences, no bugs, no `@discovered-*` reds. The two entries below are a **coverage gap** (something
we have not tested, and where it belongs) and a **housekeeping note** about stray test data.

## Coverage gaps

### CG-1 — nobody checks that the Delete button is hidden from roles that may not delete

- **What's wrong:** Nothing is wrong in the app — this is a hole in our *tests*. The inspection view's
  **Delete** button (and the **Edit Record** button beside it) is only supposed to appear for users whose
  role allows deleting. We have never actually checked that it disappears for the other roles.
  - **Expected vs actual:** We would expect a test somewhere to open an inspection as a restricted user
    and confirm the Delete button is absent. Instead: the *server* refusal is well covered, and the
    *page* is confirmed reachable per role, but the **button itself** is never looked at for any role.
  - **How we caught it:** While writing this suite (2026-09-09) we tried to record "covered elsewhere"
    for that row and checked whether it was true. The per-role write-control sweep is driven by a fixed
    list in `fixtures/security/role-columns.ts`, and that list only contains controls on the **scaler**
    and **scale site** record tabs (e.g. `{ record: 'site', tab: 'Inspections', control: 'Add Inspection' }`).
    The Delete and Edit Record buttons live one level deeper, on the inspection *view* page, which no
    role suite ever opens for a control sweep. So the claim would have been false.
  - **Why (technical):** `pages/View/ScaleSiteInspection/index.tsx:263-292` wraps each action in a
    `PermissionGate` (`SCALE_SITE_INSPECTION_UPDATE` at :263 for Edit Record, `REPORT_READ` at :275 for
    Send / View Report, `SCALE_SITE_INSPECTION_DELETE` at :287 for Delete). That gating has no test at any level. The
    endpoint side *is* proven — `features/security/check-scaler-role/api-access.feature` has "Deleting a
    site inspection is refused and the record survives" — so the risk is a **cosmetic leak** (a button
    offered that then fails), not unauthorized deletion.
  - **Recommended next step:** add the inspection view to a role suite's control sweep — open a seeded
    inspection as a restricted role (e.g. `CET`, which the client's 2026-09-02 statement makes read-only
    everywhere) and assert `Edit Record` and `Delete` are absent, paired with an administrator on the
    same page for contrast. It belongs in `features/security/`, not here: this suite deliberately runs as
    the administrator and asserts delete *behaviour*, not entitlement.
  - **Register / classification:** Coverage gap · not-an-app-defect (test-coverage hole)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** none — app-only capability; the nearest legacy reference is UC-INS-002's
    `-slices.md` S04 control matrix, which names a permission-gated "Delete" control but drives no scenario.
  - **Environment / build:** nr-scs `main` @ `53221c5`, local seeded Docker DB (`DBDOCK_01`)
  - **Data fixture:** `fixtures/ins/ins-test-data.ts` (seeded inspection on the happy-path site)
  - **Status:** OPEN · **Found:** 2026-09-09
  - **Test:** none yet — see "Recommended next step". Also recorded as Coverage gap #1 in this suite's
    [`coverage.md`](./coverage.md) and as Coverage gap #4 in
    [`../inspection-edit/coverage.md`](../inspection-edit/coverage.md).

## Verified — not a defect

### VN-1 — a stray inspection row from a July test run is still in the seeded DB

- **What's wrong:** Nothing in the app, and nothing this suite did. While confirming that these new
  tests leave the database exactly as they found it, we found **one** leftover inspection row created by
  an **earlier** test run (23 July 2026), which was never cleaned up.
  - **Expected vs actual:** Expected: after a test run, the database holds no test-created inspections.
    Actual: exactly one row remains — inspection id **97** on the happy-path site, comment
    *"e2e site inspection create"*, entered 2026-07-23 by `IDIR\DEARLES`.
  - **How we caught it:** After the parallel stress run of this suite (80 scenario executions, all
    green), a direct DB check for test-created rows —
    `select count(*) from the.scale_inspection_report where comments_text like 'e2e%' or comments_text
    like 'probe%'` — returned 1. The comment text identifies it as **UC-INS-001's create happy path**
    (`inspectionHappyPath.comments`), not this suite (which uses *"e2e edited inspection"* and
    *"e2e seeded inspection (view/delete)"*). Both new suites left **zero** residue.
  - **Why (technical):** `steps/ins/create.steps.ts:43-48` registers the new id for teardown only inside
    the `Then` step that reads it back off the redirect URL. If a create scenario fails *before* that
    step — e.g. the redirect assertion times out — the row is created but never registered, so teardown
    never sees it. This is the cleanup blind spot the authoring guide warns about.
  - **Recommended next step:** two small, independent items, both outside this suite's scope:
    (1) delete row 97 (it is unreferenced — no fixture, preflight anchor or step cites it — so removing
    it simply restores the pre-test baseline); and (2) harden UC-INS-001 so the id is registered as soon
    as it exists rather than after the redirect assertion.
  - **Register / classification:** Verified — not a defect · test-data housekeeping
  - **Severity/Priority:** sev3 / p2
  - **Environment / build:** nr-scs `main` @ `53221c5`, local seeded Docker DB (`DBDOCK_01`)
  - **Status:** OPEN (housekeeping — needs a human decision to delete real DB state) · **Found:** 2026-09-09
  - **Test:** n/a — found by a DB residue check, not by a scenario.
