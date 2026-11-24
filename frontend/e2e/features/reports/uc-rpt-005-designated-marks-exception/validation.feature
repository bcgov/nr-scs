# The two output-option validations live in the SHARED `ReportPage.handleSend` (identical messages on every
# report screen), but each screen wires its own `onValidationError` and is a separately-reachable route, so
# each UC asserts them on ITS OWN screen. Both run BEFORE dispatch, so each scenario also PROVES no request
# left the browser — the new-app equivalent of the legacy "no report is dispatched to JCRS".
# Message re-grounding: legacy "The Email Recipient is not in a valid format." → "Email Recipient must be a
# valid email address."; the Preview=No message is verbatim.
# Read-only, parallel-safe, no cleanup.
@rpt @UC-RPT-005
Feature: Generate Designated Marks Exception Report — Output Option Validation

  @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "Designated Marks Exception" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "Designated Marks Exception" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent
