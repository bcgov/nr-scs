# Coverage — UC-MSD-005 Maintain Scale Site MSD Tab

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-MSD-005-S01..S06.feature` + `UC-MSD-005-slices.md` (control/message matrix)
+ `UC-MSD-005-technical.md`, against the app's read path (`pages/View/ScaleSite/components/tabs/MsdTab.tsx`;
`ScaleSiteMarkSiteDesignationService.listByScaleSite` → PL/SQL `scs_msd_vw_pkg.search_recs` → view
`SCS_MSD_VW`). Route: `/scale-sites/view/:scaleSiteIdNmbr?tab=msd` (tab slug `msd`, index 5). Read endpoint:
`GET /api/scale-sites/{id}/mark-site-designations`.

**Scope note — display + navigation UC (no writes).** The MSD tab lists a site's designated timber marks
(each a `RouterLink` → `/mark-site-designations?timberMark={mark}`) and an always-present "Add Mark Site
Designation" button (→ `/mark-site-designations/create`); an empty site renders an `EmptySection`. Tests
open **discovered real sites read-only** — parallel-safe by construction, no seed / no cleanup. `SCS_MSD_VW`
= district_wide='N' marks (via `hauling_mark_site`) UNION district_wide='Y' marks expanded to **every site
in the org unit**, so "tab-empty" means no site-specific mark AND no org-unit district-wide mark. Anchors
pinned in `fixtures/msd/msd-test-data.ts`: site `28E` lists mark `GE5412` (stable, non-pool); site `201`'s
tab is empty (org_unit 1823 ≠ 1831 → stays empty even under UC-MSD-001 S01's transient district-wide
create). Ground-truthed against the live stack 2026-07-22.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| MSD tab renders "MSD - Timber Marks" + mark grid (S01) | slices.md S01; technical.md:55 | `MsdTab.tsx` `<h4>` + `<Table>` | scale-site-msd-tab.feature `@S01 @p1` | covered | — |
| Timber mark rendered as a link (STA-001, S03) | slices.md S01/S03; technical.md:152 | `MsdTab.tsx` `RouterLink to=/mark-site-designations?timberMark=` | `@S01` (link shown) + `@S03` (navigates) | covered | — |
| "Add Mark Site Designation" button present (STA-002, S04) | slices.md S01/S04; technical.md:193 | `MsdTab.tsx` Add button → `/mark-site-designations/create` | `@S01` (shown) + `@S04 @p1` (navigates) | covered | — |
| Empty grid when no designated marks (S02, STA-003) | slices.md S02; technical.md:117 | `MsdTab.tsx` `EmptySection` when `designations.length===0` | `@S02 @p2` | covered | — |
| Navigate to MSD list via mark link (S03) | slices.md S03; technical.md:139 | `RouterLink` → `/mark-site-designations?timberMark={mark}` | `@S03 @p2` | covered | — |
| Add button enters MSD create flow (S04) | slices.md S04; technical.md:180 | `navigate('/mark-site-designations/create')` | `@S04 @p1` | covered | — |
| Owner-filtered view (STA-004) | slices.md S01; technical.md:76 | (no client-side owner filter; single mock role) | — | not-applicable | subsumed by S01 (no distinct observable) |
| Links + Add hidden without `markSiteView`/`markSiteCreate` (S05) | slices.md S05; technical.md:215-241 | (none — new app never role-gates the tab; both always render) | — | not-applicable | Divergence #1 (log-only) |
| Not authorized accessing tab (S06 · ERR-001) | slices.md S06; technical.md:281 | `ProtectedRoute` (route-level `SCS_SYS_ADMIN`) | — | blocked | Coverage gap #1 (mock auth) |

**Symmetry check:** both grid states covered — marks-present (S01) and empty (S02). Both navigation entry
points covered — the timber-mark link (S03 → MSD list) and the Add button (S04 → create). The legacy
permission-gated arm (S05 hidden links/button) has no new-app equivalent (the tab is never role-gated) →
logged as Divergence #1, not silently dropped.

**Role / permission coverage:** the new app does **not** gate the tab's links or Add button by role (both
render for any authenticated user; the backend enforces `@IsScsEditor` only on the downstream create/update
endpoints). So the legacy per-element hide (S05) is `not-applicable`, and the route-level not-authorized
branch (S06) is `blocked` by single-role mock auth. See Divergence #1 / Coverage gap #1.

**Status values:** `covered` · `not-applicable` (legacy-only / no new-app equivalent) · `blocked` (env/auth) · `divergence` (log-only entry or a genuinely-failing `@discovered-divergence` test — see this UC's `defects.md`).
