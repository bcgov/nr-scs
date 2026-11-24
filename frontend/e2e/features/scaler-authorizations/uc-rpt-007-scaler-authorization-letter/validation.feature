@sca @UC-RPT-007 @letter
Feature: Scaler Authorization Letter — output-option validation
  The Scaler Authorization Letter Options screen (route /scaler-authorizations/{id}/letter, shared
  LetterOptionsPage/ReportPage) validates the output options on the client BEFORE requesting generation.
  These scenarios drive the three pre-submit guards against the read-only sample record 3071 (licence 8437):
  each blocks the "Send / View Report" action and proves no letter-generate request is sent.

  Letter GENERATION (POST → Jasper SCS_REP003.rpt) and stored-letter VIEW are env/data-blocked and covered
  in defects.md, not here.

  Background:
    Given I open the scaler authorization letter options

  @S01 @p1 @ERR-002
  Scenario: An invalid email recipient is rejected before generation
    When I set the scaler letter email recipient to "not-an-email"
    And I submit the scaler letter options
    Then the scaler letter shows the email error "Email Recipient must be a valid email address."
    And no scaler letter request should be sent

  @S02 @p1 @ERR-001
  Scenario: Preview = No requires an email recipient
    When I set the scaler letter Preview Report to No
    And I submit the scaler letter options
    Then the scaler letter shows the email error "If Preview Report has been set to No then the Email Recipient is required."
    And no scaler letter request should be sent

  @S03 @p1
  Scenario: A signature block must be selected when signature blocks exist
    When I clear the scaler letter signature block
    And I submit the scaler letter options
    Then the scaler letter shows the error "Signature block is required."
    And no scaler letter request should be sent
