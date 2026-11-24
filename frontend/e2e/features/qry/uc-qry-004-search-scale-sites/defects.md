# Defects — UC-QRY-004 Search Scale Sites

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

## Divergences

All three divergences below are **log-only** (no `@discovered-divergence` red): each looks like a
**deliberate new-app UX choice**, not a defect, so a red asserting the legacy behaviour would be wrong. They
are recorded for BA/QA to confirm the intent. The green tests assert the app's ACTUAL behaviour.

### Divergence #1 — a single-result scale site search no longer jumps straight to the scale site view
- **What's wrong:** nothing may be wrong — it's a behaviour change. In the old system, searching by an
  exact Scale Site # that matched exactly one site took you **straight to that site's view**. The new app
  instead shows a one-row results list, and you click the Scale Site # to open the site.
- **Expected vs actual:** *Expected* (legacy S02): exactly-one match + non-empty Scale Site # auto-forwards
  to `/scaleSiteView.do`. *Actual*: the single match is listed as one row (Scale Site # links to
  `/scale-sites/view/{id}`).
- **How we caught it:** ground-truthed 2026-07-30 — `GET /api/scale-sites/search?scaleSiteIdNmbr=520`
  returns 1 row; `pages/Queries/ScaleSites/index.tsx doSearch()` always sets results and renders the table
  (no count===1 auto-navigate). The `@S02` green test asserts the 1-row table.
- **Action:** BA/QA to raise a Jira ticket (confirm: is listing the single row intended, or should it
  auto-open the site like the legacy app?).
- **Register / classification:** Divergence · suspected-intentional-change.
- **Severity/Priority:** sev3 / p2
- **UC / Gherkin slice:** UC-QRY-004-S02 — UC-QRY-004-S02
- **Environment / build:** nr-scs commit `3b78fed`; local seeded DB `real-data-seeded-scs-db` (:1525).
- **Data fixture:** `fixtures/qry/qry-scale-site-test-data.ts` (`singleResultScaleSite = 520`).
- **Status:** OPEN. **Found:** 2026-07-30. **Test:** covered by the actual-behaviour green scenario `search.feature` `@S02` (no red — log-only).

### Divergence #2 — the Inspection # is validated client-side and its errors moved off the search form
- **What's wrong:** possibly nothing — a behaviour change. Old system: the Inspection # field was
  permission-gated (`scaleSiteInspectionView`) and a bad/unknown value produced a **server-side field-level
  error on the search form** (`OAValidator.isLong()` failure, or `errors.no.recs` "No records were found.").
  New app: the "OR enter inspection #" accordion is always shown; a **non-numeric** value is rejected
  **client-side** ("Inspection id must be a positive whole number.") with **no request sent**, and an
  **unknown numeric** value navigates nowhere but surfaces the backend 404 message
  ("No scale site inspection found with inspection id N") in a page-level **error notification** rather than
  a field error.
- **Expected vs actual:** *Expected* (legacy S05/S06, ERR-001/ERR-002): field-level errors on the form.
  *Actual*: client-side inline error (non-numeric) + notification (unknown id); the message text also
  differs from the legacy "No records were found."
- **How we caught it:** ground-truthed 2026-07-30 — `doSearch` (inspection mode) validates
  `Number.isInteger(id) && id > 0` before calling `searchScaleSiteInspection`; the `@S05` green test proves
  **zero** lookup calls via the inspection-search spy, and the `@S06` green test asserts the backend
  not-found message in the notification. (Also confirmed by the app's own unit test
  `pages/Queries/ScaleSites/index.browser.test.tsx`.)
- **Action:** BA/QA to raise a Jira ticket (confirm: is client-side validation + notification the intended
  UX, or should errors appear on the field like the legacy app? Confirm the new message wording.)
- **Register / classification:** Divergence · suspected-intentional-change.
- **Severity/Priority:** sev3 / p2
- **UC / Gherkin slice:** UC-QRY-004-S05/S06 — UC-QRY-004-S05
- **Environment / build:** nr-scs commit `3b78fed`; local seeded DB `real-data-seeded-scs-db` (:1525).
- **Data values:** asserted as Gherkin literals in `inspection.feature` (`ABC` for S05, `999999999` for S06 — not fixture exports; provenance is in that feature's S05/S06 comments).
- **Status:** OPEN. **Found:** 2026-07-30. **Test:** both paths covered by actual-behaviour green scenarios `inspection.feature` `@S05` + `@S06` (no red — log-only).

### Divergence #3 — the scale-site NAME search requires the user to type explicit `%` wildcards
- **What's wrong:** likely a UX quirk, not a defect. The Scale Site Name field is a raw SQL `LIKE`
  passthrough — the app does **not** wrap the typed value in wildcards. So typing `TEMBEC` returns
  **nothing**; a user must type `%TEMBEC%` to match "TEMBEC - CANAL FLATS". By contrast, the Scaler search
  (UC-QRY-003) matches on a bare substring (`RATHROCK` finds 3 scalers) — an inconsistency between two
  sibling search screens.
- **Expected vs actual:** *Expected* (usual search UX / legacy "partial match"): typing `TEMBEC` finds sites
  containing "TEMBEC". *Actual*: `?siteName=TEMBEC` → `[]`; `?siteName=%TEMBEC%` → 3 rows (confirmed 2026-07-30).
- **How we caught it:** ground-truthed 2026-07-30 against `GET /api/scale-sites/search`. The `@S01` green
  test uses the real, working value `%TEMBEC%`.
- **Action:** BA/QA to raise a Jira ticket (confirm: should the site-name search auto-wrap the value in `%`
  like the scaler search, for a consistent UX?).
- **Register / classification:** Divergence · suspected-intentional-change.
- **Severity/Priority:** sev4 / p3
- **UC / Gherkin slice:** UC-QRY-004-S01 — UC-QRY-004-S01
- **Environment / build:** nr-scs commit `3b78fed`; local seeded DB `real-data-seeded-scs-db` (:1525).
- **Data fixture:** `fixtures/qry/qry-scale-site-test-data.ts` (`multiResultSiteName = %TEMBEC%`).
- **Status:** OPEN. **Found:** 2026-07-30. **Test:** the working value is asserted green in `search.feature` `@S01` (no red — log-only).

## Coverage gaps

- **Coverage gap #1 — S07 CIMS-not-viewable inspection (ERR-003) — data-blocked**
  - **What's wrong:** nothing in the app. The new app **does** enforce the legacy CIMS-viewability rule:
    `ScaleSiteInspectionService.searchScaleSiteInspection` calls `isInspectionViewableInCims(id)` and returns
    **HTTP 422** ("Inspection N is not viewable in CIMS.") when false — which would surface in the same error
    notification as S06. But covering it needs an inspection that **resolves to exactly one match yet is not
    CIMS-viewable**, and none is discoverable in the current extract: freshly-seeded inspections (site 520)
    ARE viewable, and the raw extract inspection ids couldn't be enumerated to find a non-viewable one.
  - **Register / classification:** Coverage gap · blocked (test env can't reach the state / data-blocked).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `blocked`. Revisit if a non-viewable inspection is
    seeded or discovered. **Found:** 2026-07-30.

- **Coverage gap #2 — S08 permission-gated control hiding (STA-001 / STA-003) — not-applicable / blocked**
  - **What's wrong:** nothing testable. S08 asserts the Inspection # field (STA-001) and the Create Scale
    Site button (STA-003) are **hidden** when the `scaleSiteInspectionView` / `scaleSiteCreate` WebADE
    permissions are denied. The new app renders **both unconditionally** (no per-permission control-gating),
    and permission branches are unreachable under single-role mock auth (`SCS_SYS_ADMIN` only). The controls'
    presence + function ARE covered (inspection accordion via S04/S05/S06; Create Scale Site via S02).
  - **Register / classification:** Coverage gap · not-applicable (no per-permission gating in new app) +
    blocked (mock auth grants only SCS_SYS_ADMIN).
  - **Severity/Priority:** — / p2 · **Status:** OPEN. **Found:** 2026-07-30.

- **Coverage gap #3 — legacy "Back" button — no new-app equivalent (single-page layout)**
  - **What's wrong:** nothing. Legacy S01/S03 end by clicking Back to go from results (P044) to the search
    form (P043). The new app renders form + results on one `/scale-sites` page — no Back button.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only mechanic).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `not-applicable` (permanent). **Found:** 2026-07-30.

- **Coverage gap #4 — sort ordering (primary/secondary) not asserted**
  - **What's wrong:** nothing. The form exposes primary/secondary Sort options (a `SortOptions` control);
    the resulting row ordering is not asserted — only that searches return the right rows. UI nicety, not a
    legacy S01-S08 outcome (slices.md:46,407 explicitly excludes sort-order variation as producing no
    different observable outcome).
  - **Register / classification:** Coverage gap · deferred (UI nicety).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `deferred`. **Found:** 2026-07-30.
