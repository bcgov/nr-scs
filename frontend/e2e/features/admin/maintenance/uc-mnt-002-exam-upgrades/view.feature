# Chain: UC-MNT-002.md › -detailed.md › -slices.md › gherkin/UC-MNT-002-S02 › THIS FILE
#
# The read-only detail view is the entry point of the edit flow. Seeds its own exam/upgrade via the API,
# opens it read-only, asserts the detail. Parallel-safe + self-cleaning.

@mnt @UC-MNT-002
Feature: Maintain Exam Upgrades — View

  @S02 @p1
  Scenario: Administrator views an exam upgrade's read-only detail
    Given a disposable exam upgrade exists
    And I am on the Exam Upgrades list
    When I open the exam upgrade for view
    Then the exam upgrade view should show the seeded values
