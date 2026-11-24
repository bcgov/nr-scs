/**
 * UC-QRY-008 — View Scale Site Activity Summary. Read-only tab; no seed / cleanup.
 *
 * Ground-truthed 2026-09-02 against the seeded extract (:1525) via:
 *   GET /api/scale-sites/{id}/activity-summary            (X-Mock-Roles absent => full admin, per ApiAccessProbe)
 *   SELECT scale_site_id_nmbr, TO_CHAR(last_scale_date,'YYYY-MM-DD') d,
 *          number_of_samples, sample_volume, tot_volume
 *     FROM SCS_SCALE_SITE_ACTIVITY_VW WHERE scale_site_id_nmbr IN ('312','520');
 *
 * DATA REALITY (drift guard — re-verify + re-pin on any DB re-extract): the extract has NO site with live
 * 12-month activity. Across all 397 view rows, number_of_samples = 0, sample_volume = NULL and tot_volume = 0
 * for EVERY site; only last_scale_date varies (37 sites, all pre-2016 — the newest is 312 @ 2015-01-20). The
 * "last 12 months" window has slid past the snapshot's transactions. So the only real S01-vs-S02 axis the
 * data supports is "has a last return date" (312) vs "has none" (520); the "populated numeric metrics" arm
 * is data-blocked (see coverage.md / defects.md Coverage gap).
 *
 * Display column: what ActivityTab renders is asText(apiValue) (@/utils/display) — null/undefined -> '—',
 * a number (INCLUDING 0) -> its string, an ISO date string -> itself (no reformat). So 0 shows as "0" and a
 * null shows as an em dash, NOT the legacy blank string.
 */

// The four summary row LABELS live literally in summary.feature's DataTable (the executable spec) and in
// nr-scs ActivityTab; they are deliberately not duplicated here — a rename in the app fails the feature.

/** A scale site WITH recorded activity — it has a last return date (the newest one in the extract). */
export const siteWithActivity = {
  scaleSiteIdNmbr: '312',
  // GET /api/scale-sites/312/activity-summary
  api: { lastScaleDate: '2015-01-20', numberOfSamples: 0, sampleVolume: null, scaledVolume: 0 },
} as const;

/** A scale site with NO recorded activity — no last return date (an empty roll-up). */
export const siteWithoutActivity = {
  scaleSiteIdNmbr: '520',
  // GET /api/scale-sites/520/activity-summary
  api: { lastScaleDate: null, numberOfSamples: 0, sampleVolume: null, scaledVolume: 0 },
} as const;

/**
 * A scale-site id absent from the extract: the activity endpoint answers 404 (the legacy uncaught-crash
 * path, now fixed). GET /api/scale-sites/ZZ9/activity-summary
 *   -> 404 {"code":"NOT_FOUND","message":"No scale site found with id ZZ9."}
 */
export const absentScaleSiteId = 'ZZ9';
export const absentScaleSiteNotFoundMessage = 'No scale site found with id ZZ9.';

/** Resolve the human-readable kind used in the .feature files to its pinned fixture. */
export const siteByKind: Record<string, typeof siteWithActivity | typeof siteWithoutActivity> = {
  'a recorded last return date': siteWithActivity,
  'no recorded activity': siteWithoutActivity,
};
