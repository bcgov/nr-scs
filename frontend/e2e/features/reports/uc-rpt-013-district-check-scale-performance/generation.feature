# ── REAL END-TO-END GENERATION (no stubbing) ────────────────────────────────────────────────────────────
# Covers the legacy happy-path delivery slice, ENVIRONMENT-BLOCKED until the local report engine started
# working (2026-08-11): the request reaches JasperServer, Jasper renders `SCS_REP025`, the browser saves the
# file, and the SAVED BYTES are asserted. Per-report rather than once on the archetype because each report is
# a different Jasper template that can break on its own — and this report's TWIN (UC-RPT-014, SCS_REP026) is
# a near-clone screen pointing at a different template, which is exactly the pair a copy-paste would confuse.
# `report.feature` asserts each endpoint requests its own ReportDefinition; this asserts the template behind
# it actually renders.
#
# Every scenario supplies a From/To window because this screen REQUIRES one (see date-validation.feature),
# and keeps it inside the one-year cap the screen enforces.
#
# The EMPTY-RESULT scenario is worth having and is only meaningful with a real engine: a window with no
# activity still renders a valid PDF (Jasper lays out the headings and a no-data body) rather than erroring.
# Confirmed by probing the stack 2026-08-11 — a far-future window returned a ~50KB PDF, so "no data" and
# "broken" are genuinely distinguishable outcomes for a user.
#
# `@generation` grants a longer per-test budget (see steps/fixtures/rpt.ts).
# Read-only: generating a report persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-013
Feature: Generate District Check Scale Performance Report — Real Report Generation

  @p1 @generation
  Scenario: The District Check Scale Performance report renders a real PDF for a district
    Given I open the "District Check Scale Performance" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2024-01-01"
    And I set the report date "to-date" to "2024-12-31"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"

  @p2 @generation
  Scenario: A window with no activity still renders a valid report rather than failing
    Given I open the "District Check Scale Performance" report
    When I select the report Reg / Dist "DCC"
    And I set the report date "from-date" to "2099-01-01"
    And I set the report date "to-date" to "2099-12-31"
    And I submit the report and download the generated file
    Then the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"

