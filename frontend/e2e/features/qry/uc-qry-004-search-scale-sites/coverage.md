# Coverage — UC-QRY-004 Search Scale Sites

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-QRY-004-S01..S08.feature` + `UC-QRY-004-slices.md` + `UC-QRY-004-technical.md`
(control/message/field/state catalog), against the new app's read path (`pages/Queries/ScaleSites` →
`scaleSites.service` → `GET /api/scale-sites/search`; the inspection-# branch calls
`GET /api/scale-sites/inspection/search?inspectionId=` and, on success, navigates to
`/scale-sites/{siteId}/inspections/view/{inspectionId}`).

**Re-groundings:** the legacy two-screen flow `.scaleSiteSearch` (P043) → `.scaleSiteSearchResults` (P044)
with a **Back** button collapses to the single `/scale-sites` page (no Back). Legacy "Result List: 0 records"
empty table → **"No results"** empty state. The legacy Inspection # field was WebADE-permission-gated and its
errors were **server-side field errors**; the new app always renders the "OR enter inspection #" accordion
(single-role mock auth) and its errors surface as a page **notification** (unknown id) or a **client-side**
inline error (non-numeric id). Three behavioural differences are logged as **log-only divergences** (all
plausibly intentional): single-result no longer **auto-forwards** (Div #1); inspection-# validation moved
**client-side** and errors moved off the form (Div #2); site-name search requires **explicit `%` wildcards**
(Div #3). The result columns + the Scale Site # link + the "Create Scale Site" button + CNT-001 count are all
preserved.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 multi-result search (by site name) | S01.feature; slices.md:50 | `ScaleSites/index.tsx doSearch` → `GET /scale-sites/search` | `search.feature` `@S01 @p0` (%TEMBEC% → 3) | covered | — |
| CNT-001 "Result List: N records" | technical.md:92 | `TableResource` `.table-resource__total` | `search.feature` `@S01 @p0` / `@S02 @p1` (count asserts) | covered | — |
| S01 results columns (6) | slices.md:60-75; technical.md:66-77 | `TABLE_HEADERS` → `TableResource` | `search.feature` `@S01 @S02 @p1` | covered | — |
| S01 Scale Site # row link → scale site view | technical.md:69 | `renderScaleSiteCell` → `RouterLink /scale-sites/view/{id}` | `search.feature` `@S01 @p0` (`links to its scale site view`) | covered | — |
| STA-003 "Create Scale Site" button on results | technical.md:77; slices.md:376 | `ScaleSites/index.tsx` (post-search Button → `/scale-sites/create`) | `search.feature` `@S01 @S02 @p1` | covered | — |
| S02 single-result → one scale site | S02.feature; slices.md:107 | search returns 1 row → 1-row table (NOT auto-forwarded) | `search.feature` `@S02 @p1` (520 → 1) | covered | defects.md Divergence #1 (auto-forward removed) |
| STA-004 `ownerClientNumber` editable (not read-only for this actor) | technical.md:88; slices.md:73 | `ClientLocSearch` — client `#ownerClientNumber` AND loc `#ownerClientLocnCode` both editable (no `locReadOnly`) | `search.feature` `@S01 @p2` | covered | — |
| S03 zero results | S03.feature; slices.md:149 | `TableResource` `totalElements===0` → "No results" | `zero-results.feature` `@S03 @p1` | covered (re-grounded) | — |
| S04 inspection-# branch — valid → inspection view | S04.feature; slices.md:192; technical.md:181-182 | `doSearch` inspection mode → `inspectionMutation` → `navigate(/scale-sites/{site}/inspections/view/{id})` | `inspection.feature` `@S04 @p1` (seeded id) | covered | — |
| STA-002 Inspection # field rendered | technical.md:86; slices.md:211 | "OR enter inspection #" accordion (always rendered) | `inspection.feature` `@S04/@S05/@S06` (uses it) | covered | — |
| S05 + ERR-001 non-numeric Inspection # rejected | S05.feature; technical.md:89,118 | **client-side** in `doSearch` (`Number.isInteger`/`>0`) → inline error; **no** lookup dispatched | `inspection.feature` `@S05 @p1` (ABC → error + 0 calls) | covered (re-grounded) | defects.md Divergence #2 (validation moved client-side) |
| S06 + ERR-002 unknown Inspection # (`errors.no.recs` "No records were found.") | S06.feature; technical.md:90,184 | navigates nowhere; `GET /scale-sites/inspection/search` → **HTTP 404** → notification shows the backend message | `inspection.feature` `@S06 @p1` (999999999 → notification) | covered (actual behaviour) | defects.md Divergence #2 (errors moved off the form; message text differs) |
| S07 + ERR-003 CIMS record not found (`errors.null.cims.record`) | S07.feature; technical.md:91 | app DOES enforce it — `isInspectionViewableInCims` false → **HTTP 422** → notification | — (no discoverable resolves-but-not-viewable inspection; seeded ones ARE viewable) | blocked | defects.md Coverage gap #1 (data-blocked) |
| S08 STA-001 Inspection # field hidden when permission denied | S08.feature; technical.md:85 | new app renders it unconditionally (no per-permission gate) | — | not-applicable | defects.md Coverage gap #2 |
| S08 STA-003 Create Scale Site button hidden when permission denied | S08.feature; technical.md:87 | new app renders it unconditionally (no per-permission gate) | — | not-applicable | defects.md Coverage gap #2 |
| Filter fields: Reg/Dist, Site Type checkboxes, Site Owner Loc | slices.md:66-76 (controls) | same `GET /scale-sites/search` param passthrough as the asserted site-name/site-# arms | — (mechanism identical) | covered (symmetry) | — |
| Site-name search requires explicit `%` wildcards (passthrough LIKE) | (new-app behaviour) | backend SP uses the value as a literal LIKE pattern (no auto-wrap) | `search.feature` `@S01` (value `%TEMBEC%`) | covered (actual behaviour) | defects.md Divergence #3 (UX; BA to confirm) |
| S01/S03 "Back" button → return to search screen | S01/S03.feature (Back scenarios) | (none — single-page layout) | — | not-applicable | defects.md Coverage gap #3 |
| Sort options (primary/secondary ordering) | slices.md:75-76; technical.md:59-60 | `SortOptions` control (params passed; ordering not asserted) | — | deferred | defects.md Coverage gap #4 |
| Reset the form + results | (new-app control) | `ScaleSites/index.tsx handleReset` | `search.feature` `@S01 @p2` | covered | — |

**Role / permission coverage:** **blocked by mock auth.** S08 (WebADE-permission-gated hiding of the
Inspection # field / Create Scale Site button) and S07 (CIMS-viewability rejection) both depend on
capabilities unreachable under single-role mock auth (which grants only `SCS_SYS_ADMIN`): the new app has no
per-permission control-gating, and no resolves-but-not-CIMS-viewable inspection is discoverable (seeded
inspections are viewable). The screen's own controls (parameter search, inspection accordion, Create Scale
Site button, editable Site Owner field) are fully exercised under the single role. See Coverage gaps #1/#2.

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`blocked`/`deferred`):** S01
multi/columns/link/count/Create-Scale-Site, S02 single, S03 zero, S04 inspection-valid, S05 inspection
client-validation (+prove-the-negative), S06 inspection not-found, Site-Owner field, Reset — all covered.
**P0 100% · P1 100% · overall 100%.** Excluded items (S07 CIMS data-blocked, S08 permission hiding, Back
button, sort ordering) are handed off as Coverage gaps.

**Status values:** `covered` · `covered (symmetry)` · `covered (re-grounded)` · `covered (actual behaviour)` · `not-applicable` · `deferred` · `blocked` · `divergence` (here all three divergences are **log-only** — plausibly-intentional changes, so no `@discovered-divergence` red; see `defects.md`).
