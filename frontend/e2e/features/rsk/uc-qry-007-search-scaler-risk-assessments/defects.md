# Defects — UC-QRY-007 Search Risk Assessments (Scaler subject)

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

**Two Bugs** and **three Divergences** are logged below (all surfaced at the 2026-08-05 PR review). The
**bugs**: the Scaler filter's "/ Loc" sub-field is a **dead input** (collected but never sent to the
API), and the page **breadcrumb navigates to a 404** — the latter **fixed 2026-09-16**, so one bug
remains open. The **divergences**: the new app drops legacy's **client-restriction** on the Scaler
filter, the **zero-result count line**, and the **text-field length caps**. None of the divergences is
kept as a deliberately-RED `@discovered-divergence` test, for a specific reason each — Divergence #1
can't be reproduced under single-role mock auth, #2 is an accepted re-ground already asserted green by
`zero-results.feature`, and #3 is a minor parity item. The two bugs are recorded with exact repro. No
`@discovered-bug` e2e test is added here — per the defects-guide the test author records evidence and
BA/QA own triage → Jira, and a `@discovered-bug` test presupposes a ticket. Bug #1 stays OPEN for BA/QA;
Bug #2 was fixed in the app on 2026-09-16 and is pinned by a unit regression. (The blank-search behaviour
still matches legacy `scalerRiskSearch`, and the dropped edit-vs-display permission gate is the accepted
single-role model — those remain non-defects.) The rest are **Coverage gaps** (things not tested yet, or
with no new-app surface to test), one **data** limitation, a **Verified — not a defect** entry, and one
**open question** (OQ-1) — several new at this PR review.

> **Correction (2026-08-05, PR review).** A prior revision of this log asserted a flat "no divergences and
> no bugs" while several behaviours were **untested**, in two waves. **Wave 1:** multi-criteria search,
> wildcard/partial matching, and result-set paging (the verdict rested on `covered (symmetry)` hand-waving,
> not assertions). **Wave 2:** sort ordering (mis-labelled a "UI nicety" in gap #8 — it is legacy *server*
> behaviour, part of S01), the MSG-001 "Choose your search parameters." heading (which had **no matrix row
> at all**, so "100% of eligible items" was measured against an incomplete list), and the two error states
> (wrongly marked `blocked` "un-triggerable" in gap #10 when the suite already injects 500s with
> `page.route`/`route.fulfill`). All now have real scenarios (DB-backed ones carry preflight anchors) and
> **pass**.
>
> Separately, the flat "no divergences and no bugs" claim was itself wrong: it hid **three legacy
> deviations** (client-restriction absent, zero-count line dropped, field-length caps dropped) **and two
> real bugs** (dead "/ Loc" input; breadcrumb → 404) that the old matrix never recorded. Those are now
> logged as **Bugs #1–#2** and **Divergences #1–#3** below. So the corrected verdict is: **one open bug
> (#1; #2 fixed 2026-09-16), three logged divergences from legacy** (plus OQ-1, the "partial matching"
> wording vs. the observed exact-unless-`%` semantics, still open pending the legacy package).

## Bugs / Regressions

### Bug #1 — the Scaler filter's "/ Loc" sub-field is a dead input
- **What's wrong (plain):** the "Scaler (Client / Loc)" filter has two boxes — a Client # and a Location
  code. The user can type/change the **Location** box (it defaults to `00`), but that value is **never sent
  to the search**. So a user who narrows by location gets results that silently ignore it.
- **Expected vs actual:** *expected* — either the location narrows the search, or the box isn't editable
  (legacy rendered Client Loc **read-only, value "00"** — `scalerRiskSearch.jsp:60`, technical.md:78);
  *actual* — the box is freely editable and has **no effect**.
- **How we caught it:** code path — `ClientLocSearch` writes `formData.clientLocnCode`
  (`index.tsx:427,429`), but `doSearch` builds its params object with `clientNumber` only and **omits
  `clientLocnCode`** (`index.tsx:293`). The `ScalerRiskAssessmentSearchParams` type has **no
  `clientLocnCode`** field (`scalerRiskAssessments.service.ts:46-52`), and the endpoint spec exposes no
  location parameter (`scaler-risk-assessments-search.yaml`). So the value has nowhere to go.
- **Why (technical):** the shared `ClientLocSearch` widget always renders an editable loc box unless
  `locReadOnly` is passed; this page neither passes `locReadOnly` nor forwards `clientLocnCode` to the API.
- **ACTION:** BA/QA → Jira. Likely fix: render the loc box read-only (legacy parity) or remove it, since
  the search API takes no location filter. **Status:** OPEN. **Test:** none yet (no reproducing test added
  — see the note in the summary; a `@discovered-bug` request-inspection test can be added once ticketed).
  **Found:** 2026-08-05.

### Bug #2 — the page breadcrumb navigates to a 404
- **What's wrong (plain):** clicking the "Scaler Risk Assessment" breadcrumb at the top of the page lands
  the user on the **Page-Not-Found** screen.
- **Expected vs actual:** *expected* — a breadcrumb link goes to a real page (or, like the sibling query
  pages, isn't a link at all); *actual* — it 404s.
- **How we caught it:** the page passes `breadCrumbs={[{ name: 'Scaler Risk Assessment', path:
  '/queries/scaler-risk-assessments' }]}` (`index.tsx:325`). `PageTitle` renders any crumb **with a
  `path`** as a live link that `navigate()`s to it (`PageTitle/index.tsx:62-73`). But **no `/queries/*`
  route is registered** (grep: zero hits) — the real route is `/scaler-risk-assessments`
  (`routePaths.tsx:302`) — so the target falls through to the `*` catch-all → `NotFoundPage`
  (`routePaths.tsx:644-646`). The sibling query pages (Scalers `:572`, Scale Sites `:283`) pass **`name`
  only, no `path`**, so their crumb is inert text and never 404s.
- **Same defect elsewhere:** `pages/Queries/ScaleSiteRiskAssessments/index.tsx:320` (`path:
  '/queries/scale-site-risk-assessments'`) — identical bug on the Scale-Site risk page.
- **ACTION:** BA/QA → Jira. Fix applied: dropped the `path` on both pages, matching the sibling query
  pages — the crumb is now inert text, so there is no link to 404. **Status:** FIXED 2026-09-16
  (`Queries/ScalerRiskAssessments/index.tsx:315`, `Queries/ScaleSiteRiskAssessments/index.tsx:304`).
  **Test:** unit regression in `RiskAssessmentSearchLayout.unit.test.tsx` — "renders the current-page
  breadcrumb as plain text, not a link" (verified RED against the `path` version). **Found:** 2026-08-05.

## Divergences

### Divergence #1 — client-restriction (`isRestrictUserToClient`) not implemented — **access-control**
- **What's wrong (plain):** In legacy, when the signed-in user is *restricted to a single client*, the
  "Scaler (Client / Loc)" filter is pre-filled with that client and made **read-only**, so the user can
  only search their **own** risk assessments. The new app renders that filter **unconditionally editable
  with no restriction logic at all**, so a client-restricted user could query *any* client's assessments.
- **Expected vs actual:** *expected* — when `ResourceCache.isRestrictUserToClient()` is true, legacy
  overrides the client number to the session client **and** renders the Client # field read-only
  (`RiskSearchAction.java:234`, `scalerRiskSearch.jsp:54,57`; `UC-QRY-007-technical.md:77,247`); *actual* —
  the field is always editable and never pre-filled. The `ClientLocSearch` widget *does* support
  `clientReadOnly`/`locReadOnly` props, but the page never passes them (`index.tsx` renders it plain), and
  `isRestrictUserToClient` **does not exist anywhere in the repo** (grep: zero hits).
- **Why it matters:** this is not cosmetic — it is a **data-scoping / access-control** difference. Whether
  it is acceptable depends on whether client-restricted actors can reach this screen at all.
- **Why no RED test:** single-role mock auth (`SCS_SYS_ADMIN`) can't produce a client-restricted actor, so
  the divergence can't be reproduced in an E2E flow today (same environment limit as S08/S09). **Contrast
  with S08:** S08's gate is *present but untestable* (logged `blocked`); this restriction is *absent from
  the code*, so it is a genuine **Divergence**, not merely blocked.
- **Register / classification:** Divergence · access-control (also blocked from automation by single-role).
  **ACTION:** BA/QA → confirm intent (security-relevant); revisit with the RBAC rework. **Status:** OPEN.
  **Test:** none (blocked by single-role). **Found:** 2026-08-05.

### Divergence #2 — zero-result count line (INF-001 at 0) dropped
- **What's wrong (plain):** Legacy S05 shows **"Result List: 0 records"** *plus* an empty table. The new
  app shows a **"No results"** empty state and **no count line at all**.
- **Expected vs actual:** *expected* — "Result List: 0 records" + empty table (INF-001 at zero); *actual* —
  a "No results" `EmptySection`, no total. `TableResource` renders `.table-resource__total` only when
  `totalResults > 0` (`index.tsx:84`) and swaps to the empty state when `totalElements === 0`
  (`index.tsx:116-122`).
- **Assessment:** a deliberate, reasonable **re-ground** — the empty state conveys the same "nothing
  matched" — and the *new* behaviour is already asserted **green** by `zero-results.feature`. Logged here
  so the dropped count line is recorded rather than folded silently into "covered (re-grounded)".
- **Register / classification:** Divergence · accepted re-ground (covered by a GREEN test asserting the new
  behaviour; not a RED). **ACTION:** BA/QA → confirm the dropped "0 records" line is intended. **Status:**
  OPEN. **Test:** `zero-results.feature` `@S05 @p1` (asserts the new empty state). **Found:** 2026-08-05.

### Divergence #3 — legacy field-length caps dropped
- **What's wrong (plain):** Legacy constrained the scaler search text fields — Assessment ID `size 12`
  (`jsp:23`), Licence # `size 12` (`jsp:41`), Scaler Client # `maxlength 12` (`jsp:57`), Client Loc
  `maxlength 4`, read-only, value "00" (`jsp:60`) — per `UC-QRY-007-technical.md:72-78`. The new
  `TextInput`s carry **no `maxLength`** (`index.tsx:360-410`), so a user can type arbitrarily long values.
  *(The reviewer's "Client max 8" is the TimberCruise subject — technical.md:174 — not this scaler screen,
  where the client cap is maxlength 12.)*
- **Assessment:** minor. On a read-only search screen an over-long value simply matches nothing (the search
  is exact / `%`-wildcard), so there is no data-integrity impact — this is a **parity** difference, not a
  functional bug.
- **Register / classification:** Divergence · minor (parity). **ACTION:** BA/QA → decide whether to restore
  the caps for legacy parity. **Status:** OPEN — low priority. **Test:** none (logged for parity; not
  asserted). **Found:** 2026-08-05.

## Coverage gaps

### Coverage gap #1 — Scale Site risk-assessment search (UC-QRY-007 S02) not covered here
- **What's wrong:** nothing wrong. S02 is the Scale-Site subject of the same UC; it lives on a **separate
  page** (`pages/Queries/ScaleSiteRiskAssessments`, route `/scale-site-risk-assessments`), not this
  scaler page. Out of scope for this (scaler) branch.
- **Register / classification:** Coverage gap · not-yet (built, separate branch). **Status:** OPEN.
  **Found:** 2026-08-04. Closes when a sibling `rsk/uc-qry-007-search-scale-site-risk-assessments` suite is authored.

### Coverage gap #2 — Timber Cruise & Waste subjects (S03/S04/S06/S07) are descoped
- **What's wrong:** nothing testable. UC-QRY-007 S03 (Timber Cruise) and S04/S06/S07 (Waste) belong to the
  **TCR** and **Waste RSK** domains, which are **explicitly descoped — do not build** (project scope guard).
  No page exists in the new app.
- **Register / classification:** Coverage gap · not-applicable (descoped). **Status:** OPEN — `not-applicable`
  (permanent). **Found:** 2026-08-04.

### Coverage gap #3 — permission-gated edit-vs-display Assessment links (S08) — single-role
- **What's wrong:** nothing testable today. Legacy S08 renders the Assessment-ID link to an **edit** screen
  when the actor holds the `scalerAssessment` permission (STA-001) and to a **display** screen when they
  don't (STA-002). The new single-role app (`SCS_SYS_ADMIN` only) renders **one unconditional view link**
  (`/scaler-risk-assessments/view/{id}`), which the happy-path suite asserts. The permission split is
  unreachable until finer-grained roles exist.
- **Register / classification:** Coverage gap · blocked (single role / RBAC deferred). **Status:** OPEN —
  `blocked`. Revisit with the RBAC rework. **Found:** 2026-08-04.

### Coverage gap #4 — not-authorized access (S09) — blocked by mock auth
- **What's wrong:** nothing testable from the browser. S09 requires reaching a risk-search URL **without**
  the required role. Mock auth grants only `SCS_SYS_ADMIN`, which gates the whole portal, so the
  unauthorized path can't be driven in an E2E test.
- **Register / classification:** Coverage gap · blocked (mock auth). **Status:** OPEN — `blocked`. Revisit
  with multi-role auth. **Found:** 2026-08-04.

### Coverage gap #5 — UC-RSK-001 Industry-Scaler self-view — blocked by mock auth
- **What's wrong:** nothing testable today. UC-RSK-001 is the **Industry Scaler** viewing their *own* risk
  assessments — a role-gated self-view. Mock auth grants only `SCS_SYS_ADMIN` (an internal role), so the
  Industry Scaler role branch is unreachable from the browser.
- **Register / classification:** Coverage gap · blocked (mock auth). **Status:** OPEN — `blocked`. Revisit
  with multi-role auth. **Found:** 2026-08-04.

### Coverage gap #6 — no completed assessment in the extract (Complete = Yes filter)
- **What's wrong:** the "Complete = Yes" filter can't be positively asserted. Every one of the 23
  scaler risk assessments in the current real extract is **incomplete** (`GET
  /api/scaler-risk-assessments/search?completeInd=Y` → `[]`, `=N` → 23). The `completeInd` filter path is
  covered by symmetry (same `handleInputChange` → same params object as the asserted filters), but a
  positive "Yes" result has no data. This is a **data** limitation, not an app defect.
- **Register / classification:** Coverage gap · blocked (test data — no completed record). **Status:** OPEN
  — `blocked`. Closes if a completed assessment is discovered/seeded on a re-extract. **Found:** 2026-08-04.

### Coverage gap #7 — Reg/Dist & Scaler(Client/Loc) filter widgets not exercised — NARROWED (mostly CLOSED)
- **What's wrong:** nothing wrong. Both feed the same search params object as the asserted filters, but via
  distinct widgets (`DistrictSelect`; `ClientLocSearch` with its picker modal). Their param path is
  symmetric with the covered arms; the widget-specific interaction was originally deferred as low value.
- **Update (2026-08-20):** the widget→param wiring is now **covered** — `filter-widgets.feature` drives the
  real `DistrictSelect` (Selkirk 1902 → orgUnitNo, 9 rows incl. 723) and the `ClientLocSearch` Client # box
  (00047212 → clientNumber, 5 rows incl. 723), with anchors drift-guarded in `preflight/anchors.setup.ts`.
  "Symmetric param path" is no longer hand-waved: each scenario proves the widget commits its selection.
- **Still deferred (the only remaining slice):** the `ClientLocSearch` **picker-MODAL writeback** — opening
  the client-search modal and *picking* a client (vs. typing the number). Lower value (same `clientNumber`
  param the type-in arm already proves) and higher flakiness (the modal embeds the Client query page and
  depends on that search returning a deterministic client), so it is left for a follow-up.
- **Register / classification:** Coverage gap · deferred (narrowed to the picker-modal writeback only).
  **Status:** OPEN — `deferred` (widget param wiring CLOSED 2026-08-20). **Found:** 2026-08-04.

### Coverage gap #8 — Sort ordering not asserted — CLOSED
- **What's wrong:** nothing wrong with the app; this was a *coverage* miss now closed.
- **Correction (2026-08-05, PR review):** this gap originally dismissed sort as "a UI nicety, not an
  S01-S09 requirement." That is incorrect — sort ordering is **legacy server behaviour and part of S01**:
  legacy S01 selects a Primary Sort and the search runs `searchScalerAssessments(searchDto, primarySort,
  secondarySort)`; the new app forwards both to the API using the legacy sort codes (1/8/4/3/16/14/17,
  enumerated at `scaler-risk-assessments-search.yaml:78-111`). It is now **covered** by the sort scenario
  in `search.feature` (licence 9710, Primary Level / Secondary Assessment ID → `[1144,1224,1341,1226,723]`,
  distinct from the default Assessment-ID order), with a preflight anchor pinning that exact order.
- **Register / classification:** Coverage gap · ~~deferred~~ → **covered**. **Status:** CLOSED (2026-08-05).
  **Found:** 2026-08-04.

### Coverage gap #9 — persisted filters/paging *restored across navigation* not asserted
- **What's wrong:** nothing wrong. The page persists filters, sort, paging, and the last search
  `lastSearchParams` across navigation (`usePersistentState`) so returning from an assessment restores the
  prior search. The result ROWS are NOT persisted — they are re-fetched on remount by an effect that replays
  the persisted params (index.tsx "Result rows are ephemeral: re-fetched on mount"). A new-app convenience
  with no legacy equivalent in these slices; not asserted.
- **Scope correction (2026-08-05, PR review):** this gap originally read "persisted filters/**paging**"
  and was cited to defer *all* paging as a nicety. That conflated two different things. The **paging
  mechanism** (the page fetches all matching rows and slices them client-side at 10/page —
  `index.tsx:246-259`) is **core read behaviour**, not a nicety, and is now **covered** by the pagination
  scenario in `search.feature` (Level High → 14 total, 10 rows on page 1, 4 on page 2). Only the
  *restore-across-navigation* half remains deferred here.
- **Register / classification:** Coverage gap · ~~deferred~~ → **covered**. **Status:** CLOSED (2026-08-20)
  — `persistence.feature` searches (Assessment ID 723), navigates away and back CLIENT-SIDE (a full reload
  would correctly drop the in-memory store), and asserts the filter value is restored and the count
  reappears. NB the count is restored by the mount-effect re-fetch replaying the persisted params, NOT from a
  stored result set (rows are ephemeral) — so the scenario has teeth on the params store but cannot fail on a
  results store, because there is none. **Found:** 2026-08-04. **Narrowed:** 2026-08-05. **Closed:** 2026-08-20.

### Coverage gap #10 — error states (Search-failed / LOV-load-failed) not asserted — CLOSED
- **What's wrong:** nothing wrong with the app; this was a *coverage* miss now closed.
- **Correction (2026-08-05, PR review):** this gap originally claimed both error states were `blocked`
  because "backend/LOV fault we can't inject in an E2E flow" and said to "revisit if a fault-injection
  harness exists." That harness **already exists in this repo**: `steps/chk/verify.steps.ts:108-127` faults
  endpoints with Playwright `page.route` + `route.fulfill`. Using the same pattern, both states are now
  **covered** in `search.feature` — the search endpoint is faulted to a 500 → "Search failed"
  InlineNotification; the `static-lov` endpoint (both dropdowns load through it) is faulted to a 500 →
  "Could not load dropdown options" notification. No backend fault is needed; the fault is injected in the
  browser.
- **Register / classification:** Coverage gap · ~~blocked~~ → **covered** (browser-side fault injection).
  **Status:** CLOSED (2026-08-05). **Found:** 2026-08-04.

## Verified — not a defect

### Text search is exact unless the caller supplies a `%` wildcard
- **What we checked:** the endpoint spec says text fields "support partial matching" and that Assessment
  ID "Supports wildcard matching (e.g. `20%`)" (`scaler-risk-assessments-search.yaml:10,17`). We confirmed
  the *actual* behaviour of `scs_risk_scaler_vw_pkg.search_recs` against the live extract (2026-08-04):
  matching is **exact unless the caller includes a `%`**. Concretely — `?riskQuestionnaireId=723` → 1;
  `?riskQuestionnaireId=72` → **0** (not a substring match); `?riskQuestionnaireId=72%` → 1 (723);
  `?scalerLicenceNo=9710` → 5; `?scalerLicenceNo=971` → **0**; `?scalerLicenceNo=97%` → 6. So the `%` the
  user types is passed through to a SQL `LIKE`; the app does **not** auto-wrap the term in `%…%`.
- **Why it's not a defect:** the search returns correct rows for both exact and wildcard input; the two
  `search.feature` arms (`72%` → 723, bare `72` → no results) pin this and are drift-guarded in
  `preflight/anchors.setup.ts`. Recorded here so the "exact `72` returns nothing" case isn't later
  re-investigated as a bug.
- **Register / classification:** Verified — not a defect. **Status:** permanent. **Found:** 2026-08-05.

## Open questions (for BA/QA)

### OQ-1 — is "exact-unless-`%`" a divergence from legacy, or intended?
- **The question:** the OpenAPI description wording ("Text fields support partial matching using legacy
  package behavior") reads as *automatic* partial/substring matching, but the app matches **exact unless a
  `%` is supplied** (see "Verified — not a defect" above). If the **legacy** `scs_risk_scaler_vw_pkg`
  auto-wrapped the term (`%term%`), then requiring the user to type `%` is a **behavioural divergence** and
  the current tests encode the *new* behaviour; if legacy also required an explicit `%`, the only fix is to
  tighten the misleading OpenAPI wording (a **Spec gap**).
- **Why it's open, not filed:** resolving it needs the legacy package source (`scs_risk_scaler_vw_pkg`),
  which isn't in scope here — I won't guess between Divergence and Spec gap. No deliberately-RED
  `@discovered-divergence` test is added until BA/QA confirm intent.
- **Register / classification:** Open question (→ Divergence *or* Spec gap on resolution). **Status:** OPEN.
  **Found:** 2026-08-05.
