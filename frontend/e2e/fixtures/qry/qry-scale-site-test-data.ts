/**
 * UC-QRY-004 (Search Scale Sites) — DB-grounded known values, discovered 2026-07-30 against the real
 * extract (container real-data-seeded-scs-db, :1525) via the app's own read path
 * `GET /api/scale-sites/search` (SP-backed) and `GET /api/scale-sites/inspection/search?inspectionId=`.
 * The parameter search is READ-ONLY, so these are pinned by real id/value and shared freely across
 * parallel tests — no mutation, no cleanup. The inspection-# happy path (S04) instead SEEDS a fresh
 * inspection via the API (see fixtures.ts `seedInspection`) because it needs a CIMS-viewable record it
 * owns and cleans up. Real data is non-deterministic across re-extracts: RE-VERIFY with each query.
 *
 * NOTE — the scale-site NAME search is a raw SQL `LIKE` passthrough: the app does NOT auto-wrap the typed
 * value in wildcards, so a user must type `%TEMBEC%` (not `TEMBEC`, which returns []). Confirmed 2026-07-30:
 * `?siteName=TEMBEC` -> [] but `?siteName=%TEMBEC%` -> 3 rows. Values below include the explicit `%` a user
 * types. (This wildcard-passthrough is logged for BA in defects.md — the scaler search, by contrast,
 * matches on a bare substring.)
 *
 * These are pinned to the TEMBEC family (sites 520/525), which are STABLE anchors also relied on by the
 * INS suite — deliberately chosen over the volatile ATCO rows (an earlier ATCO pin evaporated when the
 * local DB was reseeded mid-session). Re-verify with each comment's query on a DB re-extract.
 *
 * DRIFT GUARD: `multiResultSiteName` (count + site-520 membership) and `singleResultScaleSite` (exact
 * count + every cell field below) are asserted in preflight/anchors.setup.ts, which runs once before the
 * suite. So a reseed that shifts the TEMBEC family or the 520 row fails there with a clear re-ground
 * pointer — not as an opaque S01/S02 assertion mismatch mid-run. Keep those guards in sync with the
 * values here (and with search.feature:16/28/30) whenever you re-pin.
 */

/**
 * A SITE NAME substring matching MORE THAN ONE scale site -> the multi-result happy path (S01).
 * Query: GET /api/scale-sites/search?siteName=%TEMBEC%&primarySort=1&secondarySort=0
 *        -> 3 rows: 520 (TEMBEC - CANAL FLATS), 521 (TEMBEC CRANBROOK), 525 (TEMBEC - ELKO).
 */
export const multiResultSiteName = {
  value: '%TEMBEC%',
  expectedCount: 3,
  /** A stable INS-anchor scale site # guaranteed in the set — asserted as a link to its scale site view. */
  aScaleSiteId: '520',
} as const;

/**
 * A specific SCALE SITE # matching EXACTLY ONE site -> the single-result case (S02). The legacy app
 * auto-forwarded to the scale site view here (when scaleSiteIdNmbr was non-empty); the new app instead
 * lists the single row (see defects.md Divergence #1). Also the deterministic row used for the
 * columns + cell-data assertion. Scale-site-# search is EXACT (`?scaleSiteIdNmbr=52` -> [], `=520` -> 1).
 * Query: GET /api/scale-sites/search?scaleSiteIdNmbr=520 -> 1 row (the INS happy-path site 520).
 */
export const singleResultScaleSite = {
  value: '520',
  expectedCount: 1,
  siteName: 'TEMBEC - CANAL FLATS',
  region: 'Kootenay-Boundary Natural Resource Region',
  district: 'Rocky Mountain Natural Resource District',
  siteType: 'Piece Scale, Weight Scale',
  ownerDisplay: '00001402/00',
} as const;

// NOTE — the S03 (no-match), S05 (non-numeric inspection #) and S06 (unknown inspection #) values are NOT
// exported here: nothing in code consumes them (they are asserted directly as Gherkin literals), so keeping
// them as exports would be dead code. Their ground-truth provenance lives with the literals it grounds —
// in zero-results.feature (ZZZNOMATCH) and inspection.feature (ABC / 999999999 + the exact lookup queries).

/**
 * S04 happy-path inspection subject. A fresh inspection is SEEDED via the API on this real, CIMS-viewable
 * site (owner present in forest_client, so the inspection is viewable via the search endpoint's CIMS
 * check), then its id is entered on the search form. Verified 2026-07-30: seeding an inspection on site
 * 520 and calling `GET /api/scale-sites/inspection/search?inspectionId={seeded}` returns
 * `{inspectionId, scaleSiteIdNmbr: "520"}` (resolves + CIMS-viewable), and the app navigates to
 * `/scale-sites/520/inspections/view/{id}`. Site 520 is the INS happy-path site (see fixtures/ins).
 */
export const inspectionHappyPathSiteId = '520';
