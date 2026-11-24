# UC-CHK-005 S04/S08 (Back button by scaler tombstone) + S07 (unauthorized — skipped, see below).
# Legacy Back -> summaryCheckScales.do (a list screen that does not exist in the new app); the new app's
# Back returns to the caller-provided backTo, and the Back button renders only when route state carries
# a scaler tombstone (scalerName). S01 scenarios 1-2 (list->create nav, licence pre-fill) are legacy-only
# with no new-app equivalent — tracked in defects.md Coverage gaps, not automatable.
@chk @UC-CHK-005
Feature: Create Summary Check Scale — navigation and Back button

  @S08 @p2
  Scenario: S08 Without a scaler tombstone the Back button is not rendered
    Given I am on the Summary Check Scale create form
    Then the Back button should not be rendered
    And the Save Record button should be visible

  @S04 @p2
  Scenario: S04 With a scaler tombstone Back is shown and returns to the referring screen
    Given I am on the Summary Check Scale create form arrived from scaler "Test Scaler" returning to "/welcome"
    Then the Back button should be visible
    When I click Back
    Then I should be returned to "/welcome"
