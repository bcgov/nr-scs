# ── REAL END-TO-END GENERATION (no stubbing) ────────────────────────────────────────────────────────────
# Covers the legacy happy-path delivery slice, which was ENVIRONMENT-BLOCKED until the local report engine
# started working (2026-08-11): the request reaches JasperServer, Jasper renders `SCS_REP007`, the browser
# saves the file, and the SAVED BYTES are asserted (a download event firing only proves the app asked the
# browser to save something — a zero-byte or wrong-format file would still fire it).
#
# Authored PER REPORT rather than once on the archetype, because every report is a DIFFERENT Jasper template
# resolved by name (`ReportDefinition.SCALE_SITE_REGISTER` → SCS_REP007) against different queries: any one
# of them can break on its own — a missing sub-report, a renamed parameter, a query the extract no longer
# satisfies — and only a per-report render would notice. That is the opposite of the SHARED download wiring,
# which is one component and so is asserted once (see ../uc-rpt-010-scaler-register/delivery.feature).
#
# Filtered to one district: province-wide renders are slow enough to exceed the suite's budget (the sibling
# Scaler Register exceeds 120s unfiltered). `@generation` grants a longer per-test budget — see
# `steps/fixtures/rpt.ts`, which also explains the 3-concurrent-render cap in `ReportService`.
# Read-only: generating a report persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-011
Feature: Generate Scale Site Register Report — Real Report Generation

  @p1 @generation
  Scenario: The Scale Site Register report renders a real PDF for a district
    Given I open the "Scale Site Register" report
    When I select the report Reg / Dist "DCC"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"

