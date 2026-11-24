# Chain: UC-CCQ-003.md › -detailed.md › -slices.md › gherkin/UC-CCQ-003-S02 › THIS FILE
#
# Re-grounded from UC-CCQ-003 S02 (select a template → read-only detail). Seeds its own template via the
# API, then opens it from the list (class filter + page-size 50 makes the row reachable) and asserts the
# read-only view fields. Read-only / self-cleaning.
@ccq @UC-CCQ-003
Feature: Maintain Templates — View

  @S02 @p1
  Scenario: Administrator views a template's read-only detail
    Given a disposable template exists
    And I am on the Templates list
    When I open the template for view
    Then the template view should show the seeded values
