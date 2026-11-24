# Re-grounded onto the new app's Mark Site Designation Report screen (route
# `/reports/mark-site-designation` → `pages/Reports/MarkSiteDesignation` → shared `ReportPage`). NOTE this is
# the REPORT (a list of designations, `SCS_REP*`), NOT the per-record MSD **letter** — that is UC-RPT-009,
# covered under `features/mark-site-designation/uc-rpt-009-msd-letter/`.
#
# The screen has no sort-order block (it is not a register report), so `the report sort order options are
# displayed` is deliberately NOT asserted here. The "Specific Timber Marks / Scale Site #" control is a
# `MultiValueInput` (pill field) whose LABEL changes with the Timber Mark/Site selector — that label switch is
# asserted in `parameters.feature` alongside the payload it produces.
# Read-only: the form fetches only LOVs (Mark Exceptions comes from the static LOV) → no seed, no cleanup.
@rpt @UC-RPT-012
Feature: Generate Mark Site Designation Report — Parameter Form

  @p1
  Scenario: The Mark Site Designation Report parameter form renders its full control set
    Given I open the "Mark Site Designation" report
    Then the "Mark Site Designation" report screen is displayed
    And the report parameter "reg-dist" is displayed
    And the report parameter "mark-or-site" is displayed
    And the report parameter "specific-values" is displayed
    And the report parameter "mark-exceptions" is displayed
    And the report parameter "effective-from" is displayed
    And the report parameter "effective-to" is displayed
    And the report parameter "expiry-from" is displayed
    And the report parameter "expiry-to" is displayed
    And the report output options are displayed
