# ── REAL END-TO-END GENERATION (no stubbing) ────────────────────────────────────────────────────────────
# Covers the legacy happy-path delivery slice, ENVIRONMENT-BLOCKED until the local report engine started
# working (2026-08-11): the request reaches JasperServer, Jasper renders `SCS_REP026`, the browser saves the
# file, and the SAVED BYTES are asserted.
#
# WHY THIS IS NOT REDUNDANT WITH UC-RPT-013. The two District Performance screens are near-clones pointing at
# DIFFERENT Jasper templates (SCS_REP025 vs SCS_REP026). That is precisely the pair where a copy-paste would
# leave both screens rendering the same report — plausible-looking output answering the wrong question. The
# unit layer asserts each endpoint requests its own `ReportDefinition`
# (`ReportServiceGuardsTest.districtSiteInspectionRendersItsOwnReport`); this asserts SCS_REP026 itself
# renders. Neither substitutes for the other.
#
# Every scenario supplies a From/To window because this screen REQUIRES one (see report.feature), inside the
# one-year cap it enforces. `@generation` grants a longer per-test budget (see steps/fixtures/rpt.ts).
# Read-only: generating a report persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-014
Feature: Generate District Site Inspection Performance Report — Real Report Generation

  @p1 @generation
  Scenario: The District Site Inspection Performance report renders a real PDF for a district
    Given I open the "District Site Inspection Performance" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"

