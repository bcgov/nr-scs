# ── REAL END-TO-END GENERATION (no stubbing) ────────────────────────────────────────────────────────────
# Covers legacy S01, ENVIRONMENT-BLOCKED until the local report engine started working (2026-08-11): the
# request reaches JasperServer, Jasper renders `SCS_REP014` for a real inspection, the browser saves the file,
# and the SAVED BYTES are asserted.
#
# THIS UC GAINS THE MOST from real generation. It is the only in-context report — its whole subject is one
# site inspection carried in the route — so before the engine worked, "does asking for inspection 322429
# actually produce that inspection's compliance assessment?" was unassertable at every layer: the screen has
# no parameters to check beyond the id, and its coverage.md listed the report CONTENT as blocked. Rendering it
# for a real inspection is what closes that.
#
# SCS_REP014 also resolves SUB-REPORTS from the deployed definition (noted in
# `ScaleSiteComplianceReportRequest`, which deliberately sends only P_USERID + P_INSPECTION_ID). A missing or
# renamed sub-report is invisible to any request-level assertion and shows up only on a real render — one of
# the clearest cases in this suite where only end-to-end generation can catch the failure.
#
# The inspection is the real legacy record pinned in `fixtures/rpt/report-test-data.ts`
# (`complianceInspectionId` = 322429, site 520), deliberately not the volatile seeded inspection 97.
# `@generation` grants a longer per-test budget (see steps/fixtures/rpt.ts).
# Read-only: generating a report persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-004
Feature: Generate Scale Site Compliance Report — Real Report Generation

  @p1 @generation
  Scenario: The compliance report renders a real PDF for a real inspection
    Given I open the Scale Site Compliance report for the sample inspection
    When I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"

