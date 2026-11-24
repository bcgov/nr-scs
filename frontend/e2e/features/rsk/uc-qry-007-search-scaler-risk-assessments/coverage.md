# Coverage — UC-QRY-007 Search Risk Assessments (Scaler subject)

> How this matrix works (statuses, the `not-applicable`/`blocked`/`deferred` rule): [coverage-guide.md](../../../coverage-guide.md).

UC-QRY-007 is a **4-subject** use case (Scaler / Scale Site / Timber Cruise / Waste). This suite covers the
**Scaler** subject only (route `/scaler-risk-assessments`, `pages/Queries/ScalerRiskAssessments`). Scale
Site is a separate page/branch; Timber Cruise and Waste are **descoped** (see Coverage gaps). Source: the
`.feature` slices under `UC-QRY-007/gherkin/` + `UC-QRY-007-slices.md` + `UC-QRY-007-technical.md`, reconciled
against the new app's read path `GET /api/scaler-risk-assessments/search`.

| Source item | Source | New-app enforcement | Scenario (tags) | Status | Gap/Defect |
|---|---|---|---|---|---|
| S01 Scaler search happy path — single criterion returns matching rows | S01.feature; slices.md:51-101 | `GET /scaler-risk-assessments/search?<param>` | `search.feature` Outline `@S01 @p0` (Assessment ID, Licence #, Level) | covered | — |
| INF-001 "Result List: {N} records" count | slices.md:79 | `TableResource.__total` | `search.feature` `@S01 @p0` (`should show N records`) | covered | — |
| S01 results table columns render (10 cols) | slices.md controls; index.tsx `TABLE_HEADERS` | `TableResource` headers | `search.feature` `@S01 @p1` (columns) | covered | — |
| S01 row cell-data mapping (rating/max, responses/questions, level, range, ver, licence, scaler, reg/dist, client) | index.tsx cell composition | composed client-side | `search.feature` `@S01 @p1` (cell data for 723) | covered | — |
| Level (risk type) dropdown filter | slices.md:71 | `riskTypeCode` param | `search.feature` Outline `@S01 @p0` (Level = Medium) | covered | — |
| Licence # text filter | slices.md:73 | `scalerLicenceNo` param | `search.feature` Outline `@S01 @p0` (9710 → 5) | covered | — |
| Assessment ID text filter | slices.md:70 | `riskQuestionnaireId` param | `search.feature` Outline `@S01 @p0` (723 → 1) | covered | — |
| Multi-criteria search — filters combine (AND), no field-clobber | S01.feature (S01 enters several fields at once); index.tsx:287-297 (`doSearch` packs all filters into one params object) | `doSearch` params object | `search.feature` `@S01 @p0` (Licence 9710 + Level Medium → 723, 1) | covered | — |
| Wildcard / partial matching — trailing `%` matches by prefix | endpoint spec scaler-risk-assessments-search.yaml:10,17 (`scs_risk_scaler_vw_pkg.search_recs`) | `riskQuestionnaireId` passed to SP `LIKE` | `search.feature` `@S01 @p1` (`72%` → 723) | covered | defects.md "Verified — not a defect" (semantics) + open question (wording) |
| Exact match — a bare (unwildcarded) value is not a substring | ground-truth 2026-08-04 (`?riskQuestionnaireId=72` → []) | `riskQuestionnaireId` exact-unless-`%` | `search.feature` `@S01 @p1` (bare `72` → no results) | covered | defects.md "Verified — not a defect" (semantics) |
| Result-set pagination — client-side 10/page; count = full match total | index.tsx:246-259 (fetch-all then `slice`); TableResource `Pagination` | client-side slice | `search.feature` `@S01 @p1` (Level High → 14 total, page 1 = 10 rows, page 2 = 4 rows) | covered | — |
| Complete (Y/N) dropdown filter | slices.md:72 | `completeInd` param | — (mechanism identical to Level; but no completed record exists) | covered (symmetry) | defects.md Coverage gap #6 (data: `completeInd=Y` → []) |
| Licence Type dropdown filter | slices.md:76 | `scalerLicenceTypeCode` param | — (same `handleInputChange` → same params object as Level; params-object integrity now directly proven by the multi-criteria arm) | covered (symmetry) | — |
| Reg/Dist filter (DistrictSelect) | slices.md:74 | `orgUnitNo` param | `filter-widgets.feature` `@S01 @p2` (Selkirk 1902 → 9, incl. 723) | covered | defects.md Coverage gap #7 (CLOSED) |
| Scaler (Client / Loc) filter (ClientLocSearch) — Client # half | slices.md:75 | `clientNumber` param | `filter-widgets.feature` `@S01 @p2` (client 00047212 → 5, incl. 723) — type-in path | covered | defects.md Coverage gap #7 (picker-MODAL writeback still deferred) |
| Scaler (Client / Loc) filter — "/ Loc" half (`clientLocnCode`) | slices.md:75 | **dead input** — collected (default `00`) but omitted from `doSearch` (index.tsx:293); not in the params type or endpoint spec | — (logged bug; test pending BA/QA) | deferred | defects.md **Bug #1** (dead loc input) |
| Client-restricted actor → Scaler (Client/Loc) auto-filled + read-only (`isRestrictUserToClient`) | technical.md:77,247 (`RiskSearchAction.java:234`, `scalerRiskSearch.jsp:54`) | **not implemented** — ClientLocSearch always editable; `isRestrictUserToClient` absent repo-wide | — (no RED test: single-role can't produce a restricted actor) | divergence | defects.md Divergence #1 (access-control) |
| Field length caps — Assessment ID/Licence # size 12, Client # maxlength 12, Client Loc maxlength 4 | technical.md:72-78 (`scalerRiskSearch.jsp`) | **not enforced** — TextInputs carry no `maxLength` (index.tsx:360-410) | — (logged for parity; not asserted) | divergence | defects.md Divergence #3 |
| Result Assessment ID link + Licence # link | slices.md:87-88 (STA-001/002) | single unconditional view link (`/scaler-risk-assessments/view/{id}`, `/scalers/view/{no}`) | `search.feature` `@S01 @p1` (links) | covered (re-grounded) | defects.md Coverage gap #3 (legacy permission gate dropped — single role) |
| Blank submit → unfiltered browse-all | S01 Relevant Fields "None — no server-side validation" | `doSearch` fires all-`undefined` | `search.feature` `@S01 @p2` (no filters) | covered | — |
| Reset clears form + results | new-app control (`handleReset`) | resets to initial state | `search.feature` `@S01 @p2` (Reset) | covered | — |
| S05 zero results → "No results" empty state | S05.feature; slices.md:272-312 | `TableResource` `totalElements===0` → EmptySection "No results" | `zero-results.feature` `@S05 @p1` | covered (re-grounded) | defects.md Divergence #2 (INF-001 "0 records" count line dropped — re-grounded to "No results") |
| S02 Scale Site subject search | S02.feature | separate page `ScaleSiteRiskAssessments` | — | not-yet | defects.md Coverage gap #1 (separate branch) |
| S03 Timber Cruise / S04 Waste / S06 / S07 | S03/S04/S06/S07.feature | — | — | not-applicable | defects.md Coverage gap #2 (descoped — do not build) |
| S08 permission-gated edit-vs-display links | S08.feature; slices.md:400-443 | no permission gate — one view link | — | blocked | defects.md Coverage gap #3 (single-role / RBAC deferred) |
| S09 not-authorized access | S09.feature; slices.md:447-483 | whole portal gated on `SCS_SYS_ADMIN` | — | blocked | defects.md Coverage gap #4 (mock auth) |
| Sort options (primary/secondary ordering) — legacy server behaviour | slices.md:77; S01 (`searchScalerAssessments(searchDto, primarySort, secondarySort)`); spec :78-111 | `primarySort`/`secondarySort` params (legacy sort codes) | `search.feature` `@S01 @p1` (primary Level / secondary Assessment ID → [1144,1224,1341,1226,723]) | covered | defects.md Coverage gap #8 (CLOSED) |
| MSG-001 "Choose your search parameters." on page load | S01.feature; `search.choose.params` | filter-accordion heading (index.tsx:354) | `search.feature` `@S01 @p2 @MSG-001` | covered (re-grounded) | — |
| Persisted filters/paging + params replayed on remount | index.tsx `usePersistentState` (filters/sort/paging/`lastSearchParams`) + mount effect re-fetch | new-app nicety | `persistence.feature` `@S01 @p2` (search 723 → client-side nav away + back → filter restored, count reappears via replayed params) | covered | defects.md Coverage gap #9 (CLOSED). Result ROWS are NOT persisted — re-fetched on mount (index.tsx "Result rows are ephemeral"); teeth on the params store, none on a results store (there is none). |
| Server-error state ("Search failed" notification) | index.tsx `serverError` / `searchMutation.isError` | InlineNotification | `search.feature` `@S01 @p1` (search endpoint faulted 500 via `route.fulfill`) | covered | defects.md Coverage gap #10 (CLOSED) |
| LOV-load error state ("Could not load dropdown options") | index.tsx `lovError` | InlineNotification | `search.feature` `@S01 @p1` (static-lov faulted 500 via `route.fulfill`) | covered | defects.md Coverage gap #10 (CLOSED) |
| Page breadcrumb link target | index.tsx:315 (`PageTitle` breadCrumbs) | Inert text — no `path`, so `PageTitle` renders a plain span (matches sibling query pages) | `RiskAssessmentSearchLayout.unit.test.tsx` — "renders the current-page breadcrumb as plain text, not a link" | covered | defects.md **Bug #2** FIXED 2026-09-16 (same fix on ScaleSiteRiskAssessments:304) |

**Role / permission coverage:** **blocked by mock auth.** Legacy gates this screen on the District Scaling
Manager role and gates the Assessment-ID link target on the `scalerAssessment` permission (STA-001 edit vs
STA-002 display). Mock auth grants only `SCS_SYS_ADMIN`, so neither the role branch (S09) nor the
edit/display permission split (S08) is reachable; the new app renders a single unconditional view link,
which **is** asserted. Legacy also **restricted a client-scoped actor** to their own client via
`isRestrictUserToClient()` (Scaler filter auto-filled + read-only) — that logic is **absent** from the new
app (logged as **Divergence #1**, access-control), and is likewise unreachable under single-role mock auth.
Revisit all three with the coming RBAC rework.

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`blocked`/`deferred`):** the
eligible items (S01 search + 3 filter arms, **multi-criteria intersection, wildcard vs. exact matching,
client-side result-set pagination, primary/secondary sort order, MSG-001 heading, "Search failed" +
"Could not load dropdown options" error states**, columns, cell data, count, result links, blank
browse-all, Reset, S05 zero-results) are all covered — **requirement-behaviour coverage P0 100% · P1
100%.** The two filter-WIDGET arms (Reg/Dist DistrictSelect, Scaler Client # via ClientLocSearch) and the
persisted-filters-restored-across-navigation nicety — all previously `deferred` — are now `covered` too
(`filter-widgets.feature` / `persistence.feature`, added 2026-08-20; anchors drift-guarded in preflight).
Excluded: Scale Site (separate branch), Timber Cruise/Waste (descoped), S08/S09 (single-role), and the
ClientLocSearch **picker-modal writeback** (still deferred — the type-in path that proves `clientNumber`
wiring IS covered).

**Open items on top of that (not "covered"):** of the two **bugs** surfaced at the 2026-08-05 PR review,
Bug #1 (dead "/ Loc" input) is still logged and `deferred` (no reproducing test yet, pending BA/QA triage →
Jira); Bug #2 (breadcrumb → 404) was **fixed 2026-09-16** and its row is now `covered` by a unit
regression. Three **Divergences** from legacy remain (#1 client-restriction absent — also `blocked` by
single-role; #2 zero-count line dropped — accepted re-ground, green; #3 field-caps dropped).
So "100%" describes *requirement behaviours exercised*, **not** a clean bill of health — the register above
has 1 open bug + 3 divergences to adjudicate.

> **Correction (2026-08-05, PR review).** Earlier revisions of this matrix reported the same 100% while
> *leaving core behaviours out of the denominator*, in two waves:
> - **Wave 1** — multi-criteria search (every arm submitted one filter, so a param-clobber bug was
>   invisible), wildcard/partial matching (untested; `9710 → 5` can't tell exact from partial), and
>   result-set **paging** (fetch-all + client-side 10/page slice — folded into the "persisted
>   filters/paging" *nicety* in gap #9 and thereby mis-deferred).
> - **Wave 2** — **sort ordering** (mis-labelled a "UI nicety" in gap #8, but it is legacy *server*
>   behaviour: legacy S01 picks a Primary Sort and `searchScalerAssessments(…, primarySort, secondarySort)`
>   passes the legacy codes to the API); **MSG-001** ("Choose your search parameters.") which had **no row
>   at all** — so "100% of eligible items" was measured against an incomplete item list; and the two
>   **error states** wrongly marked `blocked` "un-triggerable" when the suite already injects 500s with
>   `page.route` + `route.fulfill` (steps/chk/verify.steps.ts).
>
> All of the above are now first-class `covered` rows with real assertions (and DB-backed ones carry a
> preflight anchor), so the 100% now holds on a denominator that actually includes them. Only paging
> *restore across navigation* remains genuinely deferred.

**Status values:** `covered` · `covered (symmetry)` · `covered (re-grounded)` · `not-applicable`
(descoped / legacy-only) · `not-yet` (built, separate branch) · `deferred` · `blocked` (env/auth) ·
`divergence` (app differs from legacy — see the referenced Divergence in defects.md; here #1 and #3 have
no RED test, per the reasons logged there).
