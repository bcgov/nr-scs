# Re-grounded from UC-QRY-008 S01 (site WITH activity) + S02 (empty roll-up / AP1). The legacy SEPARATE
# screen `.scaleSiteSummaryActivityView` (P052) at `/scaleSiteActivity.do`, driven by a SESSION tombstone,
# becomes the "Activity Summary" TAB on the scale-site view (pages/View/ScaleSite/.../ActivityTab, route
# /scale-sites/view/{id}?tab=activity-summary), sourced from GET /api/scale-sites/{id}/activity-summary.
# Field rename: legacy `totVolume` -> `scaledVolume`. Null metrics render as an em dash '—' (asText),
# NOT the legacy blank string (defects.md Divergence #1 — log-only).
#
# DATA REALITY: the seeded extract has NO site with 12-month samples/volume (>0) — every view row has
# number_of_samples=0, sample_volume=NULL, tot_volume=0; only last_scale_date varies. So the real S01-vs-S02
# axis is "has a last return date" (site 312) vs "has none" (site 520). Sites + expected values are pinned in
# fixtures/qry/qry-scale-site-activity-test-data.ts (ground-truthed 2026-09-02); each UI table below is
# double-checked against an independent API read-back. Tab authorization is owned by the SEC suite.
@qry @UC-QRY-008
Feature: View Scale Site Activity Summary — display

  # S01 (happy path): a site WITH recorded scaling activity — it has a Date of Last Return. Proven both in
  # the UI table and by an API read-back of the activity-summary endpoint (BR-QRY-008-01: data from the view).
  @S01 @p0
  Scenario: The activity summary tab shows the metrics for a site with a recorded last return date
    When I open the activity summary for the scale site with "a recorded last return date"
    Then the activity summary table shows:
      | Field                               | Value      |
      | Date of Last Return:                | 2015-01-20 |
      | Number of Samples (last 12 months): | 0          |
      | Sample Volume (last 12 months):     | —          |
      | Scaled Volume (last 12 months):     | 0          |
    And the activity summary API for the scale site with "a recorded last return date" returns the pinned values

  # S02 (AP1) re-grounded: a site with NO recorded activity. The legacy app rendered every field as a blank
  # string; the new app renders absent (null) metrics as an em dash '—' (Date of Last Return, Sample Volume)
  # and the zero counts as "0". No error/warning is shown — an empty roll-up is a valid state.
  @S02 @p1
  Scenario: The activity summary tab shows an empty roll-up for a site with no recorded activity
    When I open the activity summary for the scale site with "no recorded activity"
    Then the activity summary table shows:
      | Field                               | Value |
      | Date of Last Return:                | —     |
      | Number of Samples (last 12 months): | 0     |
      | Sample Volume (last 12 months):     | —     |
      | Scaled Volume (last 12 months):     | 0     |
    And no activity error notification is shown
    And the activity summary API for the scale site with "no recorded activity" returns the pinned values
