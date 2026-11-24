# Coverage — UC-QRY-003 Search Scalers

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-QRY-003-S01..S07.feature` + `UC-QRY-003-slices.md` + `UC-QRY-003-technical.md`
(control/message/field/state catalog), against the new app's read path (`pages/Queries/Scalers` →
`scalers.service` → `GET /api/scalers/search`; the check-scale branch looks the number up via `findCheckScale`
→ `GET /api/check-scales/search?checkScaleId=` and navigates to `/check-scales/view/{id}` only on a match).

**Re-groundings:** the legacy two-screen flow `.scalerSearch` (P005) → `.scalerSearchResults` (P006) with a
**Back** button collapses to the single `/scalers` page (no Back). Legacy "0 records" empty table →
**"No results"** empty state. One behavioural difference is logged as a **log-only divergence** (plausibly
intentional): a single result no longer **auto-forwards** to the scaler summary (Div #1). Div #2 (check-scale #
not validated on the search form) was **fixed** 2026-10-01 — the form now shows the legacy field errors. The result columns + the licence-link +
the "Create Scaler" button + the "Check Scale #" search row are all preserved.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 multi-result search (by last name) | S01.feature; slices.md:60 | `Scalers/index.tsx doSearch` → `GET /scalers/search` | `search.feature` `@S01 @p0` (RATHROCK → 3) | covered | — |
| S01 results columns (7) | S01.feature; slices.md (results cols) | `TableResource` headers | `search.feature` `@S01 @S02 @p1` | covered | — |
| S01 licence-# row link → scaler view | technical.md:60 | `renderScalerCell` → `RouterLink /scalers/view/{lic}` | `search.feature` `@S01 @p0` (`links to its scaler view`) | covered | — |
| STA-004 "Create Scaler" button on results | technical.md:63,74 | `Scalers/index.tsx` (post-search Button → `/scalers/create`) | `search.feature` `@S01 @S02 @p1` | covered | — |
| S02 single-result → one scaler | S02.feature | search returns 1 row → 1-row table (NOT auto-forwarded) | `search.feature` `@S02 @p1` (914D → 1) | covered | defects.md Divergence #1 (auto-forward removed) |
| S03 zero results | S03.feature; technical.md:80 | `TableResource` `totalElements===0` → "No results" | `zero-results.feature` `@S03 @p1` | covered (re-grounded) | — |
| STA-003 "Check Scale #" search row | technical.md:73 | "OR enter check scale #" accordion | `check-scale.feature` `@S04 @p1` (uses it) | covered | — |
| S04 check-scale branch — valid → check scale view | S04.feature | `doSearch` checkScale mode → `navigate(/check-scales/view/{id})` | `check-scale.feature` `@S04 @p1` (145842) | covered | — |
| S05 + ERR-001/ERR-002 `errors.no.recs` "No records were found." (not-found numeric check scale #) | S05.feature; technical.md:75-76,102 | on the search form — `search?checkScaleId=` returns HTTP 200 + `[]` → field error "No records were found." on Check Scale #, no navigation | `check-scale.feature` `@S05 @p1` (999999999 → field error) | covered | defects.md Divergence #2 (RESOLVED 2026-10-01) |
| S05 second error path — non-numeric check scale # | S05.feature; technical.md:75-76,102 | rejected on the form before any request → field error "Check Scale # must be a number." (legacy `errors.long`; the S05 Gherkin's "No records were found." here is wrong) | `check-scale.feature` `@S05 @p1` (ABC → field error) | covered | defects.md Divergence #2 (RESOLVED; backend 500-vs-400 nit still open, now unreachable from the form) |
| S01/S03 "Back" button → return to search screen | S01/S03.feature (scenario 2 of each) | (none — single-page layout) | — | not-applicable | defects.md Coverage gap #1 |
| Filter fields: Reg/Dist, Licence Type, First Name, Appointment Type, Exam/Upgrade, Client/Loc | slices.md (controls) | same `GET /scalers/search` param passthrough as the 3 asserted arms | — (mechanism identical to licence/last-name/check-scale) | covered (symmetry) | — |
| S01 + S06 editable "Scaler (Client / Loc)" field | S01.feature; S06.feature; slices.md (controls) | `Scalers/index.tsx:363` `ClientLocSearch` — client `#clientNumber` editable, loc `#clientLocnCode` read-only (`locReadOnly`) | `search.feature` `@S01 @S06 @p2` (field present, label + client editable, loc read-only) | covered | — |
| S06 side-menu items (Administration/Queries/Reports/Create/**Handheld**) | S06.feature | legacy WebADE menu; new nav differs; **Handheld descoped**; role-gated | — | not-applicable | defects.md Coverage gap #2 |
| S07 + ERR-003 `message.notAuthorized` unauthorized access | S07.feature; technical.md:77 | route protection exists, but the no-permission role is unreachable under mock auth | — | blocked | defects.md Coverage gap #3 |
| Sort options (primary/secondary ordering) | slices.md (form fields) | `SortOptions` control | — (present; ordering not asserted) | deferred | defects.md Coverage gap #4 |
| Reset the form + results | (new-app control) | `Scalers/index.tsx handleReset` | `search.feature` `@S01 @p2` | covered | — |

**Role / permission coverage:** **blocked by mock auth.** S06 (role-driven menu + control visibility) and S07
(unauthorized → notAuthorized page) both depend on WebADE roles; mock auth grants only `SCS_SYS_ADMIN`, so
neither the reduced-permission branch (S07) nor the exact legacy menu set (S06, incl. the descoped Handheld
item) is reachable. The screen's own controls (search, check-scale accordion, Create Scaler button) are fully
exercised under the single role. See Coverage gaps #2/#3.

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`blocked`/`deferred`):** S01
multi/columns/link/Create-Scaler, S02 single, S03 zero, S04/S05 check-scale, field-search, Reset — all
covered. **P0 100% · P1 100% · overall 100%.** Excluded items (Back button, S06 menu, S07 unauthorized, sort
ordering) are handed off as Coverage gaps.

**Status values:** `covered` · `covered (symmetry)` · `covered (re-grounded)` · `not-applicable` · `deferred` · `blocked` · `divergence` (here the open divergence, #1, is **log-only** — a plausibly-intentional change, so no `@discovered-divergence` red; #2 is RESOLVED; see `defects.md`).
