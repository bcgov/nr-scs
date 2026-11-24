# Slice: UC-CHK-006 state/navigation — action-row buttons, STA-003 (return type locked), STA-005
# (Back gating), plus S09/S10 which are not automatable at E2E today (see inline notes + defects.md).
@chk @UC-CHK-006
Feature: Update Summary Check Scale — Navigation, Buttons, and Access

  @S01 @p2
  Scenario: The update form shows the standard action row
    Given I am editing an existing summary check scale
    Then the "Reset" action should be visible on the update form
    And the "Save Record" action should be visible on the update form
    And the "Delete Record" action should be visible on the update form
    And the "Create Letter" action should be visible on the update form

  @S01 @p2
  Scenario: Return Type is locked once the record has SPG rows (STA-003)
    Given I am editing an existing summary check scale
    Then the Return Type options should be disabled

  @S01 @p2
  Scenario: Back is not rendered without a scaler context (STA-005)
    Given I am editing an existing summary check scale
    Then the "Back" action should not be rendered on the update form

  @S01 @p2
  Scenario: Back is rendered when arriving from a scaler context (STA-005)
    Given I am editing a summary check scale reached from scaler "JANE DOE" returning to "/scalers/900Z/check-scales"
    Then the "Back" action should be visible on the update form
