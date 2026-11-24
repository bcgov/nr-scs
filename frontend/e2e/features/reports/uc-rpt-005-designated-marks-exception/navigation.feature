# Re-grounded onto the new app's Designated Marks Exception Report screen. NOTE the deliberate
# route/endpoint asymmetry: the SPA route is SINGULAR (`/reports/designated-mark-exception`) while the API
# path is PLURAL (`POST /api/reports/designated-marks-exception`) — both are asserted (the route by opening
# the screen, the endpoint by the payload scenarios), so a future "tidy-up" of either cannot pass silently.
#
# This is the only report screen with TWO Reg / Dist controls (`mark-reg-dist` and `site-reg-dist`) and TWO
# multi-value pill fields (`designated-marks`, `designated-sites`) — the report cross-references marks
# against the sites they appear at, so each side is filtered independently.
# Read-only: the form fetches only LOVs and persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-005
Feature: Generate Designated Marks Exception Report — Parameter Form

  @p1
  Scenario: The Designated Marks Exception Report parameter form renders its full control set
    Given I open the "Designated Marks Exception" report
    Then the "Designated Marks Exception" report screen is displayed
    And the report parameter "from-date" is displayed
    And the report parameter "to-date" is displayed
    And the report parameter "mark-reg-dist" is displayed
    And the report parameter "designated-marks" is displayed
    And the report parameter "site-reg-dist" is displayed
    And the report parameter "designated-sites" is displayed
    And the report output options are displayed
