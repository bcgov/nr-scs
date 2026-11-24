# ── REAL END-TO-END GENERATION (no stubbing anywhere) ──────────────────────────────────────────────────
# This file covers what was ENVIRONMENT-BLOCKED until the local report engine started working
# (2026-08-11): legacy S01's "the report is dispatched via HttpDelivery to the HTTP response" and S02's
# "dispatched via EmailDelivery". The request reaches JasperServer, Jasper renders `SCS_REP005`, and the
# browser saves the file — then the SAVED BYTES are asserted, because a download event firing only proves
# the app asked the browser to save something; a zero-byte or wrong-format file would still fire it.
#
# WHAT EACH ASSERTION BUYS
#   • filename `<uuid>.pdf` — the real contract: `ReportService.buildFetchResponse` names the file from
#     `buildFilename(requestId, mediaType)`, and requestId is a UUID. Not a friendly report name.
#   • magic bytes — `%PDF-` for PDF, the OLE2 signature D0CF11E0… for XLS. This is what catches the
#     genuinely confusing bug: bytes of one format behind the other format's Content-Type/extension, which
#     downloads "successfully" and then refuses to open.
#   • "Report Generated" — the client's own success branch, reached only on a real 2xx with a body.
#
# WHY EVERY SCENARIO FILTERS TO ONE DISTRICT: province-wide (Reg / Dist left at All) exceeds 120 seconds on
# this report — measured against the running stack. Filtered to DCC it renders in ~16s, still the slowest of
# the nine. Scenarios are tagged `@generation`, which grants them a longer per-test budget (see
# `steps/fixtures/rpt.ts`) because `ReportService` also caps concurrent renders at 3 and makes a fourth
# caller queue up to 20s.
#
# Still read-only: generating a report persists nothing → no seed, no cleanup, parallel-safe.
@rpt @UC-RPT-010
Feature: Generate Scaler Register Report — Real Report Generation

  @S01 @p1 @generation
  Scenario: The Scaler Register report renders a real PDF for a district
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "pdf"
    And the downloaded report is a real "pdf" file
    And the report shows the success message "Report Generated"

  # The format switch, end to end: the SAME report asked for as Excel must come back as a genuine OLE2
  # workbook named .xls — not a PDF wearing an .xls extension.
  @S01 @p1 @generation
  Scenario: The Scaler Register report renders a real Excel workbook when MS Excel is chosen
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I set the report file format to "MS Excel"
    And I submit the report and download the generated file
    Then the downloaded report is named with the request id and the extension "xls"
    And the downloaded report is a real "xls" file
    And the report shows the success message "Report Generated"

  # Legacy S02's EmailDelivery arm. The response is an immediate 202 ack (the render is handed to a
  # background executor), so nothing downloads — the confirmation is the whole observable outcome.
  #
  # ⚠️ THIS SCENARIO DOES NOT PROVE A RENDER, and unlike its siblings it does not need the engine: the 202
  # comes back in ~5ms from the executor hand-off, so it PASSES with JasperServer down (verified 2026-08-17
  # while the engine was 500ing every synchronous endpoint — the other 11 `@generation` scenarios failed and
  # this one passed). What it does prove is real and worth keeping: the client's email-delivery branch offers
  # no download and shows the ack. But it is `@generation`-tagged for the real backend, not for a render, so
  # do not read a green here as "the template still renders" — that is what the two scenarios above are for.
  @S02 @p1 @generation
  Scenario: Requesting email delivery is acknowledged without downloading anything
    Given I open the "Scaler Register" report
    When I select the report Reg / Dist "DCC"
    And I set the report Preview Report to No
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I submit the report expecting no download
    Then the report shows the success message "Report request submitted"
