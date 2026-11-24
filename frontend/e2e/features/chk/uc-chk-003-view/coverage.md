# Coverage — UC-CHK-003 View Detail Check Scale

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: the 7 `gherkin/UC-CHK-003-S0*.feature` slices + `UC-CHK-003-slices.md`
(control/message matrix) + `UC-CHK-003-technical.md` (ERR/STA catalog), against the new app's
**read path**: `pages/View/CheckScale/index.tsx` (the view screen), `components/Form/CheckScaleForm`
(`mode="view"` read-only fields), `components/core/CheckScaleSummaryTable` (the tab list + row link),
`pages/View/Scaler/components/tabs/CheckScalesTab.tsx` + `pages/View/ScaleSite/.../tabs/CheckScalesTab.tsx`
(the re-grounded "list" entry points), and `services/checkScales.service.ts` (`getCheckScale` →
`GET /api/check-scales/search?checkScaleId=`).

This is a **read-only** UC — no write path. All scenarios open shared **permanent** seed records
**read-only** (905001 / 905021 / 905002); nothing mutates, so no cleanup and fully parallel-safe.

| Source item | Source citation | App enforcement / render point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Happy path — view a check scale from the **scaler** Check Scales list | S01 / slices.md:50-102 | scaler `CheckScalesTab` → `CheckScaleSummaryTable` row link → `View/CheckScale` | check-scale-view `@S01 @p0` | covered | — |
| View screen renders all data fields **read-only** (Check Scale #, type, scaler-licence links, site, comment) | S01 / technical.md:79-127 | `CheckScaleForm mode="view"` (index.tsx:196-201) | check-scale-view `@S01 @p0` | covered | — |
| **Check Scale Summary** table (Original / Check / Difference / Variance % × Tops/Butts/Length/Volume/Pieces/Net Value) | S01 / technical.md:119 | `View/CheckScale` summary table (index.tsx:204-257) | check-scale-view `@S01 @p0` | covered (rows only) | rows asserted, **cell values not** — Coverage gap #5; the Variance % divisor bug (Bug #1) is pinned by a unit test instead |
| **Species Product Grade Summary** rows | S01 / technical.md:120 | `SpeciesProductGradeSummary` (index.tsx:262-269) | check-scale-view `@S01 @p0` | covered | — |
| Alternate entry — view from the **scale-site** Check Scales list | S02 / slices.md:106-147 | scale-site `CheckScalesTab` → same table/row link | check-scale-view `@S02 @p1` | covered | — |
| Filter the list before viewing | S03 / slices.md:151-189 | scaler tab role `Filter` `#scaler-check-scales-filter` (CheckScalesTab.tsx:101-115) | check-scale-view-navigation `@S03 @p1` | covered | — |
| **Legacy** check scale → Edit Record **and** Delete disabled; fields still read-only | S04 / STA-003/004, technical.md:136-137 | `disabled={ckscType==='LGCS'}` (View index.tsx:277,290) | check-scale-view-navigation `@S04 @p1` | covered | overlaps UC-CHK-002 S04 (Edit-only) — this UC owns the full view state |
| Non-legacy → Edit Record **enabled**; Back returns to the originating list | S05 / slices.md:235-274 | `disabled={false}`; `navigate(-1)` Back (View index.tsx:272-281) | check-scale-view-navigation `@S05 @p1`, `@S05 @p2` | covered | — |
| Record **not found** → clear error (re-grounded ERR-001) | S06 / ERR-001, technical.md:140 | `getCheckScale` throws on `[]` → `isError` → Error state (View index.tsx:162-170) | check-scale-view-navigation `@S06 @p1 @ERR-001` | covered | re-grounded text "Could not retrieve check scale data." (legacy "check scale not found") |
| STA-002/005 — "Add Check Scale" / "Delete" hidden when `checkScaleCreate`/`checkScaleDelete` denied | S05 / STA-002/005, technical.md:135,138 | **no per-element permission model** — all buttons always render (View index.tsx:282-294) | — (re-grounded: assert buttons **present** in `@S05 @p1`) | not-applicable | Coverage gap #1 |
| STA-006 — "Create Letter" hidden when `checkScaleAdvisoryLetterReport` denied | S05 / STA-006, technical.md:139 | same — Create Letter always renders | — | not-applicable | Coverage gap #1 |
| Scaler **tombstone context lost** on direct nav → blank list, no error (ERR-002) | S07 / ERR-002, technical.md:141 | legacy session-tombstone mechanic — **no new-app equivalent** (tab is deep-linked by licence; empty licence → "No check scales found" empty state) | — | not-applicable | Coverage gap #2 |
| Who-Did-It audit popup | S01/S04 / technical.md:126,158 | not rendered on the new view screen | — | not-applicable | Coverage gap #3 |

**Symmetry check:** the original × check mirror is covered by asserting both the Original and Check rows
of the Check Scale Summary table and both scaler-licence links (check + original). Legacy × non-legacy is
covered (S04 legacy 905002, S05 non-legacy 905021). Entry-point mirror (scaler list × scale-site list) is
covered (S01 × S02).

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`). Legacy permission-gated
visibility (STA-002/005/006, "wrong role denied") has **no new-app equivalent** — the new view renders every
action button for everyone, so there is no hidden/denied state to assert. Logged as Coverage gap #1; the
re-grounded behavior (buttons always present) IS asserted in S05.

**Status values:** `covered` · `not-applicable` (legacy-only) · see Coverage gaps in defects.md.
