# Chain: UC-SSC-002.md › -detailed.md › -slices.md › gherkin/UC-SSC-002-S02 › THIS FILE
#
# Re-grounded from UC-SSC-002 S02 (the read-only detail view). Seeds its own MSD condition via the API,
# reaches it via the class filter + page-size 50, and asserts the read-only fields render the persisted
# values. (SIA Site-Type display is covered by the create happy path's forward-to-view.)

@ssc @UC-SSC-002
Feature: Maintain Conditions — View

  @S02 @p1
  Scenario: Administrator opens a condition and sees its read-only detail
    Given a disposable condition exists
    And I am on the Conditions list
    When I open the condition for view
    Then the condition view should show the seeded values
