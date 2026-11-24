# Re-grounded from UC-RPT-010 S01 ("the report is dispatched via HttpDelivery to the HTTP response") and
# S02 ("dispatched via EmailDelivery … and no on-screen confirmation is rendered"). In the new app the
# equivalent split lives in `ScalerRegisterPage.handleSend`: Preview=Yes (or no recipient) → hand the blob to
# `useReportDownload` (browser download) + "Report Generated"; Preview=No WITH a recipient → no download,
# "Report request submitted" (so the new app DOES render a confirmation — a deliberate improvement over the
# legacy "no on-screen confirmation", recorded in coverage.md as a re-grounding, not a defect).
#
# ── WHY THESE SCENARIOS STUB THE REPORT ENGINE (AND WHAT DOES NOT) ─────────────────────────────────────
# Real end-to-end generation IS covered — see `generation.feature`, which renders real PDFs/XLS through
# JasperServer and asserts the saved bytes. What remains here are the arms real generation can never reach,
# each of which is nonetheless real `useReportDownload` logic:
#
#   • The `.pdf` / `.xls` FALLBACK filename. `useReportDownload` derives a name from the chosen file format
#     when the response carries no `Content-Disposition`. The real backend ALWAYS sends that header (a
#     `<uuid>.pdf` name — asserted in generation.feature), so the fallback branch is unreachable without
#     suppressing the header. Stubbed here precisely because it cannot be provoked for real.
#   • A SERVER-SUPPLIED filename that is not a UUID, proving the header is honoured verbatim rather than
#     reconstructed client-side — indistinguishable from generation.feature's assertion if the only
#     filename ever seen is the one the backend happens to generate.
#
# The stub fakes ONLY the Jasper RESPONSE (`route.fulfill`), the same fault/stub-injection pattern already
# used by pages/rsk/ScalerRiskAssessmentSearchPage and steps/chk/verify.steps.ts. Nothing about the app is
# stubbed, and these run fast (no render), which is why the shared wiring is asserted here rather than nine
# times over — the other UCs point at this file (see their coverage.md) instead of duplicating it.
#
# The LAST scenario now INJECTS a 500. Until 2026-08-11 it needed no faking, because every report endpoint
# returned 500 in this environment; now that the engine works, the failure has to be injected to keep the
# "Unable to submit report" branch covered.
# Read-only, parallel-safe, no cleanup.
@rpt @UC-RPT-010
Feature: Generate Scaler Register Report — Report Delivery

  @S01 @p1
  Scenario: A previewed report is downloaded using the filename the server supplies
    Given I open the "Scaler Register" report
    And the report engine returns a PDF named "SCS_REP005-scaler-register.pdf"
    When I submit the report and capture the download
    Then the downloaded report file is named "SCS_REP005-scaler-register.pdf"
    And the report shows the success message "Report Generated"

  @S01 @p2
  Scenario: Without a server filename the download falls back to the report's own PDF name
    Given I open the "Scaler Register" report
    And the report engine returns a PDF with no filename header
    When I submit the report and capture the download
    Then the downloaded report file is named "Scaler-Register.pdf"
    And the report shows the success message "Report Generated"

  @S01 @p2
  Scenario: Choosing MS Excel gives the fallback download an xls extension
    Given I open the "Scaler Register" report
    And the report engine returns a PDF with no filename header
    When I set the report file format to "MS Excel"
    And I submit the report and capture the download
    Then the downloaded report file is named "Scaler-Register.xls"

  @p1 @error-branch
  Scenario: A failing report engine surfaces an on-screen submit error
    Given I open the "Scaler Register" report
    And the report engine fails
    When I submit the report
    Then one report request should be sent
    And the report shows the submit error
