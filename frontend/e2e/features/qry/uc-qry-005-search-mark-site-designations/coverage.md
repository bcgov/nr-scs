# Coverage — UC-QRY-005 Search Mark Site Designations

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-QRY-005-S01..S07.feature` + `UC-QRY-005-slices.md` (control/message/field/rule
catalog), against the new app's read path (`pages/Queries/MarkSiteDesignations/index.tsx` →
`markSiteDesignation.service.searchMarkSiteDesignationsByTimberMark` → `GET /api/mark-site-designations/search?timberMark=`).
Route `/mark-site-designations`; the search is entirely `?timberMark=` URL-driven, so the form and a
`?timberMark=` link (the Scale Site MSD tab — UC-MSD-005) take the identical path.

**Re-groundings:** the legacy two-screen flow `.markSiteDesignationSearch` (P066) → `.markSiteDesignationSearchResults`
(P067) with a **Back** button collapses to the single `/mark-site-designations` page (no Back). Legacy
"Result List: 0 records" empty table → a **"No results"** empty state (`TableResource`). The three field
validations were legacy **server-side** field errors ("Timber Mark is required." / "Wildcards are not
allowable in this search."); the new app enforces them **client-side** (re-grounded to "Timber Mark is
required." / "Timber Mark can’t contain the % / _ character.") and dispatches **no** search request — and the
wildcard guard also blocks a hand-crafted `?timberMark=` URL. MSD # links + the "Create MSD" button are
**not per-role gated** (single-role mock auth). All differences are plausibly-intentional re-groundings —
**no divergence red**; the built app matches the re-grounded expectations (all scenarios green).

**Data:** search value `GE5412` (a real, stable extract mark — the same mark the UC-MSD-005 tab renders for
site 28E; NOT written by any create test) and the no-match `ZZZQ999` are pinned in
`fixtures/qry/qry-mark-site-designation-test-data.ts` (ground-truthed 2026-08-04). We assert **presence**
(a GE5412 row + a clickable MSD # link + the column set), not a volatile row count / authorization id.
Read-only → no seed, no cleanup, parallel-safe by construction.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 search by Timber Mark returns rows | S01; slices.md:56 | `doSearch`/param → `GET /mark-site-designations/search` | `search.feature` `@S01 @p0` (GE5412 → rows) | covered | — |
| S01 auto-search from `?timberMark=` URL (the MSD-tab link path) | S01; slices.md (URL-driven) | `useSearchParams` timberMark drives the query | `search.feature` `@S01 @p1` | covered | closes UC-MSD-005 S03 (URL-only) gap |
| S01 result columns (MSD #, Timber Mark, Effective Date, Expiry Date, Designated District) | slices.md:60-75 | `TABLE_HEADERS` → `TableResource` | `search.feature` `@S01 @p0` | covered | — |
| S01 MSD # rendered as a link → MSD view | slices.md:66; technical STA-001 | `renderAs` `RouterLink /mark-site-designations/view?haulingMarkAuthorizationId=` | `search.feature` `@S01 @p0` (link href) + `@S01 @p1` (click → view heading) | covered | — |
| STA-002 "Create MSD" button on results | slices.md S04; technical.md STA-002 | `Create MSD` Button (rendered after `hasSearched`) | `search.feature` `@S01 @p0` | covered | — |
| CNT-001 "Result List: {N} records" count | slices.md S01/S02 (CNT-001) | `TableResource` `.table-resource__total` | — (results asserted by presence, not pinned N) | covered (presence) | exact N not asserted — real-data volatile; the total element renders on every result set |
| S02 zero results (empty is a valid success, no error) | S02; slices.md:149 | `TableResource` `totalElements===0` → "No results" | `zero-results.feature` `@S02 @p1` (ZZZQ999 → No results) | covered (re-grounded) | — |
| S05 + ERR-001 Timber Mark required | S05; slices.md (ERR-001) | `validateForm` client-side → inline error; **no** GET | `validation.feature` `@S05 @p1` (blank → error + 0 calls) | covered (re-grounded) | Verified V1 (message wording) |
| S06 + ERR-002 `%` wildcard disallowed | S06; slices.md (ERR-002) | `timberMarkWildcardError('%')` client-side → inline error; **no** GET | `validation.feature` `@S06 @p1` (form) + `@S06 @p1` (crafted URL) | covered (re-grounded) | Verified V1 |
| S07 + ERR-003 `_` wildcard disallowed | S07; slices.md (ERR-003) | `timberMarkWildcardError('_')` client-side → inline error; **no** GET | `validation.feature` `@S07 @p1` (form) | covered (re-grounded) | Verified V1 |
| Timber Mark auto-uppercased before search | slices.md BR (auto-uppercase) | `handleInputChange` `value.toUpperCase()` | — (internal transform, no failure mode) | not-applicable | slices.md: "no failure mode"; GE5412 already upper |
| S03 STA-001 MSD # links hidden when `markSiteView` denied | S03; slices.md:31 | new app renders the link unconditionally (no per-permission gate) | — | not-applicable | Coverage gap #1 (+ blocked by mock auth) |
| S04 STA-002 "Create MSD" button hidden when `markSiteCreate` denied | S04; slices.md:59 | new app renders it unconditionally (post-search, no role gate) | — | not-applicable | Coverage gap #1 (+ blocked by mock auth) |
| Reset the form + results | (new-app control) | `handleReset` → clears form/persisted mark/URL | `search.feature` `@S01 @p2` (→ pre-search empty state) | covered | — |
| "Back" button → return to search screen | S01/S02 (Back control) | (none — single-page layout) | — | not-applicable | single-page re-grounding (Div-class, log-only) |
| Persist last-searched mark, restore on return | (new-app behaviour; no legacy slice) | `usePersistentState('markSiteDesignationQuery.timberMark')` | — | deferred | Coverage gap #2 |
| Server-error render ("Search failed" notification) | (new-app behaviour) | `serverError` → `InlineNotification kind=error` | — | deferred | Coverage gap #3 (reachable only via fault injection) |

**Symmetry check:** the search's two entry points are both covered — the **form** search (S01) and the
**`?timberMark=` URL** auto-search (the MSD-tab link path). The results/empty pair is covered (S01 rows /
S02 "No results"). The three field guards (required / `%` / `_`) are all covered, each with the
prove-the-negative (0 search calls); the `%` guard additionally covers the **crafted-URL** arm. The MSD #
link is covered both as an attribute (href) and as an actual navigation (→ view heading).

**Role / permission coverage:** **blocked by single-role mock auth.** S03 (MSD # link hidden without
`markSiteView`) and S04 ("Create MSD" hidden without `markSiteCreate`) have **no new-app equivalent** — the
new app renders the link and button unconditionally and centralises authorization at the route
(`ProtectedRoute` `SCS_SYS_ADMIN`) + endpoint layer, so the per-element hide is `not-applicable` and any
role assertion is unreachable under the single mock role. See Coverage gap #1.

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`deferred`):** S01 search + columns
+ link + Create-MSD + auto-search-URL + view-nav, S02 zero, S05/S06/S07 validation (+prove-the-negative +
crafted-URL), CNT-001 (presence), Reset — all covered. **P0 100% · P1 100% · overall 100%.** Excluded items
(S03/S04 role hiding, Back button, persistent-restore, server-error render) are handed off as Coverage gaps.

**Status values:** `covered` · `covered (presence)` · `covered (re-grounded)` · `not-applicable` (legacy-only /
no new-app equivalent) · `deferred` (see Coverage gaps) · `blocked` (env/auth). No divergence red — every
difference from the legacy spec is a plausibly-intentional re-grounding the built app already satisfies.
