# Chain: UC-SSC-001.md › -detailed.md › -slices.md › gherkin/UC-SSC-001-S02 › THIS FILE
#
# Re-grounded from UC-SSC-001 S02 (edit existing clause). Each scenario seeds its own fresh clause via
# the API, then edits it (self-cleaning, parallel-safe — no shared mutable row). Save forwards to the
# read-only view; the edit-side required-field block asserts ZERO update PUTs.

@ssc @UC-SSC-001
Feature: Maintain Authorization Clauses — Update

  @S02 @p0
  Scenario: Administrator edits a clause and the change is persisted
    Given a disposable authorization clause exists
    And I am on the Authorization Clauses list
    When I open the authorization clause for view
    And I open the authorization clause edit form
    And I set the authorization clause "Clause" field to "Updated clause text reflecting new policy."
    And I save the authorization clause
    Then the authorization clause should be shown in the view
    And the saved authorization clause should match the submitted values

  @S02 @p1
  Scenario: Edit save is blocked when the Clause is cleared
    Given a disposable authorization clause exists
    And I am on the Authorization Clauses list
    When I open the authorization clause for view
    And I open the authorization clause edit form
    And I clear the authorization clause "Clause" field
    And I save the authorization clause
    Then I should see the error "Clause is required."
    And no update-authorization-clause request should be sent
