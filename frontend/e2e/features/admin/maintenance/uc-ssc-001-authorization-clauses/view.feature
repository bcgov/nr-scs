# Chain: UC-SSC-001.md › -detailed.md › -slices.md › gherkin/UC-SSC-001-S02 › THIS FILE
#
# Re-grounded from UC-SSC-001 S02 (the read-only detail view opened before Edit). Seeds its own clause
# via the API, opens it, and asserts the read-only fields render the persisted values.

@ssc @UC-SSC-001
Feature: Maintain Authorization Clauses — View

  @S02 @p1
  Scenario: Administrator opens a clause and sees its read-only detail
    Given a disposable authorization clause exists
    And I am on the Authorization Clauses list
    When I open the authorization clause for view
    Then the authorization clause view should show the seeded values
