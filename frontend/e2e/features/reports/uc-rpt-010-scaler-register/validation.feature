# Re-grounded from UC-RPT-010 S06 (Preview=No with a blank Email Recipient) and S07 (malformed Email
# Recipient). In legacy both ran SERVER-side in `ReportBo.validateEmail()` and re-rendered the JSP with an
# `<html:errors>` block; in the new app both run CLIENT-side in `ReportPage.handleSend` BEFORE any request
# is dispatched — so each scenario also PROVES the request never left the browser (0 report calls), which is
# the new app's equivalent of the legacy "and no report is dispatched to JCRS".
#
# Message re-groundings:
#   S06 "If Preview Report has been set to No then the Email Recipient is required."  → VERBATIM in the new app.
#   S07 "The Email Recipient is not in a valid format."  → new app: "Email Recipient must be a valid email address."
# Both messages live in the shared `ReportPage`, so they are identical across all nine report screens; each
# UC asserts them on its OWN screen because each screen wires its own `onValidationError` handler.
#
# The legacy S06/S07 "…corrects it and re-submits successfully" second scenarios are NOT authored as
# generation arms (now covered for real in `generation.feature`md); the recovery half IS covered here as
# "the error clears once the input becomes valid", which is real client behaviour (ReportPage's clearing
# useEffect) and needs no report engine.
# Read-only, parallel-safe, no cleanup.
@rpt @UC-RPT-010
Feature: Generate Scaler Register Report — Output Option Validation

  @S07 @p1 @ERR-email-format
  Scenario: A malformed email recipient is rejected client-side with no report request sent
    Given I open the "Scaler Register" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    And no report request should be sent

  @S06 @p1 @ERR-email-required
  Scenario: A blank email with Preview set to No is rejected client-side with no report request sent
    Given I open the "Scaler Register" report
    When I set the report Preview Report to No
    And I submit the report
    Then the report options show the error "If Preview Report has been set to No then the Email Recipient is required."
    And no report request should be sent

  @S07 @p2 @ERR-email-format
  Scenario: The email-format error clears once a valid address is entered
    Given I open the "Scaler Register" report
    When I set the report email recipient to "not-an-email"
    And I submit the report
    Then the report options show the error "Email Recipient must be a valid email address."
    When I set the report email recipient to "scs.reports@example.gov.bc.ca"
    Then the report options error is cleared
    And no report request should be sent
