# Re-grounded from UC-CHK-008 (View Site Check-Scale List): S01 (happy list), S02 (empty), S03 (filter by
# check-scale type) + S04 (filtered → no results, folded into the S03 outline's "absent" row). The
# remaining slices are logged in coverage.md / defects.md and not authored: S05 (permission-hidden
# Add/link) — the new app has no per-element permission mechanism, so every control renders (the
# re-grounded positive is asserted in S01); S06 (no site context in session) — the new app has no
# tombstone, the site id comes from the URL.
#
# Re-grounding notes:
#  - Legacy standalone screen .scaleSiteCheckScales (P057) is the new app's Check Scales TAB inside the
#    Scale Site view (/scale-sites/view/{site}?tab=check-scales). Sibling of UC-CHK-007 (scaler tab);
#    same CheckScaleSummaryTable, but filtered by check-scale TYPE code (not licence role) and with NO
#    statistics section.
#  - Legacy "select filter + click Refresh" is re-grounded to a client-side filter Select that
#    auto-refreshes (no Refresh button).
#  - Data is REAL (loaded from a dev extract, 2026-07-15). Site 28E has real check scales; 145761 is one
#    (its tab returns it). Discovered via GET /api/scale-sites/28E/check-scales.
#    The type-filter LOV now returns the real codes FST/SEC (it had shown stale mock LTS/SPL/STD until the
#    LOV cache — warmed at app startup before the data load — was evicted; see defects.md gap #3, RESOLVED).
#    Record 145761 is type FST, so both filter arms are now testable: FST keeps it, SEC (which it lacks) empties it.
#  - Empty-list site 13A is a seeded site with zero check scales (SELECT ... WHERE NOT EXISTS ...).
#  - Assertions check presence/absence of the permanent record 145761 (site 28E, type FST), never row
#    counts — create suites may transiently add rows.

@chk @UC-CHK-008
Feature: View Site Check-Scale List

  @S01 @p1
  Scenario: The Check Scales tab lists the site's check scales (unfiltered)
    Given I am on scale site "28E"'s Check Scales tab
    Then the Check Scale Summary table shows the expected columns
    And the Check Scale Summary table lists check scale "145761"
    And check scale "145761" is shown as a link to its view page
    And the Add Check Scale button is available

  @S02 @p2
  Scenario: A site with no check scales shows an empty list with no error
    Given I am on scale site "13A"'s Check Scales tab
    Then the Check Scales list should be empty

  # S03/S04 — filter by check-scale type. Both arms are now testable (the LOV returns the real FST/SEC
  # after the startup cache was evicted — see the header note + defects.md gap #3). Record 145761 is FST.
  @S03 @p1
  Scenario: Filtering the list by the record's own check-scale type keeps it listed (match)
    Given I am on scale site "28E"'s Check Scales tab
    When I set the check-scale type filter to "FST"
    Then check scale "145761" "is present" in the filtered list

  @S03 @S04 @p1
  Scenario: Filtering the list by a check-scale type the record lacks empties it (no-match)
    Given I am on scale site "28E"'s Check Scales tab
    When I set the check-scale type filter to "SEC"
    Then check scale "145761" "is absent" in the filtered list
