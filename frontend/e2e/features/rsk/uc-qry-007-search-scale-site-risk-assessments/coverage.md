# Coverage — UC-QRY-007 Search Risk Assessments (Scale Site subject)

> How this matrix works (statuses, the `not-applicable`/`blocked`/`deferred` rule): [coverage-guide.md](../../../coverage-guide.md).

UC-QRY-007 is a **4-subject** use case (Scaler / Scale Site / Timber Cruise / Waste). This suite covers the
**Scale Site** subject only (route `/scale-site-risk-assessments`, `pages/Queries/ScaleSiteRiskAssessments`).
Scaler is a separate suite (`uc-qry-007-search-scaler-risk-assessments`); Timber Cruise and Waste are
**descoped** (see Coverage gaps). Source: the `.feature` slices under `UC-QRY-007/gherkin/` +
`UC-QRY-007-slices.md` + `UC-QRY-007-technical.md`, reconciled against the new app's read path
`GET /api/scale-site-risk-assessments/search`. Search values are pinned in
`fixtures/rsk/scale-site-risk-assessment-test-data.ts` (ground-truthed 2026-08-11 against the live endpoint)
and re-verified once per run in `preflight/anchors.setup.ts`.

**EXTRACT SHAPE — this scale-site extract is THIN (9 rows, all Level=High, all incomplete, all on distinct
sites).** Three arms the scaler twin runs therefore have NO scale-site data and are logged as *data* gaps
(not app defects) below, not authored as scenarios: Level-single-match, client-side pagination (>10 rows),
and Complete=Yes.

| Source item | Source | New-app enforcement | Scenario (tags) | Status | Gap/Defect |
|---|---|---|---|---|---|
| S02 Scale-site search happy path — single criterion returns matching rows | S02.feature; slices.md | `GET /scale-site-risk-assessments/search?<param>` | `search.feature` Outline `@S02 @p0` (Assessment ID, Scale Site #, Site Name) | covered | — |
| INF-001 "Result List: {N} records" count | slices.md | `TableResource.__total` | `search.feature` `@S02 @p0` (`should show N records`) | covered | — |
| S02 results table columns render (11 cols) | index.tsx `TABLE_HEADERS` | `TableResource` headers | `search.feature` `@S02 @p1` (columns) | covered | — |
| S02 row cell-data mapping (rating/max, responses/questions, level, range, ver, scale site, site name, reg/dist, owner) | index.tsx cell composition | composed client-side | `search.feature` `@S02 @p1` (cell data for 1822) | covered | Site Type (methodTypeCodeName) is null for 1822 — not asserted (Coverage gap #5) |
| Level (risk type) dropdown filter | slices.md | `riskTypeCode` param | `search.feature` `@S02 @p0` (Level = High → lists 1822, ≥ 9) | covered | count asserted as ≥ 9, not = 9 — the whole-extract High count is exposed to parallel create-seeds on the shared DB (defects.md "Parallel create-seed hazard"); exact-9 pinned by preflight on a quiescent DB |
| Scale Site # text filter | slices.md | `scaleSiteIdNmbr` param | `search.feature` Outline `@S02 @p0` (614 → 1) | covered | — |
| Assessment ID text filter | slices.md | `riskQuestionnaireId` param | `search.feature` Outline `@S02 @p0` (1822 → 1) | covered | — |
| Scale Site Name text filter (exact-unless-`%`) | slices.md | `siteName` param | `search.feature` Outline `@S02 @p0` (`WELDWOOD%` → 2) | covered | — |
| Multi-criteria search — filters combine (AND), no field-clobber | S02 (enters several fields); index.tsx:277-297 (`doSearch` packs all filters into one params object) | `doSearch` params object | `search.feature` `@S02 @p0` (Assessment ID `18%` ∩ Site Name `WELDWOOD%` → 1822, 1) | covered | intersection is a proper subset of BOTH operands (6 and 2), so a clobber in either direction is caught |
| Wildcard / partial matching — trailing `%` matches by prefix | endpoint spec (`scs_risk_scsite_vw_pkg.search_recs`) | `riskQuestionnaireId` passed to SP `LIKE` | `search.feature` `@S02 @p1` (`18%` → 6) | covered | see defects.md on the imprecise "partial matching" wording |
| Exact match — a bare (unwildcarded) value is not a substring | ground-truth 2026-08-11 (`?riskQuestionnaireId=18` → []) | `riskQuestionnaireId` exact-unless-`%` | `search.feature` `@S02 @p1` (bare `18` → no results) | covered | — |
| Sort options (primary/secondary ordering) — legacy server behaviour | slices.md; spec | `primarySort`/`secondarySort` params (legacy sort codes) | `search.feature` `@S02 @p1` (primary Site Name / secondary Assessment ID → [1850,1846,1844,1848,1861,1822]) | covered | Level cannot be the sort key here (all rows High) — Site Name is used instead |
| Result Assessment ID link + Scale Site # link | slices.md (STA-001/002) | single unconditional view links (`/scale-site-risk-assessments/view/{id}`, `/scale-sites/view/{no}`) | `search.feature` `@S02 @p1` (links) | covered | legacy permission gate dropped — single role (Coverage gap #3) |
| Blank submit → unfiltered browse-all | S02 "None — no server-side validation" | `doSearch` fires all-`undefined` | `search.feature` `@S02 @p2` (no filters) | covered | — |
| Reset clears form + results | new-app control (`handleReset`) | resets to initial state | `search.feature` `@S02 @p2` (Reset) | covered | — |
| S05 zero results → "No results" empty state | S05.feature; slices.md | `TableResource` `totalElements===0` → EmptySection "No results" | `zero-results.feature` `@S05 @p1` | covered | INF-001 "0 records" count line dropped — re-grounded to "No results" |
| MSG-001 "Choose your search parameters." on page load | S02.feature; `search.choose.params` | filter-accordion heading (index.tsx:349) | `search.feature` `@S02 @p2 @MSG-001` | covered | — |
| Server-error state ("Search failed" notification) | index.tsx `serverError` / `searchMutation.isError` | InlineNotification | `search.feature` `@S02 @p1` (search endpoint faulted 500 via `route.fulfill`) | covered | — |
| Dropdown-LOV load failure ("Could not load dropdown options") | index.tsx `lovError` | InlineNotification | `search.feature` `@S02 @p1` (static-lov faulted 500) | covered | — |
| Level single-result filter | S02 (scaler twin: Level Medium → 1) | `riskTypeCode` param | — | not-yet (data) | Coverage gap #1 — extract is uniformly High; no M/L rows to resolve a single match |
| Result-set pagination — client-side 10/page | index.tsx:249-260 (fetch-all then `slice`) | client-side slice | — | not-yet (data) | Coverage gap #2 — largest groundable set is 9 (< 10/page); no >1-page filter exists |
| Complete (Y/N) dropdown filter | slices.md | `completeInd` param | — | not-yet (data) | Coverage gap #4 — every extracted assessment is incomplete (`completeInd=Y` → []) |
| Reg/Dist filter (DistrictSelect) | slices.md | `orgUnitNo` param | `filter-widgets.feature` `@S02 @p2` (South Island 1619 → 3, incl. 1861) | covered | Coverage gap #6 (CLOSED) |
| Site Owner (Client / Loc) filter (ClientLocSearch) — `ownerClientNumber` | slices.md | `ownerClientNumber` param | `filter-widgets.feature` `@S02 @p2` (owner 00055821 → 1, = 1822) — type-in path | covered | Coverage gap #6 (picker-MODAL writeback still deferred) |
| Site Owner Loc sub-filter — `ownerClientLocnCode` | index.tsx:290-291 (`doSearch` sends it alongside the client number) | `ownerClientLocnCode` param | — | not-yet | Coverage gap #6 — the type-in scenario leaves the Loc box `''`, so this LIVE param is never populated (unlike the scaler page's genuinely-dead `clientLocnCode`, defects.md Bug #1). Untested, not covered. |
| Site Type filter (ActiveMultiSelect `methodTypes`) | slices.md | `methodTypes` param | `filter-widgets.feature` `@S02 @p2` (Piece Scale `P` → 1, = 1861) | covered | Coverage gap #6 (CLOSED) |
| S03 Timber Cruise / S04 Waste subjects | S03/S04.feature | — | — | not-applicable | Coverage gap #7 (descoped — do not build) |
| Permission-gated edit-vs-display links / not-authorized | S08/S09.feature; slices.md | no permission gate — one view link; whole portal gated on `SCS_SYS_ADMIN` | — | blocked | Coverage gap #3 (single-role / RBAC deferred; mock auth) |
| Persisted filters/paging + params replayed on remount | index.tsx `usePersistentState` (filters/sort/paging/`lastSearchParams`) + mount effect re-fetch | new-app nicety | `persistence.feature` `@S02 @p2` (search 1822 → client-side nav away + back → filter restored, count reappears via replayed params) | covered | Coverage gap #8 (CLOSED). Result ROWS are NOT persisted — re-fetched on mount (index.tsx "Result rows are ephemeral"); the scenario has teeth on the params store, none on a results store (there is none). |

**Status values:** `covered` · `not-yet (data)` (no matching rows in this extract) · `deferred` (now only
the `ClientLocSearch` picker-modal writeback — the three filter widgets and the persistence nicety were
covered 2026-08-20 by `filter-widgets.feature` / `persistence.feature`) · `not-applicable` (descoped
subject) · `blocked` (env/auth). No `@discovered-*` divergences found in this suite — it is expected all-green.

**Symmetry vs the scaler suite:** every scaler-search scenario has a scale-site twin here EXCEPT the three
data gaps above (Level single-match, client-side paging, Complete=Yes), which the thin scale-site extract
cannot supply. The scale-site suite adds nothing the scaler suite lacks; it re-proves the shared search
mechanics on the separate scale-site page/branch/endpoint.
