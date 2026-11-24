# Chain: UC-SSC-002.md › -detailed.md › -slices.md › gherkin/UC-SSC-002-S02/S08 › THIS FILE
#
# Re-grounded from UC-SSC-002 S02 (edit) and S08 (update-side required field). Each scenario seeds its own
# MSD condition via the API, then reaches it in the large list via the class filter + page-size 50, and
# edits it (Type is read-only in edit). Save forwards to the read-only view; the edit-side required block
# asserts ZERO update PUTs.

@ssc @UC-SSC-002
Feature: Maintain Conditions — Update

  @S02 @p0
  Scenario: Administrator edits a condition and the change is persisted
    Given a disposable condition exists
    And I am on the Conditions list
    When I open the condition for view
    And I open the condition edit form
    And I set the condition "Title" field to "E2E SSC002 updated title"
    And I set the condition "Condition Text" field to "E2E SSC002 updated text"
    And I save the condition
    Then the condition should be shown in the view
    And the saved condition should match the submitted values

  @S08 @p1
  Scenario: Update is blocked when the Title is cleared
    Given a disposable condition exists
    And I am on the Conditions list
    When I open the condition for view
    And I open the condition edit form
    And I clear the condition "Title" field
    And I save the condition
    Then I should see the error "Title is required."
    And no update-condition request should be sent
