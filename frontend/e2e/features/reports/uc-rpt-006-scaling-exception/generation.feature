# ── REAL END-TO-END GENERATION — ONE render per report, run in sequence ─────────────────────────────────
# Jasper renders `SCS_REP016` for real and the SAVED BYTES are asserted. Real renders are the suite's scarcest
# resource (2-16s each; only three concurrently), so each report gets exactly ONE and the `@generation` set runs
# in sequence — full rationale in ../uc-rpt-012-mark-site-designation-report/generation.feature.
#
# The single render uses a NON-DEFAULT sort order, so it carries the extra proof for free: `report.feature`
# shows the sort labels map onto the numeric primarySort/secondarySort codes in the REQUEST, and this shows
# SCS_REP016 actually accepts those codes and still renders. A report whose sort parameter expected a different
# domain would render fine on the default and fail only once the sort is changed.
#
# XLS is not re-tested per report — shared code, proven once on the archetype (UC-RPT-010).
# Read-only: generating a report persists nothing → no seed, no cleanup.
@rpt @UC-RPT-006
Feature: Generate Scaling Exception Report — Real Report Generation

  @p1 @generation
  Scenario: The Scaling Exception report renders a real PDF with a non-default sort order
    Given I open the "Scaling Exception" report
    When I select the report Reg / Dist "DCC"
    And I set the report primary sort to "Scale Site Number"
    And I set the report secondary sort to "Scaler Licence Number"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"
