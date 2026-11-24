# Re-grounded onto the new app's Scale Site Register Report screen (route `/reports/scale-site-register` →
# `pages/Reports/ScaleSiteRegister` → shared `components/core/ReportPage` / `SortOptions` /
# `ReportOutputOptions`). The legacy slice asserted a Struts forward plus the control set; here that becomes
# the rendered <h1> plus each control by its new-app id. Scale Type is populated from the scale-type LOV, so
# it is asserted as present rather than by option content (LOV contents are real data, not pinned here).
#
# Shared behaviours (email/preview validation, delivery split, download filenames, submit-error branch) are
# authored ONCE on the archetype screen — see `features/rpt/uc-rpt-010-scaler-register/` — because all nine
# report screens are the same ReportPage tree. See coverage.md.
# Read-only: the parameter form fetches only LOVs and persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-011
Feature: Generate Scale Site Register Report — Parameter Form

  @p1
  Scenario: The Scale Site Register Report parameter form renders its full control set
    Given I open the "Scale Site Register" report
    Then the "Scale Site Register" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "scale-type" is displayed
    And the report parameter "site-number" is displayed
    And the report parameter "authorization-status" is displayed
    And the report parameter "from-date" is displayed
    And the report parameter "to-date" is displayed
    And the report sort order options are displayed
    And the report output options are displayed
