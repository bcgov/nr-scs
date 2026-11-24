# Re-grounded from UC-CHK-005 (legacy Gherkin under
# the UC-CHK-005 use-case Gherkin). Routes, fields and values
# are the NEW app's; concrete inputs are pinned from the seeded DB + backend validators
# (fixtures/chk-test-data.ts), never fabricated. Step definitions live under steps/.
@chk @UC-CHK-005
Feature: Create Summary Check Scale

  As a Check Scaler
  I want to record a summary check scale with one SPG row
  So that a summary-level check scale is persisted for the scaler and site

  @S01 @p0
  Scenario: S01 A valid summary check scale is persisted and forwards to the update screen
    Given I am on the Summary Check Scale create form
    When I enter a valid Summary Check Scale header
    And I enter a valid SPG row
    And I save the record
    Then I should be forwarded to the update screen for the new record
    And the saved Summary Check Scale should match the submitted values
