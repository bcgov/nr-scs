# Re-grounded from UC-CHK-007 (View Scaler Check-Scale List): S01 (happy list + stats), S02 (empty),
# S03 (filter by licence role). The remaining slices are logged in coverage.md / defects.md and not
# authored: S04 (permission-hidden Add/link) — the new app has no per-element permission mechanism, so
# every control renders (the re-grounded positive is asserted in S01); S05 (missing session tombstone) —
# the new app has no tombstone, the scaler licence comes from the URL; S06 (unauthorized role) — mock
# auth grants only SCS_SYS_ADMIN.
#
# Re-grounding notes:
#  - Legacy standalone screen .scalerCheckScales (P012) is the new app's Check Scales TAB inside the
#    Scaler view (/scalers/view/{lic}?tab=check-scales).
#  - Legacy "select filter + click Refresh" is re-grounded to a client-side filter Select that
#    auto-refreshes (no Refresh button).
#  - Data is REAL (loaded from a dev extract, 2026-07-15). Fixtures are grounded on the ACTUAL scaler
#    Check-Scales tab endpoint (GET /api/scalers/{lic}/check-scales?filter=), which classifies by the
#    tab's primary/secondary/check licence fields — NOT the raw original_scaler_licence_no column.
#    Record 145988 shows in scaler 7443's tab as PRIMARY and scaler 7444's tab as CHECK. Both 7443 and
#    7444 have a WORKING view page (/summary 200) — required so the tab route renders. Verified:
#      /scalers/7443/check-scales?filter=All   -> has 145988   ; ?filter=Check -> absent
#      /scalers/7444/check-scales?filter=Check -> has 145988   ; ?filter=Primary -> absent
#  - NOTE (real-data gap): 28/50 seeded scalers have a broken /summary (404 — their org-unit/client
#    reference rows weren't in the capped load), so their view page errors and they are unusable as
#    fixtures. These scalers are chosen from the 22 whose view page works. See the branch commit notes.
#  - Empty-list scaler 7225 is a seeded scaler with a working view page and zero check scales.
#  - Assertions check presence/absence of the permanent record 145988, never row counts.

@chk @UC-CHK-007
Feature: View Scaler Check-Scale List

  @S01 @p1
  Scenario: The Check Scales tab lists the scaler's check scales with statistics (default All filter)
    Given I am on scaler "7443"'s Check Scales tab
    Then the Check Scale Statistics section is displayed
    And the Check Scale Summary table shows the expected columns
    And the Check Scale Summary table lists check scale "145988"
    And check scale "145988" is shown as a link to its view page
    And the Add Check Scale button is available

  @S02 @p2
  Scenario: A scaler with no check scales shows an empty list with no error
    Given I am on scaler "7225"'s Check Scales tab
    Then the Check Scales list should be empty

  # S03 — filter by licence role. Each row asserts the permanent record 145988 against a role the scaler
  # holds (present) and a role it does not (absent), which also proves the filter re-queries and that a
  # no-match filter empties the list. Parallel-safe (presence of a specific id, not a count).
  @S03 @p1
  Scenario Outline: Filtering the list by licence role narrows it to the scaler's matching check scales
    Given I am on scaler "<scaler>"'s Check Scales tab
    When I set the Check Scales filter to "<filter>"
    Then check scale "145988" "<presence>" in the filtered list

    Examples:
      | scaler | filter  | presence   |
      | 7443   | All     | is present |
      | 7443   | Check   | is absent  |
      | 7444   | Check   | is present |
      | 7444   | Primary | is absent  |
