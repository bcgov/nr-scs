# Defects — UC-CHK-008 View Site Check-Scale List

> How this log works (registers, tags, how to read an entry): [`defects-guide.md`](../../../defects-guide.md)

Read-only UC and the sibling of UC-CHK-007. Re-grounded onto REAL data (2026-07-15): scenarios open
**permanent** records read-only via the Scale Site view's Check Scales tab — site 28E (holds real check
scale 145761) and site 13A (a real site with no check scales). Nothing mutates, so they need no cleanup
and are parallel-safe. S01 (list) + S02 (empty) + S03 (type-filter no-match) green. See Coverage gap #3:
the type-filter "matching type keeps the record" arm is blocked by a stale LOV vs real-data mismatch.

**Bug / Regression:** _none._

**Divergences:** _none._ The list, 14-column table, type filter, and empty state all match the
re-grounded Gherkin.

**Coverage gaps (not tested yet — no app problem):**

- **#1 — Can't test the permission-hidden Add button / plain-text Check Scale # (S05).**
  - **What's missing:** legacy hid the "Add Check Scale" button when `checkScaleCreate` was denied and
    rendered the Check Scale # as plain text (not a link) when `checkScaleView` was denied (STA-001/002).
    The new app has **no per-element permission mechanism** — the Add button and the Check Scale # link
    always render — and the test login is always a full admin, so the "hidden" states can't be produced.
  - **What we did instead:** asserted the re-grounded positive (Add button present, Check Scale # is a
    link) in S01.
  - **Future action:** revisit when per-element permissions are built. (Identical to UC-CHK-007 gap #1.)
  - **Status:** OPEN. Found 2026-07-13.
  - **Test (covers the re-grounded behavior):** `e2e/features/chk/uc-chk-008-view-list/check-scale-site-list.feature` (S01 `@p1`).

- **#2 — No equivalent of the legacy "no site context in session" case (S06).**
  - **What's missing:** legacy `.scaleSiteCheckScales` read the scale-site id from a **session
    tombstone**; arriving without it returned an input-forward with no data. The new app has no session
    tombstone — the site id is a path segment in the tab URL (`/scale-sites/view/{site}?tab=check-scales`)
    — so there is no "missing site context" state to reproduce. (The tab does render a "No scale site
    number is available" empty state if the id is blank, but that isn't reachable through normal nav.)
  - **Verdict:** legacy-only session mechanic, **not a defect**. No scenario authored. (Sibling of
    UC-CHK-007 gap #2.)
  - **Future action:** none unless a session-context entry point is introduced.
  - **Status:** OPEN. Found 2026-07-13.

- **#3 — Can't test the "filter to a matching type keeps the record" arm (S03 present) on real data.**
  - **What's wrong:** the type-filter dropdown's options come from the LOV
    `GET /api/static-lov?tableKey=CHECK_SCALE_TYPE_CODE`, which still returns the **mock** codes
    `LTS` / `SPL` / `STD` (descriptions end in "(test)"). The **real** loaded check scales use type codes
    `FST` / `SEC`. The option set and the data therefore do not intersect, so there is no selectable type
    that any real record actually has — the "matching type → record stays listed" assertion is impossible.
  - **Expected vs actual:** expected the type LOV to offer the codes present in the data (FST/SEC); actual
    it offers stale mock codes (LTS/SPL/STD) that no loaded record uses.
  - **How caught:** `selectOption('FST')` timed out (no such option); probing the LOV endpoint returned
    LTS/SPL/STD "(test)" while `SELECT DISTINCT check_scale_type_code FROM the.check_scale` returns FST/SEC.
  - **What we did (after the cache fix):** S03 now covers BOTH arms against real data — selecting the
    record's own type `FST` keeps 145761 listed (match), and selecting `SEC` (which it lacks) empties it
    (no-match). Before the eviction fix, only the no-match arm was possible (via the stale mock `STD`).
  - **Root cause (found 2026-07-15): a STALE LOV CACHE, not a data mismatch.** `scs_static_lov_pkg.static_lov_recs`
    selects directly `FROM CHECK_SCALE_TYPE_CODE` (which holds FST/SEC), but the backend's `LovCacheWarmer`
    warmed the `lov-static` cache at **app startup — before the real data load** — so the cache held the
    mock LTS/SPL/STD. Evicting the LOV cache (`POST /api/api/internal/cache/evict`) makes the endpoint
    return the real **FST/SEC**. No data/seed change is needed; after any backend restart the warm-up
    re-reads the (now real) table correctly.
  - **Operational fix:** after loading real data into a running app, evict the LOV cache (or restart the
    backend). This is now part of the E2E environment setup.
  - **Status:** RESOLVED. Found 2026-07-15, resolved 2026-07-15 via LOV cache eviction; both filter arms
    (match `FST` / no-match `SEC`) are now wired and green in S03.
  - **Test (covers both arms):** `e2e/features/chk/uc-chk-008-view-list/check-scale-site-list.feature` (S03 match `FST` + S03/S04 no-match `SEC`).

**Spec gaps (the Gherkin is missing scenarios its own docs list):** _none._ The S01 `.feature` asserts a
representative subset of the 14 summary columns (all `bean:write` display-only, no validation); asserting
the column subset + the Check Scale # link + Add button is sufficient list coverage.

**Verified — not a defect:**

- **The legacy standalone screen is re-grounded to a tab.** Legacy `.scaleSiteCheckScales` (P057) is a
  standalone Struts screen; the new app renders the same list as the **Check Scales tab** inside the Scale
  Site view (`/scale-sites/view/{site}?tab=check-scales`), sharing the exact `CheckScaleSummaryTable` with
  the Scaler tab (UC-CHK-007). Deliberate re-grounding; the tests navigate via the tab. (Verified 2026-07-13.)
- **The site tab has no statistics section (the scaler tab does).** UC-CHK-007's scaler tab renders a
  Check Scale Statistics section; the scale-site tab renders only the filter + summary table. Matches the
  legacy screens (the site list JSP had no stats block). No stats assertion is made for this UC. (Verified 2026-07-13.)
- **Filter is by check-scale TYPE code, and the Refresh button is gone.** Legacy required selecting a type
  then clicking **Refresh**; the new app's filter `Select` (`checkScaleTypeCode`) re-queries immediately.
  The re-grounded scenarios select the type and assert the re-rendered list, with no Refresh click.
  Deliberate. (Verified 2026-07-13.)
