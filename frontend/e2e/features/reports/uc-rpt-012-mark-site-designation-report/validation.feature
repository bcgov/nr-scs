# The two output-option validations live in the SHARED `ReportPage.handleSend` (identical messages on every
# report screen), but each screen wires its own `onValidationError` and is a separately-reachable route, so
# each UC asserts them on ITS OWN screen. Both run BEFORE dispatch, so each scenario also PROVES no request
# left the browser — the new-app equivalent of the legacy "no report is dispatched to JCRS".
#
# NOTE this is the Mark Site Designation REPORT, not the per-record MSD letter (UC-RPT-009, covered under
# `features/mark-site-designation/uc-rpt-009-msd-letter/`) — the two screens share the same `ReportPage`
# validation, so the same two messages are asserted in both places against different endpoints.
# Message re-grounding: legacy "The Email Recipient is not in a valid format." → "Email Recipient must be a
# valid email address."; the Preview=No message is verbatim.
# Beyond those two shared output-option rules, this screen carries a date rule that is ITS OWN — see the
# paired-window block below.
# Read-only, parallel-safe, no cleanup.
@rpt @UC-RPT-012
Feature: Generate Mark Site Designation Report — Parameter Validation

  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "Mark Site Designation" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "Mark Site Designation" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  # ---------------------------------------------------------------- paired date windows (this screen only)
  #
  # Legacy `MarkSiteDesignationReportBo.validateDates` made each window ALL-OR-NOTHING —
  # `errors.mark_site_eff_date_both` / `errors.mark_site_exp_date_both`. This is the ONLY report screen legacy
  # applied that rule to, so it is asserted here and nowhere else (the other eight accept a half-open window
  # on purpose). Reported by QA 2026-09-08: the rule was missing entirely and a half-filled window generated
  # the report. Like the ordering rule, it gates dispatch — so every scenario proves no request left the
  # browser. The message is re-grounded onto the NEW field labels; legacy hung it on the FROM field in both
  # directions and the app keeps that, hence the assertions on "effective-from" / "expiry-from" even when it
  # is the To date that is missing.
  #
  # The endpoint enforces the SAME rule (ReportService.validateMarkSiteDesignationReportRequest -> 400),
  # which is where legacy enforced it. These scenarios cannot see that half: the screen refuses before a
  # request is made, so a browser-driven test passes whether or not the server would have blocked. The
  # backend suite carries it -- ReportServiceTest, "paired date windows". Do not read green here as proof
  # the API is guarded.

  @p1 @ERR-eff-date-both
  Scenario: An effective From date with no To date is rejected with no report request sent
    Given I open the "Mark Site Designation" report
    When I set the report date "effective-from" to "2024-01-01"
    And I submit the report
    Then the report date "effective-from" shows the error "If a value is entered in either Effective Date (From) or Effective Date (To), then a value must be entered in both."
    And the report date "expiry-from" shows no error
    And no report request should be sent

  @p1 @ERR-eff-date-both
  Scenario: An effective To date with no From date is rejected with no report request sent
    Given I open the "Mark Site Designation" report
    When I set the report date "effective-to" to "2024-12-31"
    And I submit the report
    Then the report date "effective-from" shows the error "If a value is entered in either Effective Date (From) or Effective Date (To), then a value must be entered in both."
    And no report request should be sent

  @p1 @ERR-exp-date-both
  Scenario: An expiry From date with no To date is rejected without implicating the effective window
    Given I open the "Mark Site Designation" report
    When I set the report date "expiry-from" to "2025-01-01"
    And I submit the report
    Then the report date "expiry-from" shows the error "If a value is entered in either Expiry Date (From) or Expiry Date (To), then a value must be entered in both."
    And the report date "effective-from" shows no error
    And no report request should be sent

  @p2 @ERR-exp-date-both
  Scenario: Both windows are reported when each is half-filled
    Given I open the "Mark Site Designation" report
    When I set the report date "effective-from" to "2024-01-01"
    And I set the report date "expiry-to" to "2025-06-30"
    And I submit the report
    Then the report date "effective-from" shows the error "If a value is entered in either Effective Date (From) or Effective Date (To), then a value must be entered in both."
    And the report date "expiry-from" shows the error "If a value is entered in either Expiry Date (From) or Expiry Date (To), then a value must be entered in both."
    And no report request should be sent

  # The distinction between pairing and "required": an EMPTY window is still a legal request. Proved by the
  # default-parameter submit in `parameters.feature`, which sends this report with no dates at all.

  @p2
  Scenario: Reset clears the parameters including the committed specific values
    Given I open the "Mark Site Designation" report
    When I select the report Reg / Dist "DCC"
    And I add the report values "L44804, ES20R4" to "specific-values"
    And I set the report date "effective-from" to "2024-01-01"
    And I set the report email recipient to "scs.reports@example.gov.bc.ca"
    And I reset the report parameters
    Then the report parameter "reg-dist" has the value ""
    And the report parameter "mark-or-site" has the value "MARK"
    And the report parameter "effective-from" has the value ""
    And the report parameter "email-recipient" has the value ""
    And the report value "L44804" is no longer listed in "specific-values"
    And the report value "ES20R4" is no longer listed in "specific-values"
    And no report request should be sent
