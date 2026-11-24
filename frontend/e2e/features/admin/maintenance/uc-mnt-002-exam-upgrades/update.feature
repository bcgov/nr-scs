# Chain: UC-MNT-002.md › -detailed.md › -slices.md › gherkin/UC-MNT-002-S02/S06 › THIS FILE
#
# Re-grounded from UC-MNT-002 S02 (edit) and the edit-side of S06 (required field cleared). Each seeds
# its own exam/upgrade via the API, then edits it (Type is read-only in edit mode). Save forwards to view.

@mnt @UC-MNT-002
Feature: Maintain Exam Upgrades — Update

  @S02 @p0
  Scenario: Administrator edits an existing exam upgrade
    Given a disposable exam upgrade exists
    And I am on the Exam Upgrades list
    When I open the exam upgrade for view
    And I open the exam upgrade edit form
    And I set the exam upgrade "Description" field to "E2E MNT002 updated description"
    And I save the exam upgrade
    Then the saved exam upgrade should match the submitted values

  @S06 @p1
  Scenario: Update is blocked when the Description is cleared
    Given a disposable exam upgrade exists
    And I am on the Exam Upgrades list
    When I open the exam upgrade for view
    And I open the exam upgrade edit form
    And I clear the exam upgrade "Description" field
    And I save the exam upgrade
    Then I should see the error "Description is required."
    And no update-exam-upgrade request should be sent
