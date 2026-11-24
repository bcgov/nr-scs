# Chain: UC-SSC-002.md › -detailed.md › -slices.md › gherkin/UC-SSC-002-S03/S11 › THIS FILE
#
# Re-grounded from UC-SSC-002 S03 (delete without dependents) and S11 (delete blocked by dependents). The
# happy path seeds its own MSD condition (no dependents) and removes it; the blocked path uses a REAL MSD
# condition with hauling children (read-only / parallel-safe) and asserts the "cannot delete" warning.

@ssc @UC-SSC-002
Feature: Maintain Conditions — Delete

  @S03 @p0
  Scenario: Administrator deletes a condition without dependents and it is removed
    Given a disposable condition exists
    And I am on the Conditions list
    When I open the condition for view
    And I delete the condition and confirm
    Then the condition should no longer exist

  @S11 @p1
  Scenario: Delete is blocked when the condition has dependent records
    Given a condition with dependent records exists
    And I am on the Conditions list
    When I open the condition for view
    And I attempt to delete the dependent condition
    Then the condition delete should be blocked with a dependents warning
    And the condition should still exist
