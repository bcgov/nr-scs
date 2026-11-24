# ── REAL END-TO-END GENERATION — ONE render per report, run in sequence ─────────────────────────────────
# Jasper renders `SCS_REP002` for real, the browser saves the file, and the SAVED BYTES are asserted. Real
# renders are the suite's scarcest resource (2-16s each; only three may run concurrently), so each report gets
# exactly ONE, and the `@generation` set runs in sequence — see the header of
# ../uc-rpt-012-mark-site-designation-report/generation.feature for the full rationale.
#
# This report has the LARGEST declared parameter set of the nine — two org units (mark side and site side) plus
# twelve filter slots (`mark1..6`, `site1..6`) — so it has the most to go wrong between the request the screen
# builds and what SCS_REP002 declares. The single render therefore exercises the busy case: both org units set
# and both slot families populated, ASYMMETRICALLY (2 marks, 1 site) so a mapping that crossed the two families
# would fail here. `parameters.feature` proves the request shape; this proves Jasper accepts it.
#
# XLS is not re-tested per report — the format switch is shared code, proven once on the archetype (UC-RPT-010).
# Read-only: generating a report persists nothing → no seed, no cleanup.
@rpt @UC-RPT-005
Feature: Generate Designated Marks Exception Report — Real Report Generation

  @p1 @generation
  Scenario: The report renders a real PDF with both org units and both filter slot families populated
    Given I open the "Designated Marks Exception" report
    When I select the report Reg / Dist "DCC" in "mark-reg-dist"
    And I select the report Reg / Dist "DCC" in "site-reg-dist"
    And I add the report values "L44804, ES20R4" to "designated-marks"
    And I add the report values "520" to "designated-sites"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"
