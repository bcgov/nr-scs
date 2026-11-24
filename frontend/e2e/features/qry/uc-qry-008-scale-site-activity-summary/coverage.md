# Coverage — UC-QRY-008 View Scale Site Activity Summary

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-QRY-008-S01..S05.feature` + `UC-QRY-008-slices.md` (control/message/field
matrix) + `UC-QRY-008-detailed.md` (AP1/EP1/EP2), against the new app's read path
(`pages/View/ScaleSite/components/tabs/ActivityTab` → `scaleSiteActivity.service` →
`GET /api/scale-sites/{id}/activity-summary` → `ScaleSiteActivityService`/`ScaleSiteActivityRepository`
→ `scs_scale_site_activity_vw_pkg`).

**Re-groundings:** the legacy SEPARATE screen `.scaleSiteSummaryActivityView` (P052) at `/scaleSiteActivity.do`,
driven by a **session tombstone**, becomes the **Activity Summary tab** on the scale-site view
(`/scale-sites/view/{id}?tab=activity-summary`). Field rename `totVolume` → `scaledVolume`. Null metrics
render as an em dash **'—'** (`asText`, `@/utils/display`), NOT the legacy blank string (Divergence #1,
log-only). There is **no session tombstone** (the id is a path param), so the legacy S05 "tombstone missing"
uncaught crash re-grounds to a clean **HTTP 404** on the endpoint (Verified #1). The legacy tombstone
**Search** button (S03/STA-001) does not exist on this screen in the new app.

**Data:** sites `312` (has a last return date `2015-01-20`) and `520` (no last return date), absent id `ZZ9`,
pinned in `fixtures/qry/qry-scale-site-activity-test-data.ts` (ground-truthed 2026-09-02). The extract has
**no** site with 12-month samples/volume > 0 (see Coverage gap #3). Read-only UC — no seed / cleanup; the
anchor sites are shared read-only, so parallel-safe.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| S01 view activity for a site with data | S01.feature; slices.md:47 | `ActivityTab` query → `GET /scale-sites/{id}/activity-summary` | summary.feature `@S01 @p0` (312) | covered | — |
| Date of Last Return field | slices.md:69; technical fields | `ActivityTab` row 1 (`asText(lastScaleDate)`) | summary.feature `@S01/@S02` | covered | — |
| Number of Samples (last 12 months) field | slices.md:70 | `ActivityTab` row 2 (`asText(numberOfSamples)`) | summary.feature `@S01/@S02` | covered | — |
| Sample Volume (last 12 months) field | slices.md:71 | `ActivityTab` row 3 (`asText(sampleVolume)`) | summary.feature `@S01/@S02` | covered | — |
| Scaled Volume (last 12 months) field | slices.md:72 (legacy `totVolume`) | `ActivityTab` row 4 (`asText(scaledVolume)`) | summary.feature `@S01/@S02` | covered | field renamed `totVolume`→`scaledVolume` |
| BR-QRY-008-01 data sourced from the activity view | slices.md:94 | repo `scs_scale_site_activity_vw_pkg.search_recs` | summary.feature `@S01/@S02` (API read-back parity) | covered | — |
| S02/AP1 empty roll-up (no activity) | S02.feature; detailed AP1; slices.md:98 | null metrics → `asText` → '—'; zero counts → '0' | summary.feature `@S02 @p1` (520) | covered (re-grounded) | Divergence #1 (null→'—', not blank) |
| S02 "no error/warning shown" for empty result | S02.feature | table renders; no error `InlineNotification` | summary.feature `@S02 @p1` | covered | — |
| S05/EP2 tombstone missing → legacy uncaught crash | S05.feature; detailed EP2; slices.md:224 | `ScaleSiteActivityService` → `requireFound` → HTTP 404 `{code:NOT_FOUND}` | not-found.feature `@S05 @p1` (ZZ9) | covered (re-grounded) | Verified #1 (legacy crash fixed) |
| Tombstone strip: Scale Site #, Name, Region, District | slices.md:65-68 | `ScaleSiteHeader` band (every tab), owned by scale-site view / SST | — | not-applicable | defects.md Coverage gap #1 |
| S03/STA-001 tombstone Search button hidden when `scalerSiteSearch` denied | S03.feature; slices.md:144 | new app has no per-tab tombstone Search button; tab gated by `SCALE_SITE_ACTIVITY_READ` | — | not-applicable | defects.md Coverage gap #2 |
| S04/EP1 not-authorized (wrong role) | S04.feature; slices.md:184; ERR-001 | `@RequiresPermission(SCALE_SITE_ACTIVITY_READ)` on endpoint + tab gating | covered elsewhere (SEC) | not-applicable (here) | defects.md Coverage gap #2 |
| Populated numeric metrics (samples/volume > 0) render | slices.md:70-72 | `asText(number)` | — (no such site in the extract) | blocked | defects.md Coverage gap #3 |
| Field FORMAT validation (dates etc.) | detailed (read-only UC) | (none — display-only, no user input) | — | not-applicable | read-only screen; slices.md:27 (0 validation slices) |

**Role / permission coverage:** authorization of the Activity Summary tab (which roles may read it) is
**covered elsewhere** — the SEC role-scoping suite probes `GET /api/scale-sites/{id}/activity-summary` in
`features/security/*/api-access.feature` and asserts the GUI tab in `gui-access` across the check-scaler,
read-only-internal and scale-site-owner columns. This UC exercises the **functional read** under the default
admin mock and deliberately does not duplicate the role matrix (S03/S04 → Coverage gap #2).

**Coverage gate (over coverage-eligible items, excluding `not-applicable`/`blocked`):** S01 (with-data
display + API parity), S02 (empty roll-up + no-error + API parity), S05 (clean 404) — all covered.
**P0 100% · P1 100% · overall 100%.** Excluded items — tombstone strip (SST/header), S03 tombstone Search
button (legacy-only control), S04 not-authorized (SEC), populated numeric metrics (data-blocked) — are
handed off as Coverage gaps #1–#3.

**Status values:** `covered` · `covered (re-grounded)` · `not-applicable` (legacy-only / owned elsewhere) ·
`blocked` (data) · `divergence`/`verified` (see this UC's `defects.md`; Divergence #1 is **log-only** — no
`@discovered-divergence` red).
