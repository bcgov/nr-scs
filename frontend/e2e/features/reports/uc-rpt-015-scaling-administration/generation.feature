# ── REAL END-TO-END GENERATION — ONE render per report, run in sequence ─────────────────────────────────
# Jasper renders `SCS_REP015` for real and the SAVED BYTES are asserted. One render per report, run in
# sequence — full rationale in ../uc-rpt-012-mark-site-designation-report/generation.feature.
#
# This endpoint is the one used as the standing probe for the (now closed) Jasper blocker, so it is also the
# report whose recovery is most directly asserted. The single render supplies a date window as well as the org
# unit, so the ordinary filtered case is what actually renders.
#
# XLS is not re-tested per report — shared code, proven once on the archetype (UC-RPT-010).
# Read-only: generating a report persists nothing → no seed, no cleanup.
@rpt @UC-RPT-015
Feature: Generate Scaling Administration Report — Real Report Generation

  @p1 @generation
  Scenario: The Scaling Administration report renders a real PDF for a district and date window
    Given I open the "Scaling Administration" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"
