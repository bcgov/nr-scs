# ── REAL END-TO-END GENERATION — ONE render per report, run in sequence ─────────────────────────────────
# Jasper renders `SCS_REP010` for real, the browser saves the file, and the SAVED BYTES are asserted (a
# download event firing only proves the app asked the browser to save something; a zero-byte or wrong-format
# file would still fire it).
#
# WHY ONLY ONE SCENARIO HERE. Real renders are the suite's scarcest resource — 2-16s each, and
# `ReportService` permits only three concurrently. So each report gets exactly ONE real render, and the
# `@generation` set runs **in sequence, never in parallel** (`npm run test:generation`; the default `npm test`
# excludes it entirely). Everything that does not need a rendered document — every payload/parameter
# assertion — runs against a stubbed response instead (see steps/fixtures/rpt.ts).
#
# So this single render is made to carry as much as it can: it populates the SIX-SLOT specific-mark filter
# rather than submitting an empty form. `parameters.feature` already proves the pill field fans out onto
# `siteMark1..6` in the REQUEST; this proves Jasper *accepts* that shape and still renders — the half a
# request-only assertion cannot reach, since a report declaring different parameter names would render fine
# with them all empty and fail only once one is filled. XLS is not re-tested per report: the format switch is
# shared code, proven once end-to-end on the archetype (UC-RPT-010).
#
# Filtered to one district — province-wide renders are far slower (the sibling Scaler Register exceeds 120s).
# Read-only: generating a report persists nothing → no seed, no cleanup.
@rpt @UC-RPT-012
Feature: Generate Mark Site Designation Report — Real Report Generation

  @p1 @generation
  Scenario: The Mark Site Designation report renders a real PDF with the six-slot mark filter populated
    Given I open the "Mark Site Designation" report
    When I select the report Reg / Dist "DCC"
    And I add the report values "L44804, ES20R4" to "specific-values"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"
