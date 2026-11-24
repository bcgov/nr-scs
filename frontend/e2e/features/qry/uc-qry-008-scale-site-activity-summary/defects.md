# Defects — UC-QRY-008 View Scale Site Activity Summary

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

## Divergences

### Divergence #1 — a scale site with no recorded activity shows "—" instead of a blank field
- **What's wrong:** likely nothing — a display change. In the old system, a scale site with no scaling
  activity showed the Date of Last Return and the sample/volume figures as **blank** (empty text). The new
  app shows an **em dash "—"** for any figure it has no value for, and shows **"0"** for a count/volume that
  is genuinely zero.
- **Expected vs actual:** *Expected* (legacy S02/AP1): all four fields blank when there's no activity.
  *Actual*: null figures (Date of Last Return, Sample Volume) render as "—"; zero counts (Number of Samples,
  Scaled Volume) render as "0". No error or warning is shown either way.
- **How we caught it:** ground-truthed 2026-09-02 — `GET /api/scale-sites/520/activity-summary` returns
  `{lastScaleDate:null, numberOfSamples:0, sampleVolume:null, scaledVolume:0}`; `ActivityTab` renders each
  cell via `asText` (`@/utils/display`: null/undefined → "—", a number including 0 → its string). The green
  `@S02` test asserts this actual rendering.
- **Action:** BA/QA to raise a Jira ticket (confirm: is "—" for absent figures the intended presentation, or
  should empty roll-ups be blank like the legacy screen?).
- **Register / classification:** Divergence · suspected-intentional-change.
- **Severity/Priority:** sev4 / p3
- **UC / Gherkin slice:** UC-QRY-008-S02 — UC-QRY-008-S02
- **Environment / build:** nr-scs commit `25974f8`; local seeded DB (:1525).
- **Data fixture:** `fixtures/qry/qry-scale-site-activity-test-data.ts` (`siteWithoutActivity = 520`).
- **Status:** OPEN. **Found:** 2026-09-02. **Test:** covered by the actual-behaviour green scenario `summary.feature` `@S02` (no red — log-only).

## Coverage gaps

- **Coverage gap #1 — tombstone strip fields (Scale Site # / Name / Region / District) — owned elsewhere**
  - **What's wrong:** nothing. The legacy activity screen repeated the scale-site tombstone (Scale Site #,
    Name, Region, District) at the top. In the new app those live in the shared `ScaleSiteHeader` band that
    renders on **every** scale-site view tab, so they belong to the scale-site view / SST coverage, not to
    this tab's slice.
  - **Register / classification:** Coverage gap · not-applicable (owned by the scale-site view / SST).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `not-applicable`. **Found:** 2026-09-02.

- **Coverage gap #2 — S03/S04 permission + role gating — legacy-only control / owned by SEC**
  - **What's wrong:** nothing testable here. S03 asserts the tombstone **Search** button is hidden without
    the `scalerSiteSearch` permission — the new app has **no per-tab Search button** on this screen
    (legacy-only control). S04 asserts a wrong-role user is bounced to a not-authorized page — in the new
    app the tab and its endpoint are gated by `SCALE_SITE_ACTIVITY_READ` (`@RequiresPermission` on
    `ScaleSiteActivityController`; per-permission tab filter in `ScaleSiteViewPage`), and that authorization
    is **already covered by the SEC role-scoping suite** (`features/security/*/api-access.feature` probe the
    `/activity-summary` endpoint; `gui-access` assert the tab) across the check-scaler, read-only-internal
    and scale-site-owner columns. Re-testing it here would duplicate SEC.
  - **Register / classification:** Coverage gap · not-applicable (legacy-only control) + covered-elsewhere (SEC).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `not-applicable`. **Found:** 2026-09-02.

- **Coverage gap #3 — populated numeric metrics (samples / volume > 0) not asserted — data-blocked**
  - **What's wrong:** nothing in the app. The "with data" happy path can only prove a non-blank **Date of
    Last Return**, because the seeded extract has **no** scale site with 12-month samples or volume greater
    than zero: across all 397 rows of `SCS_SCALE_SITE_ACTIVITY_VW`, `number_of_samples = 0`,
    `sample_volume = NULL` and `tot_volume = 0`; only `last_scale_date` varies (37 sites, all pre-2016). The
    "last 12 months" window has slid past the snapshot's transactions. So rendering of non-zero sample/volume
    figures is not exercised.
  - **How we caught it:** ground-truthed 2026-09-02 —
    `SELECT COUNT(number_of_samples>0), COUNT(tot_volume>0) FROM SCS_SCALE_SITE_ACTIVITY_VW` → 0 / 0; the
    newest `last_scale_date` is site 312 @ 2015-01-20.
  - **Register / classification:** Coverage gap · blocked (test env / data can't reach the state).
  - **Severity/Priority:** — / p2 · **Status:** OPEN — `blocked`. Revisit if a site with in-window scaling
    activity is seeded (would need scale/sample transactions dated within 12 months of the run). **Found:** 2026-09-02.

## Verified — not a defect

### Verified #1 — the legacy "tombstone missing" crash is FIXED (clean 404)
- **What's wrong:** nothing — this is an improvement over the legacy behaviour, recorded so it isn't
  re-investigated. Legacy S05: with no session tombstone, `ScaleSiteActivitySummaryAction` called
  `returnList.get(0)` on an empty list and threw an uncaught `IndexOutOfBoundsException` (its catch block was
  commented out), falling through to a container error page.
- **Expected vs actual:** *Expected* (legacy): uncaught exception / container error page. *Actual* (new app):
  there is no session tombstone (the id is a path param); an unknown site id yields a clean **HTTP 404**
  `{"code":"NOT_FOUND","message":"No scale site found with id ZZ9."}`
  (`ScaleSiteActivityService` → `SCSUtils.requireFound` → `ResourceNotFoundException`). At the UI, an unknown
  id makes the scale-site view render a graceful "Could not load scale site" panel before the tab mounts.
- **How we caught it:** ground-truthed 2026-09-02 — `GET /api/scale-sites/ZZ9/activity-summary` → 404. Asserted
  green by `not-found.feature` `@S05`.
- **Register / classification:** Verified — not a defect · (legacy crash re-grounded to a designed 404).
- **UC / Gherkin slice:** UC-QRY-008-S05 — UC-QRY-008-S05
- **Status:** CLOSED (intended). **Found:** 2026-09-02. **Test:** `not-found.feature` `@S05 @p1`.
