# Coverage — UC-QRY-001 Search Clients

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-QRY-001-S01..S05.feature` + `UC-QRY-001-slices.md` (control/message/field
matrix) + `UC-QRY-001-technical.md` (ERR/message catalog), against the new app's read path
(`pages/Queries/Client` → `clients.service` → `GET /api/clients/search` → `ClientController` →
`ClientService` → `ClientRepository` → SP `scs_client_vw_pkg`).

**Big re-grounding:** the legacy TWO-screen flow `.clientSearch` (P003) → `.clientSearchResults` (P004)
with a **"Back" button** collapses to the new app's **single page** `/client` (form + results together).
So every legacy "Back" step has no equivalent, and the legacy "Result List: 0 records" empty view
re-grounds to a **"No results"** empty state. The "Result List: N records" count line IS preserved.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 search by a single criterion → matching rows | S01.feature; slices.md:66-67,120 | `Client/index.tsx doSearch` → `GET /clients/search` | `search.feature` Outline `@S01 @p0` (last name / company name / client number) | covered | — |
| S01 results table columns render | S01.feature; slices.md:72-75 | `TableResource` headers | `search.feature` `@S01 @p1` (columns + cell data) | covered | — |
| CNT-001 "Result List: N records" count | slices.md:176 | `TableResource.__total` | `search.feature` `@S01 @p0` (`should show N records`) | covered | — |
| Field search: clientNumber / companyName / lastName | slices.md:66-67,120 | `GET /clients/search` params | `search.feature` Outline `@S01` (all three asserted) | covered | — |
| Field search: firstName / clientLocnCode | slices.md:24,121-123 | same input path (`handleInputChange` → same params object) | — (mechanism identical to the 3 asserted arms) | covered (symmetry) | — |
| S04 zero results → empty results view | S04.feature | `TableResource` `totalElements===0` → "No results" | `zero-results.feature` `@S04 @p1` | covered (re-grounded) | — |
| S02 all-blank search (legacy ERR-001 rejected it; **accepted new-app behaviour: "blank = browse all"**) | S02.feature; technical.md:79; slices.md:109 | **NOT enforced** (intentional) — `doSearch` fires with all params undefined; `ClientController`/`Service`/`Repository` have no `checkNullable` → HTTP 200 + full list | `validation.feature` `@S02 @ERR-001` (asserts actual behaviour: request fires + full list; GREEN) | covered (accepted divergence) | defects.md Divergence #1 |
| S01/S03/S04 "Back" button → return to search screen | S01/S03/S04.feature (scenario 2 of each) | (none — single-page layout, no Back) | — | not-applicable | defects.md Coverage gap #1 |
| S03 max 5,000-record threshold + ERR-002 `message.maxrecs` warning | S03.feature; technical.md:80; slices.md:168-188 | (none — new app has no cap/warning; also not reproducible without 5,000+ matches) | — | not-applicable | defects.md Coverage gap #2 |
| S05 CIMS unreachable → CIMSException error message | S05.feature; slices.md (S05) | error state exists (`mutation.isError`) but source is un-triggerable | — | blocked | defects.md Coverage gap #3 |
| Sort options (primarySort / secondarySort ordering) | slices.md:24 (form fields) | `SortOptions` control on the form | — (control present; ordering not asserted) | deferred | defects.md Coverage gap #4 |
| Reset the form + results | (new-app control — not in legacy S01-S05) | `Client/index.tsx handleReset` | `search.feature` `@S01 @p2` (Reset clears results) | covered | — |

**Role / permission coverage:** **blocked by mock auth.** Legacy gates this screen on
`UserRole.isDistrictScalingManager` (Background of every slice); mock auth grants only `SCS_SYS_ADMIN`, so
the role branch is unreachable from the browser today. Logged as defects.md Coverage gap #5. The screen
itself is reachable and fully exercised under the single mock role.

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`blocked`/`deferred`):** the
eligible items (S01 search, S01 columns, CNT-001, field-search, S04 zero-results, S02 blank-search, Reset)
are all covered (S02 as an accepted, asserted-actual-behaviour divergence). **P0 100% · P1 100%
· overall 100%.** The excluded items (Back button, 5,000-cap, CIMS exception, sort ordering, role gating)
are handed off as Coverage gaps with reasons.

**Status values:** `covered` · `covered (symmetry)` · `covered (re-grounded)` · `covered (accepted divergence)` (a reviewed, intentional legacy-behaviour change whose test asserts the ACTUAL new-app behaviour and is GREEN — see this UC's `defects.md`) · `not-applicable` (legacy-only / no new-app surface) · `deferred` · `blocked` (env/auth) · `divergence` (a genuinely-failing `@discovered-divergence` test — none in this UC after the S02 acceptance).
